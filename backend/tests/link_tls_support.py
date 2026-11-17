"""Ephemeral TLS server and redirect-only network adapter for resolver integration tests."""

from __future__ import annotations

import asyncio
import ipaddress
import shutil
import ssl
import subprocess
from pathlib import Path

import httpcore
from httpcore._backends.auto import AutoBackend

TEST_PUBLIC_IP = ipaddress.ip_address("93.184.216.34")


def create_test_certificate(directory: Path, hostname: str = "resolver.test") -> tuple[Path, Path]:
    openssl = shutil.which("openssl")
    if not openssl:
        raise RuntimeError("OpenSSL executable is required for the local TLS integration test.")
    certificate = directory / "resolver-test.crt"
    private_key = directory / "resolver-test.key"
    config = directory / "openssl-test.cnf"
    config.write_text(
        "[req]\n"
        "distinguished_name = test_dn\n"
        "prompt = no\n"
        "[test_dn]\n"
        "CN = resolver.test\n",
        encoding="ascii",
    )
    subprocess.run(
        [
            openssl, "req", "-config", str(config), "-x509", "-newkey", "rsa:2048", "-sha256", "-nodes",
            "-keyout", str(private_key), "-out", str(certificate), "-days", "1",
            "-subj", f"/CN={hostname}", "-addext", f"subjectAltName=DNS:{hostname}",
            "-addext", "basicConstraints=critical,CA:TRUE",
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    return certificate, private_key


class ControlledTLSRedirectServer:
    """Local TLS responder. It only returns a redirect and a terminal 404; it never fetches URLs."""

    def __init__(self, certificate: Path, private_key: Path):
        self.sni_names: list[str | None] = []
        self.host_headers: list[str] = []
        self.requests: list[str] = []
        self._server: asyncio.AbstractServer | None = None
        self._context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        self._context.load_cert_chain(str(certificate), str(private_key))
        self._context.set_servername_callback(self._capture_sni)

    @property
    def port(self) -> int:
        if self._server is None or not self._server.sockets:
            raise RuntimeError("TLS test server has not started.")
        return int(self._server.sockets[0].getsockname()[1])

    async def start(self) -> "ControlledTLSRedirectServer":
        self._server = await asyncio.start_server(self._handle, "127.0.0.1", 0, ssl=self._context)
        return self

    def _capture_sni(self, _connection, server_name: str | None, _context) -> None:
        self.sni_names.append(server_name)

    async def _handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            raw = await reader.readuntil(b"\r\n\r\n")
            lines = raw.decode("iso-8859-1").split("\r\n")
            request_line = lines[0]
            self.requests.append(request_line)
            for line in lines[1:]:
                if line.lower().startswith("host:"):
                    self.host_headers.append(line.split(":", 1)[1].strip())
                    break
            path = request_line.split(" ")[1]
            if path == "/short":
                response = b"HTTP/1.1 302 Found\r\nLocation: /landing\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
            else:
                response = b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
            writer.write(response)
            await writer.drain()
        except (ConnectionError, asyncio.IncompleteReadError, ssl.SSLError):
            # Expected when a negative TLS case rejects the server certificate.
            pass
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except (ConnectionError, ssl.SSLError):
                pass

    async def close(self) -> None:
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None


class LoopbackTestBackend(httpcore.AsyncNetworkBackend):
    """Redirect a test-only pinned public IP to the local TLS fixture, without external traffic."""

    def __init__(self, local_port: int):
        self.local_port = local_port
        self.delegate = AutoBackend()

    async def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        if str(host) != str(TEST_PUBLIC_IP) or int(port) != 443:
            raise httpcore.ConnectError("Unexpected address in controlled TLS test.")
        return await self.delegate.connect_tcp(
            host="127.0.0.1",
            port=self.local_port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )

    async def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise httpcore.ConnectError("Unix sockets are disabled in the TLS fixture.")

    async def sleep(self, seconds):
        await self.delegate.sleep(seconds)
