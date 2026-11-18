import asyncio
import json
import logging
import os
import threading
import time
from ipaddress import ip_address
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError

from ..config import settings
from .link_resolver import resolve_link
from .schemas import LinkResolveRequest, LinkResolveResponse, UtilityCapabilities

router = APIRouter(prefix="/api/utilities", tags=["utilities"])
logger = logging.getLogger(__name__)
_RESOLVER_SLOTS = threading.BoundedSemaphore(4)
_MAX_REQUEST_BODY_BYTES = 4096
_REQUEST_BODY_TIMEOUT_SECONDS = 3.0


def _vercel_runtime() -> bool:
    return os.getenv("VERCEL") == "1"


def _loopback_host(host: str | None) -> bool:
    if not host:
        return False
    normalized = host.strip().lower().rstrip(".")
    if normalized == "localhost" or normalized.endswith(".localhost"):
        return True
    try:
        return ip_address(normalized.split("%", maxsplit=1)[0]).is_loopback
    except ValueError:
        return False


def _is_loopback_request(request: Request) -> bool:
    if request.client is None or not _loopback_host(request.client.host):
        return False
    origin = request.headers.get("origin")
    if origin is None:
        return True
    try:
        return _loopback_host(urlsplit(origin).hostname)
    except ValueError:
        return False


def _public_resolver_ready() -> bool:
    return all((
        settings.utilities_enabled,
        settings.link_resolver_enabled,
        settings.link_resolver_public_enabled,
        settings.link_resolver_public_rate_limit_confirmed,
        settings.link_resolver_public_egress_confirmed,
    ))


def _utilities_available(request: Request) -> bool:
    if _vercel_runtime():
        return _public_resolver_ready()
    return settings.utilities_enabled and _is_loopback_request(request)


def _resolver_available(request: Request) -> bool:
    if _vercel_runtime():
        return _public_resolver_ready()
    return (
        settings.utilities_enabled
        and settings.link_resolver_enabled
        and _is_loopback_request(request)
    )


@router.get("/capabilities", response_model=UtilityCapabilities, include_in_schema=False)
def capabilities(request: Request) -> UtilityCapabilities:
    if not _utilities_available(request):
        raise HTTPException(status_code=404, detail="Utilitários indisponíveis.")
    on_vercel = _vercel_runtime()
    return UtilityCapabilities(
        utilities_enabled=True,
        link_resolver_enabled=settings.link_resolver_enabled and (not on_vercel or _public_resolver_ready()),
        background_remover_enabled=False if on_vercel else settings.background_remover_enabled,
    )


def _unavailable_result(url: str = "") -> LinkResolveResponse:
    return LinkResolveResponse(
        status="service_unavailable",
        original_url=url,
        final_url=None,
        final_status_code=None,
        redirect_count=0,
        redirects=[],
        security={"https": False, "warnings": [], "reputation_checked": False},
    )


async def _read_request_body(request: Request) -> bytes:
    body = bytearray()
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            declared_length = int(content_length)
        except ValueError as error:
            raise HTTPException(status_code=400, detail="Tamanho da requisição inválido.") from error
        if declared_length < 0:
            raise HTTPException(status_code=400, detail="Tamanho da requisição inválido.")
        if declared_length > _MAX_REQUEST_BODY_BYTES:
            raise HTTPException(status_code=413, detail="Corpo da requisição muito grande.")

    deadline = time.monotonic() + _REQUEST_BODY_TIMEOUT_SECONDS
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise HTTPException(status_code=408, detail="A leitura da requisição excedeu o tempo limite.")
        try:
            message = await asyncio.wait_for(request.receive(), timeout=remaining)
        except asyncio.TimeoutError as error:
            raise HTTPException(status_code=408, detail="A leitura da requisição excedeu o tempo limite.") from error
        if message["type"] == "http.disconnect":
            raise HTTPException(status_code=400, detail="A requisição foi interrompida.")
        if message["type"] != "http.request":
            raise HTTPException(status_code=400, detail="A requisição é inválida.")
        chunk = message.get("body", b"")
        if len(chunk) > _MAX_REQUEST_BODY_BYTES - len(body):
            raise HTTPException(status_code=413, detail="Corpo da requisição muito grande.")
        body.extend(chunk)
        if not message.get("more_body", False):
            break
    return bytes(body)


@router.post("/links/resolve", response_model=LinkResolveResponse, include_in_schema=False)
async def resolve_link_endpoint(request: Request) -> LinkResolveResponse:
    """Resolve locally, or on Vercel only after explicit server-side release gates."""
    if not _resolver_available(request):
        raise HTTPException(status_code=404, detail="Utilitário indisponível.")
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type != "application/json":
        raise HTTPException(status_code=415, detail="Envie um corpo application/json.")

    try:
        data = LinkResolveRequest.model_validate_json(await _read_request_body(request))
    except (ValidationError, ValueError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=422, detail="Requisição inválida.") from error

    if not _RESOLVER_SLOTS.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="Muitas consultas simultâneas. Tente novamente em instantes.",
            headers={"Retry-After": "2"},
        )

    try:
        try:
            return await resolve_link(data.url)
        except Exception as error:
            # Never log the URL, headers, redirect location, or exception message.
            logger.error("link resolver unavailable; error_type=%s", type(error).__name__)
            return _unavailable_result(data.url)
    finally:
        _RESOLVER_SLOTS.release()
