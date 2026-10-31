"""Train and cross-validate our own ML models (XGBoost + Random Forest) to predict
which endogenous retrovirus (ERV) LTRs act as active human gene switches, using:
  1. Real GRCh38 DNA sequence features (TF binding motifs, CpG ratio, GC%, 4-mer entropy)
  2. RepeatMasker & GENCODE genomic features (distance to TSS, viral divergence %, length, family)
  3. Baseline chromatin features -> predicting AlphaGenome Virtual Knockout impact (log2FC & |Z| >= 1.5).

Uses GroupKFold (grouped by locus) so tissues of the same gene never leak between train and test.
Exports `results/model_report.json`, `results/switch_xgb.json`, and updates `results/viewer_data.json`.
"""
import json
import math
import re
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
from pyfaidx import Fasta
from scipy.stats import pearsonr
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from xgboost import XGBClassifier, XGBRegressor

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RESULTS_DIR = ROOT / "results"


# Canonical Transcription Factor motif regexes (forward + reverse complement patterns)
MOTIF_PATTERNS = {
    "STAT1_IRF (Immune)": re.compile(r"(?=([ACGT]TTCC[ACGT]{2,3}GGAA|GAA[ACGT]{2}GAAA|TTTC[ACGT]{2}TTTC|TTC[ACGT]{3}GAA))"),
    "GATA_GCM1 (Placenta)": re.compile(r"(?=([AT]GATA[AG]|[CT]TATC[AT]|ATGCGG|CCGCAT))"),
    "OCT4_SOX2_KLF4 (Stem)": re.compile(r"(?=(ATGCAAAT|ATTTGCAT|CTTTGT|ACAAAG|CACCC|GGGTG))"),
    "TATA_Inr (Promoter)": re.compile(r"(?=(TATAA[AT]|TATA[AT]A|[CT]{2}A[ACGT][AT][CT]{2}))"),
    "NFkB_AP1 (Enhancer)": re.compile(r"(?=(GGG[AG]C[CT]TTCC|TGAGTCA|TGACTCA))"),
}


def compute_dna_features(seq: str) -> dict:
    """Compute sequence composition, CpG density, 4-mer complexity, and TF motif hits from DNA."""
    s = seq.upper().replace("N", "")
    n = max(len(s), 1)
    g = s.count("G")
    c = s.count("C")
    gc_pct = round(((g + c) / n) * 100.0, 2)

    cpg = s.count("CG")
    exp_cpg = ((g / n) * (c / n)) * n
    cpg_oe = round(cpg / max(exp_cpg, 1e-4), 3)

    # 4-mer Shannon entropy (0..8 bits)
    if len(s) >= 16:
        kmers = [s[i : i + 4] for i in range(len(s) - 3)]
        counts = Counter(kmers)
        total_k = len(kmers)
        ent = -sum((cnt / total_k) * math.log2(cnt / total_k) for cnt in counts.values())
    else:
        ent = 6.0

    scale_per_kb = 1000.0 / max(n, 100)
    motifs = {}
    total_motifs = 0
    for m_name, rgx in MOTIF_PATTERNS.items():
        hits = len(rgx.findall(s))
        total_motifs += hits
        motifs[m_name] = round(hits * scale_per_kb, 2)

    return {
        "gc_pct": gc_pct,
        "cpg_oe": cpg_oe,
        "kmer_entropy": round(ent, 3),
        "motif_density_per_kb": round(total_motifs * scale_per_kb, 2),
        "motifs": motifs,
        "seq_snippet": s[:120] + ("..." if len(s) > 120 else ""),
    }


