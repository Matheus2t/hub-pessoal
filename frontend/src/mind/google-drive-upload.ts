import { mindBackendApi } from "./cloud-auth";
import { safeMindVideoFileName } from "./video";

const CHUNK_BYTES = 8 * 1024 * 1024; // Google requires 256 KiB multiples except for the final chunk.
const SESSION_PREFIX = "2t-mind-drive-upload-v1:";
export interface DriveUploadProgress {
  sent: number;
  confirmed: number;
  total: number;
  bytesPerSecond?: number;
  secondsRemaining?: number;
}
export interface DriveUploadResult { uploadId: string; driveFileId: string; fileSize: number; }
export interface DrivePublishResult { previous_storage_path: string | null; previous_drive_file_id: string | null; }

export class DriveUploadCancelledError extends Error {
  constructor() { super("Envio cancelado."); this.name = "DriveUploadCancelledError"; }
}

async function responseError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null) as { detail?: unknown } | null;
  return new Error(typeof body?.detail === "string" ? body.detail : `O armazenamento respondeu com HTTP ${response.status}.`);
}
async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await mindBackendApi(path, init);
  if (!response.ok) throw await responseError(response);
  return await response.json() as T;
}
function uploadKey(itemId: string) { return SESSION_PREFIX + itemId; }
async function fingerprint(file: File): Promise<string> {
  const block = 64 * 1024;
  const spans = [file.slice(0, block), file.slice(Math.max(0, Math.floor(file.size / 2) - block / 2), Math.floor(file.size / 2) + block / 2), file.slice(Math.max(0, file.size - block))];
  const chunks = await Promise.all(spans.map(span => span.arrayBuffer()));
  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const samples = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { samples.set(new Uint8Array(chunk), offset); offset += chunk.byteLength; }
  const prefix = new TextEncoder().encode([safeMindVideoFileName(file.name), file.size, file.lastModified].join("\0") + "\0");
  const input = new Uint8Array(prefix.length + samples.length);
  input.set(prefix); input.set(samples, prefix.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function cachedUpload(file: File, itemId: string): Promise<string | null> {
  try {
    const raw = sessionStorage.getItem(uploadKey(itemId));
    if (!raw) return null;
    const value = JSON.parse(raw) as { id?: unknown; fingerprint?: unknown };
    return typeof value.id === "string" && /^[0-9a-f]{32}$/.test(value.id) && value.fingerprint === await fingerprint(file) ? value.id : null;
  } catch { return null; }
}
async function saveUpload(file: File, itemId: string, id: string) {
  try { sessionStorage.setItem(uploadKey(itemId), JSON.stringify({ id, itemId, fingerprint: await fingerprint(file) })); }
  catch { /* The upload remains usable; lack of tab storage only disables automatic resume. */ }
}
function clearUpload(itemId: string) { try { sessionStorage.removeItem(uploadKey(itemId)); } catch { /* no-op */ } }
function newUploadId() { return crypto.randomUUID().replace(/-/g, "").toLowerCase(); }
function parseRange(header: string | null): number {
  if (!header) return 0;
  const match = /^bytes=0-(\d+)$/.exec(header.trim());
  if (!match) throw new Error("O Google retornou um intervalo de retomada inválido.");
  return Number(match[1]) + 1;
}
function checkOffset(value: number, size: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > size) throw new Error("O Google retornou uma posição de envio inválida.");
  return value;
}
async function startOrResume(file: File, itemId: string, uploadId: string, signal?: AbortSignal) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (signal?.aborted) throw new DriveUploadCancelledError();
    const response = await mindBackendApi("/api/mind-drive/uploads", {
      method: "POST", signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: uploadId, item_id: itemId, file_name: safeMindVideoFileName(file.name), file_size: file.size }),
    });
    if (response.ok) return await response.json() as { session_uri?: string; complete?: boolean; drive_file_id?: string; file_size?: number };
    if (response.status !== 409 || attempt === 3) throw await responseError(response);
    await new Promise(resolve => setTimeout(resolve, 700));
    const resumed = await mindBackendApi(`/api/mind-drive/uploads/${uploadId}/resume`, { method: "POST", signal });
    if (resumed.ok) return await resumed.json() as { session_uri?: string };
    if (resumed.status === 410) throw new Error("A sessão do Google expirou. Inicie uma nova sessão com o mesmo arquivo.");
    if (resumed.status !== 404) throw await responseError(resumed);
  }
  throw new Error("Não foi possível retomar a sessão de envio.");
}

