import asyncio
import ipaddress
import socket

import pytest

from app.utilities.link_security import (
    DestinationBlocked,
    DestinationUnavailable,
    URLPolicyError,
    is_public_ip,
    parse_target,
    resolve_public_addresses,
)


@pytest.mark.parametrize("raw", [
    "https://example.com/path#fragment",
    "http://EXAMPLE.com./",
    "https://[2606:4700:4700::1111]/dns-query",
    "https://example.com:443/a",
    "http://example.com:80/a",
])
def test_parse_accepts_http_targets_and_removes_fragment(raw):
    target = parse_target(raw)
    assert target.scheme in {"http", "https"}
    assert "#" not in str(target.url)
    assert target.hostname == target.url.raw_host.decode("ascii").strip("[]")


@pytest.mark.parametrize("raw", [
    "", "not-a-url", "https:///missing-host", "https://exa mple.com/",
])
def test_parse_rejects_malformed_urls(raw):
    with pytest.raises(URLPolicyError) as error:
        parse_target(raw)
    assert error.value.status in {"invalid_url", "blocked_url"}


@pytest.mark.parametrize("raw", [
    "ftp://example.com/file", "file:///etc/passwd", "//example.com/path",
    "http://user:pass@example.com/", "https://example.com@127.0.0.1/",
    "http://localhost/", "http://sub.localhost/", "http://printer.local/",
    "http://host.internal/", "http://metadata.google.internal/",
    "http://127.0.0.1/", "http://10.0.0.1/", "http://169.254.169.254/",
    "http://192.168.1.1/", "https://[::1]/", "https://[fe80::1]/",
    "https://[ff02::1]/", "https://[::ffff:8.8.8.8]/",
    "http://2130706433/", "http://0177.0.0.1/", "http://0x7f000001/",
    "https://example.com:0/", "https://example.com:8080/", "https://example.com:65536/",
])
def test_parse_blocks_unsafe_schemes_hosts_addresses_and_ports(raw):
    with pytest.raises(URLPolicyError) as error:
        parse_target(raw)
    assert error.value.status == "blocked_url"


def test_url_length_is_bounded():
    with pytest.raises(URLPolicyError) as error:
        parse_target("https://example.com/" + "x" * 2048)
    assert error.value.status == "invalid_url"


@pytest.mark.parametrize("address", [
    "0.0.0.0", "10.1.2.3", "100.64.1.1", "127.0.0.1", "169.254.2.3",
    "172.16.0.1", "192.0.2.1", "192.168.1.1", "198.18.0.1", "203.0.113.1",
    "224.0.0.1", "240.0.0.1", "::", "::1", "::ffff:8.8.8.8", "fc00::1",
    "fe80::1", "ff02::1", "2001:db8::1", "2002::1",
])
def test_non_public_ip_ranges_are_rejected(address):
    assert is_public_ip(ipaddress.ip_address(address)) is False


@pytest.mark.parametrize("address", ["1.1.1.1", "8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"])
def test_public_ip_literals_are_accepted(address):
    assert is_public_ip(ipaddress.ip_address(address)) is True


def _record(address: str):
    parsed = ipaddress.ip_address(address)
    family = socket.AF_INET if parsed.version == 4 else socket.AF_INET6
    sockaddr = (str(parsed), 443) if parsed.version == 4 else (str(parsed), 443, 0, 0)
    return family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", sockaddr


def test_dns_returns_every_validated_a_and_aaaa_record():
    async def lookup(host, port, **kwargs):
        assert (host, port) == ("example.com", 443)
        assert kwargs["family"] == socket.AF_UNSPEC
        return [_record("93.184.216.34"), _record("2606:4700:4700::1111")]

    result = asyncio.run(resolve_public_addresses("example.com", 443, getaddrinfo=lookup))
    assert {str(item) for item in result} == {"93.184.216.34", "2606:4700:4700::1111"}


def test_dns_blocks_mixed_public_and_private_answers():
    async def lookup(*args, **kwargs):
        return [_record("93.184.216.34"), _record("10.0.0.4")]

    with pytest.raises(DestinationBlocked):
        asyncio.run(resolve_public_addresses("example.com", 443, getaddrinfo=lookup))


@pytest.mark.parametrize("records", [[], [_record("224.0.0.1")]])
def test_dns_without_usable_public_addresses_fails_closed(records):
    async def lookup(*args, **kwargs):
        return records

    expected = DestinationUnavailable if records == [] else DestinationBlocked
    with pytest.raises(expected):
        asyncio.run(resolve_public_addresses("example.com", 80, getaddrinfo=lookup))


def test_dns_failure_does_not_fall_back_to_an_unpinned_request():
    async def lookup(*args, **kwargs):
        raise socket.gaierror("private detail must not leave resolver")

    with pytest.raises(DestinationUnavailable):
        asyncio.run(resolve_public_addresses("example.com", 443, getaddrinfo=lookup))


def test_literal_destination_bypasses_dns_but_still_requires_public_ip():
    result = asyncio.run(resolve_public_addresses("8.8.8.8", 443))
    assert tuple(map(str, result)) == ("8.8.8.8",)
    with pytest.raises(DestinationBlocked):
        asyncio.run(resolve_public_addresses("127.0.0.1", 443))