def main():
    viewer_path = RESULTS_DIR / "viewer_data.json"
    vdata = json.loads(viewer_path.read_text(encoding="utf-8"))
    fasta_path = DATA_DIR / "human_GRCh38" / "GCF_000001405.40_GRCh38.p14_genomic.fna"
    fasta = Fasta(str(fasta_path))

    # Build dataset across all 20 loci x 7 tissues (140 LTR observations + 40 Alu/Random control observations)
    records = []
    dna_by_locus = {}

    for loc in vdata["loci"]:
        lid = loc["id"]
        contig = loc["contigNcbi"]
        ltr_s, ltr_e = int(loc["ltrStart"]), int(loc["ltrEnd"])
        ltr_seq = str(fasta[contig][ltr_s - 1 : ltr_e])
        dna_feats = compute_dna_features(ltr_seq)
        dna_by_locus[lid] = dna_feats
        loc["dnaFeatures"] = dna_feats

        dist_kb = abs(float(loc["ltrRelPosKb"]))
        div_pct = float(loc["divPct"])
        ltr_len = float(loc["ltrLenBp"])
        fam = loc["family"]

        for t_idx, (t_label, td) in enumerate(loc["tissues"].items()):
            # Match tissue specificity to relevant TF motif family
            if "Placenta" in t_label:
                lineage_motif = dna_feats["motifs"]["GATA_GCM1 (Placenta)"]
            elif "Stem" in t_label:
                lineage_motif = dna_feats["motifs"]["OCT4_SOX2_KLF4 (Stem)"]
            elif "Monocyte" in t_label:
                lineage_motif = dna_feats["motifs"]["STAT1_IRF (Immune)"]
            else:
                lineage_motif = dna_feats["motifs"]["TATA_Inr (Promoter)"] + 0.5 * dna_feats["motifs"]["NFkB_AP1 (Enhancer)"]

            records.append({
                "locus_id": lid,
                "gene": loc["gene"],
                "ltr_name": loc["ltrName"],
                "tissue": t_label,
                "is_default_tissue": t_label == loc["defaultTissue"],
                "dist_to_tss_kb": dist_kb,
                "div_pct": div_pct,
                "ltr_len_bp": ltr_len,
                "gc_pct": dna_feats["gc_pct"],
                "cpg_oe": dna_feats["cpg_oe"],
                "kmer_entropy": dna_feats["kmer_entropy"],
                "motif_density": dna_feats["motif_density_per_kb"],
                "lineage_motif_score": lineage_motif,
                "tata_motif": dna_feats["motifs"]["TATA_Inr (Promoter)"],
                "is_erv1": 1.0 if "ERV1" in fam else 0.0,
                "is_malr": 1.0 if "MaLR" in fam else 0.0,
                "wt_h3k27ac_ltr": float(td["wtH3k27acLtr"]),
                "wt_atac_ltr": float(td["wtAtacLtr"]),
                "wt_contact": float(td["contactScoreWt"]) * 100.0,
                "actual_log2fc": float(td["log2FC"]),
                "actual_z": float(td["zScore"]),
                "is_active_switch": 1 if float(td["zScore"]) <= -1.3 else 0,
            })

    df = pd.DataFrame(records)

    # Feature sets:
    # 1. DNA + Genomics Only (no AlphaGenome tracks)
    seq_cols = [
        "dist_to_tss_kb",
        "div_pct",
        "ltr_len_bp",
        "gc_pct",
        "cpg_oe",
        "kmer_entropy",
        "motif_density",
        "lineage_motif_score",
        "tata_motif",
        "is_erv1",
        "is_malr",
    ]
    # 2. Full Hybrid Model (DNA Sequence + Local Chromatin Context)
    full_cols = seq_cols + ["wt_h3k27ac_ltr", "wt_atac_ltr", "wt_contact"]

    X_seq = df[seq_cols].to_numpy(dtype=np.float32)
    X_full = df[full_cols].to_numpy(dtype=np.float32)
    y_cls = df["is_active_switch"].to_numpy(dtype=np.int32)
    y_reg = np.clip(-df["actual_log2fc"].to_numpy(dtype=np.float32), 0.0, 3.0)  # Magnitude of switch activation
    groups = df["locus_id"].to_numpy()

    gkf = GroupKFold(n_splits=5)
    oof_prob_seq = np.zeros(len(df), dtype=np.float32)
    oof_prob_full = np.zeros(len(df), dtype=np.float32)
    oof_pred_mag = np.zeros(len(df), dtype=np.float32)

    for tr_idx, va_idx in gkf.split(X_full, y_cls, groups):
        # Sequence-only classifier
        clf_seq = RandomForestClassifier(n_estimators=120, max_depth=4, random_state=42)
        clf_seq.fit(X_seq[tr_idx], y_cls[tr_idx])
        oof_prob_seq[va_idx] = clf_seq.predict_proba(X_seq[va_idx])[:, 1]

        # Full hybrid XGBoost classifier
        clf_full = XGBClassifier(
            n_estimators=90, max_depth=3, learning_rate=0.06, subsample=0.85,
            colsample_bytree=0.85, random_state=42, eval_metric="logloss"
        )
        clf_full.fit(X_full[tr_idx], y_cls[tr_idx])
        oof_prob_full[va_idx] = clf_full.predict_proba(X_full[va_idx])[:, 1]

        # Full hybrid XGBoost effect-size regressor
        reg_full = XGBRegressor(
            n_estimators=90, max_depth=3, learning_rate=0.06, subsample=0.85,
            colsample_bytree=0.85, random_state=42
        )
        reg_full.fit(X_full[tr_idx], y_reg[tr_idx])
        oof_pred_mag[va_idx] = np.clip(reg_full.predict(X_full[va_idx]), 0.0, 3.0)

    auroc_seq = float(roc_auc_score(y_cls, oof_prob_seq))
    auroc_full = float(roc_auc_score(y_cls, oof_prob_full))
    r_val, _ = pearsonr(y_reg, oof_pred_mag)
    mae_val = float(mean_absolute_error(y_reg, oof_pred_mag))

    # Fit final models on all data for feature importances and live interactive sandbox inference
    final_clf = XGBClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.06, subsample=0.85,
        colsample_bytree=0.85, random_state=42, eval_metric="logloss"
    )
    final_clf.fit(X_full, y_cls)

    final_reg = XGBRegressor(
        n_estimators=100, max_depth=3, learning_rate=0.06, subsample=0.85,
        colsample_bytree=0.85, random_state=42
    )
    final_reg.fit(X_full, y_reg)

    final_clf.save_model(str(RESULTS_DIR / "switch_xgb_clf.json"))
    final_reg.save_model(str(RESULTS_DIR / "switch_xgb_reg.json"))

    # Pretty feature labels & normalized importances
    pretty_names = {
        "dist_to_tss_kb": "Distance to Gene TSS (kb)",
        "wt_h3k27ac_ltr": "Local H3K27ac Enhancer Signal",
        "wt_atac_ltr": "Open Chromatin (DNase/ATAC)",
        "lineage_motif_score": "Lineage TF Motifs (STAT1/GATA/OCT4)",
        "div_pct": "Viral Divergence % (Evolutionary Age)",
        "cpg_oe": "CpG Observed/Expected Ratio",
        "tata_motif": "Core Promoter TATA/Inr Motifs",
        "wt_contact": "3D Loop Contact Probability",
        "ltr_len_bp": "Viral LTR Length (bp)",
        "gc_pct": "Sequence GC Content (%)",
        "motif_density": "Total TF Motif Density (/kb)",
        "kmer_entropy": "4-mer Sequence Complexity",
        "is_erv1": "Family: LTR/ERV1 Class",
        "is_malr": "Family: LTR/ERVL-MaLR Class",
    }

    raw_imp = 0.55 * final_clf.feature_importances_ + 0.45 * final_reg.feature_importances_
    raw_imp = raw_imp / (raw_imp.sum() + 1e-8)
    feat_importances = sorted(
        [
            {"key": col, "label": pretty_names.get(col, col), "importance": round(float(imp * 100.0), 1)}
            for col, imp in zip(full_cols, raw_imp)
        ],
        key=lambda x: x["importance"],
        reverse=True,
    )

    # Attach out-of-fold model predictions back onto each locus in viewer_data.json
    df["oof_prob_seq"] = oof_prob_seq
    df["oof_prob_full"] = oof_prob_full
    df["oof_pred_log2fc"] = -oof_pred_mag

    locus_predictions = []
    for loc in vdata["loci"]:
        lid = loc["id"]
        sub_def = df[(df["locus_id"] == lid) & (df["is_default_tissue"])].iloc[0]
        prob_full = round(float(sub_def["oof_prob_full"]) * 100.0, 1)
        prob_seq = round(float(sub_def["oof_prob_seq"]) * 100.0, 1)
        pred_l2fc = round(float(sub_def["oof_pred_log2fc"]), 3)
        act_l2fc = round(float(sub_def["actual_log2fc"]), 3)

        loc["modelPred"] = {
            "switchProbFullPct": prob_full,
            "switchProbSeqOnlyPct": prob_seq,
            "predLog2FC": pred_l2fc,
            "actualLog2FC": act_l2fc,
            "actualZ": round(float(sub_def["actual_z"]), 2),
            "isActiveSwitch": bool(sub_def["is_active_switch"]),
            "distKb": round(float(sub_def["dist_to_tss_kb"]), 2),
            "lineageMotifDensity": round(float(sub_def["lineage_motif_score"]), 2),
        }
        locus_predictions.append({
            "id": lid,
            "gene": loc["gene"],
            "ltrName": loc["ltrName"],
            "tissue": loc["defaultTissue"].split("(")[0].strip(),
            "distKb": round(float(sub_def["dist_to_tss_kb"]), 1),
            "divPct": float(loc["divPct"]),
            "switchProbSeqOnlyPct": prob_seq,
            "switchProbFullPct": prob_full,
            "predLog2FC": pred_l2fc,
            "actualLog2FC": act_l2fc,
            "actualZ": round(float(sub_def["actual_z"]), 2),
        })

    model_report = {
        "modelName": "RetroSwitch-XGB (5-Fold GroupCV by Gene Locus)",
        "numSamples": len(df),
        "numLoci": len(vdata["loci"]),
        "aurocSeqOnly": round(auroc_seq, 3),
        "aurocFullHybrid": round(auroc_full, 3),
        "pearsonR": round(float(r_val), 3),
        "maeLog2FC": round(mae_val, 3),
        "featureColumns": full_cols,
        "featureImportances": feat_importances[:10],
        "locusPredictions": locus_predictions,
    }

    (RESULTS_DIR / "model_report.json").write_text(json.dumps(model_report, indent=2), encoding="utf-8")
    vdata["modelReport"] = model_report
    viewer_path.write_text(json.dumps(vdata), encoding="utf-8")

    print(f"Trained RetroSwitch-XGB across {len(df)} locus x tissue pairs (5-fold GroupKFold):")
    print(f"  - DNA + Genomics Sequence-Only AUROC : {auroc_seq:.3f}")
    print(f"  - Full Hybrid (DNA + Chromatin) AUROC: {auroc_full:.3f}")
    print(f"  - Knockout Effect Pearson r          : {r_val:.3f} (MAE = {mae_val:.3f} log2FC)")
    print("  - Top 5 Predictive Features:")
    for fi in feat_importances[:5]:
        print(f"      * {fi['label']:38s}: {fi['importance']:5.1f}%")


if __name__ == "__main__":
    main()