async function recoverCompletedUpload(uploadId: string, expectedSize: number): Promise<DriveUploadResult | null> {
  const response = await mindBackendApi("/api/mind-drive/uploads/" + uploadId + "/complete", { method: "POST" }).catch(() => null);
  if (!response?.ok) return null;
  const result = await response.json().catch(() => null) as { drive_file_id?: unknown; file_size?: unknown } | null;
  if (typeof result?.drive_file_id !== "string" || !/^[A-Za-z0-9_-]{10,200}$/.test(result.drive_file_id) || result.file_size !== expectedSize) return null;
  return { uploadId, driveFileId: result.drive_file_id, fileSize: expectedSize };
}

async function queryOffset(sessionUri: string, size: number, signal?: AbortSignal): Promise<{ offset: number; complete: boolean }> {
  let response: Response;
  try {
    response = await fetch(sessionUri, { method: "PUT", credentials: "omit", referrerPolicy: "no-referrer", signal,
      headers: { "Content-Range": `bytes */${size}` } });
  } catch {
    throw new Error("Não foi possível consultar a sessão do Google. Verifique a conexão e tente novamente.");
  }
  if (response.status === 308) return { offset: checkOffset(parseRange(response.headers.get("Range")), size), complete: false };
  if (response.status === 200 || response.status === 201) return { offset: size, complete: true };
  if (response.status === 404 || response.status === 410) throw new Error("A sessão do Google expirou. Selecione novamente o vídeo para iniciar outro envio.");
  throw await responseError(response);
}

export async function uploadMindVideoToDrive(
  file: File, itemId: string, onProgress: (progress: DriveUploadProgress) => void, signal?: AbortSignal, restartAttempt = 0,
): Promise<DriveUploadResult> {
  let uploadId = await cachedUpload(file, itemId) ?? newUploadId();
  await saveUpload(file, itemId, uploadId);
  let start: { session_uri?: string; complete?: boolean; drive_file_id?: string; file_size?: number };
  try {
    start = await startOrResume(file, itemId, uploadId, signal);
  } catch (error) {
    if (error instanceof DriveUploadCancelledError || signal?.aborted) {
      const cancelled = await mindBackendApi(`/api/mind-drive/uploads/${uploadId}/cancel`, { method: "POST" }).catch(() => null);
      if (cancelled?.ok) clearUpload(itemId);
      throw new DriveUploadCancelledError();
    }
    // Recover a completed Drive object before replacing an expired session id.
    if (error instanceof Error && error.message.includes("expirou")) {
      const cancelled = await mindBackendApi("/api/mind-drive/uploads/" + uploadId + "/cancel", { method: "POST" }).catch(() => null);
      if (cancelled?.status === 409) {
        const completed = await recoverCompletedUpload(uploadId, file.size);
        if (completed) return completed;
      }
      if (!cancelled?.ok) throw error;
      clearUpload(itemId);
      uploadId = newUploadId(); await saveUpload(file, itemId, uploadId);
      start = await startOrResume(file, itemId, uploadId, signal);
    } else if (error instanceof Error && error.message.toLowerCase().includes("cancelado")) {
      clearUpload(itemId);
      uploadId = newUploadId(); await saveUpload(file, itemId, uploadId);
      start = await startOrResume(file, itemId, uploadId, signal);
    } else throw error;
  }
  if (start.complete && start.drive_file_id && start.file_size === file.size) {
    return { uploadId, driveFileId: start.drive_file_id, fileSize: start.file_size };
  }
  if (typeof start.session_uri !== "string" || !/^https:\/\/(www|upload)\.googleapis\.com\/upload\/drive\/v3\//.test(start.session_uri)) {
    throw new Error("O Google não retornou uma sessão de envio válida.");
  }
  const sessionUri = start.session_uri;
  let offset = 0;
  let lastSent = 0;
  let lastTime = performance.now();
  let complete = false;
  let stalledChunks = 0;
  try {
    // Drive is authoritative after a reload or a lost response. An existing
    // resumable session can already contain bytes, even if this tab sent none.
    ({ offset, complete } = await queryOffset(sessionUri, file.size, signal));
    while (offset < file.size && !complete) {
      if (signal?.aborted) throw new DriveUploadCancelledError();
      const priorOffset = offset;
      const endExclusive = Math.min(offset + CHUNK_BYTES, file.size);
      const chunk = file.slice(offset, endExclusive, "video/mp4");
      let response: Response | null;
      try {
        response = await fetch(sessionUri, { method: "PUT", body: chunk, credentials: "omit", referrerPolicy: "no-referrer", signal,
          headers: { "Content-Type": "video/mp4", "Content-Range": `bytes ${offset}-${endExclusive - 1}/${file.size}` } });
      } catch {
        if (signal?.aborted) throw new DriveUploadCancelledError();
        response = null;
      }
      if (!response || response.status === 429 || response.status >= 500) {
        ({ offset, complete } = await queryOffset(sessionUri, file.size, signal));
      } else if (response.status === 308) offset = checkOffset(parseRange(response.headers.get("Range")), file.size);
      else if (response.status === 200 || response.status === 201) { offset = file.size; complete = true; }
      else if (response.status === 404 || response.status === 410) throw new Error("A sessão do Google expirou. O envio pode ser reiniciado com o mesmo arquivo.");
      else throw await responseError(response);
      if (offset > priorOffset) stalledChunks = 0;
      else stalledChunks += 1;
      if (stalledChunks > 3) throw new Error("O Google não confirmou avanço após várias tentativas. O progresso foi preservado para retomada.");
      const now = performance.now();
      const elapsed = Math.max(1, now - lastTime) / 1000;
      const bytesPerSecond = Math.max(0, offset - lastSent) / elapsed;
      onProgress({ sent: offset, confirmed: offset, total: file.size, bytesPerSecond,
        secondsRemaining: bytesPerSecond > 0 ? Math.ceil((file.size - offset) / bytesPerSecond) : undefined });
      lastSent = offset; lastTime = now;
    }
    if (!complete && offset !== file.size) throw new Error("O Google não confirmou todos os blocos do vídeo.");
    const confirmed = await apiJson<{ drive_file_id: string; file_size: number }>(`/api/mind-drive/uploads/${uploadId}/complete`, { method: "POST" });
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(confirmed.drive_file_id) || confirmed.file_size !== file.size) throw new Error("O servidor não confirmou o arquivo enviado.");
    return { uploadId, driveFileId: confirmed.drive_file_id, fileSize: confirmed.file_size };
  } catch (error) {
    if (signal?.aborted || error instanceof DriveUploadCancelledError) {
      const cancelled = await mindBackendApi(`/api/mind-drive/uploads/${uploadId}/cancel`, { method: "POST" }).catch(() => null);
      if (cancelled?.ok) clearUpload(itemId);
      throw new DriveUploadCancelledError();
    }
    if (restartAttempt === 0 && error instanceof Error && error.message.includes("sessão do Google expirou")) {
      const cancelled = await mindBackendApi("/api/mind-drive/uploads/" + uploadId + "/cancel", { method: "POST" }).catch(() => null);
      if (cancelled?.status === 409) {
        const completed = await recoverCompletedUpload(uploadId, file.size);
        if (completed) return completed;
      }
      if (cancelled?.ok) {
        clearUpload(itemId);
        return uploadMindVideoToDrive(file, itemId, onProgress, signal, 1);
      }
    }
    throw error;
  }
}

