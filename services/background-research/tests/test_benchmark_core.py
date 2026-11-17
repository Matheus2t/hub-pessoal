from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from evaluation.dataset import load_manifest, open_pair, open_sample
from evaluation.metrics import score
from evaluation.paired import analyze_paired
from evaluation.adapters import RembgAdapter
from evaluation import runner
from evaluation.summarize import summarize
from scripts.generate_synthetic import make_sample
from scripts.import_openimages import CC_BY_2, prepare_manifest
from scripts import make_contact_sheet


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


def _write_item(root: Path, item_id: str = "sample-1", with_truth: bool = True) -> Path:
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
        "schema_version": 1 if with_truth else 2,
        "items": [{
            "id": item_id,
            "source": "synthetic unit fixture",
            "license": "CC0-1.0",
            "category": "unit",
            "image": "images/input.png",
            **({"ground_truth": "masks/alpha.png", "ground_truth_type": "continuous_alpha_matte"} if with_truth else {"ground_truth": None, "ground_truth_type": "none"}),
            "size": {"width": 20, "height": 12},
            "image_sha256": image_hash,
            **({"ground_truth_sha256": mask_hash} if with_truth else {}),
        }],
    }
    path = root / "manifest.json"
    path.write_text(json.dumps(manifest), encoding="utf-8")
    return path


def test_manifest_verifies_hash_dimensions_and_metadata(tmp_path: Path):
    manifest = _write_item(tmp_path)
    assert load_manifest(manifest)[0]["id"] == "sample-1"


def test_manifest_normalizes_legacy_reference_label_and_synthetic_group(tmp_path: Path):
    manifest = _write_item(tmp_path)
    data = json.loads(manifest.read_text())
    data["items"][0]["source"] = "2T deterministic procedural generator; no external image assets"
    data["items"][0]["ground_truth_type"] = "continuous alpha matte"
    manifest.write_text(json.dumps(data))
    item = load_manifest(manifest)[0]
    assert item["ground_truth_type"] == "continuous_alpha_matte"
    assert item["evaluation_group"] == "synthetic"


def test_manifest_accepts_visual_only_samples_but_open_pair_requires_truth(tmp_path: Path):
    manifest = _write_item(tmp_path, with_truth=False)
    item = load_manifest(manifest)[0]
    image, truth = open_sample(tmp_path, item)
    assert image.size == (20, 12)
    assert truth is None
    with pytest.raises(ValueError, match="no quantitative ground truth"):
        open_pair(tmp_path, item)


def test_manifest_rejects_ground_truth_path_type_mismatch(tmp_path: Path):
    manifest = _write_item(tmp_path, with_truth=False)
    payload = json.loads(manifest.read_text())
    payload["items"][0]["ground_truth_type"] = "binary_instance_mask"
    manifest.write_text(json.dumps(payload))
    with pytest.raises(ValueError, match="path/type mismatch"):
        load_manifest(manifest, verify_hashes=False)


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

    monkeypatch.setattr(runner, "create_adapter", lambda _spec, *_args: FakeAdapter())
    output = tmp_path / "out"
    rows = runner.run(manifest, models, output)
    assert len(rows) == 1
    assert rows[0]["status"] == "ok"
    assert rows[0]["provider"] == "CPUExecutionProvider"
    assert rows[0]["iou@0.5"] == 1
    summary = json.loads((output / "summary.json").read_text())
    assert summary["fake"]["successful"] == 1
    assert summary["fake"]["by_category"]["unit"]["n"] == 1
    assert (output / "results.csv").is_file()


