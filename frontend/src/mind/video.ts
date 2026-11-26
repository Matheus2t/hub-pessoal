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
export function assertMindVideoDownloadSize(contentLength: string | null, actualSize?: number): void {
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) throw new Error("O tamanho informado para o vídeo é inválido.");
    const declaredSize = Number(contentLength);
    if (!Number.isSafeInteger(declaredSize) || declaredSize <= 0) throw new Error("O tamanho informado para o vídeo é inválido.");
    if (declaredSize > MAX_MIND_VIDEO_BYTES) throw new Error("O vídeo ultrapassa 25 MB.");
  }
  if (actualSize !== undefined) {
    if (!Number.isSafeInteger(actualSize) || actualSize <= 0) throw new Error("O tamanho recebido para o vídeo é inválido.");
    if (actualSize > MAX_MIND_VIDEO_BYTES) throw new Error("O vídeo ultrapassa 25 MB.");
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
