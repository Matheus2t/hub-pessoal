import asyncio
import json
import sqlite3
from contextlib import ExitStack, contextmanager
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import call_channel_store as stores
from backend.app.call_signaling import CallSettings, create_app
from backend.tests.test_call_signaling import KEY, ORIGIN, activate, host, latest_presence, until


@contextmanager
def running(path: Path | None, clock=None):
    store = stores.SQLiteChannelStore(path) if path else None
    app = create_app(CallSettings(admin_key=KEY, max_rooms=1), clock or (lambda: 1800000000.0), channel_store=store)
    with TestClient(app) as client, ExitStack() as stack:
        def connect(message):
            socket = stack.enter_context(client.websocket_connect("/call/ws", headers={"origin": ORIGIN}))
            socket.send_json(message)
            return socket

        yield app, connect


def admin(connect, action, key=KEY, **fields):
    return connect({"type": "channel_admin", "action": action, "admin": key, **fields})


def join(connect, room, name, device, **proof):
    return connect({"type": "channel_join", "room": room, "name": name, "device": device, **proof})


def info(connect, room):
    return connect({"type": "channel_info", "room": room})


def test_persistent_definition_outlives_ttl_empty_channel_and_fresh_server(tmp_path):
    path = tmp_path / "channel.sqlite3"
    time = [1800000000.0]
    with running(path, lambda: time[0]) as (app, connect):
        assert until(admin(connect, "status"), "channel")["room"] is None
        channel = until(admin(connect, "create", name="Sala dos Amigos"), "channel")
        room = channel["room"]
        assert len(room) == 32 and channel["online"] == 0 and not app.state.rooms.rooms
        socket = join(connect, room, "Amiga", "A" * 43)
        session = until(socket, "session")
        assert session["approved"] and not session["host"] and session["mode"] == "channel"
        assert session["expires"] is None and session["invite"] is None
        assert not latest_presence(socket, 1)[0]["microphone"]
        time[0] += 86400
        socket.send_json({"type": "ping"})
        assert until(socket, "pong") == {"type": "pong"}
        socket.send_json({"type": "leave"})
        assert until(socket, "closed")["reason"] == "left"
        assert not app.state.rooms.rooms
        assert until(info(connect, room), "channel")["online"] == 0

    with running(path, lambda: time[0]) as (_, connect):
        assert until(info(connect, room), "channel") == {"type": "channel", "room": room, "name": "Sala dos Amigos", "online": 0}
        socket = join(connect, room, "Amiga", "A" * 43)
        assert until(socket, "session")["participant"] != session["participant"]
        assert until(admin(connect, "create", name="Outra"), "error")["code"] == "channel_exists"


def test_capacity_individual_exit_and_private_permission_boundaries(tmp_path):
    with running(tmp_path / "channel.sqlite3") as (app, connect):
        room = until(admin(connect, "create", name="Amigos"), "channel")["room"]
        owner, private = host(connect)
        assert until(join(connect, private["room"], "Intruso", "X" * 43), "error")["code"] == "channel_not_found"
        assert until(connect({"type": "join", "room": room, "name": "Intruso", "invite": private["invite"]}), "error")["code"] == "invalid_invite"
        people = [join(connect, room, f"Pessoa {i}", chr(65 + i) * 43) for i in range(5)]
        sessions = [until(socket, "session") for socket in people]
        assert all(s["approved"] and not s["host"] for s in sessions)
        assert len(latest_presence(people[0], 5)) == 5
        assert until(join(connect, room, "Sexto", "Z" * 43), "error")["code"] == "room_full"
        people[0].send_json({"type": "close"})
        assert until(people[0], "error")["code"] == "forbidden"
        people[0].send_json({"type": "admit", "target": sessions[1]["participant"]})
        assert until(people[0], "error")["code"] == "forbidden"
        owner.send_json({"type": "close"})
        assert until(owner, "closed")["reason"] == "host_closed"
        activate(people[0], sessions[0]["participant"])
        people[0].send_json({"type": "screen", "action": "claim", "request": "f" * 32})
        generation = until(people[0], "screen_granted")["generation"]
        people[0].send_json({"type": "screen", "action": "start", "request": "f" * 32, "generation": generation})
        for _ in range(10):
            screen = until(people[0], "presence")["screen"]
            if screen and screen["active"]:
                break
        else:
            pytest.fail("Screen share did not start")
        people[1].send_json({"type": "leave"})
        assert until(people[1], "closed")["reason"] == "left"
        assert len(latest_presence(people[0], 4)) == 4
        assert len(latest_presence(people[2], 4)) == 4
        assert app.state.rooms.rooms[room].screen.active
        people[0].send_json({"type": "ping"})
        until(people[0], "pong")