def test_runner_keeps_photo_items_paired_and_omits_metrics_without_truth(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    data_root = tmp_path / "data"
    data_root.mkdir()
    manifest = _write_item(data_root, "visual-1", with_truth=False)
    models = tmp_path / "models.json"
    models.write_text(json.dumps([{"id": "fake", "adapter": "fake"}]))

    class FakeAdapter:
        providers = ["CPUExecutionProvider"]
        model_input_shape = [1, 3, 320, 320]

        def load(self):
            return None

        def predict(self, image):
            return np.ones((image.height, image.width), dtype=np.float32)

    monkeypatch.setattr(runner, "create_adapter", lambda _spec, *_args: FakeAdapter())
    output = tmp_path / "visual-run"
    rows = runner.run(manifest, models, output, sample_ids=["visual-1"])
    assert len(rows) == 1
    assert rows[0]["sample_id"] == "visual-1"
    assert rows[0]["metric_scope"] == "not_scored_no_ground_truth"
    assert "mae" not in rows[0]
    environment = json.loads((output / "run-environment.json").read_text())
    assert environment["paired_sample_ids"] == ["visual-1"]
    assert (output / "fake" / "cutouts" / "visual-1.png").is_file()


def test_package_version_falls_back_to_imported_module(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        runner.importlib.metadata,
        "version",
        lambda _name: (_ for _ in ()).throw(runner.importlib.metadata.PackageNotFoundError()),
    )
    monkeypatch.setattr(
        runner.importlib,
        "import_module",
        lambda _name: type("Module", (), {"__version__": "1.32.0"})(),
    )

    assert runner._package_version("onnxruntime") == "1.32.0"


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


def test_summary_separates_metric_reference_types():
    rows = [
        {"model_id": "a", "category": "x", "status": "ok", "metric_scope": "continuous_alpha_matte", "mae": 0.1},
        {"model_id": "a", "category": "x", "status": "ok", "metric_scope": "binary_instance_mask", "mae": 0.3},
    ]
    result = summarize(rows)["a"]
    assert result["by_reference_type"]["continuous_alpha_matte"]["n"] == 1
    assert result["by_reference_type"]["binary_instance_mask"]["n"] == 1


def test_summary_never_aggregates_synthetic_and_photographic_metrics():
    rows = [
        {"model_id": "a", "sample_id": "s", "evaluation_group": "synthetic", "category": "synthetic-hair", "status": "ok", "metric_scope": "continuous_alpha_matte", "mae": .1},
        {"model_id": "a", "sample_id": "p", "evaluation_group": "photographic", "category": "portraits", "status": "ok", "metric_scope": "continuous_alpha_matte", "mae": .9},
    ]
    result = summarize(rows)["a"]
    assert "mean_mae" not in result
    assert result["aggregate_metric_scope"]["aggregated"] is False
    assert result["by_evaluation_group"]["synthetic"]["mean_mae"] == pytest.approx(.1)
    assert result["by_evaluation_group"]["photographic"]["mean_mae"] == pytest.approx(.9)


def test_paired_analysis_uses_only_common_samples_and_marks_small_n_descriptive():
    rows = [
        {"model_id": "a", "sample_id": "1", "status": "ok", "boundary_f1@2px": .8},
        {"model_id": "a", "sample_id": "2", "status": "ok", "boundary_f1@2px": .7},
        {"model_id": "b", "sample_id": "1", "status": "ok", "boundary_f1@2px": .6},
        {"model_id": "b", "sample_id": "3", "status": "ok", "boundary_f1@2px": .5},
    ]
    result = analyze_paired(rows, "boundary_f1@2px", resamples=100)["comparisons"][0]
    assert result["paired_n"] == 1
    assert result["sample_ids"] == ["1"]
    assert result["mean_delta"] == pytest.approx(.2)
    assert "no significance claim" in result["interpretation_limit"]


def test_onnx_profile_counts_actual_provider_node_events(tmp_path: Path):
    trace = tmp_path / "trace.json"
    trace.write_text(json.dumps([
        {"cat": "Node", "args": {"provider": "CUDAExecutionProvider"}},
        {"cat": "Node", "args": {"provider": "CPUExecutionProvider"}},
        {"cat": "Session", "args": {"provider": "CUDAExecutionProvider"}},
    ]))

    class Inner:
        def end_profiling(self):
            return str(trace)

    adapter = RembgAdapter({"adapter": "rembg"}, profile_prefix=tmp_path / "profile")
    adapter.session = type("Session", (), {"inner_session": Inner()})()
    result = adapter.finish_profile()
    assert result["profile_node_events"] == 2
    assert result["provider_node_events"] == {"CUDAExecutionProvider": 1, "CPUExecutionProvider": 1}
    assert result["cuda_node_share"] == .5


def test_model_artifact_is_verified_only_when_expected_hash_and_size_match(tmp_path: Path):
    import hashlib

    cache = tmp_path / "models"
    cache.mkdir()
    artifact = cache / "candidate.onnx"
    artifact.write_bytes(b"expected model bytes")
    expected_hash = hashlib.sha256(artifact.read_bytes()).hexdigest()
    inventory = tmp_path / "artifacts.json"
    inventory.write_text(json.dumps({"artifacts": [{"id": "candidate", "artifact": "candidate.onnx", "bytes": artifact.stat().st_size, "sha256": expected_hash}]}))
    spec = {"id": "candidate", "weights_source": "https://example.test/candidate.onnx"}

    rows, name, expected_hash_recorded, verified, status = runner._model_artifacts(cache, spec, inventory)
    assert name == "candidate.onnx"
    assert expected_hash_recorded == expected_hash
    assert rows[0]["sha256"] == expected_hash
    assert verified is True and status == "verified"

    artifact.write_bytes(b"different bytes")
    _, _, _, verified, status = runner._model_artifacts(cache, spec, inventory)
    assert verified is False and status == "artifact_hash_or_size_mismatch"


def test_openimages_import_requires_individual_license_review_and_keeps_attribution(tmp_path: Path):
    data_root = tmp_path / "data"
    image_dir, mask_dir = data_root / "images", data_root / "masks"
    image_dir.mkdir(parents=True)
    mask_dir.mkdir()
    Image.new("RGB", (4, 2), (40, 50, 60)).save(image_dir / "abc.jpg")
    Image.new("L", (4, 2), 255).save(mask_dir / "abc_obj.png")
    metadata = tmp_path / "metadata.csv"
    metadata.write_text("ImageID,License,OriginalLandingURL,Author,Title,AuthorProfileURL,Rotation\nabc," + CC_BY_2 + ",https://example.test/photo,Creator,Title,https://example.test/creator,90\n", encoding="utf-8")
    segmentations = tmp_path / "segmentations.csv"
    segmentations.write_text("MaskPath,ImageID,LabelName,PredictedIoU\nabc_obj.png,abc,/m/person,0.9\n", encoding="utf-8")
    rights = tmp_path / "rights.csv"
    rights.write_text("ImageID,LicenseVerified,VerifiedLandingURL,Category,ReviewedAt\nabc,yes,https://example.test/photo,portraits,2026-11-17\n", encoding="utf-8")
    output = data_root / "manifest.json"
    items = prepare_manifest(data_root, metadata, segmentations, rights, output)
    assert len(items) == 1
    assert items[0]["ground_truth_type"] == "binary_instance_mask"
    assert items[0]["task_scope"].startswith("single annotated object")
    assert items[0]["attribution"]["creator"] == "Creator"
    loaded = load_manifest(output)
    image, mask = open_sample(data_root, loaded[0])
    assert image.size == mask.size == (2, 4)


def test_openimages_import_excludes_unverified_or_inconsistent_license_rows(tmp_path: Path):
    data_root = tmp_path / "data"
    (data_root / "images").mkdir(parents=True)
    (data_root / "masks").mkdir()
    Image.new("RGB", (4, 4)).save(data_root / "images" / "abc.jpg")
    Image.new("L", (4, 4), 255).save(data_root / "masks" / "mask.png")
    metadata = tmp_path / "metadata.csv"
    metadata.write_text("ImageID,License,OriginalLandingURL,Author,Title,AuthorProfileURL,Rotation\nabc," + CC_BY_2 + ",https://example.test/photo,Creator,Title,,0\n", encoding="utf-8")
    segmentations = tmp_path / "segmentations.csv"
    segmentations.write_text("MaskPath,ImageID,LabelName,PredictedIoU\nmask.png,abc,/m/object,1\n", encoding="utf-8")
    rights = tmp_path / "rights.csv"
    rights.write_text("ImageID,LicenseVerified,VerifiedLandingURL,Category\nabc,no,https://example.test/photo,products\n", encoding="utf-8")
    assert prepare_manifest(data_root, metadata, segmentations, rights, data_root / "manifest.json") == []


def test_blind_review_gallery_keeps_candidate_mapping_separate(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    data_root = tmp_path / "data"
    data_root.mkdir()
    manifest = _write_item(data_root, "visual-1", with_truth=False)
    run_dir = tmp_path / "run"
    mask_dir = run_dir / "u2net-baseline" / "masks"
    mask_dir.mkdir(parents=True)
    Image.new("L", (20, 12), 192).save(mask_dir / "visual-1.png")
    output = tmp_path / "review-gallery"
    monkeypatch.setattr("sys.argv", ["make_contact_sheet", "visual-1", "--manifest", str(manifest), "--run", str(run_dir), "--output", str(output)])
    make_contact_sheet.main()
    gallery = output / "visual-1-blind.png"
    sheet = output / "visual-1-scores.csv"
    key = tmp_path / "blind-keys" / "visual-1-key.json"
    assert gallery.is_file() and gallery.stat().st_size > 0
    assert sheet.is_file() and "u2net-baseline" not in sheet.read_text(encoding="utf-8")
    assert json.loads(key.read_text(encoding="utf-8"))["Candidate A"]["model_id"] == "u2net-baseline"


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
