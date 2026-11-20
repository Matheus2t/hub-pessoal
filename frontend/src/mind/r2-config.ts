declare global {
  var __2T_MIND_R2_ENABLED__: boolean | undefined;
  var __2T_MIND_R2_URL__: string | undefined;
}

export interface MindR2Storage {
  ready: boolean;
  usedBytes: number | null;
  reservedBytes: number | null;
  availableBytes: number | null;
  maxBytes: number;
  objectCount?: number;
  unpublishedOrOrphanCount?: number;
}

export const MAX_MIND_R2_BYTES = 5_000_000_000;
export const MIND_R2_PART_BYTES = 16 * 1024 * 1024;
const R2_KEY = /^videos\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.mp4$/i;

export function mindR2Enabled(): boolean {
  if (globalThis.__2T_MIND_R2_ENABLED__ !== true) return false;
  try {
    const url = new URL(globalThis.__2T_MIND_R2_URL__ ?? "");
    return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash;
  } catch { return false; }
}

export function mindR2Url(path: string): string {
  if (!mindR2Enabled() || !path.startsWith("/")) throw new Error("O armazenamento R2 não está configurado.");
  return globalThis.__2T_MIND_R2_URL__!.replace(/\/$/, "") + path;
}

export function isMindR2Key(path: string): boolean { return R2_KEY.test(path); }

export function publicMindR2VideoUrl(path: string, downloadName?: string): string {
  if (!isMindR2Key(path)) throw new Error("Caminho de vídeo R2 inválido.");
  const url = new URL(mindR2Url("/media/" + path.split("/").map(encodeURIComponent).join("/")));
  if (downloadName) url.searchParams.set("download", safeR2FileName(downloadName));
  return url.toString();
}

export function safeR2FileName(value: string): string {
  const name = value.normalize("NFC").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180);
  return name.toLowerCase().endsWith(".mp4") ? name : "video.mp4";
}
