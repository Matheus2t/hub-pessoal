import asyncio
import ipaddress
import ssl

import httpcore
import httpx
import pytest

from app.utilities.link_security import parse_target
from app.utilities.link_transport import PinnedHTTPXTransport, PinnedNetworkBackend, fetch_headers


class _MockStream(httpcore.AsyncNetworkStream):
    def __init__(self, response: bytes):
        header, separator, body = response.partition(b"\r\n\r\n")
        self.header_remaining = header + separator
        self.body_remaining = body
        self.body_read_count = 0
        self.writes: list[bytes] = []
        self.tls_context: ssl.SSLContext | None = None
        self.server_hostname: str | None = None

    async def read(self, max_bytes: int, timeout: float | None = None) -> bytes:
        if self.header_remaining:
            result, self.header_remaining = self.header_remaining[:max_bytes], self.header_remaining[max_bytes:]
            return result
        self.body_read_count += 1
        result, self.body_remaining = self.body_remaining[:max_bytes], self.body_remaining[max_bytes:]
        return result

    async def write(self, buffer: bytes, timeout: float | None = None) -> None:
        self.writes.append(buffer)

    async def aclose(self) -> None:
        return None

    async def start_tls(self, ssl_context, server_hostname=None, timeout=None):
        self.tls_context = ssl_context
        self.server_hostname = server_hostname
        return self

    def get_extra_info(self, info: str):
        return None


class _MockBackend(httpcore.AsyncNetworkBackend):
    def __init__(self, status=200, headers=b"Content-Length: 0\r\nConnection: close", body=b""):
        self.host: str | None = None
        self.port: int | None = None
        reason = b"OK" if status < 400 else b"Failure"
        self.stream = _MockStream(
            b"HTTP/1.1 " + str(status).encode() + b" " + reason + b"\r\n" + headers + b"\r\n\r\n" + body
        )

    async def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        self.host, self.port = host, port
        return self.stream

    async def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise AssertionError("Unix socket must never be used")

    async def sleep(self, seconds: float):
        return None


def test_httpcore_transport_pins_ip_but_preserves_host_and_tls_identity():
    target = parse_target("https://example.com/landing")
    destination = ipaddress.ip_address("93.184.216.34")
    backend = _MockBackend()
    transport = PinnedHTTPXTransport(target, destination, backend_factory=lambda: backend)

    async def run():
        async with httpx.AsyncClient(transport=transport, trust_env=False, follow_redirects=False) as client:
            response = await client.head(str(target.url))
            assert response.status_code == 200

    asyncio.run(run())
    assert backend.host == "93.184.216.34"
    assert backend.port == 443
    assert backend.stream.server_hostname == "example.com"
    assert backend.stream.tls_context is not None
    assert backend.stream.tls_context.verify_mode == ssl.CERT_REQUIRED
    assert backend.stream.tls_context.check_hostname is True
    assert backend.stream.tls_context.minimum_version >= ssl.TLSVersion.TLSv1_2
    request = b"".join(backend.stream.writes)
    assert b"HEAD /landing HTTP/1.1" in request
    assert b"Host: example.com" in request
    assert b"cookie:" not in request.lower()
    assert b"proxy-authorization:" not in request.lower()
    assert backend.stream.body_read_count == 0


def test_pinned_backend_refuses_hostname_or_port_mismatch():
    target = parse_target("https://example.com/")
    delegate = _MockBackend()
    network = PinnedNetworkBackend(target, ipaddress.ip_address("93.184.216.34"), delegate)

    async def mismatch():
        await network.connect_tcp("attacker.example", 443)

    with pytest.raises(httpcore.ConnectError):
        asyncio.run(mismatch())
    assert delegate.host is None


def test_transport_rejects_non_public_pin_before_connecting():
    target = parse_target("https://example.com/")
    with pytest.raises(httpcore.ConnectError):
        PinnedHTTPXTransport(target, ipaddress.ip_address("127.0.0.1"))


def test_head_fallback_is_bounded_get_and_never_consumes_response_body():
    target = parse_target("https://example.com/resource")
    head = _MockBackend(405)
    get = _MockBackend(200, b"Content-Length: 12\r\nConnection: close", b"SECRET-BODY!")
    backends = iter((head, get))

    async def run():
        return await fetch_headers(
            target,
            (ipaddress.ip_address("93.184.216.34"),),
            backend_factory=lambda: next(backends),
        )

    observation = asyncio.run(run())
    assert observation.status_code == 200
    request = b"".join(get.stream.writes)
    assert b"GET /resource HTTP/1.1" in request
    assert b"range: bytes=0-0" in request
    assert get.stream.body_read_count == 0


def test_redirect_is_returned_without_automatic_following_and_duplicate_locations_preserved():
    target = parse_target("https://example.com/resource")
    backend = _MockBackend(302, b"Location: /one\r\nLocation: /two\r\nContent-Length: 0\r\nConnection: close")

    async def run():
        return await fetch_headers(
            target,
            (ipaddress.ip_address("93.184.216.34"),),
            backend_factory=lambda: backend,
        )

    observation = asyncio.run(run())
    assert observation.status_code == 302
    assert observation.locations == ("/one", "/two")
    assert len(backend.stream.writes) > 0


def test_oversized_response_headers_are_rejected_by_transport_limit():
    target = parse_target("https://example.com/")
    backend = _MockBackend(
        200,
        b"X-Large: " + b"a" * 20_000 + b"\r\nContent-Length: 0\r\nConnection: close",
    )

    async def run():
        return await fetch_headers(
            target,
            (ipaddress.ip_address("93.184.216.34"),),
            backend_factory=lambda: backend,
        )

    with pytest.raises(httpx.HTTPError):
        asyncio.run(run())
