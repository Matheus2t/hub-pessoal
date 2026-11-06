"""Real control messages: media authorization, atomic screen leases and stale work."""
import asyncio

import pytest
from pydantic import ValidationError

from backend.app.call_protocol import Action, Handshake
from backend.app.call_signaling import CallSettings, Connection, Rooms
from test_call_signaling import KEY, activate, admit, guest, host, service, until

ROLES = {"microphone": "0", "screenAudio": "1", "screenVideo": "2", "camera": "3"}


def claim(socket, request="a" * 32, **extra):
    socket.send_json({"type": "screen", "action": "claim", "request": request, **extra})
    return until(socket, "screen_granted")


def control(socket, grant, action="start", **extra):
    socket.send_json({"type": "screen", "action": action, "request": grant["request"],
                      "generation": grant["generation"], **extra})


def screen(socket, predicate):
    for _ in range(50):
        result = until(socket, "presence")["screen"]
        if predicate(result):
            return result
    raise AssertionError("Screen state did not converge")


def test_screen_requires_approval_and_voice(service):
    _, _, _, connect = service
    owner, session = host(connect)
    visitor, joined = guest(connect, session)
    visitor.send_json({"type": "screen", "action": "claim", "request": "a" * 32})
    assert until(visitor, "error")["code"] == "awaiting_approval"
    admit(owner, visitor, joined)
    visitor.send_json({"type": "screen", "action": "claim", "request": "a" * 32})
    assert until(visitor, "screen_denied")["code"] == "voice_required"


def test_legacy_screen_stale_controls_camera_and_late_arrival(service):
    app, _, _, connect = service
    owner, session = host(connect)
    visitor, joined = guest(connect, session)
    admit(owner, visitor, joined)
    activate(owner, session["participant"])
    activate(visitor, joined["participant"])
    grant = claim(owner)
    control(owner, grant, audio=True)
    current = screen(visitor, lambda s: s and s["active"])
    assert current == {"owner": session["participant"], "generation": 1, "active": True, "audio": True}
    visitor.send_json({"type": "screen", "action": "claim", "request": "b" * 32})
    assert until(visitor, "screen_denied")["code"] == "screen_busy"
    control(visitor, grant, "release")
    assert until(visitor, "screen_denied")["code"] == "stale_screen"
    owner.send_json({"type": "media", "active": True, "microphone": False, "camera": True})
    room = app.state.rooms.rooms[session["room"]]
    screen(owner, lambda s: s and s["active"])
    assert room.people[session["participant"]].voice_epoch == 1
    assert room.screens[session["participant"]].audio  # Mic/camera do not change the screen's audio.
    late, late_session = guest(connect, session, "Late")
    admit(owner, late, late_session)
    assert screen(late, lambda s: s and s["active"]) == current
    control(owner, grant, "release")
    assert screen(visitor, lambda s: s is None) is None
    newer = claim(visitor, "b" * 32)
    assert newer["generation"] == 2
    control(owner, grant, "release")
    assert until(owner, "screen_denied")["code"] == "stale_screen"
    assert list(room.screens) == [joined["participant"]]


def test_parallel_leases_keep_legacy_projection_and_independent_cleanup(service):
    app, clock, _, connect = service
    owner, session = host(connect)
    first, first_session = guest(connect, session, "First")
    viewer, viewer_session = guest(connect, session, "Viewer")
    for socket, participant in [(first, first_session), (viewer, viewer_session)]:
        admit(owner, socket, participant)
        activate(socket, participant["participant"])
    activate(owner, session["participant"])
    primary = claim(owner)
    control(owner, primary, audio=True)
    assert screen(viewer, lambda share: share and share["active"])["owner"] == session["participant"]

    secondary = claim(first, parallel=True)
    control(first, secondary)
    for _ in range(30):
        presence = until(viewer, "presence")
        if len(presence["screens"]) == 2 and all(share["active"] for share in presence["screens"]):
            break
    else:
        pytest.fail("Two active shares did not reach the viewer")
    assert presence["screen"] == presence["screens"][0]
    assert [share["audio"] for share in presence["screens"]] == [True, False]
    assert screen(first, lambda share: share and share["owner"] == first_session["participant"] and share["active"])["generation"] == secondary["generation"]
    for socket, code in [(viewer, "screen_limit"), (first, "screen_busy")]:
        socket.send_json({"type": "screen", "action": "claim", "request": "b" * 32, "parallel": True})
        assert until(socket, "screen_denied")["code"] == code
    control(viewer, secondary, "release")
    assert until(viewer, "screen_denied")["code"] == "stale_screen"

    first.close()
    for _ in range(30):
        presence = until(viewer, "presence")
        if [share["owner"] for share in presence["screens"]] == [session["participant"]]:
            break
    else:
        pytest.fail("Disconnect did not release only the departing share")
    replacement = claim(viewer, "c" * 32, parallel=True)
    clock[0] += 46
    viewer.send_json({"type": "ping"})
    until(viewer, "pong")
    control(viewer, replacement)
    assert until(viewer, "screen_denied")["code"] == "stale_screen"
    remaining = app.state.rooms.rooms[session["room"]].screens
    assert list(remaining) == [session["participant"]]
    assert remaining[session["participant"]].active


