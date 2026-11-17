import asyncio
import ssl

import httpcore
import httpx
import pytest

from app.config import settings
from app.utilities.link_resolver import resolve_link
from app.utilities.link_security import DestinationBlocked, DestinationUnavailable
from app.utilities.link_transport import HTTPObservation


def _runner(responses, *, dns=None):
    seen = []
    queue = list(responses)

    async def lookup(hostname, port):
        if dns:
            return await dns(hostname, port)
        return ("93.184.216.34",)

    async def request(target, addresses, **kwargs):
        seen.append((target, tuple(addresses)))
        if not queue:
            raise AssertionError("unexpected HTTP request")
        item = queue.pop(0)
        if isinstance(item, BaseException):
            raise item
        return item

    return lookup, request, seen


def test_relative_and_cross_domain_redirects_preserve_provenance_and_final_http_status():
    lookup, request, seen = _runner([
        HTTPObservation(301, ("/step",)),
        HTTPObservation(302, ("https://destination.example/final",)),
        HTTPObservation(404, ()),
    ])
    result = asyncio.run(resolve_link("http://short.example/start#client", dns_lookup=lookup,
                                      request_headers=request))

    assert result.status == "resolved"
    assert result.final_url == "https://destination.example/final"
    assert result.final_status_code == 404
    assert [hop.status_code for hop in result.redirects] == [301, 302]
    assert [target.hostname for target, _ in seen] == [
        "short.example", "short.example", "destination.example"
    ]
    assert all(addresses == ("93.184.216.34",) for _, addresses in seen)
    assert result.security.https is True
    assert result.security.reputation_checked is False
    assert any("HTTP sem criptografia" in warning for warning in result.security.warnings)
    assert any("domínio mudou" in warning for warning in result.security.warnings)


def test_server_error_is_a_real_final_response_not_transport_failure():
    lookup, request, _ = _runner([HTTPObservation(500, ())])
    result = asyncio.run(resolve_link("https://example.com/fail", dns_lookup=lookup,
                                      request_headers=request))
    assert (result.status, result.final_status_code) == ("resolved", 500)


def test_redirect_loop_is_detected_without_second_request():
    lookup, request, seen = _runner([HTTPObservation(302, ("/start",))])
    result = asyncio.run(resolve_link("https://example.com/start", dns_lookup=lookup,
                                      request_headers=request))
    assert result.status == "redirect_loop"
    assert result.redirect_count == 1
    assert len(seen) == 1


def test_redirect_limit_counts_only_followed_hops(monkeypatch):
    monkeypatch.setattr(settings, "link_resolver_max_redirects", 1)
    lookup, request, seen = _runner([
        HTTPObservation(301, ("/one",)),
        HTTPObservation(302, ("/two",)),
    ])
    result = asyncio.run(resolve_link("https://example.com/start", dns_lookup=lookup,
                                      request_headers=request))
    assert result.status == "redirect_limit"
    assert result.redirect_count == 1
    assert result.final_status_code == 302
    assert len(seen) == 2


@pytest.mark.parametrize("locations", [(), ("/a", "/b")])
def test_missing_or_ambiguous_location_is_unresolved(locations):
    lookup, request, _ = _runner([HTTPObservation(301, locations)])
    result = asyncio.run(resolve_link("https://example.com/start", dns_lookup=lookup,
                                      request_headers=request))
    assert result.status == "unresolved"


def test_private_redirect_is_blocked_and_never_returned_as_final_destination():
    lookup, request, _ = _runner([HTTPObservation(302, ("http://127.0.0.1/admin",))])
    result = asyncio.run(resolve_link("https://example.com/start", dns_lookup=lookup,
                                      request_headers=request))
    assert result.status == "blocked_url"
    assert result.final_url == "https://example.com/start"
    assert "127.0.0.1" not in (result.final_url or "")


@pytest.mark.parametrize("raw", ["ftp://example.com/file", "https://127.0.0.1/private", "not a URL"])
def test_invalid_or_blocked_submitted_url_never_uses_dns_or_http(raw):
    async def forbidden(*args, **kwargs):
        raise AssertionError("unsafe input must not reach DNS or HTTP")

    result = asyncio.run(resolve_link(raw, dns_lookup=forbidden, request_headers=forbidden))
    assert result.status in {"invalid_url", "blocked_url"}
    assert result.final_url is None


def test_mixed_private_dns_answers_abort_before_http():
    async def lookup(*args):
        raise DestinationBlocked()

    async def forbidden(*args, **kwargs):
        raise AssertionError("mixed DNS result must not connect")

    result = asyncio.run(resolve_link("https://example.com/", dns_lookup=lookup,
                                      request_headers=forbidden))
    assert result.status == "blocked_url"


def test_dns_rebinding_on_a_later_redirect_is_revalidated_before_connect():
    calls = 0
    http_calls = []

    async def lookup(*args):
        nonlocal calls
        calls += 1
        if calls == 1:
            return ("93.184.216.34",)
        raise DestinationBlocked()

    async def request(target, addresses, **kwargs):
        http_calls.append(target)
        return HTTPObservation(302, ("/next",))

    result = asyncio.run(resolve_link("https://example.com/start", dns_lookup=lookup,
                                      request_headers=request))
    assert result.status == "blocked_url"
    assert calls == 2
    assert len(http_calls) == 1


def test_dns_failure_is_service_unavailable_and_never_unpinned():
    async def lookup(*args):
        raise DestinationUnavailable()

    async def forbidden(*args, **kwargs):
        raise AssertionError("failed DNS must not connect")

    result = asyncio.run(resolve_link("https://example.com/", dns_lookup=lookup,
                                      request_headers=forbidden))
    assert result.status == "service_unavailable"


def test_total_deadline_covers_dns_and_request(monkeypatch):
    monkeypatch.setattr(settings, "link_resolver_total_timeout_seconds", 0.01)

    async def slow_dns(*args):
        await asyncio.sleep(0.05)
        return ("93.184.216.34",)

    async def forbidden(*args, **kwargs):
        raise AssertionError("deadline expired before HTTP")

    result = asyncio.run(resolve_link("https://example.com/", dns_lookup=slow_dns,
                                      request_headers=forbidden))
    assert result.status == "timeout"


def test_request_timeout_maps_to_timeout():
    lookup, request, _ = _runner([httpx.ReadTimeout("timeout")])
    result = asyncio.run(resolve_link("https://example.com/", dns_lookup=lookup,
                                      request_headers=request))
    assert result.status == "timeout"


def test_tls_verification_error_is_distinct_from_network_failure():
    tls = ssl.SSLCertVerificationError("certificate detail")
    error = httpx.ConnectError("connection failed")
    error.__cause__ = tls
    lookup, request, _ = _runner([error])
    result = asyncio.run(resolve_link("https://example.com/", dns_lookup=lookup,
                                      request_headers=request))
    assert result.status == "tls_error"


@pytest.mark.parametrize("error", [httpx.ConnectError("refused"), httpcore.NetworkError("offline")])
def test_network_errors_map_to_service_unavailable(error):
    lookup, request, _ = _runner([error])
    result = asyncio.run(resolve_link("https://example.com/", dns_lookup=lookup,
                                      request_headers=request))
    assert result.status == "service_unavailable"
