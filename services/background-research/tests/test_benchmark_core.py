from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from evaluation.dataset import load_manifest
from evaluation.metrics import score
from evaluation import runner
from evaluation.summarize import summarize
from scripts.generate_synthetic import make_sample


def test_perfect_soft_matte_has_zero_error_and_perfect_binary_metrics():
    truth = np.zeros((24, 32), dtype=np.float32)
    truth[4:20, 8:25] = 1
    truth[5:7, 10:22] = 0.4
    result = score(truth, truth.copy())
    assert result["mae"] == 0
    assert result["mse"] == 0
    assert result["sad"] == 0
    assert result["iou@0.5"] == 1
    assert result["boundary_f1@2px"] == pytest.approx(1)


def test_alpha_accepts_byte_scale_and_detects_binary_error():
    gt = np.zeros((12, 12), dtype=np.uint8)
    gt[3:9, 3:9] = 255
    pred = np.zeros_like(gt)
    measured = score(pred, gt)
    assert measured["mae"] == pytest.approx(0.25)
    assert measured["iou@0.5"] == 0
    assert measured["f1@0.5"] == 0


def test_metric_rejects_different_shapes_and_nan():
    with pytest.raises(ValueError, match="shape mismatch"):
        score(np.zeros((4, 4)), np.zeros((5, 5)))
    invalid = np.zeros((2, 2), dtype=np.float32)
    invalid[0, 0] = np.nan
    with pytest.raises(ValueError, match="finite"):
        score(invalid, np.zeros((2, 2)))


def _write_item(root: Path, item_id: str = "sample-1") -> Path:
    (root / "images").mkdir(parents=True)
    (root / "masks").mkdir()
    image = Image.new("RGB", (20, 12), (80, 90, 100))
    mask = Image.new("L", (20, 12), 0)
    image.save(root / "images" / "input.png")
    mask.save(root / "masks" / "alpha.png")
    import hashlib
    image_hash = hashlib.sha256((root / "images" / "input.png").read_bytes()).hexdigest()
    mask_hash = hashlib.sha256((root / "masks" / "alpha.png").read_bytes()).hexdigest()
    manifest = {
        "schema_version": 1,
        "items": [{
            "id": item_id,
            "source": "synthetic unit fixture",
            "license": "CC0-1.0",
            "category": "unit",
            "image": "images/input.png",
            "ground_truth": "masks/alpha.png",
            "size": {"width": 20, "height": 12},
            "image_sha256": image_hash,
            "ground_truth_sha256": mask_hash,
        }],
    }
    path = root / "manifest.json"
    path.write_text(json.dumps(manifest), encoding="utf-8")
    return path


def test_manifest_verifies_hash_dimensions_and_metadata(tmp_path: Path):
    manifest = _write_item(tmp_path)
    assert load_manifest(manifest)[0]["id"] == "sample-1"


def test_manifest_rejects_path_traversal(tmp_path: Path):
    manifest = _write_item(tmp_path)
    data = json.loads(manifest.read_text())
    data["items"][0]["image"] = "../outside.png"
    manifest.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="escapes dataset root"):
        load_manifest(manifest, verify_hashes=False)


def test_manifest_rejects_changed_file_hash(tmp_path: Path):
    manifest = _write_item(tmp_path)
    (tmp_path / "images" / "input.png").write_bytes(b"changed")
    with pytest.raises(ValueError, match="image hash mismatch"):
        load_manifest(manifest)


def test_manifest_rejects_duplicate_ids(tmp_path: Path):
    manifest = _write_item(tmp_path)
    data = json.loads(manifest.read_text())
    data["items"].append(dict(data["items"][0]))
    data["items"][1]["image"] = "images/input.png"
    manifest.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="duplicate sample id"):
        load_manifest(manifest, verify_hashes=False)


def test_runner_writes_raw_rows_and_category_summary(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    data_root = tmp_path / "data"
    data_root.mkdir()
    manifest = _write_item(data_root)
    models = tmp_path / "models.json"
    models.write_text(json.dumps([{"id": "fake", "adapter": "fake"}]))

    class FakeAdapter:
        providers = ["CPUExecutionProvider"]

        def load(self):
            return None

        def predict(self, image):
            return np.zeros((image.height, image.width), dtype=np.float32)

    monkeypatch.setattr(runner, "create_adapter", lambda _spec: FakeAdapter())
    output = tmp_path / "out"
    rows = runner.run(manifest, models, output)
    assert len(rows) == 1
    assert rows[0]["status"] == "ok"
    assert rows[0]["provider"] == "CPUExecutionProvider"
    summary = json.loads((output / "summary.json").read_text())
    assert summary["fake"]["successful"] == 1
    assert summary["fake"]["by_category"]["unit"]["n"] == 1
    assert (output / "results.csv").is_file()


def test_summary_separates_categories_and_reports_percentiles():
    rows = [
        {"model_id":"a", "category":"real", "status":"ok", "inference_seconds":1.0, "mae":0.1},
        {"model_id":"a", "category":"synthetic", "status":"ok", "inference_seconds":3.0, "mae":0.3},
        {"model_id":"a", "category":"real", "status":"inference_error"},
    ]
    result = summarize(rows)["a"]
    assert result["successful"] == 2
    assert result["failed"] == 1
    assert result["median_seconds"] == 2.0
    assert result["by_category"]["real"]["n"] == 1
    assert result["by_category"]["synthetic"]["n"] == 1


def test_synthetic_generator_is_repeatable_and_has_exact_alpha_ground_truth(tmp_path: Path):
    import hashlib
    left, right = tmp_path / "left", tmp_path / "right"
    (left / "synthetic").mkdir(parents=True)
    (right / "synthetic").mkdir(parents=True)
    first = make_sample(left, 4)
    second = make_sample(right, 4)
    for key in ("image", "ground_truth"):
        a = hashlib.sha256((left / first[key]).read_bytes()).hexdigest()
        b = hashlib.sha256((right / second[key]).read_bytes()).hexdigest()
        assert a == b
    assert first["category"] == second["category"] == "synthetic-thin_geometry"
    assert first["license"] == "CC0-1.0; generated by benchmark script"
