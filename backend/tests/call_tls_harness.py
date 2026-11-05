"""LOCAL test only: native TLS/WSS with simulated cloudflared origin headers.

No public tunnel or internet listener. Use 127.0.0.1 and a self-signed test cert.
"""
import ipaddress
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


def certificate(folder):
    # Optional test tooling already present on this workstation; not a runtime dependency.
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "2T Call LOCAL TEST ONLY")])
    now = datetime.now(timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now - timedelta(minutes=1))
            .not_valid_after(now + timedelta(days=1))
            .add_extension(x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]), critical=False)
            .sign(key, hashes.SHA256()))
    (folder / "key.pem").write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    (folder / "cert.pem").write_bytes(cert.public_bytes(serialization.Encoding.PEM))


if __name__ == "__main__":
    if sys.argv[1] == "--serve":
        import threading

        import uvicorn

        folder = Path(sys.argv[3])
        server = uvicorn.Server(uvicorn.Config(
            "backend.tests.call_tls_harness:app", host="127.0.0.1", port=int(sys.argv[2]),
            proxy_headers=False, ssl_keyfile=str(folder / "key.pem"), ssl_certfile=str(folder / "cert.pem"),
            ws_max_size=32768, access_log=False, log_level="warning", timeout_graceful_shutdown=3,
        ))

        def stop_at_eof():
            sys.stdin.buffer.read()
            server.should_exit = True

        threading.Thread(target=stop_at_eof, daemon=True).start()
        server.run()
    else:
        certificate(sys.argv[1])
else:
    from backend.app.call_signaling import app as backend

    if channel_path := os.environ.get("CALL_TEST_CHANNEL_SQLITE"):
        from backend.app.call_channel_store import SQLiteChannelStore
        from backend.app.call_signaling import create_app

        backend = create_app(channel_store=SQLiteChannelStore(Path(channel_path)))

    async def app(scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            # The browser-to-harness connection is actual HTTPS/WSS. Only the
            # Cloudflare -> loopback hop/headers are emulated inside this harness.
            headers = [(k, v) for k, v in scope["headers"] if k not in (b"x-forwarded-proto", b"cf-connecting-ip")]
            headers.extend([(b"x-forwarded-proto", b"https"), (b"cf-connecting-ip", b"198.51.100.44")])
            scope = {**scope, "headers": headers, "scheme": "http"}
        await backend(scope, receive, send)
