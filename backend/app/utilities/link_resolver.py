"""Bounded manual redirect resolution. URLs are never logged or persisted."""

import asyncio
import time
from typing import Callable
from urllib.parse import urljoin

import httpcore
import httpx

from ..config import settings
from .link_security import (
    DestinationBlocked,
    DestinationUnavailable,
    LinkTarget,
    URLPolicyError,
    parse_target,
    resolve_public_addresses,
)
from .link_transport import HTTPObservation, _tls_error, fetch_headers
from .schemas import LinkResolveResponse, RedirectHop

_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
# Exact hostnames only; never include wildcard subdomains.
# In public mode, HTTP requests are made exclusively to these known shorteners.
PUBLIC_SHORTENER_HOSTS = frozenset({
    "bit.ly", "tinyurl.com", "is.gd", "v.gd", "t.co", "rb.gy",
})


def _approved_shortener(target: LinkTarget) -> bool:
    return target.scheme == "https" and target.port == 443 and target.hostname in PUBLIC_SHORTENER_HOSTS



def _build_result(
    *,
    status: str,
    original_url: str,
    final_target: LinkTarget | None = None,
    final_status_code: int | None = None,
    redirects: list[RedirectHop] | None = None,
    requested_targets: list[LinkTarget] | None = None,
    extra_warnings: list[str] | None = None,
) -> LinkResolveResponse:
    hops = redirects or []
    requested = requested_targets or []
    warnings: list[str] = []
    if any(target.scheme == "http" for target in requested):
        warnings.append("A cadeia incluiu uma conexão HTTP sem criptografia.")
    if len({target.hostname for target in requested}) > 1:
        warnings.append("O domínio mudou durante a cadeia de redirecionamentos.")
    for warning in extra_warnings or []:
        if warning not in warnings:
            warnings.append(warning)
    return LinkResolveResponse(
        status=status,  # type: ignore[arg-type]
        original_url=original_url,
        final_url=final_target.display_url if final_target else None,
        final_status_code=final_status_code,
        redirect_count=len(hops),
        redirects=hops,
        security={
            "https": bool(final_target and final_target.scheme == "https"),
            "warnings": warnings,
            "reputation_checked": False,
        },
    )


def _result(status: str, original_url: str, final_target: LinkTarget | None,
            final_status_code: int | None, redirects: list[RedirectHop],
            requested: list[LinkTarget], warning: str | None = None) -> LinkResolveResponse:
    return _build_result(
        status=status,
        original_url=original_url,
        final_target=final_target,
        final_status_code=final_status_code,
        redirects=redirects,
        requested_targets=requested,
        extra_warnings=[warning] if warning else None,
    )


