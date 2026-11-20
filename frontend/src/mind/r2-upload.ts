import { mindAccessToken } from "./cloud-auth";
import { isMindR2Key, MAX_MIND_R2_BYTES, mindR2Enabled, mindR2Url, MIND_R2_PART_BYTES, type MindR2Storage } from "./r2-config";
import { MindVideoUploadCancelledError, type MindVideoUploadProgress } from "./video-upload";

interface UploadState { idempotencyKey: string; capability: string; id?: string; key?: string; }
interface UploadStatus { id: string; itemId: string; key: string; size: number; status: string; uploadId: string | null; parts: Array<{ partNumber: number; size: number }>; }
const RETRIES = [0, 700, 1800, 4000];

function bytesBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function fingerprint(file: Blob, itemId: string, ownerId: string, originalName: string) {
  const modifiedAt = file instanceof File ? file.lastModified : 0;
  const raw = `${ownerId}:${itemId}:${originalName}:${file.size}:${modifiedAt}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function stateKey(value: string) { return "2t-mind-r2-upload:" + value; }
function readState(key: string): UploadState | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<UploadState> | null;
    return value && /^[0-9a-f-]{36}$/i.test(value.idempotencyKey ?? "") && /^[A-Za-z0-9_-]{40,64}$/.test(value.capability ?? "")
      ? value as UploadState : null;
  } catch { return null; }
}
async function request(path: string, init: RequestInit = {}, capability?: string): Promise<Response> {
  const token = await mindAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", "Bearer " + token);
  if (capability) headers.set("X-Upload-Capability", capability);
  if (init.body && !(init.body instanceof Blob) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(mindR2Url(path), { ...init, headers, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" });
}
async function responseData(response: Response): Promise<Record<string, unknown>> {
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(data.error ?? `Armazenamento recusou a operação (HTTP ${response.status}).`));
  return data;
}
function xhrPart(url: string, blob: Blob, capability: string, signal: AbortSignal | undefined,
  onProgress: (sent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      error ? reject(error) : resolve();
    };
    const abort = () => { xhr.abort(); finish(new MindVideoUploadCancelledError()); };
    if (signal?.aborted) return abort();
    xhr.open("PUT", url);
    xhr.setRequestHeader("X-Upload-Capability", capability);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    void mindAccessToken().then(token => {
      if (settled) return;
      if (signal?.aborted) return abort();
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(blob.size, event.loaded)); };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300
        ? finish()
        : finish(new Error(xhr.status === 413 ? "O bloco ultrapassou a reserva do armazenamento." : `Falha ao enviar bloco (HTTP ${xhr.status}).`));
      xhr.onerror = () => finish(new Error("Conexão interrompida durante o bloco."));
      xhr.ontimeout = () => finish(new Error("Tempo esgotado durante o bloco."));
      xhr.onabort = () => finish(new Error("Bloco interrompido."));
      signal?.addEventListener("abort", abort, { once: true });
      xhr.send(blob);
    }).catch(error => finish(error instanceof Error ? error : new Error("Sessão administrativa indisponível.")));
  });
}

async function cancelSession(id: string, capability: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await request(`/admin/uploads/${id}/cancel`, { method: "POST", body: "{}" }, capability).catch(() => null);
    if (response?.ok || response?.status === 404) return true;
    if (response?.status !== 409 && response?.status !== 503) break;
    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
  }
  return false;
}

export async function uploadMindR2Video(
  file: Blob, itemId: string, ownerId: string, originalName: string,
  onProgress: (progress: MindVideoUploadProgress) => void, signal?: AbortSignal,
): Promise<{ storagePath: string; uploadId: string; capability: string }> {
  if (!mindR2Enabled()) throw new Error("O armazenamento R2 não está habilitado neste deployment.");
  if (!Number.isSafeInteger(file.size) || file.size < 12 || file.size > MAX_MIND_R2_BYTES) throw new Error("O vídeo ultrapassa o teto de armazenamento de 5 GB.");
  const fp = await fingerprint(file, itemId, ownerId, originalName), key = stateKey(fp);
  let state = readState(key);
  if (!state) {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    state = { idempotencyKey: crypto.randomUUID(), capability: bytesBase64Url(secret) };
    sessionStorage.setItem(key, JSON.stringify(state));
  }
  let created: Record<string, unknown>;
  try {
    const response = await request("/admin/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": state.idempotencyKey },
      body: JSON.stringify({ itemId, totalBytes: file.size, fileName: originalName, capability: state.capability }),
    });
    created = await responseData(response);
  } catch (error) {
    throw error;
  }
  const id = String(created.id ?? state.id ?? ""), path = String(created.key ?? state.key ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isMindR2Key(path)) throw new Error("O Worker não confirmou a reserva do arquivo.");
  state = { ...state, id, key: path };
  sessionStorage.setItem(key, JSON.stringify(state));
  const uploadUrl = mindR2Url(`/admin/uploads/${id}`);
  const statusResponse = await request(`/admin/uploads/${id}`, { method: "GET" }, state.capability);
  let status = await responseData(statusResponse) as unknown as UploadStatus;
  if (status.itemId !== itemId || status.size !== file.size || status.key !== path) throw new Error("A retomada não corresponde ao arquivo selecionado.");
  if (status.status !== "completed" && status.status !== "committed") {
    const totalParts = Math.ceil(file.size / MIND_R2_PART_BYTES);
    let confirmed = status.parts.reduce((sum, part) => sum + part.size, 0);
    let sent = confirmed;
    const start = performance.now();
    let sampleTime = start, sampleSent = confirmed;
    const known = new Set(status.parts.map(part => part.partNumber));
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      if (known.has(partNumber)) continue;
      if (signal?.aborted) {
        if (!(await cancelSession(id, state.capability))) throw new Error("O cancelamento não foi confirmado pelo R2; a reserva continua protegida e será reconciliada pelo servidor.");
        throw new MindVideoUploadCancelledError();
      }
      const offset = (partNumber - 1) * MIND_R2_PART_BYTES;
      const chunk = file.slice(offset, Math.min(file.size, offset + MIND_R2_PART_BYTES));
      let lastError: Error | null = null;
      for (const delay of RETRIES) {
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        try {
          await xhrPart(uploadUrl + `/parts/${partNumber}`, chunk, state.capability, signal, loaded => {
            const current = Math.min(file.size, confirmed + loaded);
            sent = Math.max(sent, current);
            const now = performance.now(), elapsed = (now - sampleTime) / 1000;
            const speed = elapsed >= 0.5 ? Math.max(0, (sent - sampleSent) / elapsed) : undefined;
            if (speed !== undefined) { sampleTime = now; sampleSent = sent; }
            onProgress({ sent, confirmed, total: file.size, bytesPerSecond: speed,
              secondsRemaining: speed && speed > 0 ? Math.ceil((file.size - confirmed) / speed) : undefined });
          });
          confirmed += chunk.size;
          sent = confirmed;
          onProgress({ sent, confirmed, total: file.size });
          lastError = null;
          break;
        } catch (error) {
          if (error instanceof MindVideoUploadCancelledError || signal?.aborted) {
            if (!(await cancelSession(id, state.capability))) throw new Error("O cancelamento não foi confirmado pelo R2; a reserva continua protegida e será reconciliada pelo servidor.");
            throw new MindVideoUploadCancelledError();
          }
          lastError = error instanceof Error ? error : new Error("Falha de rede no envio.");
          const resumed = await request(`/admin/uploads/${id}`, { method: "GET" }, state.capability).then(responseData).catch(() => null) as unknown as UploadStatus | null;
          if (resumed?.parts.some(part => part.partNumber === partNumber)) {
            status = resumed; confirmed = resumed.parts.reduce((sum, part) => sum + part.size, 0); sent = confirmed; lastError = null; break;
          }
        }
      }
      if (lastError) throw new Error(lastError.message + " Tente novamente para retomar os blocos confirmados.");
    }
    const complete = await request(`/admin/uploads/${id}/complete`, { method: "POST", body: "{}" }, state.capability);
    status = await responseData(complete) as unknown as UploadStatus;
  }
  if (status.status !== "completed" && status.status !== "committed") throw new Error("O R2 não confirmou a conclusão do MP4.");
  return { storagePath: path, uploadId: id, capability: state.capability };
}

export async function commitMindR2Video(uploadId: string, capability: string): Promise<void> {
  const response = await request(`/admin/uploads/${uploadId}/commit`, { method: "POST", body: "{}" }, capability);
  await responseData(response);
  for (const key of Object.keys(sessionStorage)) if (key.startsWith("2t-mind-r2-upload:")) {
    try { if ((JSON.parse(sessionStorage.getItem(key) ?? "null") as UploadState | null)?.id === uploadId) sessionStorage.removeItem(key); } catch { sessionStorage.removeItem(key); }
  }
}

export async function mindR2Storage(): Promise<MindR2Storage> {
  const response = await request("/admin/storage", { method: "GET" });
  if (response.status === 503) {
    const data = await response.json().catch(() => null) as Partial<MindR2Storage> | null;
    if (data?.ready === false) return data as MindR2Storage;
    throw new Error("O Worker não conseguiu consultar o ledger de armazenamento.");
  }
  return await responseData(response) as unknown as MindR2Storage;
}

export async function bootstrapMindR2Storage(): Promise<MindR2Storage> {
  const response = await request("/admin/storage/bootstrap", { method: "POST", body: "{}" });
  return await responseData(response) as unknown as MindR2Storage;
}

export async function deleteMindR2Video(path: string): Promise<void> {
  if (!isMindR2Key(path)) throw new Error("Chave R2 inválida.");
  const response = await request("/admin/videos/delete", { method: "POST", body: JSON.stringify({ key: path }) });
  await responseData(response);
}

export async function reconcileMindR2Item(itemId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) throw new Error("Identificador inválido.");
  const response = await request("/admin/videos/publish", { method: "POST", body: JSON.stringify({ itemId }) });
  await responseData(response);
}
