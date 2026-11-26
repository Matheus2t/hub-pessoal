"""Private Google Drive integration for the public 2T Mente library.

The browser sends resumable chunks straight to Google's session URI. OAuth
refresh tokens and session URIs are encrypted at rest in private Supabase
tables; neither is written to logs or returned by public catalog endpoints.
"""
from __future__ import annotations

import base64
import hashlib
import ipaddress
import hmac
import json
import logging
import os
import re
import secrets
import time
from datetime import datetime, timezone
from urllib.parse import urlencode, urlsplit
from uuid import UUID

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import APIRouter, Header, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from .config import settings

router = APIRouter(prefix="/api/mind-drive", tags=["mind-drive"])
_logger = logging.getLogger("2t.mind_drive.google")
MAX_MANAGED_STORAGE_BYTES = 5_000_000_000
MAX_CHUNK_BYTES = 8 * 1024 * 1024  # a multiple of Drive's 256 KiB alignment
MIN_CHUNK_BYTES = 256 * 1024
UPLOAD_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60
_GOOGLE_API = "https://www.googleapis.com/drive/v3"
_GOOGLE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_STATE_COOKIE = "2t_mind_drive_oauth_state"
_MANAGED_QUERY = "appProperties has { key='2tMindManaged' and value='v1' }"
_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def _google_error_reason(response: httpx.Response) -> str:
    """Return Google's machine reason only; never expose its message or request data."""
    try:
        error = response.json().get("error", {})
        reasons = error.get("errors", []) if isinstance(error, dict) else []
        reason = reasons[0].get("reason") if reasons and isinstance(reasons[0], dict) else None
        reason = reason or (error.get("status") if isinstance(error, dict) else None)
    except (ValueError, AttributeError, TypeError):
        reason = None
    if not isinstance(reason, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_.-]{0,79}", reason):
        return "unknown"
    return reason


def _log_drive_list_failure(response: httpx.Response, operation: str) -> None:
    # Do not log Google's message, q, account identity, URL, or authorization headers.
    safe_operation = operation if operation in {"folder_lookup", "inventory"} else "unknown"
    _logger.warning("Google Drive files.list failed operation=%s http_status=%d reason=%s",
                   safe_operation, response.status_code, _google_error_reason(response))


class UploadStart(BaseModel):
    upload_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    item_id: UUID
    file_name: str = Field(min_length=1, max_length=180)
    file_size: int = Field(gt=0, le=MAX_MANAGED_STORAGE_BYTES)


class VideoMetadata(BaseModel):
    id: UUID
    title: str = Field(min_length=1, max_length=180)
    topic: str = Field(max_length=80)
    tags: list[str] = Field(max_length=12)
    description: str = Field(max_length=3000)
    content: str = Field(max_length=250000)
    favorite: bool = False
    created_at: datetime
    updated_at: datetime
    poster_data_url: str | None = Field(default=None, max_length=65536)


def _feature_ready() -> bool:
    return bool(
        settings.mind_google_drive_enabled
        and settings.mind_supabase_url
        and settings.mind_supabase_publishable_key
        and settings.mind_supabase_service_role_key
        and settings.google_drive_client_id
        and settings.google_drive_client_secret
        and settings.google_drive_redirect_uri
        and settings.mind_google_token_encryption_key
    )


def _require_feature() -> None:
    if not _feature_ready():
        raise HTTPException(404, "O armazenamento Google Drive ainda não está habilitado neste ambiente.")


def _secret(value) -> str:
    return value.get_secret_value() if value else ""


def _encryption_key() -> bytes:
    raw = _secret(settings.mind_google_token_encryption_key)
    try:
        key = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
    except Exception as exc:
        raise HTTPException(503, "A chave de criptografia do armazenamento não está configurada corretamente.") from exc
    if len(key) != 32:
        raise HTTPException(503, "A chave de criptografia do armazenamento deve conter 32 bytes em Base64.")
    return key


def _encrypt(value: str, context: str) -> str:
    nonce = secrets.token_bytes(12)
    encrypted = AESGCM(_encryption_key()).encrypt(nonce, value.encode("utf-8"), context.encode("utf-8"))
    return "v1." + base64.urlsafe_b64encode(nonce + encrypted).decode("ascii").rstrip("=")


def _decrypt(value: str, context: str) -> str:
    if not value.startswith("v1."):
        raise HTTPException(503, "A credencial armazenada precisa ser reconectada.")
    encoded = value[3:]
    try:
        raw = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        return AESGCM(_encryption_key()).decrypt(raw[:12], raw[12:], context.encode("utf-8")).decode("utf-8")
    except Exception as exc:
        raise HTTPException(503, "Não foi possível abrir a credencial armazenada. Reconecte o Google Drive.") from exc


def _state_secret() -> bytes:
    return hashlib.sha256(b"2t-mind-drive-oauth-state\0" + _encryption_key()).digest()


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _make_state(admin_id: str, nonce: str, origin: str, now: int | None = None) -> str:
    payload = _b64url(json.dumps({"admin": admin_id, "nonce": nonce, "origin": origin, "iat": now or int(time.time())}, separators=(",", ":")).encode())
    signature = _b64url(hmac.new(_state_secret(), payload.encode(), hashlib.sha256).digest())
    return payload + "." + signature


