"""Embed the real 20-locus AlphaGenome dataset from `results/viewer_data.json`
into `index.html` so `index.html` works both via `python serve.py` and standalone.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML_PATH = ROOT / "index.html"
VIEWER_DATA_PATH = ROOT / "results" / "viewer_data.json"


def main():
    vdata = json.loads(VIEWER_DATA_PATH.read_text(encoding="utf-8"))
    html = HTML_PATH.read_text(encoding="utf-8")

    # Keep index.html lightweight (~350 KB) by embedding full tracks200/contactGrid32/mds3D
    # for each locus's primary tissue inline, while /api/data serves all 7 tissues' full arrays
    compact_loci = json.loads(json.dumps(vdata["loci"]))
    for loc in compact_loci:
        def_t = loc["defaultTissue"]
        for t_name, t_obj in loc["tissues"].items():
            if t_name != def_t:
                t_obj.pop("tracks200", None)
                t_obj.pop("contactGrid32", None)
                t_obj.pop("mds3D", None)

    nl = chr(10)
    loci_js = "const LOCI_DATA = " + json.dumps(compact_loci, separators=(",", ":")) + ";" + nl + nl
    heatmap_js = (
        "    const HEATMAP_FAMILIES = " + json.dumps(vdata["heatmapFamilies"], separators=(",", ":")) + ";" + nl
        + "    const HEATMAP_TISSUES = " + json.dumps(vdata["heatmapTissues"], separators=(",", ":")) + ";"
    )

    pattern = re.compile(
        r"const LOCI_DATA = \[.*?\];\s*(?:// Heatmap Summary Data.*?)?const HEATMAP_FAMILIES = \[.*?\];\s*const HEATMAP_TISSUES = \[.*?\];",
        re.DOTALL,
    )
    if not pattern.search(html):
        raise RuntimeError("Could not locate LOCI_DATA..HEATMAP_TISSUES block in index.html")

    updated = pattern.sub(lambda _: loci_js + heatmap_js, html, count=1)
    HTML_PATH.write_text(updated, encoding="utf-8")
    print(f"Embedded {len(vdata['loci'])} real AlphaGenome loci into {HTML_PATH.name} ({len(updated):,} bytes)")


if __name__ == "__main__":
    main()
