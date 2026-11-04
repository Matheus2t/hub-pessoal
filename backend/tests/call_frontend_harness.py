"""TLS static frontend on a second origin, for real cross-origin WSS tests only."""
import json
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
dist = Path(__file__).resolve().parents[2] / "dist"
signal = os.environ.get("CALL_TEST_SIGNAL_URL", "wss://127.0.0.1:8443/call/ws")
assert signal == "wss://127.0.0.1:8443/call/ws", "Loopback fixture only"


@app.get("/", response_class=HTMLResponse)
def index():
    content = (dist / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(content.replace("connect-src 'self'", "connect-src 'self' https://127.0.0.1:8443 wss://127.0.0.1:8443"))


@app.get("/call-config.js")
def config():
    return Response("globalThis.__2T_CALL_SIGNAL_URL__=" + json.dumps(signal) + ";", media_type="application/javascript")


app.mount("/", StaticFiles(directory=dist))
