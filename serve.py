"""Serve index.html and proxy Gemini calls using GEMINI_API_KEY from .env.

Run:  python serve.py   then open http://localhost:8050
The key stays server-side; the browser only talks to /api/gemini.
"""
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
MODEL = os.environ.get("GEMINI_MODEL", "gemini-4-argon")


def load_env():
    for line in (ROOT / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/status":
            body = json.dumps({"gemini": bool(os.environ.get("GEMINI_API_KEY")), "model": MODEL})
            return self._send(200, body.encode())
        if self.path in ("/", "/index.html"):
            return self._send(200, (ROOT / "index.html").read_bytes(), "text/html; charset=utf-8")
        self._send(404, b"not found", "text/plain")

    def do_POST(self):
        if self.path != "/api/gemini":
            return self._send(404, b"not found", "text/plain")
        payload = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
        req = urllib.request.Request(
            url, data=payload, method="POST",
            headers={"Content-Type": "application/json", "x-goog-api-key": os.environ.get("GEMINI_API_KEY", "")},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                self._send(r.status, r.read())
        except urllib.error.HTTPError as e:
            self._send(e.code, e.read())
        except Exception as e:  # network failure etc.
            self._send(502, json.dumps({"error": {"message": str(e)}}).encode())


if __name__ == "__main__":
    load_env()
    print("Serving on http://localhost:8050")
    ThreadingHTTPServer(("127.0.0.1", 8050), Handler).serve_forever()
