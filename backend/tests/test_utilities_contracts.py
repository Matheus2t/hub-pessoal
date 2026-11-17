import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from starlette.requests import Request

from app import main
from app.config import Settings, settings
from app.utilities.schemas import (
    BackgroundJobStatusResponse,
    ConfirmUploadRequest,
    CreateBackgroundJobRequest,
    LinkResolveRequest,
    LinkResolveResponse,
    UtilityCapabilities,
)
from app.utilities.router import capabilities


def capability_request(client=("127.0.0.1", 43120), origin=None):
    headers = [(b"origin", origin.encode())] if origin else []
    return Request({
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/api/utilities/capabilities",
        "raw_path": b"/api/utilities/capabilities",
        "query_string": b"",
        "root_path": "",
        "headers": headers,
        "client": client,
        "server": ("localhost", 8000),
    })


def enable_all(monkeypatch):
    monkeypatch.setattr(settings, "utilities_enabled", True)
    monkeypatch.setattr(settings, "link_resolver_enabled", True)
    monkeypatch.setattr(settings, "background_remover_enabled", True)


def test_utility_flags_default_to_disabled(monkeypatch):
    for variable in ("UTILITIES_ENABLED", "LINK_RESOLVER_ENABLED", "BACKGROUND_REMOVER_ENABLED"):
        monkeypatch.delenv(variable, raising=False)
    defaults = Settings(_env_file=None)
    assert defaults.utilities_enabled is False
    assert defaults.link_resolver_enabled is False
    assert defaults.background_remover_enabled is False


def test_capabilities_are_hidden_when_disabled(monkeypatch):
    monkeypatch.setattr(settings, "utilities_enabled", False)
    with pytest.raises(HTTPException) as error:
        capabilities(capability_request())
    assert error.value.status_code == 404


def test_local_capabilities_reflect_independent_flags(monkeypatch):
    monkeypatch.setattr(settings, "utilities_enabled", True)
    monkeypatch.setattr(settings, "link_resolver_enabled", True)
    monkeypatch.setattr(settings, "background_remover_enabled", False)
    response = capabilities(capability_request(origin="http://localhost:3000"))
    assert response.model_dump() == {
        "utilities_enabled": True,
        "link_resolver_enabled": True,
        "background_remover_enabled": False,
    }


@pytest.mark.parametrize(
    "client,origin",
    [
        (("203.0.113.9", 43120), "https://matheus2t.com.br"),
        (("127.0.0.1", 43120), "https://matheus2t.com.br"),
    ],
)
def test_capabilities_reject_non_loopback_client_or_origin(monkeypatch, client, origin):
    enable_all(monkeypatch)
    with pytest.raises(HTTPException) as error:
        capabilities(capability_request(client=client, origin=origin))
    assert error.value.status_code == 404


def test_no_link_or_image_processing_endpoint_exists(monkeypatch):
    enable_all(monkeypatch)
    paths = {getattr(route, "path", None) for route in main.app.routes}
    assert "/api/utilities/links/resolve" not in paths
    assert "/api/utilities/background/jobs" not in paths


def test_link_contract_rejects_invalid_url_and_models_all_outcomes():
    assert str(LinkResolveRequest(url="https://bit.ly/example").url).startswith("https://bit.ly")
    with pytest.raises(ValidationError):
        LinkResolveRequest(url="not a URL")

    statuses = [
        "resolved", "invalid_url", "blocked_url", "timeout", "redirect_loop",
        "unresolved", "service_unavailable",
    ]
    for status in statuses:
        response = LinkResolveResponse(
            status=status,
            original_url="https://bit.ly/example",
            final_url="https://example.com/page" if status == "resolved" else None,
            redirect_count=1 if status == "resolved" else 0,
            redirects=[{"url": "https://bit.ly/example", "status_code": 301}] if status == "resolved" else [],
            security={"https": True, "warnings": [], "reputation_checked": False},
        )
        assert response.status == status


def test_background_contracts_validate_upload_and_all_states():
    CreateBackgroundJobRequest(file_name="photo.png", content_type="image/png", size_bytes=1200)
    with pytest.raises(ValidationError):
        CreateBackgroundJobRequest(file_name="photo.png", content_type="image/png", size_bytes=0)
    with pytest.raises(ValidationError):
        ConfirmUploadRequest(job_id="job-1", sha256="short")

    states = ["created", "uploaded", "queued", "processing", "completed", "failed", "expired", "cancelled"]
    for state in states:
        result = BackgroundJobStatusResponse(
            job_id="job-1", status=state, progress_percent=25 if state == "processing" else None
        )
        assert result.status == state


def test_capability_schema_rejects_extra_fields():
    with pytest.raises(ValidationError):
        UtilityCapabilities(
            utilities_enabled=True,
            link_resolver_enabled=False,
            background_remover_enabled=False,
            secret="must not be accepted",
        )