async def resolve_link(
    original_url: str,
    *,
    dns_lookup: Callable = resolve_public_addresses,
    request_headers: Callable = fetch_headers,
    restricted_public: bool = False,
) -> LinkResolveResponse:
    """Resolve a URL while validating and pinning every destination in the chain."""
    try:
        current = parse_target(original_url)
    except URLPolicyError as error:
        warning = "O endereço foi bloqueado pela política de rede." if error.status == "blocked_url" else None
        return _result(error.status, original_url, None, None, [], [], warning)

    if restricted_public and not _approved_shortener(current):
        return _result("blocked_url", original_url, None, None, [], [],
                       "O serviço público aceita apenas encurtadores HTTPS conhecidos.")

    deadline = time.monotonic() + min(settings.link_resolver_total_timeout_seconds, 8.0 if restricted_public else 12.0)
    max_redirects = min(settings.link_resolver_max_redirects, 4 if restricted_public else 8)
    visited = {current.key}
    redirects: list[RedirectHop] = []
    requested: list[LinkTarget] = []
    last_target: LinkTarget | None = None
    last_status_code: int | None = None

    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return _result("timeout", original_url, last_target, last_status_code, redirects, requested,
                           "A consulta excedeu o tempo limite.")
        try:
            addresses = await asyncio.wait_for(dns_lookup(current.hostname, current.port), timeout=remaining)
        except (asyncio.TimeoutError, TimeoutError):
            return _result("timeout", original_url, last_target, last_status_code, redirects, requested,
                           "A consulta DNS excedeu o tempo limite.")
        except DestinationBlocked:
            return _result("blocked_url", original_url, last_target, last_status_code, redirects, requested,
                           "O destino foi bloqueado pela política de rede.")
        except (DestinationUnavailable, OSError, httpcore.NetworkError):
            return _result("service_unavailable", original_url, last_target, last_status_code, redirects, requested)
        except Exception:
            return _result("service_unavailable", original_url, last_target, last_status_code, redirects, requested)

        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return _result("timeout", original_url, last_target, last_status_code, redirects, requested)
        requested.append(current)
        try:
            observation: HTTPObservation = await asyncio.wait_for(
                request_headers(
                    current,
                    addresses,
                    connect_timeout=min(settings.link_resolver_connect_timeout_seconds, remaining),
                    read_timeout=min(settings.link_resolver_read_timeout_seconds, remaining),
                ),
                timeout=remaining,
            )
        except (asyncio.TimeoutError, TimeoutError, httpx.TimeoutException):
            return _result("timeout", original_url, last_target, last_status_code, redirects, requested,
                           "A conexão excedeu o tempo limite.")
        except (httpx.HTTPError, httpcore.NetworkError, OSError) as error:
            if _tls_error(error):
                return _result("tls_error", original_url, last_target, last_status_code, redirects, requested,
                               "A negociação TLS ou a validação do certificado falhou.")
            return _result("service_unavailable", original_url, last_target, last_status_code, redirects, requested)
        except Exception:
            return _result("service_unavailable", original_url, last_target, last_status_code, redirects, requested)

        last_target, last_status_code = current, observation.status_code
        if observation.status_code not in _REDIRECT_STATUSES:
            if restricted_public:
                # Never misrepresent the shortener's HTTP response as the destination's status.
                return _result("unresolved", original_url, None, None, redirects, requested,
                               "O encurtador não informou um destino HTTP.")
            # 4xx and 5xx are real final responses, not transport failures.
            return _result("resolved", original_url, current, observation.status_code, redirects, requested)

        if len(redirects) >= max_redirects:
            return _result("redirect_limit", original_url, current, observation.status_code, redirects, requested,
                           "O limite de redirecionamentos foi atingido.")
        if len(observation.locations) != 1:
            return _result("unresolved", original_url, current, observation.status_code, redirects, requested,
                           "A resposta não continha um único destino de redirecionamento válido.")

        redirects.append(RedirectHop(url=current.display_url, status_code=observation.status_code))
        try:
            destination = urljoin(current.display_url, observation.locations[0])
            next_target = parse_target(destination)
        except URLPolicyError as error:
            if error.status == "blocked_url":
                return _result("blocked_url", original_url, current, observation.status_code, redirects, requested,
                               "O destino do redirecionamento foi bloqueado pela política de rede.")
            return _result("unresolved", original_url, current, observation.status_code, redirects, requested,
                           "O destino do redirecionamento era inválido.")
        except (ValueError, UnicodeError):
            return _result("unresolved", original_url, current, observation.status_code, redirects, requested,
                           "O destino do redirecionamento era inválido.")

        if restricted_public and not _approved_shortener(next_target):
            # Do not resolve DNS or open a connection to the destination.
            # Only the Location header from the approved shortener is reported.
            return _result(
                "destination_identified", original_url, next_target, None, redirects, requested,
                "O destino foi informado pelo encurtador, mas não foi acessado nem verificado.",
            )

        if next_target.key in visited:
            return _result("redirect_loop", original_url, current, observation.status_code, redirects, requested,
                           "Foi detectado um ciclo de redirecionamentos.")
        visited.add(next_target.key)
        current = next_target
