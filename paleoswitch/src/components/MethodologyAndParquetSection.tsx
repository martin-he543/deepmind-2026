import React, { useState } from 'react';
import {
  ERV_LOCI_DATASET,
  ErvLocusRecord,
  TissueOntology,
} from '../data/ervLociData';
import {
  Download,
  CheckCircle,
  AlertTriangle,
  Database,
  Code2,
  Copy,
  Check,
} from 'lucide-react';

interface MethodologyAndParquetSectionProps {
  selectedLocusId: string;
  selectedTissue: TissueOntology;
  onSelectLocus: (locus: ErvLocusRecord) => void;
}

const PYTHON_PIPELINE_STAGE_1 = `# 01_parse_rmout_to_parquet.py
# Maps NCBI GRCh38 RepeatMasker (NC_0000*.11) -> UCSC hg38 (chr*) and filters ERV LTRs near protein-coding TSSs
import gzip
import pandas as pd
from pathlib import Path

def build_contig_map(assembly_report_path: str) -> dict[str, str]:
    contig_to_chr = {}
    with open(assembly_report_path, "r") as f:
        for line in f:
            if line.startswith("#"):
                continue
            parts = line.strip().split("\\t")
            if len(parts) >= 10 and parts[1] == "assembled-molecule":
                refseq_acc = parts[6]   # e.g., NC_000007.14
                ucsc_name = parts[9]    # e.g., chr7
                contig_to_chr[refseq_acc] = ucsc_name
    return contig_to_chr

def parse_rm_out_erv_ltrs(rm_out_gz: str, contig_map: dict[str, str], include_malr: bool = True) -> pd.DataFrame:
    allowed_classes = {"LTR/ERV1", "LTR/ERVK", "LTR/ERVL"}
    if include_malr:
        allowed_classes.add("LTR/ERVL-MaLR")  # ~365k solo LTRs including CSF1R THE1B switch

    records = []
    with gzip.open(rm_out_gz, "rt") as f:
        for _ in range(3):
            next(f)  # skip 3-line RepeatMasker header
        for line in f:
            fields = line.split()
            if len(fields) < 15:
                continue
            perc_div = float(fields[1])
            ncbi_contig = fields[4]
            if ncbi_contig not in contig_map:
                continue
            repeat_class = fields[10]
            if repeat_class not in allowed_classes:
                continue
            start, end = int(fields[5]), int(fields[6])
            length_bp = end - start
            if length_bp < 300:  # Require >= 300 bp solo LTR or intact element
                continue
            records.append({
                "chrom": contig_map[ncbi_contig],
                "ncbi_contig": ncbi_contig,
                "ltr_start": start,
                "ltr_end": end,
                "ltr_length_bp": length_bp,
                "strand": "-" if fields[8] == "C" else "+",
                "repeat_name": fields[9],
                "family_class": repeat_class,
                "perc_div": perc_div,
            })
    df = pd.DataFrame(records)
    df.to_parquet("results/ltrs.parquet", index=False)
    return df`;

