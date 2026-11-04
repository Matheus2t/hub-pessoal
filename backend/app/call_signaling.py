"""Single-process, ephemeral signaling. Deliberately NOT mounted in the production API."""
import asyncio
import hashlib
import os
import secrets
import time
from collections import deque
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass, field
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import Field, SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

from .call_protocol import Action, Create, Handshake, Join, Resume


class CallSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CALL_", extra="ignore")
    admin_key: SecretStr | None = None
    allowed_origins: str = "http://localhost:8001,http://127.0.0.1:8001"
    serve_frontend: bool = False
    room_seconds: int = Field(default=3600, ge=60, le=14400)
    invite_seconds: int = Field(default=900, ge=30, le=3600)
    reconnect_seconds: int = Field(default=20, ge=1, le=60)
    approval_seconds: int = Field(default=60, ge=1, le=120)
    heartbeat_seconds: int = Field(default=30, ge=1, le=120)
    max_rooms: int = Field(default=8, ge=1, le=32)


class Rejected(Exception):
    def __init__(self, code: str):
        self.code = code


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


@dataclass(eq=False)
class Connection:
    queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=64))
    closing: bool = False

    def send(self, message: dict):
        if not self.closing:
            try:
                self.queue.put_nowait(message)
            except asyncio.QueueFull:
                self.finish("slow_client")

    def finish(self, reason: str):
        if self.closing:
            return
        self.closing = True
        # Reserve space for a terminal event without blocking other rooms.
        while self.queue.qsize() > 62:
            self.queue.get_nowait()
        self.queue.put_nowait({"type": "closed", "reason": reason})
        self.queue.put_nowait(None)


@dataclass
class Participant:
    id: str
    name: str
    credential_hash: str = field(repr=False)
    connection: Connection | None = field(repr=False)
    approved: bool = True
    disconnected_at: float | None = None
    requested_at: float = 0


@dataclass
class Room:
    id: str
    host: str
    invite_hash: str = field(repr=False)
    expires: float
    invite_expires: float
    people: dict[str, Participant] = field(default_factory=dict)


