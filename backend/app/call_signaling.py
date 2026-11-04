"""Single-process, ephemeral signaling. Deliberately NOT mounted in the production API."""
import asyncio
import hashlib
import base64
import hmac
import os
import re
import secrets
import time
import json
import logging
import anyio
from collections import deque
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass, field
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, Response
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import Field, SecretStr, ValidationError, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .call_protocol import Action, Create, Handshake, Join, Resume
from .call_boundary import CallBoundary, https_origin
from .call_turn import CloudflareTurn, TurnUnavailable


class CallSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CALL_", extra="ignore", hide_input_in_errors=True)
    admin_key: SecretStr | None = None
    allowed_origins: str = "http://localhost:8001,http://127.0.0.1:8001"
    serve_frontend: bool = False
    public_origin: str | None = None
    proxy_mode: str = Field(default="none", pattern="^(none|cloudflare|render)$")
    room_seconds: int = Field(default=3600, ge=60, le=14400)
    invite_seconds: int = Field(default=900, ge=30, le=3600)
    reconnect_seconds: int = Field(default=20, ge=1, le=60)
    approval_seconds: int = Field(default=60, ge=1, le=120)
    heartbeat_seconds: int = Field(default=30, ge=1, le=120)
    max_rooms: int = Field(default=8, ge=1, le=32)
    stun_urls: str = "stun:stun.cloudflare.com:3478"
    turn_urls: str = ""
    turn_shared_secret: SecretStr | None = None
    turn_provider: str = Field(default="coturn", pattern="^(none|coturn|cloudflare)$")
    cloudflare_turn_key_id: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_-]{16,128}$")
    cloudflare_turn_api_token: SecretStr | None = None
    turn_seconds: int = Field(default=600, ge=60, le=600)
    screen_claim_seconds: int = Field(default=45, ge=5, le=120)

    @model_validator(mode="after")
    def ice_settings(self):
        cloudflare_configured = self.cloudflare_turn_key_id or self.cloudflare_turn_api_token
        if self.turn_provider == "cloudflare":
            if (not self.cloudflare_turn_key_id or not self.cloudflare_turn_api_token or
                    len(self.cloudflare_turn_api_token.get_secret_value()) < 32 or self.turn_urls or self.turn_shared_secret):
                raise ValueError("Cloudflare TURN requires its own key ID/token, not coturn credentials")
        elif cloudflare_configured:
            raise ValueError("Cloudflare credentials require an explicit provider selection")
        if self.turn_provider == "none" and (self.turn_urls or self.turn_shared_secret):
            raise ValueError("Disabled TURN cannot have relay credentials")
        if self.proxy_mode == "render":
            managed = os.getenv("RENDER_EXTERNAL_URL", "")
            if os.getenv("RENDER") != "true" or not managed:
                raise ValueError("Render proxy mode requires the managed Render runtime")
            managed = https_origin(managed)
            if self.public_origin and https_origin(self.public_origin) != managed:
                raise ValueError("Render public origin must match its managed external URL")
            self.public_origin = managed
            if not self.admin_key or len(self.admin_key.get_secret_value()) < 48 or self.admin_key.get_secret_value().startswith("test-only-"):
                raise ValueError("Hosted Call requires a new private owner credential of at least 48 characters")
        if self.public_origin:
            self.public_origin = https_origin(self.public_origin)
            origins = [s.strip() for s in self.allowed_origins.split(",")]
            if (self.serve_frontend and self.public_origin not in origins) or any(https_origin(s) != s for s in origins):
                raise ValueError("Public Call requires exact HTTPS origins; serving its shell also requires its own origin")
        if self.proxy_mode == "cloudflare" and not self.public_origin:
            raise ValueError("Cloudflare proxy mode requires an exact public origin")
        for value, schemes in [(self.stun_urls, "stuns?"), (self.turn_urls, "turns?")]:
            for url in filter(None, (s.strip() for s in value.split(","))):
                if not re.fullmatch(rf"(?:{schemes}):(?:\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+)(?::[0-9]{{1,5}})?(?:\?transport=(?:udp|tcp))?", url):
                    raise ValueError("Invalid ICE server URL")
        if bool(self.turn_urls.strip()) != bool(self.turn_shared_secret):
            raise ValueError("TURN requires both URLs and a server-only shared secret")
        if self.turn_shared_secret and len(self.turn_shared_secret.get_secret_value()) < 32:
            raise ValueError("TURN shared secret must contain at least 32 characters")
        return self


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
    voice: bool = False
    microphone: bool = False
    voice_epoch: int = 0
    camera: bool = False


@dataclass
class ScreenShare:
    owner: str
    request: str
    generation: int
    deadline: float
    active: bool = False
    audio: bool = False


@dataclass
class Room:
    id: str
    host: str
    invite_hash: str = field(repr=False)
    expires: float
    invite_expires: float
    people: dict[str, Participant] = field(default_factory=dict)
    screen: ScreenShare | None = None
    screen_generation: int = 0


