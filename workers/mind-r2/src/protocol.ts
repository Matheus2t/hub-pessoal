export const MAX_R2_STORAGE_BYTES = 5_000_000_000;
export const R2_PART_BYTES = 16 * 1024 * 1024;
// Leave margin before R2's seven-day incomplete multipart cleanup window.
export const R2_UPLOAD_TTL_MS = 6 * 24 * 60 * 60 * 1000;
export const MAX_R2_PARTS = Math.ceil(MAX_R2_STORAGE_BYTES / R2_PART_BYTES);

export function expectedPartSize(totalBytes: number, partNumber: number): number {
  if (!Number.isSafeInteger(totalBytes) || totalBytes < 1 || totalBytes > MAX_R2_STORAGE_BYTES ||
      !Number.isInteger(partNumber) || partNumber < 1) return 0;
  const offset = (partNumber - 1) * R2_PART_BYTES;
  return offset >= totalBytes ? 0 : Math.min(R2_PART_BYTES, totalBytes - offset);
}

export function canReserve(occupiedBytes: number, reservedBytes: number, requestedBytes: number): boolean {
  return Number.isSafeInteger(occupiedBytes) && Number.isSafeInteger(reservedBytes) &&
    Number.isSafeInteger(requestedBytes) && occupiedBytes >= 0 && reservedBytes >= 0 &&
    requestedBytes > 0 && requestedBytes <= MAX_R2_STORAGE_BYTES &&
    occupiedBytes + reservedBytes + requestedBytes <= MAX_R2_STORAGE_BYTES;
}

export interface ByteRange { start: number; end: number; length: number; }

export function parseByteRange(value: string | null, size: number): ByteRange | null | false {
  if (!value) return null;
  if (!Number.isSafeInteger(size) || size < 0 || !/^bytes=\d*-\d*$/.test(value.trim())) return false;
  const [rawStart, rawEnd] = value.trim().slice(6).split("-");
  if (!rawStart && !rawEnd) return false;
  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isSafeInteger(suffix) || suffix <= 0 || size === 0) return false;
    const length = Math.min(suffix, size);
    return { start: size - length, end: size - 1, length };
  }
  const start = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 ||
      requestedEnd < start || start >= size) return false;
  const end = Math.min(requestedEnd, size - 1);
  return { start, end, length: end - start + 1 };
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
export const R2_VIDEO_KEY = new RegExp(`^videos/${UUID}/${UUID}-${UUID}\\.mp4$`, "i");
export const UUID_PATTERN = new RegExp(`^${UUID}$`, "i");

export function safeFileName(value: unknown): string {
  if (typeof value !== "string") return "video.mp4";
  const name = value.normalize("NFC").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180);
  return name.toLowerCase().endsWith(".mp4") ? name : "video.mp4";
}
