import asyncio
import json
import subprocess
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError
from starlette.websockets import WebSocketDisconnect

from backend.app.call_signaling import CallSettings, create_app
from backend.app.call_turn import CloudflareTurn, TurnUnavailable
from test_call_signaling import KEY, activate, admit, guest, host, service, until

SITE = "https://matheus2t.com.br"
SIGNAL = "https://signal-test.onrender.com"
PRIVATE_TEST = "synthetic-owner-secret-for-hosted-unit-tests-only-0123456789abcdef"
CF_TOKEN = SecretStr("synthetic-cloudflare-provider-token-not-a-real-key-0123456789")
KEY_ID = "a" * 32
ICE = {"iceServers": [{"urls": ["stun:stun.cloudflare.com:3478"]},
                      {"urls": ["turn:turn.cloudflare.com:3478?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"],
                       "username": "temporary-test-user", "credential": "temporary-test-password"}]}


def hosted(monkeypatch, **kwargs):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv("RENDER_EXTERNAL_URL", SIGNAL)
    monkeypatch.delenv("VERCEL", raising=False)
    return CallSettings(admin_key=PRIVATE_TEST, proxy_mode="render", allowed_origins=SITE, **kwargs)


def test_hosted_health_cors_authorization_and_closed_surface(monkeypatch):
    settings = hosted(monkeypatch)
    with TestClient(create_app(settings), base_url=SIGNAL) as client:
        health = client.get("/call/health")  # Native provider probe need not have XFP.
        assert health.status_code == 200
        assert set(health.json()) == {"status", "mode", "media", "boot", "uptimeSeconds"}
        assert client.get("/call/health", headers={"origin": SITE}) .headers["access-control-allow-origin"] == SITE
        assert "access-control-allow-origin" not in client.get("/call/health", headers={"origin": "https://evil.example"}).headers
        headers = {"origin": SITE, "x-forwarded-proto": "https"}
        with client.websocket_connect(SIGNAL.replace("https:", "wss:") + "/call/ws", headers=headers) as socket:
            socket.send_json({"type": "create", "name": "Owner", "admin": PRIVATE_TEST})
            assert until(socket, "session")["host"]
        for path in ["/", "/.env", "/api/health", "/docs", "/backend/app/call_signaling.py", "/call-config.js"]:
            assert client.get(path, headers=headers).status_code == 404
        for origin in ["null", "https://evil.example", "http://matheus2t.com.br"]:
            with pytest.raises(WebSocketDisconnect):
                with client.websocket_connect(SIGNAL.replace("https:", "wss:") + "/call/ws", headers={**headers, "origin": origin}):
                    pass
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(SIGNAL.replace("https:", "wss:") + "/call/ws", headers={"origin": SITE}):
                pass


def test_render_limits_cannot_be_reset_with_forwarded_ips(monkeypatch):
    with TestClient(create_app(hosted(monkeypatch)), base_url=SIGNAL) as client:
        for n in range(6):
            with client.websocket_connect(SIGNAL.replace("https:", "wss:") + "/call/ws", headers={
                    "origin": SITE, "x-forwarded-proto": "https", "x-forwarded-for": f"203.0.113.{n}"}) as socket:
                socket.send_json({"type": "create", "name": "Owner", "admin": "legacy-invalid"})
                if n < 5:
                    assert until(socket, "session")["host"]
                else:
                    assert until(socket, "error")["code"] == "rate_limited"

def test_hosted_fails_closed_without_managed_host_or_new_secret(monkeypatch):
    monkeypatch.delenv("RENDER", raising=False)
    with pytest.raises(ValidationError):
        CallSettings(proxy_mode="render", admin_key=PRIVATE_TEST, allowed_origins=SITE)
    hosted(monkeypatch)
    for values in [{"public_origin": "https://wrong.example"}, {"admin_key": KEY}, {"allowed_origins": "*"}]:
        with pytest.raises(ValidationError) as error:
            CallSettings(proxy_mode="render", **{"admin_key": PRIVATE_TEST, "allowed_origins": SITE, **values})
        assert PRIVATE_TEST not in str(error.value)


@pytest.mark.parametrize("values", [
    {"turn_provider": "cloudflare"}, {"cloudflare_turn_key_id": KEY_ID},
    {"turn_provider": "cloudflare", "cloudflare_turn_key_id": KEY_ID, "cloudflare_turn_api_token": "short"},
    {"turn_provider": "none", "turn_urls": "turn:relay.example:3478", "turn_shared_secret": PRIVATE_TEST},
])
def test_turn_provider_selection_is_explicit(values):
    with pytest.raises(ValidationError):
        CallSettings(**values)


