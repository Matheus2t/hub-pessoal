"""One-shot HTTPS/WSS probe. No room, owner credential or idle-avoidance pings."""
import argparse
import base64
import hashlib
import http.client
import ipaddress
import json
import secrets
import ssl
import sys
import time
from urllib.parse import urlsplit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("signal", help="Public wss://host/call/ws, never an invitation")
    parser.add_argument("--origin", required=True, help="Exact allowed frontend HTTPS origin")
    parser.add_argument("--local-ca", help="Synthetic loopback test CA only")
    args = parser.parse_args()
    try:
        target, origin = urlsplit(args.signal), urlsplit(args.origin)
        if (target.scheme != "wss" or target.username or target.password or target.query or target.fragment
                or target.path != "/call/ws" or origin.scheme != "https" or origin.username or origin.password
                or origin.path not in ("", "/") or origin.query or origin.fragment):
            raise ValueError("Invalid public configuration")
        context = ssl.create_default_context()
        if args.local_ca:
            if not ipaddress.ip_address(target.hostname).is_loopback:
                raise ValueError("A local CA is only permitted for loopback fixtures")
            context.load_verify_locations(cafile=args.local_ca)
        started = time.monotonic()

        def request(path, source=args.origin, upgrade=False):
            connection = http.client.HTTPSConnection(target.hostname, target.port or 443, timeout=15, context=context)
            headers = {"Origin": source}
            key = base64.b64encode(secrets.token_bytes(16)).decode()
            if upgrade:
                headers.update({"Upgrade": "websocket", "Connection": "Upgrade", "Sec-WebSocket-Key": key, "Sec-WebSocket-Version": "13"})
            try:
                connection.request("GET", path, headers=headers)
                response = connection.getresponse()
                if response.status == 101:
                    expected = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
                    if response.getheader("Sec-WebSocket-Accept") != expected:
                        raise ValueError("Invalid WebSocket accept")
                    body = b""
                else:
                    body = response.read(32769)
                    if len(body) > 32768:
                        raise ValueError("Oversized health response")
                return response.status, dict(response.getheaders()), body
            finally:
                connection.close()

        status, headers, body = request("/call/health")
        health = json.loads(body)
        assert status == 200 and health["status"] == "ok" and health["mode"] == "single-process" and health["media"] is False
        assert {k.lower(): v for k, v in headers.items()}.get("access-control-allow-origin") == args.origin
        ws = request("/call/ws", upgrade=True)[0]
        refused = request("/call/ws", source="https://unauthorized-origin.invalid", upgrade=True)[0]
        assert ws == 101 and refused == 403
        assert all(request(path)[0] == 404 for path in ("/.env", "/docs", "/api/health"))
        print(json.dumps({"https": status, "mode": health["mode"], "wss": ws, "forbiddenOrigin": refused, "internalPaths": "blocked",
                          "uptimeSeconds": health.get("uptimeSeconds"), "elapsedMs": round((time.monotonic() - started) * 1000),
                          "scope": "local-fixture" if args.local_ca else "external"}))
        return 0
    except Exception:
        print("Call probe failed. Check TLS, health, Origin and WSS in the provider dashboard; no credentials were sent.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
