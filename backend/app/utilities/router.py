from ipaddress import ip_address
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Request

from ..config import settings
from .schemas import UtilityCapabilities

router = APIRouter(prefix="/api/utilities", tags=["utilities"])


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
    if not settings.utilities_enabled or not _is_loopback_request(request):
        raise HTTPException(status_code=404, detail="Utilitários indisponíveis.")
    return UtilityCapabilities(
        utilities_enabled=True,
        link_resolver_enabled=settings.link_resolver_enabled,
        background_remover_enabled=settings.background_remover_enabled,
    )
