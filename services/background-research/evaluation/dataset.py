from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

_GROUND_TRUTH_ALIASES = {
    "continuous alpha matte": "continuous_alpha_matte",
    "continuous_alpha_matte": "continuous_alpha_matte",
    "binary mask": "binary_mask",
    "binary_mask": "binary_mask",
    "binary instance mask": "binary_instance_mask",
    "binary_instance_mask": "binary_instance_mask",
    "none": "none",
}


def _evaluation_group(item: dict[str, Any]) -> str:
    explicit = str(item.get("evaluation_group", "")).strip()
    if explicit:
        return explicit
    source = str(item.get("source", "")).casefold()
    source_id = str(item.get("source_id", "")).casefold()
    if "deterministic procedural generator" in source or source_id.startswith("synthetic-seed-"):
        return "synthetic"
    if "open images" in source:
        return "photographic"
    return "unspecified"


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
    if payload.get("schema_version") not in {1, 2} or not isinstance(payload.get("items"), list):
        raise ValueError("unsupported or malformed dataset manifest")
    root = path.parent.resolve()
    seen: set[str] = set()
    for item in payload["items"]:
        required = {"id", "source", "license", "image", "category"}
        if payload["schema_version"] == 1:
            required.add("ground_truth")
        missing = required - item.keys()
        if missing:
            raise ValueError(f"{item.get('id', '<unknown>')} missing {sorted(missing)}")
        truth_path = item.get("ground_truth")
        truth_type_raw = item.get("ground_truth_type", "continuous_alpha_matte" if truth_path else "none")
        truth_type = _GROUND_TRUTH_ALIASES.get(str(truth_type_raw).strip().casefold(), str(truth_type_raw))
        if truth_type not in {"continuous_alpha_matte", "binary_mask", "binary_instance_mask", "none"}:
            raise ValueError(f"unsupported ground truth type for {item['id']}: {truth_type}")
        item["ground_truth_type"] = truth_type
        item["evaluation_group"] = _evaluation_group(item)
        if bool(truth_path) != (truth_type != "none"):
            raise ValueError(f"ground truth path/type mismatch: {item['id']}")
        if item["id"] in seen:
            raise ValueError(f"duplicate sample id: {item['id']}")
        seen.add(item["id"])
        image_path = _local_file(root, item["image"])
        mask_path = _local_file(root, truth_path) if truth_path else None
        if verify_hashes:
            if item.get("image_sha256") != sha256(image_path):
                raise ValueError(f"image hash mismatch: {item['id']}")
            if mask_path and item.get("ground_truth_sha256") != sha256(mask_path):
                raise ValueError(f"mask hash mismatch: {item['id']}")
        with Image.open(image_path) as im:
            im.verify()
        if mask_path:
            with Image.open(mask_path) as gt:
                gt.verify()
        with Image.open(image_path) as im:
            oriented = ImageOps.exif_transpose(im)
            rotation = int(item.get("rotation_degrees", 0) or 0)
            if rotation:
                oriented = oriented.rotate(rotation, expand=True)
            recorded = item.get("size")
            if recorded and recorded != {"width": oriented.width, "height": oriented.height}:
                raise ValueError(f"recorded dimensions mismatch: {item['id']}")
        if mask_path:
            with Image.open(mask_path) as gt:
                mask_oriented = ImageOps.exif_transpose(gt)
                mask_rotation = int(item.get("mask_rotation_degrees", rotation) or 0)
                if mask_rotation:
                    mask_oriented = mask_oriented.rotate(mask_rotation, expand=True)
                if oriented.size != mask_oriented.size:
                    raise ValueError(f"image/ground truth size mismatch: {item['id']}")
    return payload["items"]


def open_sample(root: Path, item: dict[str, Any]) -> tuple[Image.Image, Image.Image | None]:
    with Image.open(_local_file(root, item["image"])) as im:
        image = ImageOps.exif_transpose(im).convert("RGB")
    image_rotation = int(item.get("rotation_degrees", 0) or 0)
    if image_rotation:
        image = image.rotate(image_rotation, expand=True)
    truth_path = item.get("ground_truth")
    if not truth_path:
        return image, None
    with Image.open(_local_file(root, truth_path)) as gt:
        mask = ImageOps.exif_transpose(gt).convert("L")
        mask_rotation = int(item.get("mask_rotation_degrees", image_rotation) or 0)
        if mask_rotation:
            mask = mask.rotate(mask_rotation, expand=True)
        mask = mask.copy()
    if image.size != mask.size:
        raise ValueError(f"image/ground truth size mismatch: {item['id']}")
    return image, mask


def open_pair(root: Path, item: dict[str, Any]) -> tuple[Image.Image, Image.Image]:
    """Backward-compatible reader for callers that require quantitative ground truth."""
    image, mask = open_sample(root, item)
    if mask is None:
        raise ValueError(f"sample has no quantitative ground truth: {item['id']}")
    return image, mask
