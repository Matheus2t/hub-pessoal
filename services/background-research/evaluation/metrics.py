from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter


def _alpha(value: np.ndarray) -> np.ndarray:
    array = np.asarray(value, dtype=np.float32)
    if array.ndim == 3:
        array = array[..., 0]
    if array.size == 0 or not np.isfinite(array).all():
        raise ValueError("alpha must be a non-empty finite array")
    if array.max(initial=0) > 1.0:
        array = array / 255.0
    return np.clip(array, 0.0, 1.0)


def _binary_scores(pred: np.ndarray, truth: np.ndarray, threshold: float = 0.5) -> tuple[float, float, float]:
    p = pred >= threshold
    t = truth >= threshold
    tp = int(np.logical_and(p, t).sum())
    fp = int(np.logical_and(p, ~t).sum())
    fn = int(np.logical_and(~p, t).sum())
    precision = tp / (tp + fp) if tp + fp else (1.0 if fn == 0 else 0.0)
    recall = tp / (tp + fn) if tp + fn else (1.0 if fp == 0 else 0.0)
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1


def _boundary(mask: np.ndarray, radius: int = 2) -> np.ndarray:
    image = Image.fromarray((mask.astype(np.uint8) * 255), mode="L")
    kernel = radius * 2 + 1
    eroded = image.filter(ImageFilter.MinFilter(kernel))
    return np.asarray(image, dtype=np.uint8) > np.asarray(eroded, dtype=np.uint8)


def _dilate(mask: np.ndarray, radius: int = 2) -> np.ndarray:
    image = Image.fromarray((mask.astype(np.uint8) * 255), mode="L")
    dilated = image.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    return np.asarray(dilated, dtype=np.uint8) > 0


def score(prediction: np.ndarray, ground_truth: np.ndarray) -> dict[str, float]:
    """Return common soft-matte and binary-mask metrics; lower errors are better."""
    pred = _alpha(prediction)
    truth = _alpha(ground_truth)
    if pred.shape != truth.shape:
        raise ValueError(f"shape mismatch: {pred.shape} != {truth.shape}")
    error = pred - truth
    precision, recall, f1 = _binary_scores(pred, truth)
    pred_binary = pred >= 0.5
    truth_binary = truth >= 0.5
    union = int(np.logical_or(pred_binary, truth_binary).sum())
    intersection = int(np.logical_and(pred_binary, truth_binary).sum())
    pred_edge = _boundary(pred_binary)
    truth_edge = _boundary(truth_binary)
    edge_precision = (pred_edge & _dilate(truth_edge)).sum() / max(int(pred_edge.sum()), 1)
    edge_recall = (truth_edge & _dilate(pred_edge)).sum() / max(int(truth_edge.sum()), 1)
    edge_f1 = 2 * edge_precision * edge_recall / max(edge_precision + edge_recall, 1e-12)
    gy_p, gx_p = np.gradient(pred)
    gy_t, gx_t = np.gradient(truth)
    gradient_error = np.sqrt((gx_p - gx_t) ** 2 + (gy_p - gy_t) ** 2).mean()
    return {
        "mae": float(np.abs(error).mean()),
        "mse": float(np.square(error).mean()),
        "sad": float(np.abs(error).sum() / 1000.0),
        "precision@0.5": float(precision),
        "recall@0.5": float(recall),
        "f1@0.5": float(f1),
        "iou@0.5": float(intersection / union) if union else 1.0,
        "boundary_f1@2px": float(edge_f1),
        "gradient_mae": float(gradient_error),
    }