def test_moderation_persists_block_rename_and_rotation(tmp_path):
    path = tmp_path / "channel.sqlite3"
    with running(path) as (_, connect):
        assert until(admin(connect, "create", key="invalid", name="Fake"), "error")["code"] == "unauthorized"
        room = until(admin(connect, "create", name="Amigos"), "channel")["room"]
        a = join(connect, room, "Amiga", "A" * 43)
        a_id = until(a, "session")["participant"]
        b = join(connect, room, "Amigo", "B" * 43)
        b_id = until(b, "session")["participant"]
        assert "participants" not in until(info(connect, room), "channel")
        blocked = until(admin(connect, "block", target=a_id), "channel")
        assert blocked["online"] == 1 and len(blocked["blocked"]) == 1
        assert blocked["blocked"][0]["id"] != "A" * 43
        assert until(a, "closed")["reason"] == "channel_blocked"
        assert until(join(connect, room, "Outro nome", "A" * 43), "error")["code"] == "channel_blocked"
        assert until(admin(connect, "rename", name="Outro nome"), "channel")["room"] == room
        assert until(b, "channel")["name"] == "Outro nome"
        assert until(admin(connect, "kick", target=b_id), "channel")["online"] == 0
        assert until(b, "closed")["reason"] == "channel_kicked"
    with running(path) as (_, connect):
        assert until(join(connect, room, "Amiga", "A" * 43), "error")["code"] == "channel_blocked"
        unblock = until(admin(connect, "unblock", target=blocked["blocked"][0]["id"]), "channel")
        assert unblock["blocked"] == [] and unblock["name"] == "Outro nome"
        a = join(connect, room, "Amiga", "A" * 43)
        until(a, "session")
        new = until(admin(connect, "rotate"), "channel")["room"]
        assert new != room and until(a, "closed")["reason"] == "channel_rotated"
        assert until(info(connect, room), "error")["code"] == "channel_not_found"
        assert until(info(connect, new), "channel")["online"] == 0
    with running(path) as (_, connect):
        assert until(info(connect, room), "error")["code"] == "channel_not_found"
        assert until(info(connect, new), "channel")["name"] == "Outro nome"


def test_invalid_handshakes_entry_limits_and_disabled_store(tmp_path):
    with running(None) as (_, connect):
        assert until(admin(connect, "status"), "error")["code"] == "channel_unavailable"
        assert host(connect)[1]["host"] is True
    with running(tmp_path / "channel.sqlite3") as (_, connect):
        room = until(admin(connect, "create", name="Amigos"), "channel")["room"]
        assert until(connect({"type": "channel_join", "room": room, "name": "Test", "device": "A" * 43, "admin": KEY}), "error")["code"] == "invalid_message"
        for _ in range(18):
            assert until(join(connect, "f" * 32, "Tentativa", "A" * 43), "error")["code"] == "channel_not_found"
        assert until(join(connect, room, "Limitada", "A" * 43), "error")["code"] == "rate_limited"


def test_resume_requires_session_secret_and_has_independent_limit(tmp_path):
    with running(tmp_path / "channel.sqlite3") as (_, connect):
        room = until(admin(connect, "create", name="Amigos"), "channel")["room"]
        current = join(connect, room, "Amiga", "A" * 43)
        session = until(current, "session")
        resume = {"type": "resume", "room": room, "participant": session["participant"], "credential": session["credential"]}
        assert until(connect({**resume, "credential": "invalid"}), "error")["code"] == "unauthorized"
        for _ in range(8):
            previous, current = current, connect(resume)
            assert until(current, "session")["participant"] == session["participant"]
            assert until(previous, "closed")["reason"] == "replaced"
        assert until(connect(resume), "error")["code"] == "rate_limited"
        assert len(latest_presence(current, 1)) == 1


def test_d1_bound_parameters_and_explicit_failure(monkeypatch):
    requests = []
    failure = False

    def respond(request):
        requests.append(json.loads(request.content))
        assert request.url.host == "api.cloudflare.com"
        assert request.headers["authorization"] == "Bearer synthetic-token"
        if failure:
            return httpx.Response(429, json={"success": False, "errors": []})
        return httpx.Response(200, json={"success": True, "result": [{"success": True, "results": [{"definition": definition.model_dump_json()}]}]})

    definition = stores.ChannelDefinition(id="a" * 32, name="Amigos ' SQL", created_at=123)
    client_type = httpx.AsyncClient
    monkeypatch.setattr(stores.httpx, "AsyncClient", lambda **kw: client_type(**kw, transport=httpx.MockTransport(respond)))
    store = stores.D1ChannelStore("a" * 32, "b" * 36, "synthetic-token")
    assert asyncio.run(store.save(None, definition))
    assert requests == [{"sql": stores.INSERT, "params": [definition.model_dump_json()]}]
    failure = True
    with pytest.raises(stores.ChannelUnavailable):
        asyncio.run(store.read())


