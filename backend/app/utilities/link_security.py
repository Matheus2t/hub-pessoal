"""Fail-closed URL and DNS policy for the local link resolver."""

import asyncio
import ipaddress
import re
import socket
from dataclasses import dataclass
from typing import Awaitable, Callable, Sequence
from urllib.parse import urlsplit

import httpx


MAX_URL_LENGTH = 2048
MAX_DNS_ADDRESSES = 32
_ALLOWED_PORTS = {80, 443}
_NUMERIC_HOST = re.compile(r"(?i)^(?:(?:0x[0-9a-f]+)|[0-9]+|\.)+$")
_BLOCKED_HOSTS = {"localhost", "metadata", "metadata.google", "metadata.google.internal"}
_BLOCKED_SUFFIXES = (".localhost", ".local", ".internal")
_SPECIAL_NETWORKS = tuple(
    ipaddress.ip_network(value)
    for value in (
        "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
        "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24",
        "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24",
        "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4", "::/128", "::1/128",
        "::ffff:0:0/96", "64:ff9b::/96", "64:ff9b:1::/48", "100::/64",
        "2001::/23", "2001:db8::/32", "2002::/16", "fc00::/7", "fe80::/10", "ff00::/8",
    )
)


class URLPolicyError(ValueError):
    def __init__(self, status: str):
        super().__init__(status)
        self.status = status


class DestinationBlocked(URLPolicyError):
    def __init__(self):
        super().__init__("blocked_url")


class DestinationUnavailable(OSError):
    """DNS did not produce a usable address, or returned an unusable set."""


@dataclass(frozen=True)
class LinkTarget:
    url: httpx.URL
    hostname: str
    port: int
    scheme: str
    key: str

    @property
    def display_url(self) -> str:
        return str(self.url)


def is_public_ip(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped is not None:
        return False
    return (
        address.is_global
        and not address.is_private
        and not address.is_reserved
        and not address.is_loopback
        and not address.is_link_local
        and not address.is_multicast
        and not address.is_unspecified
        and not any(address.version == network.version and address in network for network in _SPECIAL_NETWORKS)
    )


def _normalize_hostname(hostname: str) -> str:
    host = hostname.lower().rstrip(".")
    if not host or len(host) > 253 or "%" in host or "\\" in host:
        raise URLPolicyError("invalid_url")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        if _NUMERIC_HOST.fullmatch(host):
            raise DestinationBlocked()
        if host in _BLOCKED_HOSTS or host.endswith(_BLOCKED_SUFFIXES) or "." not in host:
            raise DestinationBlocked()
        labels = host.split(".")
        if any(
            not label or len(label) > 63 or label.startswith("-") or label.endswith("-")
            or re.fullmatch(r"[a-z0-9-]+", label) is None
            for label in labels
        ):
            raise URLPolicyError("invalid_url")
        return host
    if not is_public_ip(address):
        raise DestinationBlocked()
    return address.compressed.lower()


def parse_target(raw_url: str) -> LinkTarget:
    if not isinstance(raw_url, str) or not raw_url or len(raw_url) > MAX_URL_LENGTH:
        raise URLPolicyError("invalid_url")
    if raw_url != raw_url.strip() or "\\" in raw_url or any(ord(char) < 32 or ord(char) == 127 for char in raw_url):
        raise URLPolicyError("invalid_url")
    try:
        parts = urlsplit(raw_url)
    except ValueError as error:
        raise URLPolicyError("invalid_url") from error

    scheme = parts.scheme.lower()
    if scheme not in {"http", "https"}:
        raise DestinationBlocked()
    if not parts.netloc or not parts.hostname:
        raise URLPolicyError("invalid_url")
    if parts.username is not None or parts.password is not None or "@" in parts.netloc:
        raise DestinationBlocked()
    if "%" in parts.hostname:
        raise DestinationBlocked()
    raw_hostname = parts.hostname.lower().rstrip(".")
    if _NUMERIC_HOST.fullmatch(raw_hostname):
        try:
            ipaddress.ip_address(raw_hostname)
        except ValueError:
            # Reject legacy shortened, octal, and hexadecimal IPv4 notations.
            raise DestinationBlocked()
    try:
        port = parts.port if parts.port is not None else (443 if scheme == "https" else 80)
    except ValueError as error:
        raise DestinationBlocked() from error
    if port not in _ALLOWED_PORTS:
        raise DestinationBlocked()

    try:
        parsed = httpx.URL(raw_url)
    except httpx.InvalidURL as error:
        raise URLPolicyError("invalid_url") from error
    hostname = _normalize_hostname(parsed.raw_host.decode("ascii"))
    # Keep the exact canonical host used for DNS, Host, and TLS SNI in sync.
    normalized = parsed.copy_with(host=hostname, fragment=None)
    return LinkTarget(
        url=normalized,
        hostname=hostname,
        port=port,
        scheme=scheme,
        key=str(normalized),
    )


async def resolve_public_addresses(
    hostname: str,
    port: int,
    *,
    getaddrinfo: Callable[..., Awaitable[Sequence[tuple]]] | None = None,
) -> tuple[ipaddress.IPv4Address | ipaddress.IPv6Address, ...]:
    """Resolve once, validate every A/AAAA result, and return pinned literals."""
    try:
        literal = ipaddress.ip_address(hostname)
    except ValueError:
        literal = None
    if literal is not None:
        if not is_public_ip(literal):
            raise DestinationBlocked()
        return (literal,)
    if hostname in _BLOCKED_HOSTS or hostname.endswith(_BLOCKED_SUFFIXES) or _NUMERIC_HOST.fullmatch(hostname):
        raise DestinationBlocked()

    resolver = getaddrinfo or asyncio.get_running_loop().getaddrinfo
    try:
        records = await resolver(
            hostname,
            port,
            family=socket.AF_UNSPEC,
            type=socket.SOCK_STREAM,
            proto=socket.IPPROTO_TCP,
        )
    except (OSError, asyncio.TimeoutError) as error:
        raise DestinationUnavailable() from error
    if not records or len(records) > MAX_DNS_ADDRESSES:
        raise DestinationUnavailable()

    addresses: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    for family, _socktype, _proto, _canonname, sockaddr in records:
        if family not in (socket.AF_INET, socket.AF_INET6):
            continue
        try:
            address = ipaddress.ip_address(sockaddr[0].split("%", maxsplit=1)[0])
        except (ValueError, IndexError, AttributeError) as error:
            raise DestinationUnavailable() from error
        if not is_public_ip(address):
            raise DestinationBlocked()
        if address not in addresses:
            addresses.append(address)
    if not addresses:
        raise DestinationUnavailable()
    return tuple(addresses)
