import { Upload, type DetailedError, type PreviousUpload } from "tus-js-client";
import { mindStorageHeaders, mindTusEndpoint } from "./cloud-auth";
import { MAX_MIND_VIDEO_BYTES, safeMindVideoFileName } from "./video";

export const MIND_TUS_CHUNK_BYTES = 6 * 1024 * 1024;
const OBJECT_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}(?:-[0-9a-f-]{36})?\.mp4$/i;

export interface MindVideoUploadProgress {
  sent: number;
  confirmed: number;
  total: number;
  bytesPerSecond?: number;
  secondsRemaining?: number;
}

export class MindVideoUploadCancelledError extends Error {
  constructor() { super("Upload cancelado. O progresso pode ser retomado ao selecionar o mesmo arquivo novamente."); }
}

function statusOf(error: Error): number | undefined {
  const detailed = error as DetailedError;
  return detailed.originalResponse?.getStatus();
}

function safePrevious(upload: PreviousUpload, ownerId: string, endpoint: string): boolean {
  const path = upload.metadata?.objectName ?? "";
  try {
    const url = new URL(upload.uploadUrl ?? "");
    const allowed = new URL(endpoint);
    return url.protocol === "https:" && url.origin === allowed.origin && url.pathname === allowed.pathname &&
      OBJECT_PATH.test(path) && path.toLowerCase().startsWith(ownerId.toLowerCase() + "/") &&
      upload.metadata?.bucketName === "mind-videos" && upload.metadata?.contentType === "video/mp4";
  } catch { return false; }
}

/** Uploads one MP4 directly to Supabase Storage using resumable, acknowledged chunks. */
export async function uploadMindVideo(
  file: Blob,
  originalName: string,
  ownerId: string,
  onProgress: (progress: MindVideoUploadProgress) => void,
  signal?: AbortSignal,
): Promise<{ storagePath: string; resumed: boolean }> {
  if (file.size > MAX_MIND_VIDEO_BYTES) throw new Error("O vídeo ultrapassa o limite de 50 MB do projeto.");
  if (!/^[0-9a-f-]{36}$/i.test(ownerId)) throw new Error("A sessão administrativa é inválida.");
  const endpoint = mindTusEndpoint();
  const filename = safeMindVideoFileName(originalName || "video.mp4");
  const lastModified = "lastModified" in file && typeof file.lastModified === "number" ? file.lastModified : 0;
  const fingerprint = `2t-mind-video-v1:${ownerId}:${filename}:${file.size}:${lastModified}`;
  const startTime = performance.now();
  let priorSampleAt = startTime;
  let priorSampleSent = 0;
  let authRefreshUsed = false;
  let refreshed401 = false;
  let confirmedBytes = 0;
  let cancelled = false;

  const build = (objectName: string) => {
    const upload = new Upload(file, {
      endpoint,
      fingerprint: async () => fingerprint,
      metadata: { bucketName: "mind-videos", objectName, contentType: "video/mp4", cacheControl: "3600" },
      chunkSize: MIND_TUS_CHUNK_BYTES,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      parallelUploads: 1,
      uploadDataDuringCreation: true,
      storeFingerprintForResuming: true,
      removeFingerprintOnSuccess: true,
      headers: { apikey: "" },
      onBeforeRequest: async request => {
        const headers = await mindStorageHeaders();
        request.setHeader("apikey", headers.apikey);
        request.setHeader("Authorization", headers.Authorization);
      },
      onAfterResponse: async (_request, response) => {
        if (response.getStatus() === 401 && !authRefreshUsed) {
          authRefreshUsed = true;
          try { await mindStorageHeaders(true); refreshed401 = true; }
          catch { refreshed401 = false; }
        }
      },
      onShouldRetry: (error, _attempt) => {
        const status = statusOf(error);
        if (status === 401 && refreshed401) { refreshed401 = false; return true; }
        if (status === undefined) return true;
        return status === 408 || status === 429 || status >= 500;
      },
      onProgress: (sent, total) => {
        const now = performance.now();
        const seconds = (now - priorSampleAt) / 1000;
        const speed = seconds >= 0.4 ? Math.max(0, (sent - priorSampleSent) / seconds) : undefined;
        if (speed !== undefined) { priorSampleAt = now; priorSampleSent = sent; }
        onProgress({ sent, confirmed: confirmedBytes, total, bytesPerSecond: speed,
          secondsRemaining: speed && speed > 0 ? Math.ceil((total - sent) / speed) : undefined });
      },
      onChunkComplete: (_chunk, accepted, total) => {
        confirmedBytes = Math.max(confirmedBytes, accepted);
        onProgress({ sent: confirmedBytes, confirmed: confirmedBytes, total });
      },
    });
    return upload;
  };

  if (signal?.aborted) throw new MindVideoUploadCancelledError();
  let upload = build(ownerId + "/" + crypto.randomUUID() + ".mp4");
  const previousUploads = await upload.findPreviousUploads();
  const previous = previousUploads.filter(entry => safePrevious(entry, ownerId, endpoint) && entry.size === file.size)
    .sort((a, b) => b.creationTime.localeCompare(a.creationTime))[0];
  if (previous) upload.resumeFromPreviousUpload(previous);
  for (const stale of previousUploads) {
    if (!safePrevious(stale, ownerId, endpoint)) await upload.options.urlStorage?.removeUpload(stale.urlStorageKey);
  }
  const storagePath = previous?.metadata.objectName ?? upload.options.metadata!.objectName;
  let resumed = !!previous;

  const run = (candidate: Upload): Promise<void> => new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      error ? reject(error) : resolve();
    };
    const abort = () => {
      cancelled = true;
      void candidate.abort(false).finally(() => finish(new MindVideoUploadCancelledError()));
    };
    signal?.addEventListener("abort", abort, { once: true });
    candidate.options.onSuccess = () => finish();
    candidate.options.onError = error => finish(error);
    candidate.start();
  });

  try {
    await run(upload);
  } catch (error) {
    if (cancelled) throw new MindVideoUploadCancelledError();
    if (previous && statusOf(error as Error) === 404) {
      await upload.options.urlStorage?.removeUpload(previous.urlStorageKey);
      upload = build(ownerId + "/" + crypto.randomUUID() + ".mp4");
      resumed = false;
      await run(upload);
      return { storagePath: upload.options.metadata!.objectName, resumed };
    }
    const status = statusOf(error as Error);
    if (status === 413) throw new Error("O Storage recusou o vídeo por ultrapassar o limite global de 50 MB.");
    if (status === 401 || status === 403) throw new Error("A sessão expirou ou esta conta não tem permissão para publicar vídeos.");
    if (status && status >= 400 && status < 500) throw new Error(`O Storage recusou o upload (HTTP ${status}).`);
    throw new Error("Não foi possível concluir o envio. Tente novamente com o mesmo arquivo para retomar o progresso.");
  }
  return { storagePath, resumed };
}