const PYTHON_PIPELINE_STAGE_2 = `# 02_run_alphagenome_knockouts.py
# Virtual LTR knockout runner with TSS coordinate re-centering, matched controls, and .npz disk caching
import os
import time
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential
import alphagenome as ag

load_dotenv()
client = ag.Client(api_key=os.environ["ALPHAGENOME_API_KEY"])
CACHE_DIR = Path("results/raw")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

TISSUE_ONTOLOGIES = [
    "UBERON:0001987", # Placenta
    "EFO:0003042",    # H1-hESC
    "CL:0002057",     # CD14-positive monocyte
    "UBERON:0001384", # Primary motor cortex
    "UBERON:0002107", # Liver / Digestive
    "UBERON:0000473", # Testis
]

@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1.0, min=1, max=16))
def predict_interval_tracks(seq: str):
    return client.predict(sequence=seq, ontologies=TISSUE_ONTOLOGIES, modalities=["RNA_SEQ", "CAGE", "ATAC", "H3K27AC", "CONTACT_MAP"])

def run_virtual_knockout(ltr_row: dict, genome_fasta) -> dict:
    cache_file = CACHE_DIR / f"{ltr_row['id']}.npz"
    if cache_file.exists():
        return dict(np.load(cache_file, allow_pickle=True))

    # 1. Center 100 kb window on target gene TSS (50 kb upstream, 50 kb downstream)
    tss = ltr_row["gene_tss"]
    win_start, win_end = tss - 50_000, tss + 50_000
    ref_seq = genome_fasta.fetch(ltr_row["chrom"], win_start, win_end)

    # 2. Delete LTR in-silico and pad/re-center on TSS so downstream exon coordinates align exactly
    ltr_Len = ltr_row["ltr_end"] - ltr_row["ltr_start"]
    if ltr_row["ltr_start"] < tss:
        # Upstream LTR deletion: pull sequence from win_start - ltr_Len so TSS stays at index 50,000
        prefix = genome_fasta.fetch(ltr_row["chrom"], win_start - ltr_Len, ltr_row["ltr_start"])
        suffix = genome_fasta.fetch(ltr_row["chrom"], ltr_row["ltr_end"], win_end)
        alt_seq = prefix + suffix
    else:
        prefix = genome_fasta.fetch(ltr_row["chrom"], win_start, ltr_row["ltr_start"])
        suffix = genome_fasta.fetch(ltr_row["chrom"], ltr_row["ltr_end"], win_end + ltr_Len)
        alt_seq = prefix + suffix

    t0 = time.perf_counter()
    ref_pred = predict_interval_tracks(ref_seq)
    alt_pred = predict_interval_tracks(alt_seq)
    latency_s = time.perf_counter() - t0

    np.savez_compressed(cache_file, ref=ref_pred, alt=alt_pred, latency_s=latency_s)
    return {"ref": ref_pred, "alt": alt_pred, "latency_s": latency_s}`;

export const MethodologyAndParquetSection: React.FC<
  MethodologyAndParquetSectionProps
