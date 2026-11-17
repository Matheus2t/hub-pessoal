from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1] / "data")
    args = parser.parse_args()
    rows = []
    for metadata_path in sorted(args.root.rglob("*-items.json")):
        rows.extend(json.loads(metadata_path.read_text(encoding="utf-8")))
    final = []
    for item in rows:
        image_path = args.root / item["image"]
        mask_path = args.root / item["ground_truth"]
        with Image.open(image_path) as im, Image.open(mask_path) as gt:
            size = ImageOps.exif_transpose(im).size
            if size != gt.size:
                raise SystemExit(f"dimension mismatch for {item['id']}")
        final.append({
            **item,
            "size": {"width": size[0], "height": size[1]},
            "image_sha256": sha(image_path),
            "ground_truth_sha256": sha(mask_path),
        })
    final.sort(key=lambda row: row["id"])
    ids = [row["id"] for row in final]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate sample IDs")
    payload = {
        "schema_version": 1,
        "name": "2T Background Removal Research Set",
        "created_by": "scripts/build_manifest.py",
        "usage": "Local research evaluation only. Third-party images are not redistributed by this repository.",
        "counts_by_category": {key: sum(row["category"] == key for row in final) for key in sorted({r["category"] for r in final})},
        "items": final,
    }
    destination = args.root / "manifest.json"
    destination.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"manifest contains {len(final)} verified samples at {destination}")


if __name__ == "__main__":
    main()
