/** Only allow known video providers; never render an iframe from an arbitrary URL. */
export type VideoProvider = "youtube" | "vimeo";
export interface VideoLink {
  provider: VideoProvider;
  url: string;
  embedUrl: string;
  thumbnail?: string;
}

export function parseMindVideoLink(value: string): VideoLink | null {
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { return null; }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return null;
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.split("/").filter(Boolean);
  const youtube = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"];
  if (youtube.includes(host)) {
    const id = host.endsWith("youtu.be")
      ? (path.length === 1 ? path[0] : "")
      : path[0] === "watch" ? parsed.searchParams.get("v") ?? ""
      : ["shorts", "live", "embed"].includes(path[0]) && path.length === 2 ? path[1] : "";
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
    return {
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=" + id,
      embedUrl: "https://www.youtube-nocookie.com/embed/" + id,
      thumbnail: "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg",
    };
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = host === "player.vimeo.com" && path[0] === "video" ? path[1] : path.length === 1 ? path[0] : "";
    if (!/^\d{1,18}$/.test(id)) return null;
    return { provider: "vimeo", url: "https://vimeo.com/" + id, embedUrl: "https://player.vimeo.com/video/" + id };
  }
  return null;
}

export const MAX_MIND_VIDEO_BYTES = 25 * 1024 * 1024;

/** Reject invalid or oversized public MP4 downloads using both the advertised and received byte counts. */
export const MIND_VIDEO_DOWNLOAD_IDLE_TIMEOUT_MS = 60_000;

/** Reject invalid or oversized public MP4 downloads using both advertised and received byte counts. */
export function assertMindVideoDownloadSize(
  contentLength: string | null,
  actualSize?: number,
  maxBytes = MAX_MIND_VIDEO_BYTES,
): void {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new RangeError("Limite de tamanho inválido.");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) throw new Error("O tamanho informado para o vídeo é inválido.");
    const declaredSize = Number(contentLength);
    if (!Number.isSafeInteger(declaredSize) || declaredSize <= 0) throw new Error("O tamanho informado para o vídeo é inválido.");
    if (declaredSize > maxBytes) throw new Error("O vídeo ultrapassa 25 MB.");
  }
  if (actualSize !== undefined) {
    if (!Number.isSafeInteger(actualSize) || actualSize <= 0) throw new Error("O tamanho recebido para o vídeo é inválido.");
    if (actualSize > maxBytes) throw new Error("O vídeo ultrapassa 25 MB.");
  }
}

async function cancelMindVideoResponse(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation is best-effort when the browser has already locked/closed the body.
  }
}

export async function readMindVideoBlobWithinLimit(
  response: Response,
  options: { maxBytes?: number; signal?: AbortSignal; idleTimeoutMs?: number } = {},
): Promise<Blob> {
  const maxBytes = options.maxBytes ?? MAX_MIND_VIDEO_BYTES;
  const idleTimeoutMs = options.idleTimeoutMs ?? MIND_VIDEO_DOWNLOAD_IDLE_TIMEOUT_MS;
  if (!Number.isFinite(idleTimeoutMs) || idleTimeoutMs <= 0) throw new RangeError("Timeout de download inválido.");

  try {
    assertMindVideoDownloadSize(response.headers.get("content-length"), undefined, maxBytes);
  } catch (error) {
    await cancelMindVideoResponse(response);
    throw error;
  }

  const signal = options.signal;
  if (signal?.aborted) throw new Error("Download do vídeo cancelado.");
  const reader = response.body?.getReader();
  if (!reader) {
    const blob = await response.blob();
    if (signal?.aborted) throw new Error("Download do vídeo cancelado.");
    assertMindVideoDownloadSize(null, blob.size, maxBytes);
    return blob;
  }

  let timer: ReturnType<typeof setTimeout>;
  let timedOut = false;
  const armIdleTimeout = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      void reader.cancel().catch(() => {});
    }, idleTimeoutMs);
  };
  const cancelOnAbort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", cancelOnAbort, { once: true });

  try {
    const chunks: ArrayBuffer[] = [];
    let total = 0;
    armIdleTimeout();
    while (true) {
      if (signal?.aborted) throw new Error("Download do vídeo cancelado.");
      let part: ReadableStreamReadResult<Uint8Array>;
      try {
        part = await reader.read();
      } catch (error) {
        if (timedOut) throw new Error("O download do vídeo excedeu o tempo limite. Tente novamente.");
        if (signal?.aborted) throw new Error("Download do vídeo cancelado.");
        throw error;
      }
      if (timedOut) throw new Error("O download do vídeo excedeu o tempo limite. Tente novamente.");
      if (signal?.aborted) throw new Error("Download do vídeo cancelado.");
      if (part.done) break;
      if (part.value.byteLength > maxBytes - total) {
        try { await reader.cancel(); } catch { /* Preserve the size-limit error. */ }
        throw new Error("O vídeo ultrapassa 25 MB.");
      }
      if (part.value.byteLength) {
        total += part.value.byteLength;
        chunks.push(part.value.slice().buffer as ArrayBuffer);
        armIdleTimeout();
      }
    }
    assertMindVideoDownloadSize(null, total, maxBytes);
    return new Blob(chunks, { type: response.headers.get("content-type") ?? "" });
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancelOnAbort);
    reader.releaseLock();
  }
}

/** Container signature check; never trust filename or claimed MIME alone. */
export async function checkedMp4(file: File | Blob): Promise<boolean> {
  if (file.size < 12 || file.size > MAX_MIND_VIDEO_BYTES) return false;
  const data = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70;
}

export function safeMindVideoFileName(value: string): string {
  const name = value.normalize("NFC").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180);
  return name.toLowerCase().endsWith(".mp4") ? name : "video.mp4";
}
