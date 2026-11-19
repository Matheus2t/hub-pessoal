"""Real loopback TLS integration: FastAPI route -> resolver -> pinned IP -> TLS verification."""

import asyncio
import shutil

import httpx
import pytest

from link_tls_support import (
    LoopbackTestBackend,
    ControlledTLSRedirectServer,
    create_test_certificate,
)


def test_fastapi_resolver_uses_real_tls_and_rejects_untrusted_or_mismatched_certificates(monkeypatch, tmp_path):
    if not shutil.which("openssl"):
        pytest.skip("OpenSSL is unavailable; local real-TLS fixture cannot be generated.")

    certificate, private_key = create_test_certificate(tmp_path)
    monkeypatch.delenv("VERCEL", raising=False)

    from app import main
    from app.utilities import link_resolver, link_transport, router
    from link_tls_support import TEST_PUBLIC_IP

    # The local resolver endpoint still runs its normal guards; only its DNS and socket peer
    # are redirected inside this test process to an ephemeral TLS server.
    router.settings.utilities_enabled = True
    router.settings.link_resolver_enabled = True
    original_ssl_factory = link_transport.ssl.create_default_context

    def trust_ephemeral_test_certificate(*args, **kwargs):
        context = original_ssl_factory(*args, **kwargs)
        context.load_verify_locations(cafile=str(certificate))
        return context

    async def scenario():
        server = await ControlledTLSRedirectServer(certificate, private_key).start()
        try:
            async def public_test_dns(_hostname, _port):
                return (TEST_PUBLIC_IP,)

            async def controlled_http(target, addresses, **kwargs):
                return await link_transport.fetch_headers(
                    target,
                    addresses,
                    backend_factory=lambda: LoopbackTestBackend(server.port),
                    **kwargs,
                )

            async def controlled_resolve(url):
                return await link_resolver.resolve_link(
                    url,
                    dns_lookup=public_test_dns,
                    request_headers=controlled_http,
                )

            monkeypatch.setattr(router, "resolve_link", controlled_resolve)
            monkeypatch.setattr(link_transport.ssl, "create_default_context", trust_ephemeral_test_certificate)
            transport = httpx.ASGITransport(app=main.app, client=("127.0.0.1", 43210))
            async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1") as client:
                good = await client.post(
                    "/api/utilities/links/resolve",
                    json={"url": "https://resolver.test/short"},
                    headers={"origin": "http://localhost:3000"},
                )
                assert good.status_code == 200
                payload = good.json()
                assert payload["status"] == "resolved"
                assert payload["final_status_code"] == 404
                assert payload["redirect_count"] == 1
                assert payload["final_url"] == "https://resolver.test/landing"

                wrong_hostname = await client.post(
                    "/api/utilities/links/resolve",
                    json={"url": "https://mismatch.test/short"},
                    headers={"origin": "http://localhost:3000"},
                )
                assert wrong_hostname.status_code == 200
                assert wrong_hostname.json()["status"] == "tls_error"

                monkeypatch.setattr(link_transport.ssl, "create_default_context", original_ssl_factory)
                untrusted_chain = await client.post(
                    "/api/utilities/links/resolve",
                    json={"url": "https://resolver.test/short"},
                    headers={"origin": "http://localhost:3000"},
                )
                assert untrusted_chain.status_code == 200
                assert untrusted_chain.json()["status"] == "tls_error"

            assert server.sni_names.count("resolver.test") >= 3
            assert "mismatch.test" in server.sni_names
            assert server.host_headers[:2] == ["resolver.test", "resolver.test"]
            assert server.requests[:2] == ["HEAD /short HTTP/1.1", "HEAD /landing HTTP/1.1"]
        finally:
            await server.close()

    asyncio.run(scenario())

def test_vercel_forces_utilities_api_off_even_when_local_flags_are_enabled(monkeypatch):
    from app import main
    from app.config import settings

    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setattr(settings, "utilities_enabled", True)
    monkeypatch.setattr(settings, "link_resolver_enabled", True)

    async def scenario():
        transport = httpx.ASGITransport(app=main.app, client=("127.0.0.1", 43210))
        async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1") as client:
            capabilities = await client.get("/api/utilities/capabilities")
            resolution = await client.post(
                "/api/utilities/links/resolve",
                json={"url": "https://resolver.test/short"},
            )
        assert capabilities.status_code == 404
        assert resolution.status_code == 404

    asyncio.run(scenario())
