import json
import logging
import os
import threading
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


@router.get("/capabilities", response_model=UtilityCapabilities, include_in_schema=False)
def capabilities(request: Request) -> UtilityCapabilities:
    if _vercel_runtime() or not settings.utilities_enabled or not _is_loopback_request(request):
        raise HTTPException(status_code=404, detail="Utilitários indisponíveis.")
    return UtilityCapabilities(
        utilities_enabled=True,
        link_resolver_enabled=settings.link_resolver_enabled,
        background_remover_enabled=settings.background_remover_enabled,
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


@router.post("/links/resolve", response_model=LinkResolveResponse, include_in_schema=False)
async def resolve_link_endpoint(request: Request) -> LinkResolveResponse:
    """Local-only link resolution; deliberately unavailable on Vercel."""
    if (
        _vercel_runtime()
        or not settings.utilities_enabled
        or not settings.link_resolver_enabled
        or not _is_loopback_request(request)
    ):
        raise HTTPException(status_code=404, detail="Utilitário indisponível.")
    if not _RESOLVER_SLOTS.acquire(blocking=False):
        return _unavailable_result()

    try:
        content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            raise HTTPException(status_code=415, detail="Envie um corpo application/json.")
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 4096:
                raise HTTPException(status_code=413, detail="Corpo da requisição muito grande.")
        try:
            data = LinkResolveRequest.model_validate_json(bytes(body))
        except (ValidationError, ValueError, json.JSONDecodeError) as error:
            raise HTTPException(status_code=422, detail="Requisição inválida.") from error

        try:
            return await resolve_link(data.url)
        except Exception as error:
            # Never log the URL, headers, redirect location, or exception message.
            logger.error("link resolver unavailable; error_type=%s", type(error).__name__)
            return _unavailable_result(data.url)
    finally:
        _RESOLVER_SLOTS.release()
