#!/usr/bin/env python3
import json
import re
import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image

XLSX = Path("/tmp/iza-drive/Catalogo de Artículos sp.xlsx")
OUT_DIR = Path("/workspace/public/productos/catalogo")
MAP_PATH = Path("/workspace/data/catalogo-fotos.json")


def cell_texts(xml: str):
    """Yield (col, row, text) for inlineStr <t> cells."""
    for m in re.finditer(
        r'<c r="([A-Z]+)(\d+)"[^>]*t="inlineStr"[^>]*>\s*<is>\s*<r>\s*<t[^>]*>([^<]*)</t>',
        xml,
    ):
        yield m.group(1), int(m.group(2)), m.group(3)


def main():
    z = zipfile.ZipFile(XLSX)
    sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
    drawing = z.read("xl/drawings/drawing1.xml").decode("utf-8")

    by_row: dict[int, dict[str, str]] = {}
    for col, row, text in cell_texts(sheet):
        if not text.strip():
            continue
        by_row.setdefault(row, {})[col] = text.strip()

    claves: list[tuple[int, str]] = []
    for row, cols in by_row.items():
        if cols.get("B") == "Clave:" and cols.get("D"):
            claves.append((row, cols["D"]))
    claves.sort()
    print("claves", len(claves), flush=True)

    anchors = re.findall(
        r"<xdr:from><xdr:col>(\d+)</xdr:col>[\s\S]*?<xdr:row>(\d+)</xdr:row>[\s\S]*?r:embed=\"([^\"]+)\"",
        drawing,
    )
    print("anchors", len(anchors), flush=True)

    # clave rows are 7,17,27... image from-row sits in the 10-row card
    def sku_for_from_row(from_row: int) -> str | None:
        idx = (from_row - 3) // 10
        if 0 <= idx < len(claves):
            # prefer clave whose row is in the same 10-row block
            expected = 7 + 10 * idx
            for r, sku in claves:
                if r == expected:
                    return sku
            return claves[idx][1]
        # nearest
        best = None
        best_d = 10**9
        for r, sku in claves:
            d = abs(r - (from_row + 4))
            if d < best_d:
                best_d = d
                best = sku
        return best

    matched: dict[str, str] = {}
    for col, from_row, embed in ((int(a), int(b), c) for a, b, c in anchors):
        sku = sku_for_from_row(from_row)
        if sku and sku not in matched:
            matched[sku] = embed
    print("matched", len(matched), "330", matched.get("330"), "XC1092", matched.get("XC1092"), flush=True)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    mapping = {}
    ok = fail = 0
    names = set(z.namelist())
    for i, (sku, embed) in enumerate(matched.items(), 1):
        media_path = f"xl/media/{embed}"
        if media_path not in names:
            fail += 1
            continue
        raw = z.read(media_path)
        try:
            im = Image.open(BytesIO(raw)).convert("RGB")
            im.thumbnail((640, 640))
            safe = re.sub(r"[^a-zA-Z0-9_-]+", "_", sku)
            dest_name = f"{safe}.jpg"
            im.save(OUT_DIR / dest_name, "JPEG", quality=72)
            mapping[sku] = f"/productos/catalogo/{dest_name}"
            ok += 1
        except Exception as e:
            fail += 1
            if fail <= 8:
                print("fail", sku, e, flush=True)
        if i % 200 == 0:
            print("progress", i, "ok", ok, flush=True)

    MAP_PATH.write_text(json.dumps(mapping, ensure_ascii=False), encoding="utf-8")
    size = sum(p.stat().st_size for p in OUT_DIR.glob("*.jpg"))
    print("saved", ok, "fail", fail, "bytes", size, "map", len(mapping), flush=True)


if __name__ == "__main__":
    main()
