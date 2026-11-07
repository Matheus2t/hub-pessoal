import asyncio
from contextlib import ExitStack

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from backend.app.call_protocol import Handshake
from backend.app.call_signaling import CallSettings, Connection, Rejected, Rooms, create_app

KEY = "test-only-owner-credential-not-for-production"
ORIGIN = "http://127.0.0.1:8001"


@pytest.fixture
def service(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    clock = [1800000000.0]
    app = create_app(CallSettings(admin_key=KEY), lambda: clock[0])
    with TestClient(app) as client, ExitStack() as stack:
        def connect(message):
            socket = stack.enter_context(client.websocket_connect("/call/ws", headers={"origin": ORIGIN}))
            socket.send_json(message)
            return socket
        yield app, clock, client, connect


def until(socket, kind):
    for _ in range(50):
        message = socket.receive_json()
        if message["type"] == kind:
            return message
    raise AssertionError(f"No {kind} received")


def host(connect, name="Owner"):
    socket = connect({"type": "create", "name": name, "admin": KEY})
    return socket, until(socket, "session")


def guest(connect, session, name="Guest"):
    socket = connect({"type": "join", "room": session["room"], "invite": session["invite"], "name": name})
    return socket, until(socket, "session")


def admit(owner, visitor, session):
    owner.send_json({"type": "admit", "target": session["participant"]})
    until(visitor, "approved")


def activate(socket, participant):
    socket.send_json({"type": "media", "active": True, "microphone": False})
    for _ in range(40):
        people = until(socket, "presence")["participants"]
        own = next((p for p in people if p["id"] == participant), None)
        if own and own["voice"]:
            return own["voiceEpoch"]
    raise AssertionError("Voice not authorized")


def latest_presence(socket, expected, connected=None):
    for _ in range(40):
        message = until(socket, "presence")
        if len(message["participants"]) == expected and (connected is None or sum(p["connected"] for p in message["participants"]) == connected):
            return message["participants"]
    raise AssertionError("Roster did not converge")


def test_owner_authorization_and_no_public_listing(service):
    _, _, client, connect = service
    public_owner = connect({"type": "create", "name": "Guest"})
    public_session = until(public_owner, "session")
    assert public_session["host"] and public_session["approved"]
    owner, session = host(connect)
    assert len(session["invite"]) == len(session["credential"]) == 43
    assert session["invite"] != session["credential"]
    assert session["host"] and session["approved"]
    assert client.get("/call/rooms").status_code == 404
    assert client.get("/call/health").json()["media"] is False


@pytest.mark.parametrize("origin", [None, "http://evil.example", "null"])
def test_origin_is_required(service, origin):
    _, _, client, _ = service
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/call/ws", headers={"origin": origin} if origin else {}):
            pass


def test_tokens_not_accepted_in_socket_url(service):
    _, _, client, _ = service
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/call/ws?token=secret", headers={"origin": ORIGIN}):
            pass


def test_five_participants_sixth_rejected_and_presence(service):
    _, _, _, connect = service
    owner, session = host(connect)
    visitors = []
    for number in range(4):
        visitor, joined = guest(connect, session, f"Guest {number}")
        assert not joined["approved"] and not joined["host"]
        admit(owner, visitor, joined)
        visitors.append(visitor)
    for socket in [owner, *visitors]:
        people = latest_presence(socket, 5, 5)
        assert sum(p["host"] for p in people) == 1
        assert "credential" not in str(people) and "invite" not in str(people)
    sixth = connect({"type": "join", "room": session["room"], "invite": session["invite"], "name": "Sixth"})
    assert until(sixth, "error")["code"] == "room_full"


def test_invalid_and_expired_invites(service):
    _, clock, _, connect = service
    owner, session = host(connect)
    invalid = connect({"type": "join", "room": session["room"], "invite": "wrong", "name": "X"})
    assert until(invalid, "error")["code"] == "invalid_invite"
    clock[0] += 901
    expired = connect({"type": "join", "room": session["room"], "invite": session["invite"], "name": "X"})
    assert until(expired, "error")["code"] == "invalid_invite"
    owner.send_json({"type": "ping"})
    until(owner, "pong")


def test_room_expiration_and_empty_cleanup(service):
    app, clock, _, connect = service
    owner, session = host(connect)
    clock[0] += 3601
    owner.send_json({"type": "ping"})
    assert until(owner, "closed")["reason"] == "expired"
    assert session["room"] not in app.state.rooms.rooms


def test_host_only_admission_close_and_pending_permissions(service):
    app, _, _, connect = service
    owner, session = host(connect)
    visitor, joined = guest(connect, session)
    visitor.send_json({"type": "close"})
    assert until(visitor, "error")["code"] == "awaiting_approval"
    admit(owner, visitor, joined)
    visitor.send_json({"type": "close"})
    assert until(visitor, "error")["code"] == "forbidden"
    owner.send_json({"type": "close"})
    assert until(visitor, "closed")["reason"] == "host_closed"
    assert session["room"] not in app.state.rooms.rooms


def test_rejection_and_approval_expiry_release_reservations(service):
    app, clock, _, connect = service
    owner, session = host(connect)
    denied, joined = guest(connect, session)
    owner.send_json({"type": "reject", "target": joined["participant"]})
    assert until(denied, "closed")["reason"] == "rejected"
    waiting, joined = guest(connect, session)
    clock[0] += 61
    owner.send_json({"type": "ping"})
    assert until(waiting, "closed")["reason"] == "approval_expired"
    assert len(app.state.rooms.rooms[session["room"]].people) == 1


def test_isolation_and_directed_sdp_ice(service):
    _, _, _, connect = service
    owner, session = host(connect)
    other, other_session = host(connect, "Other owner")
    visitor, joined = guest(connect, session)
    admit(owner, visitor, joined)
    epoch = activate(owner, session["participant"])
    visitor_epoch = activate(visitor, joined["participant"])
    metadata = {"epoch": visitor_epoch, "targetEpoch": epoch,
                "roles": {"microphone": "0", "screenAudio": "1", "screenVideo": "2", "camera": "3"}}
    visitor.send_json({"type": "offer", "target": other_session["participant"], "sdp": "v=0\r\n", **metadata})
    assert until(visitor, "error")["code"] == "invalid_target"
    visitor.send_json({"type": "offer", "target": session["participant"], "sdp": "v=0\r\n", **metadata})
    offer = until(owner, "offer")
    assert offer == {"type": "offer", "from": joined["participant"], "sdp": "v=0\r\n", **metadata}
    owner.send_json({"type": "answer", "target": joined["participant"], "sdp": "v=0\r\nanswer", "epoch": epoch, "targetEpoch": visitor_epoch, "roles": metadata["roles"]})
    assert until(visitor, "answer")["from"] == session["participant"]
    owner.send_json({"type": "ice", "target": joined["participant"], "candidate": {"candidate": "candidate:test", "sdpMid": "0", "sdpMLineIndex": 0}, "epoch": epoch, "targetEpoch": visitor_epoch})
    assert until(visitor, "ice")["candidate"]["candidate"] == "candidate:test"
    other.send_json({"type": "ping"})
    until(other, "pong")


def test_leave_disconnect_resume_without_duplicate_and_replaced_connection(service):
    app, _, _, connect = service
    owner, session = host(connect)
    visitor, joined = guest(connect, session)
    admit(owner, visitor, joined)
    latest_presence(owner, 2, 2)
    visitor.close()
    latest_presence(owner, 2, 1)
    resume = {"type": "resume", "room": session["room"], "participant": joined["participant"], "credential": joined["credential"]}
    resumed = connect(resume)
    assert until(resumed, "session")["participant"] == joined["participant"]
    latest_presence(owner, 2, 2)
    replacement = connect(resume)
    assert until(resumed, "closed")["reason"] == "replaced"
    until(replacement, "session")
    assert len(app.state.rooms.rooms[session["room"]].people) == 2
    replacement.send_json({"type": "leave"})
    assert until(replacement, "closed")["reason"] == "left"
    latest_presence(owner, 1, 1)


def test_resume_cannot_use_invite_or_other_room_credentials(service):
    _, _, _, connect = service
    owner, session = host(connect)
    _, other_session = host(connect, "Other")
    for credential in [session["invite"], other_session["credential"]]:
        invalid = connect({"type": "resume", "room": session["room"], "participant": session["participant"], "credential": credential})
        assert until(invalid, "error")["code"] == "unauthorized"


def test_abandoned_host_expires_room_after_grace(service):
    app, clock, _, connect = service
    owner, session = host(connect)
    visitor, joined = guest(connect, session)
    admit(owner, visitor, joined)
    owner.close()
    latest_presence(visitor, 2, 1)
    # Give a mobile browser time to resume after a short screen lock.
    clock[0] += 21
    visitor.send_json({"type": "ping"})
    assert until(visitor, "pong")["type"] == "pong"
    clock[0] += 160
    visitor.send_json({"type": "ping"})
    assert until(visitor, "closed")["reason"] == "host_left"
    assert session["room"] not in app.state.rooms.rooms


@pytest.mark.parametrize("payload", [
    {"type": "ping", "from": "spoofed"}, {"type": "unknown"},
    {"type": "ice", "target": "a" * 32, "candidate": {"candidate": "x", "sdpMLineIndex": -1}},
    {"type": "offer", "target": "a" * 32, "sdp": "x" * 25000},
])
def test_invalid_messages_are_rejected(service, payload):
    _, _, _, connect = service
    owner, _ = host(connect)
    owner.send_json(payload)
    assert until(owner, "error")["code"] == "invalid_message"


def test_size_and_frequency_limits(service):
    _, _, _, connect = service
    owner, _ = host(connect)
    owner.send_text("x" * 33000)
    assert until(owner, "error")["code"] == "message_too_large"
    owner, _ = host(connect)
    for _ in range(121):
        owner.send_json({"type": "ping"})
        reply = until(owner, "pong") if _ < 120 else until(owner, "error")
    assert reply["code"] == "rate_limited"


def test_binary_frames_are_rejected_without_server_error(service):
    _, _, _, connect = service
    owner, _ = host(connect)
    owner.send_bytes(b"not a protocol message")
    assert until(owner, "error")["code"] == "invalid_message"


def test_creation_rate_limit(service):
    _, _, _, connect = service
    for _ in range(5):
        host(connect)
    extra = connect({"type": "create", "name": "Owner", "admin": KEY})
    assert until(extra, "error")["code"] == "rate_limited"


def test_concurrent_pending_reservations_are_atomic():
    async def scenario():
        rooms = Rooms(CallSettings(admin_key=KEY))
        connection = Connection()
        room, _ = await rooms.enter(Handshake.validate_python({"type": "create", "name": "Host", "admin": KEY}), connection, "local")
        session = connection.queue.get_nowait()
        async def join(n):
            try:
                await rooms.enter(Handshake.validate_python({"type": "join", "room": room, "invite": session["invite"], "name": str(n)}), Connection(), "local")
                return True
            except Rejected as error:
                assert error.code == "room_full"
                return False
        results = await asyncio.gather(*(join(n) for n in range(20)))
        assert sum(results) == 4
        assert len(rooms.rooms[room].people) == 5
    asyncio.run(scenario())


def test_heartbeat_timeout():
    with TestClient(create_app(CallSettings(admin_key=KEY, heartbeat_seconds=1))) as client:
        with client.websocket_connect("/call/ws", headers={"origin": ORIGIN}) as socket:
            socket.send_json({"type": "create", "name": "Host", "admin": KEY})
            until(socket, "session")
            assert until(socket, "closed")["reason"] == "timeout"


def test_disabled_without_key_or_on_vercel(monkeypatch):
    for settings, vercel in [(CallSettings(admin_key=None), ""), (CallSettings(admin_key=KEY), "1")]:
        monkeypatch.setenv("VERCEL", vercel)
        with TestClient(create_app(settings)) as client:
            with pytest.raises(WebSocketDisconnect):
                with client.websocket_connect("/call/ws", headers={"origin": ORIGIN}):
                    pass


def test_mobile_background_default_grace():
    # A locked browser may stop delivering JavaScript heartbeat messages.
    defaults = CallSettings.model_fields
    assert defaults["heartbeat_seconds"].default >= 60
    assert defaults["reconnect_seconds"].default >= 120