class Rooms:
    def __init__(self, settings: CallSettings, clock=time.time):
        self.settings, self.clock = settings, clock
        self.rooms: dict[str, Room] = {}
        self.lock = asyncio.Lock()
        self.limits: dict[tuple[str, str], deque] = {}
        self.connections = 0

    def limit(self, category: str, key: str, maximum: int, seconds: int = 60):
        now = self.clock()
        # Bounded in-memory limiter; no untrusted proxy headers are used.
        for old in [k for k, v in self.limits.items() if not v or v[-1] <= now - 60]:
            del self.limits[old]
        if (category, key) not in self.limits and len(self.limits) >= 1024:
            raise Rejected("rate_limited")
        bucket = self.limits.setdefault((category, key), deque())
        while bucket and bucket[0] <= now - seconds:
            bucket.popleft()
        if len(bucket) >= maximum:
            raise Rejected("rate_limited")
        bucket.append(now)

    def close(self, room: Room, reason: str):
        self.rooms.pop(room.id, None)
        for person in room.people.values():
            if person.connection:
                person.connection.finish(reason)

    def sweep(self):
        now = self.clock()
        for room in list(self.rooms.values()):
            if now >= room.expires:
                self.close(room, "expired")
                continue
            changed = False
            for person in list(room.people.values()):
                lost = person.disconnected_at is not None and now - person.disconnected_at >= self.settings.reconnect_seconds
                waiting = not person.approved and now - person.requested_at >= self.settings.approval_seconds
                if lost or waiting:
                    if person.id == room.host:
                        self.close(room, "host_left")
                        break
                    if person.connection:
                        person.connection.finish("approval_expired" if waiting else "disconnected")
                    del room.people[person.id]
                    changed = True
            if room.id in self.rooms and changed:
                self.broadcast(room, "disconnected")

    def broadcast(self, room: Room, reason: str):
        people = [{"id": p.id, "name": p.name, "host": p.id == room.host,
                   "connected": p.connection is not None and not p.connection.closing}
                  for p in room.people.values() if p.approved]
        for person in room.people.values():
            if person.connection and person.approved:
                person.connection.send({"type": "presence", "participants": people, "reason": reason})
        host = room.people.get(room.host)
        if host and host.connection:
            host.connection.send({"type": "requests", "participants": [
                {"id": p.id, "name": p.name} for p in room.people.values() if not p.approved]})

    async def enter(self, message, connection: Connection, address: str):
        async with self.lock:
            self.sweep()
            invite = None
            now = self.clock()
            if isinstance(message, Create):
                self.limit("create", address, 5)
                key = self.settings.admin_key
                if not key or len(key.get_secret_value()) < 32 or not secrets.compare_digest(
                        digest(message.admin.get_secret_value()), digest(key.get_secret_value())):
                    raise Rejected("unauthorized")
                if len(self.rooms) >= self.settings.max_rooms:
                    raise Rejected("capacity")
                invite = secrets.token_urlsafe(32)
                room_id, participant_id = secrets.token_hex(16), secrets.token_hex(16)
                room = Room(room_id, participant_id, digest(invite), now + self.settings.room_seconds,
                            now + min(self.settings.invite_seconds, self.settings.room_seconds))
                self.rooms[room.id] = room
            else:
                room = self.rooms.get(message.room)
                if not room:
                    raise Rejected("invalid_invite" if isinstance(message, Join) else "session_expired")
            credential = None
            if isinstance(message, Resume):
                person = room.people.get(message.participant)
                if not person or not secrets.compare_digest(person.credential_hash, digest(message.credential.get_secret_value())):
                    raise Rejected("unauthorized")
                old = person.connection
                if old:
                    old.finish("replaced")
                person.connection, person.disconnected_at = connection, None
            else:
                if isinstance(message, Join):
                    if now >= room.invite_expires or not secrets.compare_digest(room.invite_hash, digest(message.invite.get_secret_value())):
                        raise Rejected("invalid_invite")
                    if len(room.people) >= 5:
                        raise Rejected("room_full")
                credential = secrets.token_urlsafe(32)
                person = Participant(secrets.token_hex(16) if isinstance(message, Join) else room.host,
                                     message.name.strip(), digest(credential), connection,
                                     approved=isinstance(message, Create), requested_at=now)
                if not person.name:
                    raise Rejected("invalid_message")
                room.people[person.id] = person
            connection.send({"type": "session", "room": room.id, "participant": person.id,
                             "credential": credential, "host": person.id == room.host,
                             "approved": person.approved, "invite": invite,
                             "expires": room.expires, "inviteExpires": room.invite_expires})
            self.broadcast(room, "reconnected" if isinstance(message, Resume) else "joined")
            return room.id, person.id

    async def action(self, room_id: str, person_id: str, connection: Connection, message):
        async with self.lock:
            self.sweep()
            room = self.rooms.get(room_id)
            person = room.people.get(person_id) if room else None
            if not room or not person or person.connection is not connection or connection.closing:
                raise Rejected("session_expired")
            if message.type == "ping":
                connection.send({"type": "pong"})
                return
            if message.type == "leave":
                if person_id == room.host:
                    self.close(room, "host_left")
                else:
                    del room.people[person_id]
                    connection.finish("left")
                    self.broadcast(room, "left")
                return
            if not person.approved:
                raise Rejected("awaiting_approval")
            if message.type in ("close", "admit", "reject"):
                if person_id != room.host:
                    raise Rejected("forbidden")
                if message.type == "close":
                    self.close(room, "host_closed")
                    return
                target = room.people.get(message.target)
                if not target or target.approved:
                    raise Rejected("invalid_target")
                if message.type == "admit":
                    target.approved = True
                    if target.connection:
                        target.connection.send({"type": "approved"})
                else:
                    if target.connection:
                        target.connection.finish("rejected")
                    del room.people[target.id]
                self.broadcast(room, "admitted" if message.type == "admit" else "rejected")
                return
            target = room.people.get(message.target)
            if not target or target.id == person_id or not target.approved or not target.connection or target.connection.closing:
                raise Rejected("invalid_target")
            payload = message.model_dump(exclude={"target"})
            payload["from"] = person_id  # Never accept a client-supplied sender or room.
            target.connection.send(payload)

    async def detach(self, room_id: str, person_id: str, connection: Connection):
        async with self.lock:
            room = self.rooms.get(room_id)
            person = room.people.get(person_id) if room else None
            if person and person.connection is connection:
                person.connection, person.disconnected_at = None, self.clock()
                self.broadcast(room, "disconnected")


