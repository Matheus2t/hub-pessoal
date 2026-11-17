from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


CC_BY_2 = "https://creativecommons.org/licenses/by/2.0/"
CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/"
ALLOWED_CATEGORIES = {"portraits", "hair", "animals", "products", "thin_geometry", "low_contrast", "transparency", "other"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _inside(root: Path, path: Path) -> str:
    root = root.resolve()
    path = path.resolve()
    if root != path and root not in path.parents:
        raise ValueError(f"asset is outside data root: {path.name}")
    return path.relative_to(root).as_posix()


def _find_image(folder: Path, image_id: str) -> Path | None:
    matches = sorted(path for path in folder.glob(f"{image_id}.*") if path.is_file())
    if len(matches) > 1:
        raise ValueError(f"multiple image files for Open Images ID {image_id}")
    return matches[0] if matches else None


def prepare_manifest(
    data_root: Path,
    metadata_csv: Path,
    segmentation_csv: Path,
    rights_review_csv: Path,
    output_path: Path,
    limit: int = 100,
) -> list[dict[str, Any]]:
    data_root = data_root.resolve()
    images_root, masks_root = data_root / "images", data_root / "masks"
    if limit < 1:
        raise ValueError("limit must be at least 1")
    reviews: dict[str, dict[str, str]] = {}
    with rights_review_csv.open(newline="", encoding="utf-8-sig") as stream:
        for row in csv.DictReader(stream):
            image_id = row.get("ImageID", "").strip()
            if not image_id:
                raise ValueError("rights review has a row without ImageID")
            if image_id in reviews:
                raise ValueError(f"duplicate rights-review ID: {image_id}")
            if row.get("LicenseVerified", "").strip().casefold() not in {"yes", "true", "1"}:
                continue
            if not row.get("VerifiedLandingURL", "").strip():
                raise ValueError(f"verified landing page is required: {image_id}")
            if row.get("Category", "").strip() not in ALLOWED_CATEGORIES:
                raise ValueError(f"unsupported manual category for {image_id}")
            reviews[image_id] = row

    metadata: dict[str, dict[str, str]] = {}
    with metadata_csv.open(newline="", encoding="utf-8-sig") as stream:
        for row in csv.DictReader(stream):
            image_id = row.get("ImageID", "").strip()
            if image_id in reviews:
                if row.get("License", "").strip() != CC_BY_2:
                    continue
                if row.get("OriginalLandingURL", "").strip() != reviews[image_id]["VerifiedLandingURL"].strip():
                    continue
                metadata[image_id] = row

    candidates: dict[str, tuple[float, dict[str, str]]] = {}
    with segmentation_csv.open(newline="", encoding="utf-8-sig") as stream:
        for row in csv.DictReader(stream):
            image_id = row.get("ImageID", "").strip()
            if image_id not in metadata:
                continue
            mask_name = Path(row.get("MaskPath", "")).name
            if not mask_name or not (masks_root / mask_name).is_file():
                continue
            try:
                quality = float(row.get("PredictedIoU", "0") or 0)
            except ValueError:
                quality = 0.0
            if not math.isfinite(quality):
                quality = 0.0
            if image_id not in candidates or quality > candidates[image_id][0]:
                candidates[image_id] = (quality, row)

    final: list[dict[str, Any]] = []
    for image_id in sorted(candidates):
        if len(final) >= limit:
            break
        photo = _find_image(images_root, image_id)
        if photo is None:
            continue
        quality, annotation = candidates[image_id]
        mask = masks_root / Path(annotation["MaskPath"]).name
        info, review = metadata[image_id], reviews[image_id]
        try:
            with Image.open(photo) as source:
                oriented = ImageOps.exif_transpose(source)
                raw_size = oriented.size
                rotation_text = (info.get("Rotation") or "").strip()
                rotation = int(float(rotation_text)) if rotation_text and rotation_text.casefold() != "nan" else 0
                if rotation not in {0, 90, 180, 270}:
                    raise ValueError(f"unsupported declared rotation for {image_id}: {rotation}")
                rotated = oriented.rotate(rotation, expand=True) if rotation else oriented
            with Image.open(mask) as mask_image:
                mask_oriented = ImageOps.exif_transpose(mask_image)
                if mask_oriented.size == raw_size:
                    mask_rotation = rotation
                elif mask_oriented.size == rotated.size:
                    mask_rotation = 0
                else:
                    raise ValueError(f"photo/mask dimensions do not align for {image_id}")
                if mask_rotation:
                    mask_oriented = mask_oriented.rotate(mask_rotation, expand=True)
                if mask_oriented.size != rotated.size:
                    raise ValueError(f"rotated photo/mask dimensions do not align for {image_id}")
        except (OSError, ValueError) as exc:
            raise ValueError(f"invalid official sample {image_id}: {exc}") from exc
        landing = info.get("OriginalLandingURL", "").strip()
        author = info.get("Author", "").strip()
        title = info.get("Title", "").strip()
        if not landing or not author:
            continue
        final.append({
            "id": f"openimages-{image_id}",
            "source": "Open Images V7 validation; original photograph credited to its listed creator",
            "evaluation_group": "photographic",
            "source_id": image_id,
            "source_url": landing,
            "license": CC_BY_2,
            "annotation_source_license": CC_BY_4,
            "attribution": {
                "creator": author,
                "title": title,
                "creator_profile_url": (info.get("AuthorProfileURL") or "").strip(),
                "landing_url": landing,
            },
            "rights_review": {
                "status": "individual-landing-page-reviewed",
                "reviewed_landing_url": review["VerifiedLandingURL"].strip(),
                "reviewed_at": review.get("ReviewedAt", "").strip() or None,
                "scope_note": "recorded CC BY 2.0 was checked against the individual landing page; not a legal opinion",
            },
            "category": review["Category"].strip(),
            "object_label_mid": annotation.get("LabelName", "").strip(),
            "annotation_predicted_iou": quality,
            "ground_truth_type": "binary_instance_mask",
            "task_scope": "single annotated object instance; not a continuous alpha matte or whole-scene removal reference",
            "image": _inside(data_root, photo),
            "ground_truth": _inside(data_root, mask),
            "rotation_degrees": rotation,
            "mask_rotation_degrees": mask_rotation,
            "size": {"width": rotated.width, "height": rotated.height},
            "image_sha256": sha256(photo),
            "ground_truth_sha256": sha256(mask),
        })
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps({
        "schema_version": 2,
        "name": "Open Images V7 individually reviewed instance-mask subset",
        "created_by": "scripts/import_openimages.py",
        "usage": "Local research only. Verify image-level license and separate publicity/privacy rights before any public redistribution.",
        "annotation_license": CC_BY_4,
        "items": final,
    }, indent=2), encoding="utf-8")
    return final


def main() -> None:
    base = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Import only locally held Open Images V7 items with human-reviewed per-image license metadata.")
    parser.add_argument("--data-root", type=Path, default=base / "data" / "openimages")
    parser.add_argument("--metadata", type=Path, required=True, help="official validation-images-with-rotation.csv")
    parser.add_argument("--segmentations", type=Path, required=True, help="official validation-annotations-object-segmentation.csv")
    parser.add_argument("--rights-review", type=Path, required=True, help="CSV with ImageID,LicenseVerified,VerifiedLandingURL,Category,ReviewedAt")
    parser.add_argument("--output", type=Path, default=base / "data" / "openimages" / "manifest.json")
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    items = prepare_manifest(args.data_root, args.metadata, args.segmentations, args.rights_review, args.output, args.limit)
    print(f"prepared {len(items)} individually reviewed mask samples at {args.output}")


if __name__ == "__main__":
    main()
