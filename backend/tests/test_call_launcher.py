import json
import shutil
import socket
import subprocess
import time
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "2t-call.ps1"
STATE = ROOT / ".vercel" / "2t-call" / "session.json"
POWERSHELL = shutil.which("pwsh.exe") or shutil.which("powershell.exe")
pytestmark = pytest.mark.skipif(not POWERSHELL, reason="Windows PowerShell unavailable")


def shell(*args, timeout=20):
    return subprocess.run([POWERSHELL, "-NoProfile", *args], cwd=ROOT, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)


def test_launcher_syntax_and_default_external_guard():
    before = STATE.read_bytes() if STATE.exists() else None
    result = shell("-Command", "$e=$null;$t=$null;[Management.Automation.Language.Parser]::ParseFile((Join-Path $PWD 'scripts/2t-call.ps1'),[ref]$t,[ref]$e)|Out-Null;if($e.Count){exit 1}")
    assert result.returncode == 0, result.stderr
    for args in [("-Mode", "External"), ("-Mode", "External", "-ApproveExposure", "-Plan")]:
        result = shell("-File", str(SCRIPT), *args)
        assert result.returncode == 0, result.stderr
        assert "nenhum servidor ou tunel foi iniciado" in result.stdout
        assert (STATE.read_bytes() if STATE.exists() else None) == before


def test_tunnel_parser_and_pid_reuse_guard():
    result = shell("-Command", ". ./scripts/2t-call.ps1 -Plan; if((Get-CallTunnelOrigin 'URL https://example-name.trycloudflare.com') -ne 'https://example-name.trycloudflare.com'){exit 1};if(Get-CallTunnelOrigin 'https://evil.example'){exit 2};$p=Get-Process -Id $PID;try{Stop-CallRecordedProcess @{Id=$PID;Started='0';Executable=$p.Path;Kind='server'};exit 3}catch{Write-Output 'guard-preserved-process'}")
    assert result.returncode == 0, result.stderr
    assert "guard-preserved-process" in result.stdout


def credential_command(port):
    return ("$key=ConvertTo-SecureString 'test-only-owner-credential-not-for-production' -AsPlainText -Force; "
            f"& ./scripts/2t-call.ps1 -Mode Local -SkipBuild -Port {port} -Minutes 5 -OwnerCredential $key")


def test_launcher_refuses_occupied_port_without_stopping_other_service():
    if STATE.exists():
        pytest.skip("Existing owner session preserved")
    with socket.socket() as occupied:
        occupied.bind(("127.0.0.1", 0))
        occupied.listen()
        result = shell("-Command", credential_command(occupied.getsockname()[1]))
        assert result.returncode != 0
        assert occupied.getsockname()[1] > 0
        assert not STATE.exists()


def test_launcher_starts_and_stops_only_its_local_server():
    if STATE.exists():
        pytest.skip("Existing owner session preserved")
    if not (ROOT / "dist" / "bundle.js").exists():
        pytest.skip("Build the frontend first")
    with socket.socket() as reservation:
        reservation.bind(("127.0.0.1", 0))
        port = reservation.getsockname()[1]
    process = subprocess.Popen([POWERSHELL, "-NoProfile", "-Command", credential_command(port)], cwd=ROOT,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        deadline = time.monotonic() + 20
        healthy = False
        while time.monotonic() < deadline and process.poll() is None:
            try:
                healthy = httpx.get(f"http://127.0.0.1:{port}/call/health", timeout=1).status_code == 200
                if healthy:
                    break
            except httpx.HTTPError:
                pass
            time.sleep(.1)
        assert healthy, "Local launcher did not become ready"
        metadata = json.loads(STATE.read_text(encoding="utf-8-sig"))
        assert metadata["Mode"] == "Local"
        assert metadata["Origin"] == f"http://127.0.0.1:{port}"
        assert len(metadata["Processes"]) == 1 and metadata["Processes"][0]["Kind"] == "server"
        assert "credential" not in STATE.read_text().lower()
        stopped = shell("-File", str(SCRIPT), "-Mode", "Stop")
        assert stopped.returncode == 0, stopped.stderr
        process.communicate(timeout=10)
        assert not STATE.exists()
        with pytest.raises(httpx.HTTPError):
            httpx.get(f"http://127.0.0.1:{port}/call/health", timeout=1)
    finally:
        if STATE.exists():
            metadata = json.loads(STATE.read_text(encoding="utf-8-sig"))
            if metadata.get("Origin") == f"http://127.0.0.1:{port}":
                shell("-File", str(SCRIPT), "-Mode", "Stop")
        if process.poll() is None:
            process.terminate()
            process.communicate(timeout=10)