def create_app(settings: CallSettings | None = None, clock=time.time) -> FastAPI:
    config = settings or CallSettings()
    rooms = Rooms(config, clock)

    @asynccontextmanager
    async def lifespan(app):
        async def reap():
            while True:
                await asyncio.sleep(1)
                async with rooms.lock:
                    rooms.sweep()
        task = asyncio.create_task(reap())
        yield
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        for room in list(rooms.rooms.values()):
            rooms.close(room, "server_stopped")

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.state.rooms = rooms

    @app.get("/call/health")
    async def health():
        return {"status": "ok", "mode": "single-process", "media": False}

    @app.websocket("/call/ws")
    async def websocket(socket: WebSocket):
        # This app cannot accidentally expose its RAM rooms on Vercel.
        if os.getenv("VERCEL") or not config.admin_key or len(config.admin_key.get_secret_value()) < 32:
            await socket.close(code=1008)
            return
        if socket.headers.get("origin") not in {s.strip() for s in config.allowed_origins.split(",")} or socket.url.query:
            await socket.close(code=1008)
            return
        connection, room_id, person_id = Connection(), None, None
        address = socket.client.host if socket.client else "unknown"
        try:
            async with rooms.lock:
                rooms.limit("upgrade", address, 30)
                if rooms.connections >= 128:
                    raise Rejected("capacity")
                rooms.connections += 1
        except Rejected:
            await socket.close(code=1008)
            return
        await socket.accept()

        async def read(adapter, timeout):
            frame = await asyncio.wait_for(socket.receive(), timeout)
            if frame["type"] == "websocket.disconnect":
                raise WebSocketDisconnect(frame.get("code", 1000))
            data = frame.get("text")
            if data is None:
                raise Rejected("invalid_message")
            if len(data.encode("utf-8")) > 32768:
                raise Rejected("message_too_large")
            try:
                return adapter.validate_json(data)
            except (ValidationError, ValueError):
                raise Rejected("invalid_message") from None

        async def write():
            while True:
                item = await connection.queue.get()
                if item is None:
                    await socket.close(code=1000)
                    return
                await asyncio.wait_for(socket.send_json(item), 5)

        async def receive():
            nonlocal room_id, person_id
            message = await read(Handshake, 8)
            room_id, person_id = await rooms.enter(message, connection, address)
            bucket = deque()
            while not connection.closing:
                message = await read(Action, config.heartbeat_seconds)
                now = clock()
                while bucket and bucket[0] < now - 10:
                    bucket.popleft()
                if len(bucket) >= 120:
                    raise Rejected("rate_limited")
                bucket.append(now)
                try:
                    await rooms.action(room_id, person_id, connection, message)
                except Rejected as error:
                    connection.send({"type": "error", "code": error.code})

        writer, reader = asyncio.create_task(write()), asyncio.create_task(receive())
        try:
            done, _ = await asyncio.wait({writer, reader}, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                task.result()
            if reader in done and not writer.done():
                await asyncio.wait_for(writer, 5)
        except Rejected as error:
            connection.send({"type": "error", "code": error.code})
            connection.finish(error.code)
            with suppress(Exception):
                await asyncio.wait_for(writer, 5)
        except asyncio.TimeoutError:
            connection.finish("timeout")
            with suppress(Exception):
                await asyncio.wait_for(writer, 5)
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            for task in (reader, writer):
                task.cancel()
            await asyncio.gather(reader, writer, return_exceptions=True)
            if room_id and person_id:
                await rooms.detach(room_id, person_id, connection)
            async with rooms.lock:
                rooms.connections -= 1

    if config.serve_frontend:
        dist = Path(__file__).resolve().parents[2] / "dist"

        @app.get("/", response_class=HTMLResponse)
        async def index(request: Request):
            origin = f"{request.url.scheme}://{request.url.netloc}"
            if origin not in {s.strip() for s in config.allowed_origins.split(",")}:
                return HTMLResponse("Origin not allowed", status_code=403)
            ws = origin.replace("https://", "wss://").replace("http://", "ws://")
            content = (dist / "index.html").read_text(encoding="utf-8")
            # Only this opt-in local server's HTML authorizes its exact WebSocket origin.
            return HTMLResponse(content.replace("connect-src 'self'", f"connect-src 'self' {ws}"),
                                headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})

        app.mount("/", StaticFiles(directory=dist, check_dir=False))
    return app


app = create_app()
