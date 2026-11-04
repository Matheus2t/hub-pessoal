"""Opt-in public boundary for the standalone Call test service, never the main API."""
from ipaddress import ip_address
import re
from urllib.parse import urlsplit

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import PlainTextResponse, RedirectResponse


def https_origin(value: str) -> str:
    parsed = urlsplit(value)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in ("", "/") or parsed.query or parsed.fragment
            or any(c.isspace() for c in value)
            or not re.fullmatch(r"[a-zA-Z0-9.:-]+", parsed.hostname)):
        raise ValueError("An exact HTTPS origin without path or credentials is required")
    if parsed.port == 0:
        raise ValueError("Invalid HTTPS port")
    return f"https://{parsed.netloc.lower()}"


class CallBoundary:
    def __init__(self, app, public_origin=None, proxy_mode="none"):
        self.app, self.origin, self.proxy_mode = app, public_origin, proxy_mode
        self.host = urlsplit(public_origin).netloc if public_origin else None

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            return await self.app(scope, receive, send)
        headers = Headers(scope=scope)

        async def reject(status=403):
            if scope["type"] == "websocket":
                await send({"type": "websocket.close", "code": 1008})
            else:
                await PlainTextResponse("Call access refused", status_code=status)(scope, receive, send)

        if self.origin:
            if headers.get("host", "").lower() != self.host:
                return await reject()
            scope = dict(scope)
            if self.proxy_mode == "cloudflare":
                # Uvicorn must run with --no-proxy-headers. Only the loopback connector
                # is trusted; CF-Connecting-IP is overwritten at the Cloudflare edge.
                try:
                    peer = ip_address(scope.get("client", ("", 0))[0])
                    visitor = ip_address(headers.get("cf-connecting-ip", ""))
                    if not peer.is_loopback:
                        return await reject()
                except ValueError:
                    return await reject()
                scheme = headers.get("x-forwarded-proto")
                if scheme not in ("https", "http"):
                    return await reject()
                scope["client"] = (str(visitor), 0)
                scope["scheme"] = ("wss" if scope["type"] == "websocket" else "https") if scheme == "https" else "http"
            if scope["scheme"] not in ("https", "wss"):
                if scope["type"] == "websocket":
                    return await reject()
                # The canonical host is config, not an arbitrary forwarded Host.
                target = self.origin + scope.get("path", "/")
                if scope.get("query_string"):
                    target += "?" + scope["query_string"].decode("ascii", errors="replace")
                return await RedirectResponse(target, status_code=307)(scope, receive, send)
            # Public test service exposes just Call's shell/assets, not financial data,
            # source maps, unrelated lazy modules, filesystem contents or API endpoints.
            if scope.get("path") not in {
                "/", "/bundle.js", "/styles.css", "/2t-logo.webp", "/2t-mark.svg",
                "/call/ws", "/call/health",
            }:
                return await reject(404)

        async def secure_send(message):
            if message["type"] == "http.response.start":
                response = MutableHeaders(scope=message)
                response["Cache-Control"] = "no-store"
                response["Referrer-Policy"] = "no-referrer"
                response["X-Content-Type-Options"] = "nosniff"
                response["X-Frame-Options"] = "DENY"
                response["X-Robots-Tag"] = "noindex, nofollow, noarchive"
                response["Permissions-Policy"] = 'microphone=(self), camera=(), display-capture=(self)'
            await send(message)

        await self.app(scope, receive, secure_send)
