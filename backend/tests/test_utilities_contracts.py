import pytest
import asyncio
import httpx
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
    for variable in (
        "UTILITIES_ENABLED", "LINK_RESOLVER_ENABLED", "BACKGROUND_REMOVER_ENABLED",
        "LINK_RESOLVER_PUBLIC_ENABLED", "LINK_RESOLVER_PUBLIC_RATE_LIMIT_CONFIRMED",
        "LINK_RESOLVER_PUBLIC_EGRESS_CONFIRMED",
    ):
        monkeypatch.delenv(variable, raising=False)
    defaults = Settings(_env_file=None)
    assert defaults.utilities_enabled is False
    assert defaults.link_resolver_enabled is False
    assert defaults.background_remover_enabled is False


def test_resolver_limits_cannot_exceed_hard_caps():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, link_resolver_max_redirects=9)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, link_resolver_total_timeout_seconds=12.1)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, link_resolver_connect_timeout_seconds=3.1)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, link_resolver_read_timeout_seconds=3.1)


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


def test_link_endpoint_is_present_but_hidden_from_public_openapi(monkeypatch):
    enable_all(monkeypatch)
    paths = {getattr(route, "path", None) for route in main.app.routes}
    assert "/api/utilities/links/resolve" in paths
    assert "/api/utilities/background/jobs" not in paths
    assert "/api/utilities/links/resolve" not in main.app.openapi()["paths"]