def _verify_state(state: str, cookie: str, now: int | None = None) -> dict:
    try:
        payload, signature = state.split(".", 1)
        expected = _b64url(hmac.new(_state_secret(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        age = (int(time.time()) if now is None else now) - int(claims["iat"])
        if age < 0 or age > 600 or not hmac.compare_digest(str(claims["nonce"]), cookie):
            raise ValueError("expired or mismatched")
        if not _UUID.fullmatch(str(claims["admin"])):
            raise ValueError("admin")
        claims["origin"] = _origin_allowed(str(claims.get("origin", "")))
        return claims
    except Exception as exc:
        raise HTTPException(400, "A autorização Google expirou ou não corresponde a esta sessão. Inicie novamente.") from exc


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Entre na conta administrativa da Mente.")
    token = authorization[7:].strip()
    if not token or len(token) > 8192:
        raise HTTPException(401, "Sessão administrativa inválida.")
    return token


async def _require_admin(authorization: str | None) -> str:
    _require_feature()
    token = _bearer(authorization)
    url = (settings.mind_supabase_url or "").rstrip("/")
    key = settings.mind_supabase_publishable_key or ""
    headers = {"apikey": key, "Authorization": "Bearer " + token}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            user_response = await client.get(url + "/auth/v1/user", headers=headers)
            if user_response.status_code != 200:
                raise HTTPException(401, "A sessão administrativa expirou. Entre novamente.")
            user = user_response.json()
            admin_id = str(user.get("id", ""))
            if not _UUID.fullmatch(admin_id):
                raise HTTPException(401, "Identidade administrativa inválida.")
            # mind_is_admin() takes no arguments; an empty JSON object asks
            # PostgREST to find a one-argument overload instead.
            admin_response = await client.post(url + "/rest/v1/rpc/mind_is_admin", headers=headers)
            if admin_response.status_code != 200 or admin_response.json() is not True:
                raise HTTPException(403, "Esta conta não tem permissão para gerenciar a Mente.")
            return admin_id
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Não foi possível confirmar a sessão administrativa no Supabase.") from exc


async def _rpc(name: str, body: dict) -> object:
    _require_feature()
    url = (settings.mind_supabase_url or "").rstrip("/")
    key = _secret(settings.mind_supabase_service_role_key)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(url + "/rest/v1/rpc/" + name, headers={"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}, json=body)
        if response.status_code >= 400:
            raise HTTPException(503, "O banco não confirmou a operação segura do armazenamento.")
        return response.json()
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(503, "O armazenamento administrativo está indisponível.") from exc


async def _drive_request(method: str, path: str, access_token: str, *, params=None, body=None, headers=None) -> httpx.Response:
    try:
        async with httpx.AsyncClient(timeout=45, follow_redirects=False) as client:
            response = await client.request(method, path if path.startswith("https://") else _GOOGLE_API + path,
                params=params, json=body, headers={"Authorization": "Bearer " + access_token, **(headers or {})})
        return response
    except httpx.HTTPError as exc:
        raise HTTPException(503, "O Google Drive não respondeu. Tente novamente.") from exc


async def _connection(admin_id: str) -> dict:
    value = await _rpc("mind_drive_get_connection", {"p_admin_id": admin_id})
    if not isinstance(value, dict) or not value.get("refresh_token_cipher"):
        raise HTTPException(409, "Conecte uma conta Google Drive antes de enviar vídeos.")
    return value


async def _access_token(admin_id: str, connection: dict | None = None) -> tuple[str, dict]:
    connection = connection or await _connection(admin_id)
    refresh = _decrypt(str(connection["refresh_token_cipher"]), "refresh:" + admin_id)
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(_TOKEN_URL, data={
                "client_id": settings.google_drive_client_id,
                "client_secret": _secret(settings.google_drive_client_secret),
                "refresh_token": refresh,
                "grant_type": "refresh_token",
            })
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Não foi possível renovar a conexão com o Google Drive.") from exc
    if response.status_code != 200:
        raise HTTPException(401, "A autorização Google expirou ou foi revogada. Reconecte o Drive.")
    data = response.json()
    access_token = data.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise HTTPException(502, "O Google não retornou uma sessão válida.")
    return access_token, connection


async def _about(access_token: str) -> dict:
    response = await _drive_request("GET", "/about", access_token, params={"fields": "user(emailAddress),storageQuota(limit,usage,usageInDrive,usageInDriveTrash)"})
    if response.status_code != 200:
        raise HTTPException(502, "Não foi possível consultar o armazenamento da conta Google.")
    return response.json()


async def _managed_files(access_token: str) -> list[dict]:
    files: list[dict] = []
    token = None
    for _ in range(1000):
        response = await _drive_request("GET", "/files", access_token, params={
            "q": _MANAGED_QUERY,
            "spaces": "drive",
            "pageSize": 1000,
            "orderBy": "createdTime",
            "fields": "nextPageToken,files(id,name,mimeType,size,trashed,appProperties,createdTime,modifiedTime,parents,webViewLink)",
            **({"pageToken": token} if token else {}),
        })
        if response.status_code != 200:
            _log_drive_list_failure(response, "inventory")
            raise HTTPException(502, "Não foi possível reconciliar os arquivos gerenciados no Google Drive.")
        page = response.json()
        files.extend(item for item in page.get("files", []) if isinstance(item, dict) and item.get("id") and str(item.get("size", "0")).isdigit())
        token = page.get("nextPageToken")
        if not token:
            return files
    raise HTTPException(502, "O inventário do Google Drive excede o limite seguro de reconciliação.")


def _asset_snapshot(files: list[dict]) -> list[dict]:
    result = []
    for item in files:
        if item.get("mimeType") == "application/vnd.google-apps.folder":
            continue
        size = int(item.get("size", 0))
        if size < 0 or size > MAX_MANAGED_STORAGE_BYTES:
            continue
        app = item.get("appProperties") or {}
        result.append({"file_id": str(item["id"]), "file_name": str(item.get("name", "arquivo"))[:180],
                       "size_bytes": size, "trashed": item.get("trashed") is True,
                       "mime_type": item.get("mimeType"), "upload_id": app.get("2tMindUpload"),
                       "parents": [str(parent) for parent in item.get("parents", []) if isinstance(parent, str)]})
    return result


def _origin_allowed(origin: str | None) -> str:
    if not origin:
        raise HTTPException(403, "A origem do navegador não foi identificada.")
    allowed = {part.strip().rstrip("/") for part in settings.mind_google_drive_allowed_origins.split(",") if part.strip()}
    try:
        parsed = urlsplit(origin)
        parsed.port
    except ValueError as exc:
        raise HTTPException(403, "Esta origem não está autorizada para upload direto.") from exc
    if (parsed.scheme not in ("https", "http") or not parsed.netloc or parsed.username or parsed.password or
            parsed.path or parsed.query or parsed.fragment or origin.rstrip("/") not in allowed):
        raise HTTPException(403, "Esta origem não está autorizada para upload direto.")
    if parsed.scheme == "http":
        host = (parsed.hostname or "").lower()
        try:
            local_http = host == "localhost" or ipaddress.ip_address(host).is_loopback
        except ValueError:
            local_http = False
        if not local_http:
            raise HTTPException(403, "Uploads sem HTTPS são permitidos somente em localhost.")
    return origin.rstrip("/")


def _session_uri(value: str | None) -> str:
    if not value:
        raise HTTPException(502, "O Google não criou uma sessão retomável.")
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError as exc:
        raise HTTPException(502, "O Google retornou um endereço de upload inesperado.") from exc
    if parsed.scheme != "https" or parsed.hostname not in {"www.googleapis.com", "upload.googleapis.com"} or parsed.username or parsed.password or port not in (None, 443) or not parsed.path.startswith("/upload/drive/v3/"):
        raise HTTPException(502, "O Google retornou um endereço de upload inesperado.")
    return value


async def _get_or_create_folder(access_token: str, role: str, name: str, parent: str | None) -> str:
    q = "trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='2tMindFolder' and value='" + role + "' }"
    if parent:
        q += " and '" + parent.replace("'", "") + "' in parents"
    found = await _drive_request("GET", "/files", access_token, params={"q": q, "pageSize": 10, "fields": "files(id,appProperties,parents)"})
    if found.status_code != 200:
        _log_drive_list_failure(found, "folder_lookup")
        raise HTTPException(502, "Não foi possível consultar a pasta gerenciada no Drive.")
    rows = found.json().get("files", [])
    if rows:
        return str(rows[0]["id"])
    body = {"name": name, "mimeType": "application/vnd.google-apps.folder", "appProperties": {"2tMindFolder": role}}
    if parent:
        body["parents"] = [parent]
    created = await _drive_request("POST", "/files", access_token, params={"fields": "id"}, body=body)
    if created.status_code not in (200, 201) or not created.json().get("id"):
        raise HTTPException(502, "Não foi possível criar a pasta exclusiva 2T/Mente/Vídeos no Drive.")
    return str(created.json()["id"])


async def _ensure_video_folder(access_token: str) -> str:
    root = await _get_or_create_folder(access_token, "root", "2T", None)
    mind = await _get_or_create_folder(access_token, "mind", "Mente", root)
    return await _get_or_create_folder(access_token, "videos", "Vídeos", mind)


@router.get("/status", include_in_schema=False)
async def status(authorization: str | None = Header(default=None)):
    admin_id = await _require_admin(authorization)
    connection = await _rpc("mind_drive_get_connection", {"p_admin_id": admin_id})
    if not isinstance(connection, dict) or not connection.get("refresh_token_cipher"):
        return {"enabled": True, "connected": False, "managed_limit_bytes": MAX_MANAGED_STORAGE_BYTES,
                "used_bytes": None, "reserved_bytes": None, "account_free_bytes": None, "quota_verified": False, "orphan_files": []}
    access, connection = await _access_token(admin_id, connection)
    started = datetime.now(timezone.utc).isoformat()
    about = await _about(access)
    assets = _asset_snapshot(await _managed_files(access))
    usage = await _rpc("mind_drive_reconcile", {"p_admin_id": admin_id, "p_scan_started_at": started, "p_assets": assets,
                                         "p_folder_id": connection.get("folder_id")})
    quota = about.get("storageQuota") or {}
    limit = int(quota["limit"]) if str(quota.get("limit", "")).isdigit() else None
    total = int(quota["usage"]) if str(quota.get("usage", "")).isdigit() else None
    return {"enabled": True, "connected": True, "google_email": connection.get("google_email"),
            "folder_name": "2T / Mente / Vídeos", "managed_limit_bytes": MAX_MANAGED_STORAGE_BYTES,
            "used_bytes": int((usage or {}).get("used_bytes", 0)), "reserved_bytes": int((usage or {}).get("reserved_bytes", 0)),
            "account_limit_bytes": limit, "account_used_bytes": total,
            "account_free_bytes": max(0, limit - total) if limit is not None and total is not None else None,
            "quota_verified": limit is not None and total is not None,
            "orphan_files": (usage or {}).get("orphan_files", [])}


@router.post("/google/connect", include_in_schema=False)
async def connect_google(request: Request, authorization: str | None = Header(default=None)):
    admin_id = await _require_admin(authorization)
    origin = _origin_allowed(request.headers.get("origin"))
    nonce = secrets.token_urlsafe(32)
    state = _make_state(admin_id, nonce, origin)
    params = urlencode({
        "client_id": settings.google_drive_client_id,
        "redirect_uri": settings.google_drive_redirect_uri,
        "response_type": "code",
        "scope": "openid email https://www.googleapis.com/auth/drive.file",
        "access_type": "offline", "include_granted_scopes": "true", "prompt": "consent",
        "state": state,
    })
    response = Response(content=json.dumps({"authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?" + params}),
                        media_type="application/json", headers={"Cache-Control": "no-store"})
    response.set_cookie(_STATE_COOKIE, nonce, max_age=600, httponly=True, secure=request.url.scheme == "https" or os.getenv("VERCEL") == "1", samesite="lax", path="/api/mind-drive/google/callback")
    return response


@router.get("/google/callback", include_in_schema=False)
async def google_callback(request: Request, code: str | None = None, state: str | None = None, error: str | None = None):
    _require_feature()
    cookie = request.cookies.get(_STATE_COOKIE, "")
    if error or not code or not state:
        raise HTTPException(400, "Autorização Google não concluída. Volte à Mente e tente novamente.")
    claims = _verify_state(state, cookie)
    admin_id = claims["admin"]
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            token_response = await client.post(_TOKEN_URL, data={"code": code, "client_id": settings.google_drive_client_id,
                "client_secret": _secret(settings.google_drive_client_secret), "redirect_uri": settings.google_drive_redirect_uri,
                "grant_type": "authorization_code"})
            if token_response.status_code != 200:
                raise HTTPException(400, "O Google recusou a autorização. Confira o cliente e o redirect URI configurados.")
            tokens = token_response.json()
            access_token, refresh_token = tokens.get("access_token"), tokens.get("refresh_token")
            if not isinstance(access_token, str):
                raise HTTPException(502, "O Google não retornou uma sessão válida.")
            granted = set(str(tokens.get("scope", "")).split())
            if "https://www.googleapis.com/auth/drive.file" not in granted:
                raise HTTPException(403, "A autorização Google não concedeu o escopo restrito drive.file.")
            userinfo = await client.get(_USERINFO_URL, headers={"Authorization": "Bearer " + access_token})
            if userinfo.status_code != 200:
                raise HTTPException(502, "Não foi possível identificar a conta Google autorizada.")
            identity = userinfo.json()
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Não foi possível concluir a conexão com o Google Drive.") from exc
    if not isinstance(identity.get("email"), str) or not identity.get("email_verified") or not isinstance(identity.get("sub"), str):
        raise HTTPException(400, "A conta Google não retornou uma identidade verificada.")
    previous = await _rpc("mind_drive_get_connection", {"p_admin_id": admin_id})
    if not isinstance(refresh_token, str) or not refresh_token:
        if not isinstance(previous, dict) or not previous.get("refresh_token_cipher") or previous.get("google_subject") != identity["sub"]:
            raise HTTPException(400, "O Google não forneceu autorização duradoura. Revise o modo OAuth e reconecte.")
        refresh_cipher = previous["refresh_token_cipher"]
    else:
        refresh_cipher = _encrypt(refresh_token, "refresh:" + admin_id)
    folder_id = await _ensure_video_folder(access_token)
    await _rpc("mind_drive_save_connection", {"p_admin_id": admin_id, "p_refresh_token_cipher": refresh_cipher,
        "p_google_email": identity["email"], "p_google_subject": identity["sub"], "p_folder_id": folder_id})
    response = RedirectResponse(claims["origin"] + "/#/mente", status_code=303)
    response.delete_cookie(_STATE_COOKIE, path="/api/mind-drive/google/callback", httponly=True, secure=request.url.scheme == "https" or os.getenv("VERCEL") == "1", samesite="lax")
    return response


@router.post("/google/disconnect", include_in_schema=False)
async def disconnect_google(authorization: str | None = Header(default=None)):
    admin_id = await _require_admin(authorization)
    connection = await _rpc("mind_drive_get_connection", {"p_admin_id": admin_id})
    refresh = _decrypt(str(connection["refresh_token_cipher"]), "refresh:" + admin_id) if isinstance(connection, dict) and connection.get("refresh_token_cipher") else None
    # The database refuses disconnect while an upload is active. Perform that
    # atomic guard before revoking the only credential that can resume it.
    await _rpc("mind_drive_disconnect", {"p_admin_id": admin_id})
    if refresh:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                await client.post("https://oauth2.googleapis.com/revoke", data={"token": refresh})
        except httpx.HTTPError:
            pass
    return {"connected": False, "files_deleted": False}


@router.post("/uploads", include_in_schema=False)
async def start_upload(body: UploadStart, request: Request, authorization: str | None = Header(default=None)):
    admin_id = await _require_admin(authorization)
    origin = _origin_allowed(request.headers.get("origin"))
    if not body.file_name.lower().endswith(".mp4"):
        raise HTTPException(422, "O arquivo precisa ter extensão .mp4.")
    existing = await _rpc("mind_drive_get_upload", {"p_admin_id": admin_id, "p_upload_id": body.upload_id})
    if isinstance(existing, dict) and existing.get("status") == "cancelled":
        raise HTTPException(410, "Este envio foi cancelado. Selecione o arquivo novamente para iniciar outra sessão.")
    if isinstance(existing, dict) and existing.get("status") not in (None, "cancelled"):
        if existing.get("item_id") != str(body.item_id) or int(existing.get("expected_size", 0)) != body.file_size or existing.get("file_name") != body.file_name[:180]:
            raise HTTPException(409, "O identificador de retomada já pertence a outro arquivo.")
        if existing.get("session_uri_cipher") and existing.get("status") == "uploading":
            uri = _decrypt(str(existing["session_uri_cipher"]), "session:" + admin_id + ":" + body.upload_id)
            return {"upload_id": body.upload_id, "item_id": str(body.item_id), "session_uri": _session_uri(uri),
                    "chunk_bytes": MAX_CHUNK_BYTES, "alignment_bytes": MIN_CHUNK_BYTES, "expires_in_seconds": UPLOAD_SESSION_TTL_SECONDS}
        if existing.get("status") == "uploaded":
            return {"upload_id": body.upload_id, "item_id": str(body.item_id), "complete": True,
                    "drive_file_id": existing.get("drive_file_id"), "file_size": existing.get("confirmed_size")}
        if existing.get("status") == "published":
            raise HTTPException(409, "Este vídeo já foi publicado.")
    connection = await _connection(admin_id)
    access, connection = await _access_token(admin_id, connection)
    quota = (await _about(access)).get("storageQuota") or {}
    limit, current = quota.get("limit"), quota.get("usage")
    if not str(limit or "").isdigit() or not str(current or "").isdigit():
        raise HTTPException(503, "Não foi possível confirmar a cota livre da conta Google; o envio foi bloqueado.")
    account_free = max(0, int(limit) - int(current))
    if account_free < body.file_size:
        raise HTTPException(413, "A conta Google não tem espaço livre suficiente para este vídeo.")
    scan_started = datetime.now(timezone.utc).isoformat()
    snapshot = _asset_snapshot(await _managed_files(access))
    upload_id = body.upload_id
    reserved = await _rpc("mind_drive_reserve_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id,
        "p_item_id": str(body.item_id), "p_file_name": body.file_name, "p_expected_size": body.file_size,
        "p_scan_started_at": scan_started, "p_assets": snapshot, "p_account_free_bytes": account_free})
    current = await _rpc("mind_drive_get_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
    if not isinstance(current, dict) or current.get("status") not in {"reserved", "creating"}:
        raise HTTPException(409, "Esta reserva não pode iniciar um novo upload.")
    claim = await _rpc("mind_drive_claim_upload_session", {"p_admin_id": admin_id, "p_upload_id": upload_id})
    if claim is not True:
        raise HTTPException(409, "A sessão de upload já está sendo preparada. Tente retomar em alguns segundos.")
    folder_id = str(connection.get("folder_id", ""))
    if not folder_id:
        await _rpc("mind_drive_release_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
        raise HTTPException(409, "A pasta gerenciada não foi criada. Reconecte o Google Drive.")
    metadata = {"name": body.file_name[:180], "mimeType": "video/mp4", "parents": [folder_id],
                "appProperties": {"2tMindManaged": "v1", "2tMindUpload": upload_id}}
    try:
        response = await _drive_request("POST", _GOOGLE_UPLOAD, access, params={"uploadType": "resumable", "fields": "id,name,size,mimeType"},
            body=metadata, headers={"Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4",
                                   "X-Upload-Content-Length": str(body.file_size), "Origin": origin})
        if response.status_code not in (200, 201):
            raise HTTPException(502, "O Google não iniciou a sessão de upload retomável.")
        session_uri = _session_uri(response.headers.get("location"))
        encrypted_session = _encrypt(session_uri, "session:" + admin_id + ":" + upload_id)
        await _rpc("mind_drive_set_upload_session", {"p_admin_id": admin_id, "p_upload_id": upload_id,
                                                       "p_session_uri_cipher": encrypted_session,
                                                       "p_expires_at": (datetime.now(timezone.utc).timestamp() + UPLOAD_SESSION_TTL_SECONDS)})
    except Exception:
        # Keep the reservation: the Google session may have been created even if
        # persisting its URI failed. Reconciliation/expiry can resolve it safely.
        raise
    return {"upload_id": upload_id, "item_id": str(body.item_id), "session_uri": session_uri,
            "chunk_bytes": MAX_CHUNK_BYTES, "alignment_bytes": MIN_CHUNK_BYTES, "expires_in_seconds": UPLOAD_SESSION_TTL_SECONDS}


@router.post("/uploads/{upload_id}/resume", include_in_schema=False)
async def resume_upload(upload_id: str, request: Request, authorization: str | None = Header(default=None)):
    admin_id = await _require_admin(authorization)
    _origin_allowed(request.headers.get("origin"))
    if not re.fullmatch(r"[0-9a-f]{32}", upload_id):
        raise HTTPException(404, "Sessão de upload não encontrada.")
    row = await _rpc("mind_drive_get_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
    if not isinstance(row, dict) or row.get("status") != "uploading" or not row.get("session_uri_cipher"):
        raise HTTPException(404, "Esta sessão não pode mais ser retomada. Selecione novamente o vídeo.")
    expiry = row.get("session_expires_at")
    if expiry and datetime.fromisoformat(str(expiry).replace("Z", "+00:00")) <= datetime.now(timezone.utc):
        raise HTTPException(410, "A sessão do Google expirou. Inicie novamente o envio deste vídeo.")
    session_uri = _decrypt(str(row["session_uri_cipher"]), "session:" + admin_id + ":" + upload_id)
    _session_uri(session_uri)
    return {"upload_id": upload_id, "item_id": row["item_id"], "file_name": row["file_name"],
            "file_size": row["expected_size"], "session_uri": session_uri, "chunk_bytes": MAX_CHUNK_BYTES}


@router.post("/uploads/{upload_id}/complete", include_in_schema=False)
async def complete_upload(upload_id: str, authorization: str | None = Header(default=None)):
    if not re.fullmatch(r"[0-9a-f]{32}", upload_id):
        raise HTTPException(404, "Upload não encontrado.")
    admin_id = await _require_admin(authorization)
    row = await _rpc("mind_drive_get_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
    if not isinstance(row, dict) or row.get("status") not in {"uploading", "uploaded"}:
        raise HTTPException(404, "Upload não encontrado ou já encerrado.")
    if row.get("status") == "uploaded":
        return {"upload_id": upload_id, "drive_file_id": row.get("drive_file_id"), "file_size": row.get("confirmed_size")}
    access, connection = await _access_token(admin_id)
    session_uri = _decrypt(str(row["session_uri_cipher"]), "session:" + admin_id + ":" + upload_id)
    _session_uri(session_uri)
    probe = await _drive_request("PUT", session_uri, access, headers={"Content-Range": "bytes */" + str(row["expected_size"])})
    file_id = None
    if probe.status_code in (200, 201):
        data = probe.json()
        file_id = data.get("id")
    else:
        data = None
    if not file_id:
        candidates = [f for f in await _managed_files(access) if f.get("appProperties", {}).get("2tMindUpload") == upload_id]
        if len(candidates) == 1:
            data = candidates[0]
            file_id = data.get("id")
        elif len(candidates) > 1:
            raise HTTPException(503, "Há mais de um arquivo associado à retomada. A reserva foi mantida para revisão.")
    if not file_id or not isinstance(data, dict):
        raise HTTPException(409, "O Drive ainda não confirmou o arquivo completo. Retome o envio e tente novamente.")
    verified = await _drive_request("GET", f"/files/{file_id}", access, params={
        "supportsAllDrives": "true", "fields": "id,name,size,mimeType,trashed,parents,appProperties"})
    if verified.status_code != 200:
        raise HTTPException(502, "Não foi possível verificar o arquivo concluído no Drive.")
    data = verified.json()
    if (data.get("id") != file_id or data.get("appProperties", {}).get("2tMindManaged") != "v1" or
            data.get("appProperties", {}).get("2tMindUpload") != upload_id or data.get("trashed") is True or
            str(connection.get("folder_id", "")) not in data.get("parents", [])):
        raise HTTPException(422, "O arquivo confirmado não pertence à pasta gerenciada desta sessão.")
    size = int(data.get("size", -1)) if str(data.get("size", "")).isdigit() else -1
    if size != int(row["expected_size"]) or data.get("mimeType") != "video/mp4":
        raise HTTPException(422, "O tamanho ou tipo real confirmado pelo Drive não corresponde ao arquivo enviado.")
    await _rpc("mind_drive_finalize_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id,
                                               "p_drive_file_id": str(file_id), "p_confirmed_size": size,
                                               "p_file_name": str(data.get("name", row["file_name"]))[:180]})
    return {"upload_id": upload_id, "drive_file_id": file_id, "file_size": size}


async def _verified_upload_file(row: dict, access: str, connection: dict) -> dict:
    file_id = str(row.get("drive_file_id", ""))
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,200}", file_id):
        raise HTTPException(409, "O Drive não confirmou o arquivo.")
    response = await _drive_request("GET", f"/files/{file_id}", access,
        params={"supportsAllDrives": "true", "fields": "id,name,size,mimeType,trashed,parents,appProperties"})
    if response.status_code != 200:
        raise HTTPException(409, "O vídeo não está mais disponível no Google Drive.")
    data = response.json()
    size = int(data.get("size", -1)) if str(data.get("size", "")).isdigit() else -1
    if (data.get("id") != file_id or size != int(row.get("confirmed_size", -2)) or data.get("mimeType") != "video/mp4" or
            data.get("trashed") is True or data.get("appProperties", {}).get("2tMindManaged") != "v1" or
            data.get("appProperties", {}).get("2tMindUpload") != row.get("upload_id") or
            str(connection.get("folder_id", "")) not in data.get("parents", [])):
        raise HTTPException(422, "O arquivo não corresponde ao vídeo gerenciado confirmado nesta sessão.")
    return data


@router.post("/uploads/{upload_id}/cancel", include_in_schema=False)
async def cancel_upload(upload_id: str, authorization: str | None = Header(default=None)):
    admin_id = await _require_admin(authorization)
    row = await _rpc("mind_drive_get_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
    if isinstance(row, dict) and row.get("status") == "creating":
        released = await _rpc("mind_drive_release_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
        if released is True:
            return {"cancelled": True, "reservation_released": True}
        row = await _rpc("mind_drive_get_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
    if not isinstance(row, dict) or row.get("status") not in {"reserved", "uploading"}:
        raise HTTPException(409, "O envio já foi concluído; publique ou remova o arquivo pela biblioteca.")
    if row.get("session_uri_cipher"):
        access, _ = await _access_token(admin_id)
        candidates = [f for f in await _managed_files(access) if f.get("appProperties", {}).get("2tMindUpload") == upload_id]
        if len(candidates) > 1:
            raise HTTPException(503, "Há arquivos duplicados nesta sessão; a reserva foi mantida para revisão.")
        if candidates:
            file = candidates[0]
            size = int(file.get("size", -1)) if str(file.get("size", "")).isdigit() else -1
            if size != int(row["expected_size"]) or file.get("mimeType") != "video/mp4":
                raise HTTPException(422, "O arquivo parcial no Drive não corresponde à reserva; a cota foi mantida.")
            await _rpc("mind_drive_finalize_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id,
                "p_drive_file_id": file["id"], "p_confirmed_size": size, "p_file_name": file.get("name", row["file_name"])})
            raise HTTPException(409, "O envio já foi concluído no Drive. A reserva foi convertida em arquivo; publique ou exclua-o.")
        session_uri = _decrypt(str(row["session_uri_cipher"]), "session:" + admin_id + ":" + upload_id)
        _session_uri(session_uri)
        response = await _drive_request("DELETE", session_uri, access)
        if response.status_code not in (200, 202, 204, 404, 410):
            raise HTTPException(503, "O Google não confirmou o cancelamento; a reserva foi mantida por segurança.")
    await _rpc("mind_drive_cancel_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
    return {"cancelled": True, "reservation_released": True}


@router.post("/uploads/{upload_id}/publish", include_in_schema=False)
async def publish_upload(upload_id: str, body: VideoMetadata, authorization: str | None = Header(default=None)):
    admin_id = await _require_admin(authorization)
    row = await _rpc("mind_drive_get_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
    if not isinstance(row, dict) or row.get("status") not in {"uploaded", "published"} or str(body.id) != row.get("item_id"):
        raise HTTPException(409, "Finalize o upload antes de publicar este vídeo.")
    if body.poster_data_url and not re.fullmatch(r"data:image/webp;base64,[A-Za-z0-9+/=]+", body.poster_data_url):
        raise HTTPException(422, "A miniatura do vídeo é inválida.")
    access, connection = await _access_token(admin_id)
    file_id = str(row.get("drive_file_id", ""))
    await _verified_upload_file(row, access, connection)
    permissions = await _drive_request("GET", f"/files/{file_id}/permissions", access,
        params={"supportsAllDrives": "true", "fields": "permissions(id,type,role)", "pageSize": 100})
    if permissions.status_code != 200:
        raise HTTPException(502, "Não foi possível verificar as permissões atuais do vídeo no Drive.")
    match = next((p for p in permissions.json().get("permissions", []) if p.get("type") == "anyone" and p.get("role") == "reader"), None)
    if row.get("status") == "published":
        if not match:
            raise HTTPException(409, "Este vídeo foi publicado, mas a permissão do Drive foi removida. Revise o compartilhamento no Drive.")
        return {"published": True, "drive_file_id": file_id, "web_view_url": "https://drive.google.com/file/d/" + file_id + "/view",
                "previous_storage_path": row.get("previous_storage_path"), "previous_drive_file_id": row.get("previous_drive_file_id")}
    permission_id = match.get("id") if match else None
    created_permission = False
    if not match:
        permission = await _drive_request("POST", f"/files/{file_id}/permissions", access,
            params={"supportsAllDrives": "true", "sendNotificationEmail": "false", "fields": "id,type,role"},
            body={"type": "anyone", "role": "reader"})
        if permission.status_code not in (200, 201):
            raise HTTPException(403, "O Drive não permitiu acesso público por link. O vídeo continua não publicado.")
        permission_data = permission.json()
        if permission_data.get("type") != "anyone" or permission_data.get("role") != "reader":
            raise HTTPException(502, "O Drive não confirmou uma permissão pública de leitura para o arquivo.")
        permission_id = permission_data.get("id")
        created_permission = True
    try:
        result = await _rpc("mind_drive_publish_video", {"p_admin_id": admin_id, "p_upload_id": upload_id,
            "p_item": {"id": str(body.id), "title": body.title.strip(), "topic": body.topic.strip() or "Sem assunto",
                       "tags": body.tags, "description": body.description, "content": body.content,
                       "favorite": body.favorite, "created_at": body.created_at.isoformat(),
                       "updated_at": body.updated_at.isoformat(), "poster_data_url": body.poster_data_url}})
    except Exception:
        # A PostgREST timeout can happen after PostgreSQL committed the item.
        # Reconcile the ledger before compensating the Drive permission so a
        # committed public video is not left marked as published but unplayable.
        try:
            persisted = await _rpc("mind_drive_get_upload", {"p_admin_id": admin_id, "p_upload_id": upload_id})
        except Exception:
            persisted = None
        if (isinstance(persisted, dict) and persisted.get("status") == "published" and
                persisted.get("drive_file_id") == file_id):
            return {"published": True, "drive_file_id": file_id,
                    "web_view_url": "https://drive.google.com/file/d/" + file_id + "/view",
                    "previous_storage_path": persisted.get("previous_storage_path"), "previous_drive_file_id": persisted.get("previous_drive_file_id")}
        if persisted is None:
            # The database outcome is still unknown. Keep the public permission
            # so a committed item cannot be left published but unplayable.
            raise
        if created_permission and permission_id:
            try:
                await _drive_request("DELETE", f"/files/{file_id}/permissions/{permission_id}", access, params={"supportsAllDrives": "true"})
            except Exception:
                pass
        raise
    return {"published": True, "drive_file_id": file_id, "web_view_url": "https://drive.google.com/file/d/" + file_id + "/view",
            "previous_storage_path": (result or {}).get("previous_storage_path") if isinstance(result, dict) else None,
            "previous_drive_file_id": (result or {}).get("previous_drive_file_id") if isinstance(result, dict) else None}


@router.delete("/files/{file_id}", include_in_schema=False)
async def delete_managed_file(file_id: str, authorization: str | None = Header(default=None)):
    admin_id = await _require_admin(authorization)
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,200}", file_id):
        raise HTTPException(422, "Identificador de arquivo inválido.")
    allowed = await _rpc("mind_drive_claim_asset_delete", {"p_admin_id": admin_id, "p_file_id": file_id})
    if allowed is not True:
        raise HTTPException(409, "O arquivo ainda está vinculado ou não pertence ao armazenamento gerenciado.")
    access, _ = await _access_token(admin_id)
    response = await _drive_request("DELETE", f"/files/{file_id}", access, params={"supportsAllDrives": "true"})
    if response.status_code not in (200, 204, 404):
        await _rpc("mind_drive_release_asset_delete", {"p_admin_id": admin_id, "p_file_id": file_id})
        raise HTTPException(503, "O Google não confirmou a exclusão; o espaço continua contabilizado.")
    await _rpc("mind_drive_mark_asset_deleted", {"p_admin_id": admin_id, "p_file_id": file_id})
    return {"deleted": True}


def drive_preview_url(file_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,200}", file_id):
        raise ValueError("Invalid Drive file id")
    return "https://drive.google.com/file/d/" + file_id + "/preview"


def account_free_bytes(storage_quota: dict) -> int | None:
    limit, usage = storage_quota.get("limit"), storage_quota.get("usage")
    if not str(limit or "").isdigit() or not str(usage or "").isdigit():
        return None
    return max(0, int(limit) - int(usage))


def parse_confirmed_range(value: str | None) -> int:
    if not value:
        return 0
    match = re.fullmatch(r"bytes=0-(\d+)", value.strip())
    if not match:
        raise ValueError("Invalid resumable Range")
    return int(match.group(1)) + 1