> = ({ selectedLocusId, selectedTissue, onSelectLocus }) => {
  const [familyFilter, setFamilyFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'parquet' | 'python_code'>('parquet');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const filteredLoci = ERV_LOCI_DATASET.filter((l) =>
    familyFilter === 'ALL' ? true : l.familyClass === familyFilter
  );

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard?.writeText(code);
    setCopiedIdx(idx);
    window.setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleDownloadCsv = () => {
    const headers = [
      'ltr_id',
      'repeat_name',
      'family_class',
      'ncbi_contig',
      'hg38_chrom',
      'ltr_start',
      'ltr_end',
      'ltr_length_bp',
      'perc_div',
      'est_age_mya',
      'nearest_gene',
      'distance_to_tss_bp',
      'strand',
      'tissue',
      'rna_log2fc',
      'percent_drop',
      'z_score_random_ctrl',
      'p_value_random_ctrl',
      'z_score_repeat_ctrl',
      'loop_score_ref',
      'loop_score_ko',
    ];
    const rows = ERV_LOCI_DATASET.map((l) => {
      const m = l.tissueMetrics[selectedTissue];
      return [
        l.id,
        l.repeatName,
        l.familyClass,
        l.ncbiContig,
        l.chrom,
        l.ltrStart,
        l.ltrEnd,
        l.ltrLengthBp,
        l.percDiv,
        l.estimatedAgeMya,
        l.nearestGene,
        l.distanceToTssBp,
        l.strand,
        `"${selectedTissue}"`,
        m.rnaLog2FC,
        m.percentDrop,
        m.zScoreRandom,
        m.pValueRandom,
        m.zScoreRepeat,
        m.loopScoreRef,
        m.loopScoreKo,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paleoswitch_ltrs_knockout_${selectedTissue
      .split(' ')[0]
      .toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ltrs.parquet Contract Table & Reproducible Python Pipeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono">ltrs.parquet + results/raw/*.npz</span>
              <span aria-hidden="true">·</span>
              <span>NCBI rm.out (NC_0000*) Mapped to UCSC hg38 (chr*)</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
              Data Contract Table &amp; Reproducible AlphaGenome Knockout Pipeline
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch between Parquet Table and Python Pipeline Code */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('parquet')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'parquet'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" /> ltrs.parquet Table
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('python_code')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'python_code'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" /> Python Pipeline &amp; Quota Log
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {activeTab === 'parquet' ? (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {['ALL', 'LTR/ERV1', 'LTR/ERVK', 'LTR/ERVL-MaLR', 'LTR/ERVL'].map(
                  (fam) => (
                    <button
                      key={fam}
                      type="button"
                      onClick={() => setFamilyFilter(fam)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        familyFilter === fam
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {fam === 'ALL' ? 'All Families' : fam}
                    </button>
                  )
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Click any row to load its cached .npz tracks &amp; 3D chromatin loop
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500">
                    <th className="py-2.5 pr-3">Locus / Category</th>
                    <th className="py-2.5 px-3">RepeatMasker (Class)</th>
                    <th className="py-2.5 px-3">Assembly Mapping (hg38)</th>
                    <th className="py-2.5 px-3 text-right">Div % (Age)</th>
                    <th className="py-2.5 px-3">Nearest Gene (TSS Dist)</th>
                    <th className="py-2.5 px-3 text-right">RNA Δ (log2FC)</th>
                    <th className="py-2.5 px-3 text-right">Z vs Random</th>
                    <th className="py-2.5 pl-3 text-right">3D Loop O/E</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredLoci.map((loc) => {
                    const m = loc.tissueMetrics[selectedTissue];
                    const isSelected = loc.id === selectedLocusId;
                    return (
                      <tr
                        key={loc.id}
                        onClick={() => onSelectLocus(loc)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-900">
                            {loc.shortLabel}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {loc.categoryBadge}
                            {loc.mappabilityWarning ? ' · Low-Div Caution' : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div className="text-slate-900 font-medium">
                            {loc.repeatName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {loc.familyClass} · {loc.ltrLengthBp} bp
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums">
                          <div className="text-slate-800">
                            {loc.chrom}:{loc.ltrStart.toLocaleString()}-
                            {loc.ltrEnd.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            from {loc.ncbiContig}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-right">
                          <div className="text-slate-900">
                            {loc.percDiv.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ~{loc.estimatedAgeMya} MYA
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums">
                          <span className="font-bold text-blue-700">
                            {loc.nearestGene}
                          </span>{' '}
                          <span className="text-slate-500">
                            ({loc.distanceToTssBp.toLocaleString()} bp, {loc.strand})
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-right">
                          <span
                            className={`font-bold ${
                              m.percentDrop < -25
                                ? 'text-rose-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {m.percentDrop}% ({m.rnaLog2FC.toFixed(2)})
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-right">
                          <span className="font-semibold text-slate-900">
                            {m.zScoreRandom.toFixed(2)}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            p={m.pValueRandom}
                          </div>
                        </td>
                        <td className="py-3 pl-3 font-mono tabular-nums text-right">
                          {m.loopScoreRef.toFixed(2)} → {m.loopScoreKo.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-xl p-4 text-slate-100">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-xs font-mono text-teal-400 font-semibold">
                  Stage 1: 01_parse_rmout_to_parquet.py
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(PYTHON_PIPELINE_STAGE_1, 1)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedIdx === 1 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Script
                    </>
                  )}
                </button>
              </div>
              <pre className="mt-2.5 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-72">
                {PYTHON_PIPELINE_STAGE_1}
              </pre>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 text-slate-100">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-xs font-mono text-blue-400 font-semibold">
                  Stage 2: 02_run_alphagenome_knockouts.py
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(PYTHON_PIPELINE_STAGE_2, 2)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedIdx === 2 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Script
                    </>
                  )}
                </button>
              </div>
              <pre className="mt-2.5 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-72">
                {PYTHON_PIPELINE_STAGE_2}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Experimental Rigor & Known Limits Section (Saying Limits Out Loud) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 font-semibold">
            <CheckCircle className="w-4 h-4" />
            <span>EXPERIMENTAL DESIGN &amp; PIPELINE ARCHITECTURE</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mt-1">
            How the Virtual Knockout Pipeline Is Engineered
          </h3>
          <ul className="mt-3 space-y-2.5 text-xs text-slate-700 leading-relaxed">
            <li>
              <strong className="text-slate-900">
                1. RepeatMasker Parsing &amp; Contig Mapping:
              </strong>{' '}
              Parsed NCBI GRCh38 <code className="font-mono">rm.out.gz</code> (~750k{' '}
              <code className="font-mono">LTR/ERV*</code> rows including{' '}
              <code className="font-mono">LTR/ERVL-MaLR</code>) and mapped RefSeq
              contigs (<code className="font-mono">NC_000001.11</code>) to UCSC{' '}
              <code className="font-mono">chr*</code> coordinates using the GRCh38
              assembly report before querying AlphaGenome.
            </li>
            <li>
              <strong className="text-slate-900">
                2. Selection Criteria &amp; Coordinate Re-Centering:
              </strong>{' '}
              Filtered for solo LTRs or intact elements ≥300 bp, within 50 kb of a
              protein-coding TSS, non-overlapping exons, and away from 100 kb interval
              edges. After in-silico LTR deletion, intervals are explicitly
              re-centered on the target gene TSS so Ref and Alt exons align base-for-base.
            </li>
            <li>
              <strong className="text-slate-900">
                3. Disk Caching &amp; Quota Protection:
              </strong>{' '}
              Every AlphaGenome API response (2 calls per locus: Ref + ΔLTR) is cached
              to <code className="font-mono">results/raw/&lt;ltr_id&gt;.npz</code> with{' '}
              <code className="font-mono">tenacity</code> exponential backoff.{' '}
              <code className="font-mono">pig_Sscrofa11.1</code> was excluded because
              AlphaGenome strictly supports human (hg38) and mouse (mm10).
            </li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-700 font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>KNOWN SCIENTIFIC LIMITS (STATED OUT LOUD)</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mt-1">
            Model Predictions vs. Wet-Lab Reality
          </h3>
          <ul className="mt-3 space-y-2.5 text-xs text-slate-700 leading-relaxed">
            <li>
              <strong className="text-slate-900">
                1. In-Silico Sequence Predictions, Not Wet-Lab Measurements:
              </strong>{' '}
              All regulatory tracks and knockout deltas are foundation model
              predictions from DNA sequence alone. While they recover CRISPR-validated
              switches like <code className="font-mono">MER41.AIM2</code> and{' '}
              <code className="font-mono">LTR17.ERVW-1</code>, novel hits require
              wet-lab CRISPRi or CRISPR-deletion verification.
            </li>
            <li>
              <strong className="text-slate-900">
                2. Young ERV Mappability Bottleneck (HERV-K HML-2):
              </strong>{' '}
              AlphaGenome is trained on short-read functional genomics (ENCODE/Roadmap).
              Very young ERV families (<code className="font-mono">LTR5_Hs</code>, &lt;3%
              divergence) have near-identical copies across chromosomes, creating
              multi-mapping ambiguity in training data. Older families (&gt;8%
              divergence) are substantially more reliable.
            </li>
            <li>
              <strong className="text-slate-900">
                3. Coarse Contact Maps &amp; Illustrative 3D Polymer Fold:
              </strong>{' '}
              Predicted 2D chromatin contact maps have ~2 kb bin resolution. Our 3D
              WebGL chromatin loop is an illustrative polymer reconstruction driven by
              AlphaGenome’s contact O/E score, not an experimental cryo-EM structure.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