export async function publishMindDriveVideo(uploadId: string, item: {
  id: string; title: string; topic: string; tags: string[]; description: string; content: string;
  favorite: boolean; createdAt: number; updatedAt: number; posterDataUrl?: string;
}): Promise<DrivePublishResult> {
  return apiJson(`/api/mind-drive/uploads/${uploadId}/publish`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: item.id, title: item.title, topic: item.topic, tags: item.tags, description: item.description,
      content: item.content, favorite: item.favorite, created_at: new Date(item.createdAt).toISOString(),
      updated_at: new Date(item.updatedAt).toISOString(), poster_data_url: item.posterDataUrl ?? null }) });
}

export async function deleteManagedDriveVideo(fileId: string): Promise<void> {
  const response = await mindBackendApi(`/api/mind-drive/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  if (!response.ok) throw await responseError(response);
}
export function clearMindDriveUpload(itemId: string) { clearUpload(itemId); }
export async function findPendingMindDriveUpload(file: File, existingItemIds: ReadonlySet<string>): Promise<{ itemId: string; uploadId: string } | null> {
  try {
    const expected = await fingerprint(file);
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index);
      if (!key?.startsWith(SESSION_PREFIX)) continue;
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw) as { id?: unknown; itemId?: unknown; fingerprint?: unknown };
      if (typeof value.id === "string" && /^[0-9a-f]{32}$/.test(value.id) && typeof value.itemId === "string" &&
          value.fingerprint === expected && !existingItemIds.has(value.itemId)) return { itemId: value.itemId, uploadId: value.id };
    }
  } catch { /* Resume is optional when tab storage is unavailable. */ }
  return null;
}
