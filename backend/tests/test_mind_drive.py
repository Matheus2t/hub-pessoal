import asyncio
import base64
import time
from uuid import UUID

import httpx
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


@pytest.mark.parametrize("is_admin", [True, False])
def test_require_admin_calls_zero_argument_rpc_without_json_body(monkeypatch, is_admin):
    rpc_requests = []

    def respond(request):
        if request.url.path == "/auth/v1/user":
            return httpx.Response(200, json={"id": ADMIN})
        if request.url.path == "/rest/v1/rpc/mind_is_admin":
            rpc_requests.append(request)
            if request.content:
                return httpx.Response(404, json={"code": "PGRST202"})
            return httpx.Response(200, json=is_admin)
        return httpx.Response(404)

    transport = httpx.MockTransport(respond)
    original_client = drive.httpx.AsyncClient
    monkeypatch.setattr(drive.httpx, "AsyncClient", lambda *, timeout: original_client(transport=transport, timeout=timeout))
    monkeypatch.setattr(drive, "_require_feature", lambda: None)
    monkeypatch.setattr(drive.settings, "mind_supabase_url", "http://supabase.local")
    monkeypatch.setattr(drive.settings, "mind_supabase_publishable_key", "test-publishable-key")

    if is_admin:
        assert asyncio.run(drive._require_admin("Bearer synthetic-user-token")) == ADMIN
    else:
        with pytest.raises(HTTPException) as error:
            asyncio.run(drive._require_admin("Bearer synthetic-user-token"))
        assert error.value.status_code == 403
    assert len(rpc_requests) == 1
    assert rpc_requests[0].content == b""
    assert "content-type" not in rpc_requests[0].headers


def test_folder_lookup_uses_drive_v3_app_properties_query(monkeypatch):
    calls = []

    async def fake_drive_request(method, path, access_token, *, params=None, body=None, headers=None):
        calls.append((method, path, params))
        return httpx.Response(200, json={"files": [{"id": "existing-folder"}]})

    monkeypatch.setattr(drive, "_drive_request", fake_drive_request)
    folder_id = asyncio.run(drive._get_or_create_folder("token-not-logged", "videos", "Vídeos", "parent-123"))

    assert folder_id == "existing-folder"
    assert calls == [("GET", "/files", {
        "q": "trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='2tMindFolder' and value='videos' } and 'parent-123' in parents",
        "pageSize": 10,
        "fields": "files(id,appProperties,parents)",
    })]


def test_folder_lookup_logs_only_sanitized_google_status_and_reason(monkeypatch, caplog):
    secret_message = "private@example.invalid access-token-never-log"

    async def fail_drive_request(method, path, access_token, *, params=None, body=None, headers=None):
        return httpx.Response(403, json={"error": {"code": 403, "message": secret_message,
            "errors": [{"reason": "accessNotConfigured", "message": secret_message}]}})

    monkeypatch.setattr(drive, "_drive_request", fail_drive_request)
    with caplog.at_level("WARNING", logger="2t.mind_drive.google"):
        with pytest.raises(HTTPException) as error:
            asyncio.run(drive._get_or_create_folder("token-never-log", "root", "2T", None))

    assert error.value.status_code == 502
    assert error.value.detail == "Não foi possível consultar a pasta gerenciada no Drive."
    assert "http_status=403 reason=accessNotConfigured" in caplog.text
    assert secret_message not in caplog.text
    assert "token-never-log" not in caplog.text


@pytest.mark.parametrize("scenario", ["commit_response_lost", "rollback", "retry_after_restart"])
def test_publish_reconciliation_preserves_previous_media_for_ui_cleanup(monkeypatch, scenario):
    upload_id = "a" * 32
    file_id = "Abcdefghij0123456789"
    item_id = "22222222-3333-4444-8555-666666666666"
    previous_storage_path = "22222222-3333-4444-8555-666666666666/33333333-4444-4555-8666-777777777777.mp4"
    previous_drive_file_id = "OldDriveFileId123456"
    initial_status = "published" if scenario == "retry_after_restart" else "uploaded"
    row = {"status": initial_status, "item_id": item_id, "drive_file_id": file_id, "confirmed_size": 1024,
           "previous_storage_path": previous_storage_path if initial_status == "published" else None,
           "previous_drive_file_id": previous_drive_file_id if initial_status == "published" else None}
    state = dict(row)
    deleted_permissions = []
    publish_calls = []

    async def require_admin(_authorization):
        return ADMIN

    async def rpc(name, _body):
        if name == "mind_drive_get_upload":
            return dict(state)
        if name == "mind_drive_publish_video":
            publish_calls.append(name)
            if scenario == "commit_response_lost":
                state.update(status="published", previous_storage_path=previous_storage_path,
                             previous_drive_file_id=previous_drive_file_id)
            raise HTTPException(503, "database response lost")
        raise AssertionError(f"unexpected RPC: {name}")

    async def access_token(_admin_id):
        return "synthetic-access-token", {"folder_id": "folder-id-123"}

    async def verified_file(_row, _access, _connection):
        return {"id": file_id}

    async def drive_request(method, path, _access, *, params=None, body=None, headers=None):
        if method == "GET" and path.endswith("/permissions"):
            permissions = ([{"id": "existing-permission", "type": "anyone", "role": "reader"}]
                           if scenario == "retry_after_restart" else [])
            return httpx.Response(200, json={"permissions": permissions})
        if method == "POST" and path.endswith("/permissions"):
            return httpx.Response(200, json={"id": "permission-id", "type": "anyone", "role": "reader"})
        if method == "DELETE":
            deleted_permissions.append(path)
            return httpx.Response(204)
        raise AssertionError(f"unexpected Drive request: {method} {path}")

    monkeypatch.setattr(drive, "_require_admin", require_admin)
    monkeypatch.setattr(drive, "_rpc", rpc)
    monkeypatch.setattr(drive, "_access_token", access_token)
    monkeypatch.setattr(drive, "_verified_upload_file", verified_file)
    monkeypatch.setattr(drive, "_drive_request", drive_request)
    body = drive.VideoMetadata(id=UUID(item_id), title="Aula", topic="Estudos", tags=[],
        description="", content="", created_at="2026-11-26T00:00:00Z", updated_at="2026-11-26T00:00:00Z")

    if scenario == "rollback":
        with pytest.raises(HTTPException) as error:
            asyncio.run(drive.publish_upload(upload_id, body, "Bearer synthetic-user-token"))
        assert error.value.status_code == 503
        assert deleted_permissions == [f"/files/{file_id}/permissions/permission-id"]
        assert state["status"] == "uploaded"
    else:
        result = asyncio.run(drive.publish_upload(upload_id, body, "Bearer synthetic-user-token"))
        assert result["published"] is True
        assert result["drive_file_id"] == file_id
        assert result["previous_storage_path"] == previous_storage_path
        assert result["previous_drive_file_id"] == previous_drive_file_id
        assert deleted_permissions == []
        assert publish_calls == ([] if scenario == "retry_after_restart" else ["mind_drive_publish_video"])