def test_link_contract_limits_raw_url_and_models_all_outcomes():
    assert LinkResolveRequest(url="https://bit.ly/example").url == "https://bit.ly/example"
    with pytest.raises(ValidationError):
        LinkResolveRequest(url="")
    with pytest.raises(ValidationError):
        LinkResolveRequest(url="https://example.com/" + "x" * 2048)

    statuses = [
        "resolved", "invalid_url", "blocked_url", "timeout", "redirect_loop",
        "redirect_limit", "tls_error", "unresolved", "service_unavailable",
    ]
    for status in statuses:
        response = LinkResolveResponse(
            status=status,
            original_url="https://bit.ly/example",
            final_url="https://example.com/page" if status == "resolved" else None,
            final_status_code=200 if status == "resolved" else None,
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


def _set_link_flags(monkeypatch):
    monkeypatch.setattr(settings, "utilities_enabled", True)
    monkeypatch.setattr(settings, "link_resolver_enabled", True)


def test_vercel_runtime_stays_closed_without_all_public_release_gates(monkeypatch):
    _set_link_flags(monkeypatch)
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setattr(settings, "link_resolver_public_enabled", True)
    monkeypatch.setattr(settings, "link_resolver_public_rate_limit_confirmed", True)
    monkeypatch.setattr(settings, "link_resolver_public_egress_confirmed", False)
    with pytest.raises(HTTPException) as error:
        capabilities(capability_request(client=("203.0.113.10", 43120)))
    assert error.value.status_code == 404

    async def run():
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
            response = await client.post("/api/utilities/links/resolve", json={"url": "https://example.com"})
        assert response.status_code == 404

    asyncio.run(run())


def test_vercel_public_gates_allow_only_the_resolver_and_never_the_background_tool(monkeypatch):
    _set_link_flags(monkeypatch)
    monkeypatch.setenv("VERCEL", "1")
    for setting in (
        "link_resolver_public_enabled",
        "link_resolver_public_rate_limit_confirmed",
        "link_resolver_public_egress_confirmed",
    ):
        monkeypatch.setattr(settings, setting, True)
    monkeypatch.setattr(settings, "background_remover_enabled", True)

    response = capabilities(capability_request(
        client=("203.0.113.10", 43120), origin="https://matheus2t.com.br"
    ))
    assert response.model_dump() == {
        "utilities_enabled": True,
        "link_resolver_enabled": True,
        "background_remover_enabled": False,
    }

    from app.utilities import router as router_module

    async def fake_resolve(url):
        return LinkResolveResponse(
            status="resolved", original_url=url, final_url="https://example.com/",
            final_status_code=200, redirect_count=0, redirects=[],
            security={"https": True, "warnings": [], "reputation_checked": False},
        )

    monkeypatch.setattr(router_module, "resolve_link", fake_resolve)

    async def run():
        transport = httpx.ASGITransport(app=main.app, client=("203.0.113.10", 43120))
        async with httpx.AsyncClient(transport=transport, base_url="https://matheus2t.com.br") as client:
            response = await client.post(
                "/api/utilities/links/resolve", json={"url": "https://example.com/"},
                headers={"Origin": "https://matheus2t.com.br"},
            )
        assert response.status_code == 200
        assert response.json()["final_url"] == "https://example.com/"

    asyncio.run(run())


def test_local_concurrency_limit_returns_retryable_429(monkeypatch):
    _set_link_flags(monkeypatch)
    monkeypatch.delenv("VERCEL", raising=False)
    from app.utilities import router as router_module

    acquired_slots = 0
    try:
        while acquired_slots < 4:
            assert router_module._RESOLVER_SLOTS.acquire(blocking=False)
            acquired_slots += 1

        async def run():
            transport = httpx.ASGITransport(app=main.app)
            async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
                return await client.post("/api/utilities/links/resolve", json={"url": "https://example.com"})

        response = asyncio.run(run())
        assert response.status_code == 429
        assert response.headers["retry-after"] == "2"
    finally:
        for _ in range(acquired_slots):
            router_module._RESOLVER_SLOTS.release()


@pytest.mark.parametrize(
    "client_ip,origin",
    [("203.0.113.9", None), ("127.0.0.1", "https://matheus2t.com.br")],
)
def test_resolver_rejects_nonlocal_client_or_origin(monkeypatch, client_ip, origin):
    _set_link_flags(monkeypatch)
    monkeypatch.delenv("VERCEL", raising=False)

    async def run():
        transport = httpx.ASGITransport(app=main.app, client=(client_ip, 43120))
        headers = {"Origin": origin} if origin else {}
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
            response = await client.post("/api/utilities/links/resolve", json={"url": "https://example.com"},
                                         headers=headers)
        assert response.status_code == 404

    asyncio.run(run())


def test_resolver_requires_both_flags_and_json_body(monkeypatch):
    monkeypatch.setattr(settings, "utilities_enabled", True)
    monkeypatch.setattr(settings, "link_resolver_enabled", False)
    monkeypatch.delenv("VERCEL", raising=False)

    async def run():
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
            disabled = await client.post("/api/utilities/links/resolve", json={"url": "https://example.com"})
            monkeypatch.setattr(settings, "link_resolver_enabled", True)
            wrong_type = await client.post("/api/utilities/links/resolve", content=b"{}",
                                          headers={"Content-Type": "text/plain"})
            bad_body = await client.post("/api/utilities/links/resolve", content=b"{bad",
                                         headers={"Content-Type": "application/json"})
        assert disabled.status_code == 404
        assert wrong_type.status_code == 415
        assert bad_body.status_code == 422

    asyncio.run(run())


def test_local_endpoint_calls_resolver_without_persisting(monkeypatch):
    _set_link_flags(monkeypatch)
    monkeypatch.delenv("VERCEL", raising=False)
    from app.utilities import router as router_module

    async def fake_resolve(url):
        assert url == "https://example.com/private-query?token=not-logged"
        return LinkResolveResponse(
            status="resolved", original_url=url, final_url=url, final_status_code=200,
            redirect_count=0, redirects=[],
            security={"https": True, "warnings": [], "reputation_checked": False},
        )

    monkeypatch.setattr(router_module, "resolve_link", fake_resolve)

    async def run():
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
            response = await client.post("/api/utilities/links/resolve",
                                         json={"url": "https://example.com/private-query?token=not-logged"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "resolved"
        assert payload["final_status_code"] == 200
        assert payload["security"]["reputation_checked"] is False

    asyncio.run(run())


def test_unexpected_resolver_error_does_not_log_submitted_url(monkeypatch, caplog):
    _set_link_flags(monkeypatch)
    monkeypatch.delenv("VERCEL", raising=False)
    from app.utilities import router as router_module

    async def fail(url):
        raise RuntimeError(f"transport error at {url}")

    monkeypatch.setattr(router_module, "resolve_link", fail)

    async def run():
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
            return await client.post("/api/utilities/links/resolve",
                                     json={"url": "https://example.com/?secret=private"})

    response = asyncio.run(run())
    assert response.status_code == 200
    assert response.json()["status"] == "service_unavailable"
    assert "example.com" not in caplog.text
    assert "private" not in caplog.text
    assert "RuntimeError" in caplog.text


def test_oversized_http_body_is_rejected_before_validation(monkeypatch):
    _set_link_flags(monkeypatch)
    monkeypatch.delenv("VERCEL", raising=False)

    async def run():
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
            response = await client.post("/api/utilities/links/resolve", content=b" " * 4097,
                                         headers={"Content-Type": "application/json"})
        assert response.status_code == 413

    asyncio.run(run())


def test_slow_request_body_times_out_before_consuming_a_resolver_slot(monkeypatch):
    _set_link_flags(monkeypatch)
    monkeypatch.delenv("VERCEL", raising=False)
    from app.utilities import router as router_module

    monkeypatch.setattr(router_module, "_REQUEST_BODY_TIMEOUT_SECONDS", 0.01)

    receives = 0

    async def receive():
        nonlocal receives
        receives += 1
        if receives == 1:
            return {"type": "http.request", "body": b'{"url":', "more_body": True}
        await asyncio.sleep(0.05)
        return {"type": "http.request", "body": b'"https://example.com"}', "more_body": False}

    request = Request({
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": "POST", "scheme": "http", "path": "/api/utilities/links/resolve",
        "raw_path": b"/api/utilities/links/resolve", "query_string": b"", "root_path": "",
        "headers": [(b"content-type", b"application/json")], "client": ("127.0.0.1", 43120),
        "server": ("localhost", 8000),
    }, receive=receive)

    async def run():
        with pytest.raises(HTTPException) as error:
            await router_module._read_request_body(request)
        assert error.value.status_code == 408

    asyncio.run(run())
    assert router_module._RESOLVER_SLOTS.acquire(blocking=False)
    router_module._RESOLVER_SLOTS.release()
