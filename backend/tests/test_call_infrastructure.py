from contextlib import ExitStack

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from backend.app.call_boundary import https_origin
from backend.app.call_signaling import CallSettings, create_app
from test_call_signaling import KEY, until

PUBLIC = "https://call-check.example"
PROXY_HEADERS = {"cf-connecting-ip": "198.51.100.23", "x-forwarded-proto": "https"}


@pytest.fixture
def external_service(tmp_path, monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    (tmp_path / "index.html").write_text('<meta http-equiv="Content-Security-Policy" content="connect-src \'self\'">', encoding="utf8")
    (tmp_path / "bundle.js").write_text("/* fixture */", encoding="utf8")
    (tmp_path / "styles.css").write_text("/* fixture */", encoding="utf8")
    settings = CallSettings(admin_key=KEY, public_origin=PUBLIC, allowed_origins=PUBLIC,
                            proxy_mode="cloudflare", serve_frontend=True)
    app = create_app(settings, frontend_dir=tmp_path)
    peer = ["127.0.0.1"]

    async def connector(scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            scope = {**scope, "client": (peer[0], 12345), "scheme": "http"}
        await app(scope, receive, send)

    with TestClient(connector, base_url=PUBLIC) as client:
        yield client, app, peer


def test_public_https_assets_wss_csp_and_private_headers(external_service):
    client, _, _ = external_service
    page = client.get("/", headers=PROXY_HEADERS)
    assert page.status_code == 200
    assert "text/html" in page.headers["content-type"]
    assert "wss://call-check.example" in page.text
    assert page.headers["cache-control"] == "no-store"
    assert page.headers["referrer-policy"] == "no-referrer"
    assert page.headers["x-frame-options"] == "DENY"
    assert "camera=()" in page.headers["permissions-policy"]
    for asset in ["bundle.js", "styles.css"]:
        assert client.get(f"/{asset}", headers=PROXY_HEADERS).status_code == 200
    headers = {**PROXY_HEADERS, "origin": PUBLIC}
    with client.websocket_connect("wss://call-check.example/call/ws", headers=headers) as socket:
        socket.send_json({"type": "create", "name": "Host", "admin": KEY})
        assert until(socket, "session")["host"]


@pytest.mark.parametrize("path", ["/.env", "/api/health", "/financials/manifest.json", "/bundle.js.map", "/learn.js", "/docs", "/../backend/app/config.py"])
def test_public_surface_does_not_expose_other_modules(external_service, path):
    client, _, _ = external_service
    assert client.get(path, headers=PROXY_HEADERS).status_code == 404


def test_wrong_host_and_origin_are_rejected(external_service):
    client, _, _ = external_service
    assert client.get("/", headers={**PROXY_HEADERS, "host": "wrong.example"}).status_code == 403
    for origin in ["http://call-check.example", "https://evil.example", "null"]:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("wss://call-check.example/call/ws", headers={**PROXY_HEADERS, "origin": origin}):
                pass


def test_http_redirect_is_canonical_and_unencrypted_ws_is_refused(external_service):
    client, _, _ = external_service
    headers = {**PROXY_HEADERS, "x-forwarded-proto": "http", "x-forwarded-host": "evil.example"}
    response = client.get("/", headers=headers, follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == PUBLIC + "/"
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("wss://call-check.example/call/ws", headers={**headers, "origin": PUBLIC}):
            pass


@pytest.mark.parametrize("headers", [{}, {"x-forwarded-proto": "https"},
                                     {"cf-connecting-ip": "invalid", "x-forwarded-proto": "https"},
                                     {"cf-connecting-ip": "198.51.100.1,198.51.100.2", "x-forwarded-proto": "https"}])
def test_missing_or_invalid_connector_headers_fail_closed(external_service, headers):
    client, _, _ = external_service
    assert client.get("/call/health", headers=headers).status_code == 403


def test_proxy_headers_are_not_trusted_from_nonloopback(external_service):
    client, _, peer = external_service
    peer[0] = "203.0.113.77"
    assert client.get("/call/health", headers=PROXY_HEADERS).status_code == 403


def test_limiter_uses_connector_visitor_not_arbitrary_forwarded_for(external_service):
    client, _, _ = external_service
    with ExitStack() as stack:
        def connect(ip, forwarded):
            return stack.enter_context(client.websocket_connect("wss://call-check.example/call/ws", headers={
                **PROXY_HEADERS, "origin": PUBLIC, "cf-connecting-ip": ip, "x-forwarded-for": forwarded}))
        for n in range(5):
            socket = connect("198.51.100.1", f"203.0.113.{n}")
            socket.send_json({"type": "create", "name": "Host", "admin": "invalid"})
            assert until(socket, "error")["code"] == "unauthorized"
        socket = connect("198.51.100.1", "203.0.113.100")
        socket.send_json({"type": "create", "name": "Host", "admin": KEY})
        assert until(socket, "error")["code"] == "rate_limited"
        socket = connect("198.51.100.2", "203.0.113.100")
        socket.send_json({"type": "create", "name": "Host", "admin": KEY})
        assert until(socket, "session")["host"]


@pytest.mark.parametrize("origin", ["http://example.com", "https://user:password@example.com", "https://example.com/path",
                                    "https://*.example.com", "https://example.com?token=x", "https://example.com:0",
                                    "https://example.com:99999", "https://example.com'", "https://example.com#x"])
def test_public_origin_validation(origin):
    with pytest.raises(ValueError):
        https_origin(origin)


def test_public_configuration_rejects_unsafe_origin_and_redacts_errors():
    secret = "never-log-this-private-config-value-0123456789"
    with pytest.raises(ValidationError) as error:
        CallSettings(admin_key=secret, turn_shared_secret=secret, public_origin=PUBLIC)
    assert secret not in str(error.value)
    assert "input_value" not in str(error.value)
    with pytest.raises(ValidationError):
        CallSettings(proxy_mode="cloudflare")