PASSWORD = "test-only-guest-passphrase"


def test_legacy_definition_is_protected_in_place_before_lobby_discovery(tmp_path):
    path = tmp_path / "channel.sqlite3"
    stores.SQLiteChannelStore(path)
    room = "d" * 32
    legacy = {"id": room, "name": "Sala existente", "created_at": 1780000000, "revision": 3, "blocked": {"b" * 64: "Blocked"}}
    with sqlite3.connect(path) as database:
        database.execute("INSERT INTO call_channel VALUES (1, ?)", [json.dumps(legacy)])
    database.close()

    with running(path) as (app, connect):
        lobby = TestClient(app).get("/call/lobby")
        assert lobby.status_code == 200 and lobby.headers["Cache-Control"] == "no-store"
        assert lobby.json() == {"type": "channel", "room": None, "name": "Sala existente", "online": 0, "setupRequired": True}
        original = join(connect, room, "Legado", "A" * 43)
        assert until(original, "session")["room"] == room
        for unsuitable in (KEY, "short", " " * 15):
            assert until(admin(connect, "password", password=unsuitable), "error")["code"] == "channel_password_policy"
        protected = until(admin(connect, "password", password=PASSWORD), "channel")
        assert protected["room"] == room and protected["requiresPassword"] is True
        assert until(original, "closed")["reason"] == "channel_password_changed"
        assert until(join(connect, room, "Guest", "A" * 43), "error")["code"] == "channel_password_required"
        public = TestClient(app).get("/call/lobby").json()
        assert public == {"type": "channel", "room": room, "name": "Sala existente", "online": 0, "requiresPassword": True}
    with sqlite3.connect(path) as database:
        raw = database.execute("SELECT definition FROM call_channel").fetchone()[0]
    database.close()
    assert PASSWORD not in raw and KEY not in raw
    persisted = json.loads(raw)
    assert persisted["password_hash"].startswith("$argon2id$")
    assert persisted["created_at"] == legacy["created_at"] and persisted["blocked"] == legacy["blocked"]


def test_password_attempts_are_limited_per_device_and_shared_address(tmp_path):
    with running(tmp_path / "channel.sqlite3") as (_, connect):
        room = until(admin(connect, "create", name="Sala", password=PASSWORD), "channel")["room"]
        for device, count in (("A", 5), ("B", 5), ("C", 2)):
            for _ in range(count):
                assert until(join(connect, room, "Guest", device * 43, password="incorrect"), "error")["code"] == "channel_bad_password"
            if device == "A":
                assert until(join(connect, room, "Guest", device * 43, password=PASSWORD), "error")["code"] == "rate_limited"
                valid = join(connect, room, "Guest", "D" * 43, password=PASSWORD)
                assert until(valid, "session")["approved"]
        assert until(join(connect, room, "Guest", "E" * 43, password=PASSWORD), "error")["code"] == "rate_limited"
        assert host(connect)[1]["host"] is True


def test_reentry_after_restart_is_bound_to_device_password_and_expiry(tmp_path):
    path = tmp_path / "channel.sqlite3"
    now = [1800000000.0]
    with running(path, lambda: now[0]) as (_, connect):
        room = until(admin(connect, "create", name="Sala", password=PASSWORD), "channel")["room"]
        socket = join(connect, room, "Guest", "A" * 43, password=PASSWORD)
        first = until(socket, "session")["reentry"]
        now[0] += 301
        socket.send_json({"type": "ping"})
        refreshed = until(socket, "channel_reentry")["proof"]
        assert refreshed != first
    now[0] += 600  # Initial proof expired. The refresh still authorizes reentry.
    with running(path, lambda: now[0]) as (_, connect):
        assert until(join(connect, room, "Guest", "A" * 43, reentry=first), "error")["code"] == "channel_password_required"
        assert until(join(connect, room, "Guest", "B" * 43, reentry=refreshed), "error")["code"] == "channel_password_required"
        socket = join(connect, room, "Guest", "A" * 43, reentry=refreshed)
        assert until(socket, "session")["room"] == room
        new_password = PASSWORD + "-updated"
        assert until(admin(connect, "password", password=new_password), "channel")["room"] == room
        assert until(socket, "closed")["reason"] == "channel_password_changed"
        assert until(join(connect, room, "Guest", "A" * 43, reentry=refreshed), "error")["code"] == "channel_password_required"
        assert until(join(connect, room, "Guest", "A" * 43, password=PASSWORD), "error")["code"] == "channel_bad_password"
        assert until(join(connect, room, "Guest", "A" * 43, password=new_password), "session")["approved"]
