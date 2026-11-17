from __future__ import annotations

import argparse
import hashlib
import json
import random
import time
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image
from io import BytesIO


API = "https://datasets-server.huggingface.co/rows?dataset=nobg%2FP3M-10K&config=default&split=P3M_500_P&offset={offset}&length={length}"
PERMANENT_SOURCE = "https://huggingface.co/datasets/nobg/P3M-10K"
LICENSE_URL = "https://jizhizili.github.io/files/p3m_dataset_agreement/P3M-10k_Dataset_Release_Agreement.pdf"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def get_json(url: str) -> dict:
    req = Request(url, headers={"User-Agent": "2T-background-research/1.0"})
    with urlopen(req, timeout=45) as response:
        return json.loads(response.read())


def get_asset(url: str) -> bytes:
    # Signed URLs are intentionally never printed, serialized, or persisted.
    req = Request(url, headers={"User-Agent": "2T-background-research/1.0"})
    with urlopen(req, timeout=90) as response:
        return response.read()


def main() -> None:
    parser = argparse.ArgumentParser(description="Download face-blurred P3M-500-P pairs for local evaluation.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1] / "data")
    parser.add_argument("--limit", type=int, default=40)
    parser.add_argument("--accept-p3m-terms", action="store_true", help="confirm reading the official dataset agreement")
    args = parser.parse_args()
    if not args.accept_p3m_terms:
        parser.error("read the P3M release agreement and pass --accept-p3m-terms before downloading")
    if not 1 <= args.limit <= 500:
        parser.error("limit must be between 1 and 500 (face-blurred P3M_500_P only)")
    out = args.root / "p3m-500-p"
    out.mkdir(parents=True, exist_ok=True)
    all_rows = []
    for offset in range(0, 500, 100):
        response = get_json(API.format(offset=offset, length=100))
        all_rows.extend(response.get("rows", []))
    # Deterministic sample distributed over the official 500-row validation split.
    rng = random.Random(2_025_011)
    pool = list(range(len(all_rows)))
    rng.shuffle(pool)
    chosen = sorted(pool[:args.limit])
    manifest = []
    for counter, position in enumerate(chosen, start=1):
        row = all_rows[position].get("row", {})
        image_field, mask_field = row.get("image"), row.get("mask")
        if not isinstance(image_field, dict) or not isinstance(mask_field, dict):
            continue
        # Do not put temporary signed URLs into IDs, manifests, logs, or errors.
        image_url, mask_url = image_field.get("src"), mask_field.get("src")
        if not image_url or not mask_url:
            continue
        sample_id = f"p3m-p-{position+1:03d}"
        try:
            image_bytes = get_asset(image_url)
            mask_bytes = get_asset(mask_url)
            with Image.open(BytesIO(image_bytes)) as im:
                im.verify()
            with Image.open(BytesIO(mask_bytes)) as gt:
                gt.verify()
            image_file = out / f"{sample_id}.jpg"
            mask_file = out / f"{sample_id}-alpha.png"
            image_file.write_bytes(image_bytes)
            mask_file.write_bytes(mask_bytes)
            with Image.open(image_file) as im, Image.open(mask_file) as gt:
                size = {"width": im.width, "height": im.height}
                if im.size != gt.size:
                    raise ValueError("dimension mismatch")
            manifest.append({
                "id": sample_id,
                "source": "P3M-10K face-blurred P3M_500_P validation split, accessed through public HF mirror",
                "source_id": f"P3M_500_P row {position+1}",
                "source_url": PERMANENT_SOURCE,
                "dataset_release_agreement": LICENSE_URL,
                "license": "P3M dataset agreement: MIT; original photo copyright remains with original owner; mirror does not expose per-photo license URL; research evaluation only, do not redistribute images",
                "category": "portrait-face-blurred",
                "image": f"p3m-500-p/{image_file.name}",
                "ground_truth": f"p3m-500-p/{mask_file.name}",
                "ground_truth_type": "continuous alpha matte",
                "size": size,
                "image_sha256": digest(image_bytes),
                "ground_truth_sha256": digest(mask_bytes),
                "dataset_position": position,
            })
            print(f"downloaded verified face-blurred pair {counter}/{args.limit} ({sample_id})")
        except Exception as exc:
            print(f"skipped {sample_id}: {type(exc).__name__}")
            for path in (out / f"{sample_id}.jpg", out / f"{sample_id}-alpha.png"):
                path.unlink(missing_ok=True)
        time.sleep(0.08)
    target = out / "p3m-items.json"
    target.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"saved metadata for {len(manifest)} verified pairs to {target}")


if __name__ == "__main__":
    main()
