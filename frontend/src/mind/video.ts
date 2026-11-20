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

/** Legacy Supabase Storage and local-browser per-file ceiling. */
export const MAX_MIND_VIDEO_BYTES = 50_000_000;
/** R2's per-file limit is the app's total managed-storage limit; the Worker enforces it cumulatively. */
export const MAX_MIND_R2_VIDEO_BYTES = 5_000_000_000;

/** Checks the MP4 container signature only; browser decoding separately validates playable codecs. */
export async function checkedMp4(file: File | Blob, maxBytes = MAX_MIND_R2_VIDEO_BYTES): Promise<boolean> {
  if (!Number.isSafeInteger(file.size) || file.size < 12 || file.size > maxBytes) return false;
  const data = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70;
}

export function safeMindVideoFileName(value: string): string {
  const name = value.normalize("NFC").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180);
  return name.toLowerCase().endsWith(".mp4") ? name : "video.mp4";
}