@pytest.mark.parametrize("ending", ["leave", "disconnect", "voice", "replace", "expire"])
def test_sharer_cleanup_and_no_automatic_camera_restore(service, ending):
    app, clock, _, connect = service
    owner, session = host(connect)
    visitor, joined = guest(connect, session)
    admit(owner, visitor, joined)
    activate(visitor, joined["participant"])
    grant = claim(visitor)
    control(visitor, grant)
    screen(owner, lambda s: s and s["active"])
    visitor.send_json({"type": "media", "active": True, "microphone": False, "camera": True})
    until(visitor, "presence")
    if ending == "disconnect":
        visitor.close()
    elif ending == "replace":
        resumed = connect({"type": "resume", "room": session["room"], "participant": joined["participant"], "credential": joined["credential"]})
        until(resumed, "session")
    elif ending == "expire":
        clock[0] += 3601
        owner.send_json({"type": "ping"})
        assert until(owner, "closed")["reason"] == "expired"
        assert not app.state.rooms.rooms
        return
    elif ending == "voice":
        visitor.send_json({"type": "media", "active": False, "microphone": False, "camera": False})
    else:
        visitor.send_json({"type": "leave"})
    assert screen(owner, lambda s: s is None) is None
    room = app.state.rooms.rooms[session["room"]]
    if joined["participant"] in room.people:
        assert not room.people[joined["participant"]].camera


def test_picker_lease_expires_and_stale_start_cannot_revive_it(service):
    _, clock, _, connect = service
    owner, session = host(connect)
    activate(owner, session["participant"])
    old = claim(owner)
    clock[0] += 46
    owner.send_json({"type": "ping"})
    screen(owner, lambda s: s is None)
    control(owner, old)
    assert until(owner, "screen_denied")["code"] == "stale_screen"
    new = claim(owner, "b" * 32)
    assert new["generation"] == 2
    control(owner, old, "release")
    assert until(owner, "screen_denied")["code"] == "stale_screen"
    control(owner, new)
    clock[0] += 46
    owner.send_json({"type": "ping"})
    until(owner, "pong")
    # Only the picker lease expires; an active share follows room/session lifetime.


@pytest.mark.parametrize("payload", [
    {"type": "screen", "action": "start", "request": "a" * 32},
    {"type": "screen", "action": "claim", "request": "a" * 32, "generation": 1},
    {"type": "screen", "action": "release", "request": "a" * 32, "audio": True},
    {"type": "screen", "action": "claim", "request": "bad"},
    {"type": "offer", "target": "a" * 32, "epoch": 1, "targetEpoch": 1, "sdp": "v=0", "roles": {**ROLES, "camera": "2"}},
    {"type": "offer", "target": "a" * 32, "epoch": 1, "targetEpoch": 1, "sdp": "v=0", "roles": {**ROLES, "camera": "4\n"}},
])
def test_typed_media_messages_fail_closed(payload):
    with pytest.raises(ValidationError):
        Action.validate_python(payload)


@pytest.mark.parametrize(("parallel", "winners"), [(False, 1), (True, 2)])
def test_twenty_concurrent_claims_have_only_one_winner_per_available_slot(parallel, winners):
    async def scenario():
        rooms = Rooms(CallSettings(admin_key=KEY))
        connections = [Connection() for _ in range(5)]
        room_id, owner = await rooms.enter(Handshake.validate_python({"type": "create", "name": "Host", "admin": KEY}), connections[0], "local")
        session = connections[0].queue.get_nowait()
        people = [owner]
        for n in range(1, 5):
            _, person = await rooms.enter(Handshake.validate_python({"type": "join", "room": room_id, "invite": session["invite"], "name": str(n)}), connections[n], "local")
            people.append(person)
        room = rooms.rooms[room_id]
        for person in room.people.values():
            person.approved = person.voice = True
            while not person.connection.queue.empty():
                person.connection.queue.get_nowait()
        await asyncio.gather(*(rooms.action(room_id, people[n % 5], connections[n % 5], Action.validate_python({
            "type": "screen", "action": "claim", "request": f"{n:032x}", "parallel": parallel,
        })) for n in range(20)))
        messages = []
        for connection in connections:
            while not connection.queue.empty():
                messages.append(connection.queue.get_nowait())
        assert sum(m["type"] == "screen_granted" for m in messages) == winners
        assert sum(m["type"] == "screen_denied" for m in messages) == 20 - winners
        assert len(room.screens) == room.screen_generation == winners
    asyncio.run(scenario())


def test_watch_signal_relays_only_to_approved_voice_peer(service):
    _, _, _, connect = service
    owner, session = host(connect)
    guest_socket, joined = guest(connect, session)
    admit(owner, guest_socket, joined)
    activate(owner, session["participant"])
    activate(guest_socket, joined["participant"])
    payload = {"type": "watch", "target": session["participant"], "epoch": 1,
               "targetEpoch": 1, "enabled": False}
    guest_socket.send_json(payload)
    notice = until(owner, "watch")
    assert notice == {"type": "watch", "from": joined["participant"],
                      "epoch": 1, "targetEpoch": 1, "enabled": False}
    guest_socket.send_json({**payload, "enabled": True})
    assert until(owner, "watch")["enabled"] is True
    guest_socket.send_json({**payload, "targetEpoch": 2})
    assert until(guest_socket, "error")["code"] == "stale_voice"
    for invalid in [{"enabled": "no"}, {"enabled": 1}, {"target": joined["participant"]}]:
        try:
            Action.validate_python({**payload, **invalid})
        except ValidationError:
            pass
        else:
            if invalid.get("target") == joined["participant"]:
                guest_socket.send_json({**payload, **invalid})
                assert until(guest_socket, "error")["code"] == "invalid_target"
            else:
                raise AssertionError("Invalid subscription must be rejected")
