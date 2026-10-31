"""Serve index.html, real AlphaGenome knockout data (`results/viewer_data.json`),
our trained `RetroSwitch-XGB` live predictor (`/api/predict_switch`),
and Gemini 4 Argon analysis (`/api/gemini`).

Run:  python serve.py   then open http://localhost:8060
"""
import json
import os
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
from xgboost import XGBClassifier, XGBRegressor

from scripts.train_switch_model import compute_dna_features

ROOT = Path(__file__).resolve().parent
HTML_PATH = ROOT / "index.html"
RESULTS_DIR = ROOT / "results"
VIEWER_DATA_PATH = RESULTS_DIR / "viewer_data.json"
CLF_PATH = RESULTS_DIR / "switch_xgb_clf.json"
REG_PATH = RESULTS_DIR / "switch_xgb_reg.json"

ALLOWED_MODELS = {
    "gemini-4-argon": "gemini-4-argon",
    "gemini-3.8-flash": "gemini-3.8-flash",
    "gemini-3.5-flash": "gemini-3.5-flash",
    "gemini-2.5-flash": "gemini-4-argon",
    "gemini-2.5-pro": "gemini-4-argon",
}

_XGB_CLF = None
_XGB_REG = None


def get_xgb_models():
    global _XGB_CLF, _XGB_REG
    if _XGB_CLF is None and CLF_PATH.exists():
        clf = XGBClassifier()
        clf.load_model(str(CLF_PATH))
        _XGB_CLF = clf
    if _XGB_REG is None and REG_PATH.exists():
        reg = XGBRegressor()
        reg.load_model(str(REG_PATH))
        _XGB_REG = reg
    return _XGB_CLF, _XGB_REG