def test_cloudflare_contract_and_no_coturn_assumptions():
    def exchange(request):
        assert request.url.host == "rtc.live.cloudflare.com"
        assert request.url.path == f"/v1/turn/keys/{KEY_ID}/credentials/generate-ice-servers"
        assert request.headers["authorization"] == "Bearer " + CF_TOKEN.get_secret_value()
        assert json.loads(request.content) == {"ttl": 600}
        return httpx.Response(201, json=ICE)
    result = asyncio.run(CloudflareTurn(KEY_ID, CF_TOKEN, transport=httpx.MockTransport(exchange)).credentials(600))
    assert result == ICE["iceServers"]
    assert CF_TOKEN.get_secret_value() not in str(result)


@pytest.mark.parametrize("response", [
    httpx.Response(401, text="upstream-secret-must-not-be-logged"),
    httpx.Response(302, headers={"location": "https://evil.example"}),
    httpx.Response(201, text="x" * 33000), httpx.Response(201, json={"iceServers": []}),
    httpx.Response(201, json={"iceServers": [{"urls": ["turn:evil.example:3478"], "username": "u", "credential": "p"}]}),
    httpx.Response(201, json={"iceServers": [{"urls": ["turn:turn.cloudflare.com:3478"], "username": "u", "credential": CF_TOKEN.get_secret_value()}]}),
])
def test_cloudflare_errors_are_bounded_and_redacted(response):
    async def scenario():
        provider = CloudflareTurn(KEY_ID, CF_TOKEN, transport=httpx.MockTransport(lambda request: response))
        with pytest.raises(TurnUnavailable) as error:
            await provider.credentials(600)
        assert CF_TOKEN.get_secret_value() not in str(error.value)
        assert "upstream-secret" not in str(error.value)
    asyncio.run(scenario())


def test_cloudflare_requests_outside_room_lock_cached_and_not_sent_to_pending_guests(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    config = CallSettings(admin_key=KEY, turn_provider="cloudflare", cloudflare_turn_key_id=KEY_ID, cloudflare_turn_api_token=CF_TOKEN)
    app = create_app(config)
    count = []
    async def exchange(ttl):
        assert not app.state.rooms.lock.locked()
        count.append(ttl)
        await asyncio.sleep(.02)
        return ICE["iceServers"]
    app.state.rooms.turn.credentials = exchange
    with TestClient(app) as client:
        with client.websocket_connect("/call/ws", headers={"origin": "http://127.0.0.1:8001"}) as socket:
            socket.send_json({"type": "create", "name": "Owner", "admin": KEY})
            session = until(socket, "session")
            result = until(socket, "rtc_config")
            assert result["relayAvailable"] and result["turnExpires"] <= session["expires"]
            for _ in range(5):
                socket.send_json({"type": "rtc_config"})
                assert until(socket, "rtc_config") == result
            assert len(count) == 1


def test_cloudflare_failure_is_visible_and_has_retry_cooldown(monkeypatch, caplog):
    monkeypatch.delenv("VERCEL", raising=False)
    config = CallSettings(admin_key=KEY, turn_provider="cloudflare", cloudflare_turn_key_id=KEY_ID, cloudflare_turn_api_token=CF_TOKEN)
    app, calls = create_app(config), []
    async def unavailable(ttl):
        calls.append(ttl)
        raise TurnUnavailable("safe")
    app.state.rooms.turn.credentials = unavailable
    with TestClient(app) as client:
        with client.websocket_connect("/call/ws", headers={"origin": "http://127.0.0.1:8001"}) as socket:
            socket.send_json({"type": "create", "name": "Owner", "admin": KEY})
            until(socket, "session")
            assert until(socket, "error")["code"] == "turn_unavailable"
            assert until(socket, "rtc_config")["relayError"]
            socket.send_json({"type": "rtc_config"})
            assert not until(socket, "rtc_config")["relayAvailable"]
            assert len(calls) == 1
    assert "turn_credential_unavailable" in caplog.text
    assert CF_TOKEN.get_secret_value() not in caplog.text


@pytest.mark.parametrize("endpoint", ["wss://signal.example/call/ws", "", "ws://signal.example/call/ws", "wss://user:secret@signal.example/call/ws", "wss://signal.example/call/ws?secret=x"])
def test_public_build_config_preserves_csp_and_never_accepts_secret_urls(tmp_path, endpoint):
    source = '<meta content="connect-src \'self\' https://financial.example; script-src \'self\'">'
    (tmp_path / "index.html").write_text(source)
    script = "require('./scripts/build-call-config.cjs').configure(process.argv[1],process.argv[2])"
    result = subprocess.run(["node", "-e", script, str(tmp_path), endpoint], capture_output=True, text=True)
    valid = not endpoint or endpoint.startswith("wss://signal.example/call/ws") and "?" not in endpoint
    assert (result.returncode == 0) == valid
    if valid:
        content = (tmp_path / "index.html").read_text()
        assert "https://financial.example" in content and "script-src 'self'" in content
        if endpoint:
            assert "wss://signal.example https://signal.example" in content
        else:
            assert content == source
