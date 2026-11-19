"""Local-only API harness for the Desencurtador browser integration test."""

from __future__ import annotations

import asyncio
import importlib
import os
import shutil
import sys
import threading
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))


async def serve(port: int) -> None:
    os.environ.pop("VERCEL", None)
    os.environ["UTILITIES_ENABLED"] = "true"
    os.environ["LINK_RESOLVER_ENABLED"] = "true"
    os.environ["BACKGROUND_REMOVER_ENABLED"] = "true"
    os.environ["API_CORS_ORIGINS"] = f"http://127.0.0.1:{port}"

    from app import main
    from app.utilities import link_resolver, link_transport
    from link_tls_support import ControlledTLSRedirectServer, LoopbackTestBackend, TEST_PUBLIC_IP, create_test_certificate
    import uvicorn

    router_module = importlib.import_module("app.utilities.router")
    fixture_dir = BACKEND / "tests" / f".link-tls-browser-{uuid.uuid4().hex}"
    fixture_dir.mkdir()
    tls_server = None
    original_ssl_factory = link_transport.ssl.create_default_context
    try:
        certificate, private_key = create_test_certificate(fixture_dir)
        tls_server = await ControlledTLSRedirectServer(certificate, private_key).start()

        def trust_ephemeral_test_certificate(*args, **kwargs):
            context = original_ssl_factory(*args, **kwargs)
            context.load_verify_locations(cafile=str(certificate))
            return context

        link_transport.ssl.create_default_context = trust_ephemeral_test_certificate

        async def dns_lookup(_hostname: str, _port: int):
            return (TEST_PUBLIC_IP,)

        async def controlled_fetch(target, addresses, **kwargs):
            return await link_transport.fetch_headers(
                target,
                addresses,
                backend_factory=lambda: LoopbackTestBackend(tls_server.port),
                **kwargs,
            )

        async def controlled_resolve(url: str):
            return await link_resolver.resolve_link(url, dns_lookup=dns_lookup, request_headers=controlled_fetch)

        router_module.resolve_link = controlled_resolve
        server = uvicorn.Server(uvicorn.Config(
            main.app,
            host="127.0.0.1",
            port=port,
            log_level="error",
            access_log=False,
        ))
        loop = asyncio.get_running_loop()

        def stop_on_stdin_close() -> None:
            sys.stdin.buffer.read()
            loop.call_soon_threadsafe(setattr, server, "should_exit", True)

        threading.Thread(target=stop_on_stdin_close, daemon=False).start()
        await server.serve()
    finally:
        link_transport.ssl.create_default_context = original_ssl_factory
        if tls_server:
            await tls_server.close()
        shutil.rmtree(fixture_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(serve(int(sys.argv[1])))