def load_env():
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes, ctype: str = "application/json; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            self._send(200, HTML_PATH.read_bytes(), "text/html; charset=utf-8")
        elif path in ("/api/health", "/api/status"):
            has_gemini = bool(os.environ.get("GEMINI_API_KEY"))
            has_ag = bool(os.environ.get("ALPHAGENOME_API_KEY"))
            has_data = VIEWER_DATA_PATH.exists()
            self._send(200, json.dumps({
                "gemini": has_gemini,
                "alphagenome": has_ag,
                "has_key": has_gemini,
                "has_alphagenome_key": has_ag,
                "has_viewer_data": has_data,
                "default_model": "gemini-4-argon",
            }).encode())
        elif path == "/api/data":
            if VIEWER_DATA_PATH.exists():
                self._send(200, VIEWER_DATA_PATH.read_bytes(), "application/json; charset=utf-8")
            else:
                self._send(404, b'{"error":{"message":"results/viewer_data.json not found"}}')
        elif path.startswith("/results/"):
            rel = path[len("/results/"):]
            target = (RESULTS_DIR / rel).resolve()
            if str(target).startswith(str(RESULTS_DIR.resolve())) and target.is_file():
                ctype = "image/png" if target.suffix.lower() == ".png" else "application/json; charset=utf-8"
                self._send(200, target.read_bytes(), ctype)
            else:
                self._send(404, b'{"error":"not found"}')
        else:
            self._send(404, b'{"error":"not found"}')

    def do_POST(self):
        if self.path == "/api/alphagenome":
            self._handle_alphagenome()
            return
        if self.path == "/api/predict_switch":
            self._handle_predict_switch()
            return
        if self.path != "/api/gemini":
            self._send(404, b'{"error":"not found"}')
            return

        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            self._send(500, b'{"error":{"message":"GEMINI_API_KEY not set in .env"}}')
            return

        length = int(self.headers.get("Content-Length", 0))
        req_body = json.loads(self.rfile.read(length) or b"{}")
        raw_model = req_body.get("model", "gemini-4-argon")
        model = ALLOWED_MODELS.get(raw_model, "gemini-4-argon")
        gemini_payload = req_body.get("payload", req_body)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        upstream = urllib.request.Request(
            url,
            data=json.dumps(gemini_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(upstream, timeout=45) as resp:
                self._send(resp.status, resp.read())
        except urllib.error.HTTPError as e:
            self._send(e.code, e.read())
        except Exception as e:
            self._send(502, json.dumps({"error": {"message": str(e)}}).encode())

    def _handle_predict_switch(self):
        """Run our trained RetroSwitch-XGB classifier & regressor live on DNA + feature inputs."""
        length = int(self.headers.get("Content-Length", 0))
        req = json.loads(self.rfile.read(length) or b"{}")

        seq = str(req.get("dnaSequence", "TATAAAGGATAAATGAGTCAATGCAAATTTCCGGAA"))
        dist_kb = float(req.get("distKb", 2.0))
        div_pct = float(req.get("divPct", 8.0))
        ltr_len = float(req.get("ltrLenBp", max(len(seq), 450)))
        family = str(req.get("family", "LTR/ERV1"))
        h3k27ac = float(req.get("h3k27ac", 75.0))
        atac = float(req.get("atac", 70.0))
        contact = float(req.get("contact", 65.0))

        dna_feats = compute_dna_features(seq)
        lineage_motif = max(dna_feats["motifs"].values()) if dna_feats["motifs"] else 0.0
        tata_motif = dna_feats["motifs"].get("TATA_Inr (Promoter)", 0.0)

        x_vec = np.array([[
            dist_kb,
            div_pct,
            ltr_len,
            dna_feats["gc_pct"],
            dna_feats["cpg_oe"],
            dna_feats["kmer_entropy"],
            dna_feats["motif_density_per_kb"],
            lineage_motif,
            tata_motif,
            1.0 if "ERV1" in family else 0.0,
            1.0 if "MaLR" in family else 0.0,
            h3k27ac,
            atac,
            contact,
        ]], dtype=np.float32)

        clf, reg = get_xgb_models()
        if clf is not None and reg is not None:
            prob = float(clf.predict_proba(x_vec)[0, 1]) * 100.0
            pred_mag = float(np.clip(reg.predict(x_vec)[0], 0.0, 3.5))
            pred_log2fc = -pred_mag
        else:
            prob = 50.0
            pred_log2fc = -0.5

        self._send(200, json.dumps({
            "switchProbPct": round(prob, 1),
            "predLog2FC": round(pred_log2fc, 3),
            "predPctDrop": round((1.0 - 2.0 ** pred_log2fc) * 100.0, 1),
            "dnaFeatures": dna_feats,
        }).encode())

    def _handle_alphagenome(self):
        length = int(self.headers.get("Content-Length", 0))
        req_body = json.loads(self.rfile.read(length) or b"{}")
        locus_id = req_body.get("locusId", "LTR_001_ERVW1")
        tissue = req_body.get("tissue", "Placenta (UBERON:0001987)")
        mode = req_body.get("mode", "KO")

        if not VIEWER_DATA_PATH.exists():
            self._send(404, b'{"error":{"message":"results/viewer_data.json not found"}}')
            return

        t0 = time.time()
        vdata = json.loads(VIEWER_DATA_PATH.read_text(encoding="utf-8"))
        locus = next((x for x in vdata["loci"] if x["id"] == locus_id), vdata["loci"][0])
        t_data = locus["tissues"].get(tissue) or next(iter(locus["tissues"].values()))
        elapsed_ms = round((time.time() - t0) * 1000.0, 1)

        self._send(200, json.dumps({
            "status": "ok",
            "model": vdata.get("model", "AlphaGenome 100KB"),
            "locusId": locus["id"],
            "gene": locus["gene"],
            "chrom": locus["chrom"],
            "start": locus["start"],
            "end": locus["end"],
            "ltrName": locus["ltrName"],
            "tissue": tissue,
            "mode": mode,
            "elapsedMs": elapsed_ms,
            "metrics": {
                "log2FC": t_data["log2FC"],
                "zScore": t_data["zScore"],
                "pVal": t_data["pVal"],
                "aluLog2FC": t_data["aluLog2FC"],
                "randLog2FC": t_data["randLog2FC"],
                "contactScoreWt": t_data["contactScoreWt"],
                "contactScoreKo": t_data["contactScoreKo"],
            },
            "tracks200": t_data.get("tracks200", {}),
            "mds3D": t_data.get("mds3D", {}),
            "contactGrid32": t_data.get("contactGrid32", {}),
        }).encode())


if __name__ == "__main__":
    load_env()
    print("Serving on http://localhost:8060")
    ThreadingHTTPServer(("127.0.0.1", 8060), Handler).serve_forever()
