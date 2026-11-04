import base64
import hashlib
import hmac

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.call_signaling import CallSettings, create_app
from test_call_signaling import KEY, ORIGIN, activate, admit, guest, host, service, until


def test_stun_config_only_after_authorization(service):
    _, _, _, connect = service
    owner, session = host(connect)
    config = until(owner, "rtc_config")
    assert config["iceServers"] == [{"urls": "stun:stun.cloudflare.com:3478"}]
    assert not config["relayAvailable"] and config["turnExpires"] is None
    visitor, joined = guest(connect, session)
    visitor.send_json({"type": "rtc_config"})
    assert until(visitor, "error")["code"] == "awaiting_approval"
    admit(owner, visitor, joined)
    assert until(visitor, "rtc_config") == config


def test_temporary_turn_credential_is_scoped_and_refreshable(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    clock = [1800000000.0]
    secret = "server-only-test-secret-0123456789abcdef"
    settings = CallSettings(admin_key=KEY, turn_urls="turn:relay.example:3478?transport=udp,turns:relay.example:5349?transport=tcp", turn_shared_secret=secret)
    with TestClient(create_app(settings, lambda: clock[0])) as client:
        with client.websocket_connect("/call/ws", headers={"origin": ORIGIN}) as owner:
            owner.send_json({"type": "create", "name": "Host", "admin": KEY})
            session = until(owner, "session")
            config = until(owner, "rtc_config")
            turn = config["iceServers"][-1]
            assert config["relayAvailable"]
            assert config["turnExpires"] == clock[0] + 600
            assert turn["username"] == f"1800000600:{session['participant']}"
            expected = base64.b64encode(hmac.new(secret.encode(), turn["username"].encode(), hashlib.sha1).digest()).decode()
            assert turn["credential"] == expected
            assert secret not in str(config)
            clock[0] += 500
            owner.send_json({"type": "rtc_config"})
            refreshed = until(owner, "rtc_config")
            assert refreshed["turnExpires"] == clock[0] + 600
            assert refreshed["iceServers"][-1]["credential"] != expected
            clock[0] += 2900
            owner.send_json({"type": "rtc_config"})
            final = until(owner, "rtc_config")
            assert final["turnExpires"] == session["expires"]


@pytest.mark.parametrize("settings", [
    {"turn_urls": "turn:example.com:3478"}, {"turn_shared_secret": "x" * 32},
    {"stun_urls": "https://not-stun.example"},
    {"turn_urls": "turn:user:password@example.com", "turn_shared_secret": "x" * 32},
    {"turn_urls": "turn:example.com", "turn_shared_secret": "short"},
])
def test_invalid_ice_configuration_fails_closed(settings):
    with pytest.raises(ValidationError):
        CallSettings(**settings)


def test_media_authorization_and_epoch_changes(service):
    _, _, _, connect = service
    owner, session = host(connect)
    visitor, joined = guest(connect, session)
    visitor.send_json({"type": "media", "active": True, "microphone": True})
    assert until(visitor, "error")["code"] == "awaiting_approval"
    admit(owner, visitor, joined)
    owner.send_json({"type": "media", "active": False, "microphone": True})
    assert until(owner, "error")["code"] == "invalid_message"
    assert activate(owner, session["participant"]) == 1
    owner.send_json({"type": "media", "active": True, "microphone": True})
    while True:
        people = until(owner, "presence")["participants"]
        own = next(p for p in people if p["id"] == session["participant"])
        if own["microphone"]:
            assert own["voiceEpoch"] == 1
            break
    owner.send_json({"type": "media", "active": False, "microphone": False})
    assert activate(owner, session["participant"]) == 3


def test_stale_or_inactive_voice_cannot_signal(service):
    _, _, _, connect = service
    owner, session = host(connect)
    visitor, joined = guest(connect, session)
    admit(owner, visitor, joined)
    message = {"type": "offer", "target": joined["participant"], "epoch": 1, "targetEpoch": 1, "sdp": "v=0\r\n",
               "roles": {"microphone": "0", "screenAudio": "1", "screenVideo": "2", "camera": "3"}}
    owner.send_json(message)
    assert until(owner, "error")["code"] == "stale_voice"
    activate(owner, session["participant"])
    activate(visitor, joined["participant"])
    for metadata in [{"epoch": 2}, {"targetEpoch": 2}]:
        owner.send_json({**message, **metadata})
        assert until(owner, "error")["code"] == "stale_voice"
    owner.send_json(message)
    assert until(visitor, "offer")["from"] == session["participant"]


def test_resume_preserves_voice_epoch_and_microphone_state(service):
    _, _, _, connect = service
    owner, session = host(connect)
    activate(owner, session["participant"])
    owner.close()
    resumed = connect({"type": "resume", "room": session["room"], "participant": session["participant"], "credential": session["credential"]})
    until(resumed, "session")
    own = until(resumed, "presence")["participants"][0]
    assert own["voice"] and own["voiceEpoch"] == 1 and not own["microphone"]