class Rooms:
    def __init__(self, settings: CallSettings, clock=time.time):
        self.settings, self.clock = settings, clock
        self.rooms: dict[str, Room] = {}
        self.lock = asyncio.Lock()
        self.limits: dict[tuple[str, str], deque] = {}
        self.connections = 0
        self.turn = (CloudflareTurn(settings.cloudflare_turn_key_id, settings.cloudflare_turn_api_token)
                     if settings.turn_provider == "cloudflare" else None)
        self.rtc_tasks: dict[tuple[str, str], asyncio.Task] = {}
        self.rtc_cache: dict[tuple[str, str], tuple[float, dict]] = {}
        self.turn_slots = asyncio.Semaphore(4)

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
        for key, task in list(self.rtc_tasks.items()):
            if key[0] == room.id:
                task.cancel()
        for key in list(self.rtc_cache):
            if key[0] == room.id:
                self.rtc_cache.pop(key, None)
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
            if room.screen and not room.screen.active and now >= room.screen.deadline:
                room.screen = None
                changed = True
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
                    self.release_screen(room, person.id)
                    changed = True
            if room.id in self.rooms and changed:
                self.broadcast(room, "disconnected")

    def broadcast(self, room: Room, reason: str):
        people = [{"id": p.id, "name": p.name, "host": p.id == room.host,
                   "connected": p.connection is not None and not p.connection.closing,
                   "voice": p.voice, "microphone": p.microphone, "voiceEpoch": p.voice_epoch,
                   "camera": p.camera}
                  for p in room.people.values() if p.approved]
        screen = ({"owner": room.screen.owner, "generation": room.screen.generation,
                   "active": room.screen.active, "audio": room.screen.audio} if room.screen else None)
        for person in room.people.values():
            if person.connection and person.approved:
                person.connection.send({"type": "presence", "participants": people, "reason": reason, "screen": screen})
        host = room.people.get(room.host)
        if host and host.connection:
            host.connection.send({"type": "requests", "participants": [
                {"id": p.id, "name": p.name} for p in room.people.values() if not p.approved]})

    def release_screen(self, room: Room, owner: str):
        if room.screen and room.screen.owner == owner:
            room.screen = None

    def screen_control(self, room: Room, person: Participant, message, connection: Connection):
        def denied(code):
            connection.send({"type": "screen_denied", "request": message.request, "code": code})
        if not person.voice:
            denied("voice_required")
            return
        share = room.screen
        if message.action == "claim":
            if share and (share.owner != person.id or share.request != message.request):
                denied("screen_busy")
                return
            if not share:
                room.screen_generation += 1
                share = room.screen = ScreenShare(person.id, message.request, room.screen_generation,
                                                  self.clock() + self.settings.screen_claim_seconds)
            connection.send({"type": "screen_granted", "request": message.request, "generation": share.generation})
            self.broadcast(room, "screen_claimed")
            return
        if (not share or share.owner != person.id or share.request != message.request
                or message.generation is not None and message.generation != share.generation):
            denied("stale_screen")
            return
        if message.action == "start":
            share.active, share.audio = True, message.audio
        else:
            room.screen = None
        self.broadcast(room, "screen_started" if message.action == "start" else "screen_stopped")

    def rtc_config(self, room: Room, person: Participant):
        if self.turn:
            key = (room.id, person.id)
            cached = self.rtc_cache.get(key)
            if cached and cached[0] > self.clock():
                if person.connection:
                    person.connection.send(cached[1])
                return
            if key not in self.rtc_tasks:
                self.rtc_tasks[key] = asyncio.create_task(self.fetch_cloudflare_config(room, person, person.connection))
            return
        servers = [{"urls": u.strip()} for u in self.settings.stun_urls.split(",") if u.strip()]
        expires = None
        if self.settings.turn_shared_secret:
            expires = int(min(room.expires, self.clock() + self.settings.turn_seconds))
            username = f"{expires}:{person.id}"
            credential = base64.b64encode(hmac.new(
                self.settings.turn_shared_secret.get_secret_value().encode(), username.encode(), hashlib.sha1
            ).digest()).decode()
            servers.append({"urls": [u.strip() for u in self.settings.turn_urls.split(",") if u.strip()],
                            "username": username, "credential": credential})
        if person.connection:
            person.connection.send({"type": "rtc_config", "iceServers": servers, "turnExpires": expires,
                                    "relayAvailable": expires is not None})

    async def fetch_cloudflare_config(self, room, person, connection):
        key = (room.id, person.id)
        try:
            async with self.turn_slots:
                ttl = max(1, int(min(self.settings.turn_seconds, room.expires - self.clock())))
                expires = int(self.clock() + ttl - 5)
                servers = await self.turn.credentials(ttl)
            result = {"type": "rtc_config", "iceServers": servers, "turnExpires": expires, "relayAvailable": True}
        except TurnUnavailable:
            logging.getLogger("2t.call").warning("turn_credential_unavailable")
            result = {"type": "rtc_config", "iceServers": [{"urls": u.strip()} for u in self.settings.stun_urls.split(",") if u.strip()],
                      "turnExpires": None, "relayAvailable": False, "relayError": True}
        finally:
            if self.rtc_tasks.get(key) is asyncio.current_task():
                self.rtc_tasks.pop(key, None)
        async with self.lock:
            current = self.rooms.get(room.id)
            if (current is room and self.clock() < room.expires and current.people.get(person.id) is person
                    and person.approved and person.connection is connection and connection and not connection.closing):
                self.rtc_cache[key] = (result["turnExpires"] - 60 if result["relayAvailable"] else self.clock() + 30, result)
                if not result["relayAvailable"]:
                    connection.send({"type": "error", "code": "turn_unavailable"})
                connection.send(result)

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
                pending = self.rtc_tasks.pop((room.id, person.id), None)
                if pending:
                    pending.cancel()
                if old:
                    old.finish("replaced")
                person.camera = False
                self.release_screen(room, person.id)
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
            if person.approved:
                self.rtc_config(room, person)
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
                    self.release_screen(room, person_id)
                    connection.finish("left")
                    self.broadcast(room, "left")
                return
            if not person.approved:
                raise Rejected("awaiting_approval")
            if message.type == "rtc_config":
                self.rtc_config(room, person)
                return
            if message.type == "media":
                if (message.microphone or message.camera) and not message.active:
                    raise Rejected("invalid_message")
                if message.active != person.voice:
                    person.voice_epoch += 1
                if (person.voice, person.microphone, person.camera) != (message.active, message.microphone, message.camera):
                    person.voice, person.microphone, person.camera = message.active, message.microphone, message.camera
                    if not person.voice:
                        self.release_screen(room, person_id)
                    self.broadcast(room, "media")
                return
            if message.type == "screen":
                self.screen_control(room, person, message, connection)
                return
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
                        self.rtc_config(room, target)
                else:
                    if target.connection:
                        target.connection.finish("rejected")
                    del room.people[target.id]
                self.broadcast(room, "admitted" if message.type == "admit" else "rejected")
                return
            target = room.people.get(message.target)
            if not target or target.id == person_id or not target.approved or not target.connection or target.connection.closing:
                raise Rejected("invalid_target")
            if not person.voice or not target.voice or message.epoch != person.voice_epoch or message.targetEpoch != target.voice_epoch:
                raise Rejected("stale_voice")
            payload = message.model_dump(exclude={"target"})
            payload["from"] = person_id  # Never accept a client-supplied sender or room.
            target.connection.send(payload)

    async def detach(self, room_id: str, person_id: str, connection: Connection):
        async with self.lock:
            room = self.rooms.get(room_id)
            person = room.people.get(person_id) if room else None
            if person and person.connection is connection:
                pending = self.rtc_tasks.pop((room.id, person.id), None)
                if pending:
                    pending.cancel()
                person.connection, person.disconnected_at = None, self.clock()
                person.camera = False
                self.release_screen(room, person_id)
                self.broadcast(room, "disconnected")


