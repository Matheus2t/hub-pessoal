from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import platform
import re
import shutil
import subprocess
from pathlib import Path

import psutil


def _run(args: list[str]) -> str | None:
    try:
        return subprocess.run(args, check=True, capture_output=True, text=True, timeout=8).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None


def collect() -> dict:
    nvidia = _run(["nvidia-smi"])
    gpu_query = _run(["nvidia-smi", "--query-gpu=name,driver_version,memory.total,memory.used,temperature.gpu", "--format=csv,noheader,nounits"])
    cuda_supported = re.search(r"CUDA Version:\s*([\d.]+)", nvidia or "")
    try:
        import onnxruntime as ort
        ort_data = {"version": ort.__version__, "available_providers": ort.get_available_providers()}
    except ImportError:
        ort_data = {"version": None, "available_providers": []}
    packages = {}
    for package in ("onnxruntime-gpu", "nvidia-cuda-runtime-cu13", "nvidia-cudnn-cu13", "nvidia-cublas-cu13", "onnxruntime"):
        try:
            packages[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            packages[package] = ort_data["version"] if package == "onnxruntime" else None
    return {
        "os": platform.platform(),
        "python": platform.python_version(),
        "cpu": platform.processor() or platform.machine(),
        "logical_cpu_count": os.cpu_count(),
        "ram_total_bytes": psutil.virtual_memory().total,
        "ram_available_bytes": psutil.virtual_memory().available,
        "nvidia_smi_query": gpu_query,
        "driver_cuda_compatibility_version": cuda_supported.group(1) if cuda_supported else None,
        "nvcc_available": shutil.which("nvcc") is not None,
        "cuda_path_configured": bool(os.environ.get("CUDA_PATH")),
        "cudnn_home_configured": bool(os.environ.get("CUDNN_HOME")),
        "onnxruntime": ort_data,
        "packages": packages,
        "notes": ["nvidia-smi CUDA version is driver compatibility, not proof that a CUDA toolkit or cuDNN is installed."],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Record non-sensitive local hardware and runtime capabilities.")
    parser.add_argument("--output", type=Path, help="optional JSON output; default prints to stdout")
    args = parser.parse_args()
    report = collect()
    serialized = json.dumps(report, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized, encoding="utf-8")
        print(f"hardware report written: {args.output}")
    else:
        print(serialized)


if __name__ == "__main__":
    main()
