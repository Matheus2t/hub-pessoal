import base64
import time
from uuid import UUID

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app import mind_drive as drive

ADMIN = "11111111-2222-4333-8444-555555555555"
KEY = base64.urlsafe_b64encode(b"0123456789abcdef0123456789abcdef").decode().rstrip("=")


def enable_crypto(monkeypatch):
    monkeypatch.setattr(drive.settings, "mind_google_token_encryption_key", SecretStr(KEY))


def test_refresh_token_encryption_is_authenticated_and_context_bound(monkeypatch):
    enable_crypto(monkeypatch)
    encrypted = drive._encrypt("private-refresh-token", "refresh:" + ADMIN)
    assert encrypted.startswith("v1.")
    assert drive._decrypt(encrypted, "refresh:" + ADMIN) == "private-refresh-token"
    with pytest.raises(HTTPException) as error:
        drive._decrypt(encrypted, "session:" + ADMIN)
    assert error.value.status_code == 503


def test_oauth_state_binds_admin_origin_cookie_and_expiry(monkeypatch):
    enable_crypto(monkeypatch)
    monkeypatch.setattr(drive.settings, "mind_google_drive_allowed_origins", "https://site.example")
    state = drive._make_state(ADMIN, "nonce-123", "https://site.example", now=1_700_000_000)
    claims = drive._verify_state(state, "nonce-123", now=1_700_000_300)
    assert claims["admin"] == str(UUID(ADMIN))
    assert claims["origin"] == "https://site.example"
    for bad_state, bad_cookie, bad_now in [
        (state + "x", "nonce-123", 1_700_000_300),
        (state, "wrong", 1_700_000_300),
        (state, "nonce-123", 1_700_000_601),
    ]:
        with pytest.raises(HTTPException) as error:
            drive._verify_state(bad_state, bad_cookie, now=bad_now)
        assert error.value.status_code == 400


def test_http_origins_are_limited_to_explicit_loopback(monkeypatch):
    monkeypatch.setattr(drive.settings, "mind_google_drive_allowed_origins",
                        "https://site.example,http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.7:3000")
    assert drive._origin_allowed("https://site.example") == "https://site.example"
    assert drive._origin_allowed("http://localhost:3000") == "http://localhost:3000"
    assert drive._origin_allowed("http://127.0.0.1:3000") == "http://127.0.0.1:3000"
    for origin in ("http://192.168.1.7:3000", "https://site.example.evil", "https://user@site.example", "https://site.example:bad"):
        with pytest.raises(HTTPException):
            drive._origin_allowed(origin)


@pytest.mark.parametrize("uri", [
    "https://www.googleapis.com/upload/drive/v3/files/session-token",
    "https://upload.googleapis.com/upload/drive/v3/files/session-token",
])
def test_google_resumable_session_uri_allowlist(uri):
    assert drive._session_uri(uri) == uri


@pytest.mark.parametrize("uri", [
    "http://www.googleapis.com/upload/drive/v3/files/x",
    "https://evil.example/upload/drive/v3/files/x",
    "https://user@www.googleapis.com/upload/drive/v3/files/x",
    "https://www.googleapis.com:444/upload/drive/v3/files/x",
    "https://www.googleapis.com:99999/upload/drive/v3/files/x",
    "https://www.googleapis.com/other/x",
])
def test_google_resumable_session_rejects_untrusted_uri(uri):
    with pytest.raises(HTTPException) as error:
        drive._session_uri(uri)
    assert error.value.status_code == 502


def test_quota_and_confirmed_range_preserve_zero_as_a_real_value():
    assert drive.account_free_bytes({"limit": "100", "usage": "100"}) == 0
    assert drive.account_free_bytes({"limit": "100", "usage": "0"}) == 100
    assert drive.account_free_bytes({"limit": "unknown", "usage": "0"}) is None
    assert drive.parse_confirmed_range(None) == 0
    assert drive.parse_confirmed_range("bytes=0-0") == 1
    assert drive.parse_confirmed_range("bytes=0-262143") == 262144
    with pytest.raises(ValueError):
        drive.parse_confirmed_range("bytes=10-20")


def test_asset_snapshot_includes_identity_and_excludes_folders_and_out_of_range_sizes():
    rows = drive._asset_snapshot([
        {"id": "abcdefghij", "name": "clip.mp4", "mimeType": "video/mp4", "size": "42",
         "appProperties": {"2tMindUpload": "a" * 32}, "parents": ["folder-id-123"], "trashed": False},
        {"id": "folder-id-123", "name": "folder", "mimeType": "application/vnd.google-apps.folder", "size": "0"},
        {"id": "oversized-file", "name": "bad.mp4", "mimeType": "video/mp4", "size": "5000000001"},
    ])
    assert rows == [{"file_id": "abcdefghij", "file_name": "clip.mp4", "size_bytes": 42, "trashed": False,
                     "mime_type": "video/mp4", "upload_id": "a" * 32, "parents": ["folder-id-123"]}]