def create_app(settings: CallSettings | None = None, clock=time.time, *, frontend_dir: Path | None = None) -> FastAPI:
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
        pending = list(rooms.rtc_tasks.values())
        for room in list(rooms.rooms.values()):
            rooms.close(room, "server_stopped")
        await asyncio.gather(*pending, return_exceptions=True)

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=[s.strip() for s in config.allowed_origins.split(",")],
                       allow_credentials=False, allow_methods=["GET"], allow_headers=[])
    app.add_middleware(CallBoundary, public_origin=config.public_origin, proxy_mode=config.proxy_mode)
    app.state.rooms = rooms
    boot, started = secrets.token_hex(8), time.monotonic()

    @app.get("/call/health")
    async def health():
        return {"status": "ok", "mode": "single-process", "media": False,
                "boot": boot, "uptimeSeconds": int(time.monotonic() - started)}

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
            # ASGI shutdown can cancel the endpoint while it is cleaning up its
            # child tasks. Shield this bounded, local cleanup so leases/counters
            # are released even under a cancelling AnyIO scope.
            with anyio.CancelScope(shield=True):
                for task in (reader, writer):
                    task.cancel()
                await asyncio.gather(reader, writer, return_exceptions=True)
                if room_id and person_id:
                    await rooms.detach(room_id, person_id, connection)
                async with rooms.lock:
                    rooms.connections -= 1

    if config.serve_frontend:
        dist = frontend_dir or Path(__file__).resolve().parents[2] / "dist"

        @app.get("/call-config.js")
        async def public_call_config(request: Request):
            origin = config.public_origin or f"{request.url.scheme}://{request.url.netloc}"
            if origin not in {s.strip() for s in config.allowed_origins.split(",")}:
                return Response(status_code=403)
            endpoint = origin.replace("https://", "wss://").replace("http://", "ws://") + "/call/ws"
            return Response("globalThis.__2T_CALL_SIGNAL_URL__=" + json.dumps(endpoint) + ";\n",
                            media_type="application/javascript")

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
