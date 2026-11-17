from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _local_file(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    if path != root.resolve() and root.resolve() not in path.parents:
        raise ValueError(f"manifest path escapes dataset root: {relative}")
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def load_manifest(path: Path, verify_hashes: bool = True) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 1 or not isinstance(payload.get("items"), list):
        raise ValueError("unsupported or malformed dataset manifest")
    root = path.parent.resolve()
    seen: set[str] = set()
    for item in payload["items"]:
        required = {"id", "source", "license", "image", "ground_truth", "category"}
        missing = required - item.keys()
        if missing:
            raise ValueError(f"{item.get('id', '<unknown>')} missing {sorted(missing)}")
        if item["id"] in seen:
            raise ValueError(f"duplicate sample id: {item['id']}")
        seen.add(item["id"])
        image_path = _local_file(root, item["image"])
        mask_path = _local_file(root, item["ground_truth"])
        if verify_hashes:
            if item.get("image_sha256") != sha256(image_path):
                raise ValueError(f"image hash mismatch: {item['id']}")
            if item.get("ground_truth_sha256") != sha256(mask_path):
                raise ValueError(f"mask hash mismatch: {item['id']}")
        with Image.open(image_path) as im:
            im.verify()
        with Image.open(mask_path) as gt:
            gt.verify()
        with Image.open(image_path) as im, Image.open(mask_path) as gt:
            oriented = ImageOps.exif_transpose(im)
            if oriented.size != gt.size:
                raise ValueError(f"image/ground truth size mismatch: {item['id']}")
            recorded = item.get("size")
            if recorded and recorded != {"width": oriented.width, "height": oriented.height}:
                raise ValueError(f"recorded dimensions mismatch: {item['id']}")
    return payload["items"]


def open_pair(root: Path, item: dict[str, Any]) -> tuple[Image.Image, Image.Image]:
    with Image.open(_local_file(root, item["image"])) as im:
        image = ImageOps.exif_transpose(im).convert("RGB")
    with Image.open(_local_file(root, item["ground_truth"])) as gt:
        mask = gt.convert("L").copy()
    if image.size != mask.size:
        raise ValueError(f"image/ground truth size mismatch: {item['id']}")
    return image, mask
