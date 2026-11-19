"""HTTPX transport that connects only to an already validated IP literal."""

import ipaddress
import ssl
from dataclasses import dataclass
from typing import Callable, Iterable

import httpcore
import httpx
from httpcore._backends.auto import AutoBackend

from .link_security import LinkTarget, is_public_ip


MAX_ADDRESS_ATTEMPTS = 4
MAX_RESPONSE_HEADER_BYTES = 16 * 1024
_USER_AGENT = "2T-Link-Resolver/1.0"


@dataclass(frozen=True)
class HTTPObservation:
    status_code: int
    locations: tuple[str, ...]


class PinnedNetworkBackend(httpcore.AsyncNetworkBackend):
    """Translate httpcore's hostname connect request to one validated IP."""

    def __init__(
        self,
        target: LinkTarget,
        address: ipaddress.IPv4Address | ipaddress.IPv6Address,
        delegate: httpcore.AsyncNetworkBackend | None = None,
    ):
        if not is_public_ip(address):
            raise httpcore.ConnectError("Destination is not public.")
        self.target = target
        self.address = address
        self.delegate = delegate or AutoBackend()

    async def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        requested_host = str(host).lower().rstrip(".")
        if requested_host != self.target.hostname or port != self.target.port or not is_public_ip(self.address):
            raise httpcore.ConnectError("Pinned destination mismatch.")
        return await self.delegate.connect_tcp(
            host=self.address.compressed,
            port=self.target.port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )

    async def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise httpcore.ConnectError("Unix sockets are not allowed.")

    async def sleep(self, seconds):
        await self.delegate.sleep(seconds)


class _CoreResponseStream(httpx.AsyncByteStream):
    def __init__(self, response: httpcore.Response):
        self.response = response

    async def __aiter__(self):
        async for chunk in self.response.stream:
            yield chunk

    async def aclose(self):
        await self.response.aclose()


class PinnedHTTPXTransport(httpx.AsyncBaseTransport):
    def __init__(
        self,
        target: LinkTarget,
        address: ipaddress.IPv4Address | ipaddress.IPv6Address,
        *,
        backend_factory: Callable[[], httpcore.AsyncNetworkBackend] = AutoBackend,
    ):
        self.target = target
        self.address = address
        context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        self.pool = httpcore.AsyncConnectionPool(
            ssl_context=context,
            max_connections=1,
            max_keepalive_connections=0,
            keepalive_expiry=0,
            http1=True,
            http2=False,
            retries=0,
            proxy=None,
            network_backend=PinnedNetworkBackend(target, address, backend_factory()),
        )

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        core_url = httpcore.URL(
            scheme=request.url.raw_scheme,
            host=request.url.raw_host,
            port=request.url.port,
            target=request.url.raw_path,
        )
        core_request = httpcore.Request(
            method=request.method,
            url=core_url,
            headers=request.headers.raw,
            content=request.stream,
            extensions=request.extensions,
        )
        response = await self.pool.handle_async_request(core_request)
        header_bytes = sum(len(name) + len(value) + 4 for name, value in response.headers)
        if header_bytes > MAX_RESPONSE_HEADER_BYTES:
            await response.aclose()
            raise httpx.RemoteProtocolError("Response headers exceed the configured size limit.")
        return httpx.Response(
            status_code=response.status,
            headers=response.headers,
            stream=_CoreResponseStream(response),
            extensions=response.extensions,
            request=request,
        )

    async def aclose(self):
        await self.pool.aclose()


def _single_header_values(response: httpx.Response, name: str) -> tuple[str, ...]:
    values = response.headers.get_list(name)
    if any(len(value) > 2048 for value in values):
        return ()
    return tuple(values)


async def _request_one(
    target: LinkTarget,
    address: ipaddress.IPv4Address | ipaddress.IPv6Address,
    method: str,
    *,
    backend_factory: Callable[[], httpcore.AsyncNetworkBackend] = AutoBackend,
    timeout: httpx.Timeout | None = None,
) -> HTTPObservation:
    transport = PinnedHTTPXTransport(target, address, backend_factory=backend_factory)
    request_headers = {
        "accept": "*/*",
        "accept-encoding": "identity",
        "user-agent": _USER_AGENT,
    }
    if method == "GET":
        request_headers["range"] = "bytes=0-0"
    async with httpx.AsyncClient(
        transport=transport,
        trust_env=False,
        follow_redirects=False,
        timeout=timeout or httpx.Timeout(connect=3.0, read=3.0, write=2.0, pool=1.0),
        cookies=None,
    ) as client:
        async with client.stream(method, str(target.url), headers=request_headers) as response:
            return HTTPObservation(response.status_code, _single_header_values(response, "location"))


def _tls_error(error: BaseException) -> bool:
    current: BaseException | None = error
    visited: set[int] = set()
    while current is not None and id(current) not in visited:
        visited.add(id(current))
        if isinstance(current, ssl.SSLError):
            return True
        current = current.__cause__ or current.__context__
    return False


async def fetch_headers(
    target: LinkTarget,
    addresses: Iterable[ipaddress.IPv4Address | ipaddress.IPv6Address],
    *,
    connect_timeout: float = 3.0,
    read_timeout: float = 3.0,
    backend_factory: Callable[[], httpcore.AsyncNetworkBackend] = AutoBackend,
) -> HTTPObservation:
    """Send HEAD, with a tiny streaming GET fallback for 405/501 only."""
    address_list = tuple(addresses)[:MAX_ADDRESS_ATTEMPTS]
    if not address_list:
        raise httpx.ConnectError("No validated destination.")
    timeout = httpx.Timeout(connect=connect_timeout, read=read_timeout, write=2.0, pool=1.0)
    last_error: httpx.HTTPError | None = None
    for address in address_list:
        try:
            observation = await _request_one(target, address, "HEAD", backend_factory=backend_factory, timeout=timeout)
            if observation.status_code in {405, 501}:
                observation = await _request_one(target, address, "GET", backend_factory=backend_factory, timeout=timeout)
            return observation
        except httpx.HTTPError as error:
            if _tls_error(error):
                raise
            last_error = error
            if not isinstance(error, (httpx.ConnectError, httpx.ConnectTimeout)):
                raise
    if last_error is not None:
        raise last_error
    raise httpx.ConnectError("No validated destination.")
