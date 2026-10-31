"""End-to-end verification tests for the RETROSWITCH AlphaGenome x Gemini pipeline."""
import json
import threading
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

import numpy as np
import pandas as pd

from scripts.run_knockouts import SEQ_LEN, realign_200bins_to_ref
from serve import Handler, load_env

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"


def test_ltrs_parquet_contract():
    df = pd.read_parquet(RESULTS_DIR / "ltrs.parquet")
    assert len(df) == 20, f"Expected 20 loci, got {len(df)}"
    required_cols = {
        "id", "gene", "contig_ncbi", "chrom", "tss", "window_start", "window_end",
        "ltr_name", "family", "ltr_start", "ltr_end", "ltr_len_bp",
        "alu_name", "alu_start", "alu_end", "rand_start", "rand_end",
    }
    assert required_cols.issubset(set(df.columns))
    assert "LTR/ERVL-MaLR" in set(df["family"]), "LTR/ERVL-MaLR must be in scope"
    for _, r in df.iterrows():
        assert (r["window_end"] - r["window_start"] + 1) == SEQ_LEN


def test_cached_npz_and_determinism():
    df = pd.read_parquet(RESULTS_DIR / "ltrs.parquet")
    for _, r in df.iterrows():
        p = RESULTS_DIR / "raw" / f"{r['id']}.npz"
        assert p.exists(), f"Missing cached AlphaGenome file: {p}"
        z = np.load(p)
        assert z["wt_t0_rna"].shape == (200,)
        assert z["ko_t0_rna"].shape == (200,)
        assert z["wt_t0_cmap"].shape == (64, 64)
        assert not np.isnan(z["wt_t0_rna"]).any()

    z0 = np.load(RESULTS_DIR / "raw" / "LTR_001_ERVW1.npz")
    assert float(z0["ref_determinism_diff"]) == 0.0


def test_realign_200bins_to_ref():
    # Create a synthetic track with a sharp exon peak at +10 kb (bin ~120)
    grid_kb = np.linspace(-49.75, 49.75, 200)
    tss = 100000
    # Suppose a 2000 bp deletion occurred at +2 kb..+4 kb (between TSS and the +10 kb exon)
    # In the perturbed sequence, the +10 kb exon shifted left by 2.0 kb to +8.0 kb
    arr_pert = np.exp(-((grid_kb - 8.0) / 1.0) ** 2).astype(np.float32)
    realigned = realign_200bins_to_ref(arr_pert, tss, tss + 2000, tss + 3999, zero_excised=True)
    peak_kb = grid_kb[int(np.argmax(realigned))]
    assert abs(peak_kb - 10.0) < 0.6, f"Expected realigned exon peak at +10.0 kb, got {peak_kb}"


def test_serve_endpoints():
    load_env()
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    try:
        # 1. /api/status
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/status", timeout=5) as r:
            st = json.loads(r.read().decode())
            assert st["gemini"] is True
            assert st["alphagenome"] is True
            assert st["has_viewer_data"] is True

        # 2. /api/data
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/data", timeout=5) as r:
            d = json.loads(r.read().decode())
            assert d["numLoci"] == 20
            assert len(d["loci"]) == 20

        # 3. /api/alphagenome
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/alphagenome",
            data=json.dumps({"locusId": "LTR_001_ERVW1", "tissue": "Placenta (UBERON:0001987)", "mode": "KO"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            ag = json.loads(r.read().decode())
            assert ag["status"] == "ok"
            assert ag["metrics"]["log2FC"] < -1.0

        # 4. /api/gemini (live Gemini 4 Argon call)
        g_req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/gemini",
            data=json.dumps({
                "model": "gemini-4-argon",
                "contents": [{"role": "user", "parts": [{"text": "Summarize in 1 sentence: ERVW-1 log2FC=-1.734, Z=-10.82 in Placenta."}]}],
            }).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(g_req, timeout=25) as r:
            gm = json.loads(r.read().decode())
            txt = gm["candidates"][0]["content"]["parts"][0]["text"]
            assert len(txt) > 10
            print("  Live /api/gemini response:", txt.strip()[:120] + "...")
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    test_ltrs_parquet_contract()
    print("✓ test_ltrs_parquet_contract passed")
    test_cached_npz_and_determinism()
    print("✓ test_cached_npz_and_determinism passed")
    test_realign_200bins_to_ref()
    print("✓ test_realign_200bins_to_ref passed")
    test_serve_endpoints()
    print("✓ test_serve_endpoints passed")
    print("ALL TESTS PASSED!")
