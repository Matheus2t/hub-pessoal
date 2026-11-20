/**
 * 2T Mente V1: local-first document store.
 * Intentionally no network calls. This is NOT an authenticated or encrypted vault.
 * All items and PDF blobs live in the current browser profile's IndexedDB.
 */
import { checkedMp4, MAX_MIND_VIDEO_BYTES, parseMindVideoLink } from "./video";

export type MindKind = "note" | "pdf" | "video";
export interface MindItem {
  id: string;
  kind: MindKind;
  title: string;
  topic: string;
  tags: string[];
  description: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  fileName?: string;
  fileSize?: number;
  storagePath?: string;
  storageProvider?: "google-drive";
  driveFileId?: string;
  videoUrl?: string;
  posterDataUrl?: string;
  file?: Blob;
}

export const MAX_MIND_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_MIND_BACKUP_BYTES = 160 * 1024 * 1024;
const DB_NAME = "2t-mente-local-v1";
const STORE = "items";

function openDatabase(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) return Promise.reject(new Error("Este navegador não permite armazenamento local."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir a biblioteca local."));
    request.onblocked = () => reject(new Error("Feche outras abas da 2T e tente novamente."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? request.error ?? new Error("Falha ao salvar os dados locais."));
      tx.onabort = () => reject(tx.error ?? new Error("Armazenamento indisponível. Confira o espaço do navegador."));
    });
  } finally {
    db.close();
  }
}

export async function listMindItems(): Promise<MindItem[]> {
  return transaction("readonly", store => store.getAll() as IDBRequest<MindItem[]>);
}
export async function saveMindItem(item: MindItem): Promise<void> {
  await transaction("readwrite", store => store.put(item));
}
export async function deleteMindItem(id: string): Promise<void> {
  await transaction("readwrite", store => store.delete(id));
}

export function normalizedTags(value: string): string[] {
  return [...new Set(value.split(",").map(tag => tag.trim()).filter(Boolean).slice(0, 12))];
}
export function displayFileSize(bytes: number): string {
  return bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + " KB" : (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
}
export function mindBackupAssetName(item: MindItem): string {
  const suffix = item.kind === "pdf" ? ".pdf" : ".mp4";
  const base = (item.fileName || item.title + suffix).normalize("NFC")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180);
  return `${item.id}__${base.toLowerCase().endsWith(suffix) ? base : base + suffix}`;
}
export async function checkedPdf(file: File | Blob): Promise<boolean> {
  return file.size > 0 && file.size <= MAX_MIND_PDF_BYTES && (await file.slice(0, 5).text()) === "%PDF-";
}

function toBase64(buffer: ArrayBuffer): string {
  const data = new Uint8Array(buffer);
  const chunk = 0x8000;
  let encoded = "";
  for (let i = 0; i < data.length; i += chunk) {
    encoded += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  return btoa(encoded);
}

function fromBase64(data: string): Blob {
  if (data.length > Math.ceil(MAX_MIND_PDF_BYTES / 3) * 4 + 16 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    throw new Error("Arquivo PDF inválido no backup.");
  }
  const decoded = atob(data);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  if (bytes.length < 5 || String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("O backup contém um arquivo que não é PDF.");
  }
  return new Blob([bytes], { type: "application/pdf" });
}

function videoFromBase64(data: string): Blob {
  if (data.length > Math.ceil(MAX_MIND_VIDEO_BYTES / 3) * 4 + 16 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    throw new Error("Vídeo inválido no backup.");
  }
  const decoded = atob(data);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  if (bytes.length < 12 || bytes[4] !== 0x66 || bytes[5] !== 0x74 ||
      bytes[6] !== 0x79 || bytes[7] !== 0x70) throw new Error("O backup contém um vídeo inválido.");
  return new Blob([bytes], { type: "video/mp4" });
}

/** V3 keeps metadata in JSON and stores each PDF/MP4 as a separate sidecar file. */
export async function createMindBackup(items: MindItem[]): Promise<Blob> {
  const records = [];
  let hasExternalBinary = false;
  for (const item of items) {
    const { file: _file, ...metadata } = item;
    delete metadata.storagePath;
    const isDriveVideo = item.kind === "video" && item.storageProvider === "google-drive" && !!item.driveFileId;
    const hasFile = (item.kind === "pdf" || item.kind === "video") && !item.videoUrl && !isDriveVideo && (!!item.file || !!item.storagePath);
    if (isDriveVideo || ((item.kind === "pdf" || item.kind === "video") && !item.videoUrl && !item.file)) hasExternalBinary = true;
    records.push({
      ...metadata,
      ...(hasFile ? { assetName: mindBackupAssetName(item), assetSize: item.fileSize ?? item.file?.size ?? null } : {}),
    });
  }
  return new Blob([JSON.stringify({ format: "2t-mind", version: 3, assetsComplete: !hasExternalBinary, exportedAt: new Date().toISOString(), records })], { type: "application/json" });
}

export async function parseMindBackup(file: File, sidecars: File[] = []): Promise<MindItem[]> {
  if (!file.size || file.size > MAX_MIND_BACKUP_BYTES) throw new Error("O backup ultrapassa o limite de 160 MB.");
  let archive: unknown;
  try { archive = JSON.parse(await file.text()); }
  catch { throw new Error("Não foi possível ler o arquivo de backup."); }
  if (!archive || typeof archive !== "object") throw new Error("Arquivo de backup inválido.");
  const data = archive as { format?: unknown; version?: unknown; records?: unknown };
  if (data.format !== "2t-mind" || ![1, 2, 3].includes(data.version as number) || !Array.isArray(data.records) || data.records.length > 300) {
    throw new Error("O arquivo não é um backup compatível da Mente 2T.");
  }
  const imported: MindItem[] = [];
  const assets = new Map(sidecars.map(asset => [asset.name, asset]));
  for (const entry of data.records) {
    if (!entry || typeof entry !== "object") throw new Error("Registro inválido no backup.");
    const r = entry as Record<string, unknown>;
    if (r.kind !== "note" && r.kind !== "pdf" && r.kind !== "video") throw new Error("Tipo de registro inválido.");
    if (typeof r.id !== "string" || !/^[0-9a-f-]{36}$/i.test(r.id)) throw new Error("Identificador inválido.");
    if (typeof r.title !== "string" || !r.title.trim() || r.title.length > 180) throw new Error("Título inválido.");
    if (typeof r.topic !== "string" || r.topic.length > 80 || typeof r.description !== "string" || r.description.length > 3000) throw new Error("Metadados inválidos.");
    if (typeof r.content !== "string" || r.content.length > 250000) throw new Error("Nota longa demais.");
    const item: MindItem = {
      id: r.id, kind: r.kind, title: r.title.trim(), topic: r.topic.trim() || "Sem assunto",
      description: r.description, content: r.content,
      tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === "string" && t.length <= 50).slice(0, 12) : [],
      favorite: r.favorite === true,
      createdAt: typeof r.createdAt === "number" && Number.isFinite(r.createdAt) ? r.createdAt : Date.now(),
      updatedAt: typeof r.updatedAt === "number" && Number.isFinite(r.updatedAt) ? r.updatedAt : Date.now(),
    };
    if (r.kind === "video" && typeof r.posterDataUrl === "string" && r.posterDataUrl.length <= 65536 && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(r.posterDataUrl)) {
      item.posterDataUrl = r.posterDataUrl;
    }
    if (r.kind === "pdf") {
      if (data.version === 3) {
        if (typeof r.assetName !== "string") throw new Error("PDF ausente no manifesto do backup.");
        const asset = assets.get(r.assetName);
        if (!asset || !(await checkedPdf(asset)) || (typeof r.assetSize === "number" && asset.size !== r.assetSize)) throw new Error(`Arquivo ausente ou inválido: ${r.assetName}`);
        item.file = asset;
      } else {
        if (typeof r.pdfBase64 !== "string") throw new Error("PDF ausente no backup.");
        item.file = fromBase64(r.pdfBase64);
      }
      if (item.file.size > MAX_MIND_PDF_BYTES) throw new Error("PDF do backup excede 25 MB.");
      item.fileSize = item.file.size;
      item.fileName = typeof r.fileName === "string" ? r.fileName.slice(0, 180) : item.title + ".pdf";
    }
    if (r.kind === "video") {
      if (typeof r.videoUrl === "string" && r.videoUrl) {
        const link = parseMindVideoLink(r.videoUrl);
        if (!link || r.videoBase64) throw new Error("Link de vídeo inválido no backup.");
        item.videoUrl = link.url;
      } else if (data.version === 3 && r.storageProvider === "google-drive") {
        if (typeof r.driveFileId !== "string" || !/^[A-Za-z0-9_-]{10,200}$/.test(r.driveFileId) ||
            typeof r.fileSize !== "number" || !Number.isSafeInteger(r.fileSize) || r.fileSize < 1 || r.fileSize > 5_000_000_000 ||
            typeof r.fileName !== "string" || r.fileName.length > 180 || r.assetName || r.videoBase64) {
          throw new Error("A referência externa do vídeo no backup é inválida.");
        }
        item.storageProvider = "google-drive";
        item.driveFileId = r.driveFileId;
        item.fileSize = r.fileSize;
        item.fileName = r.fileName;
      } else if (data.version === 3 && typeof r.assetName === "string") {
        const asset = assets.get(r.assetName);
        if (!asset || asset.size > MAX_MIND_VIDEO_BYTES || (typeof r.assetSize === "number" && asset.size !== r.assetSize)) throw new Error(`Arquivo ausente, alterado ou acima de 50 MB: ${String(r.assetName)}`);
        item.file = asset;
        if (!(await checkedMp4(item.file))) throw new Error("MP4 inválido no backup.");
        item.fileSize = item.file.size;
        item.fileName = typeof r.fileName === "string" ? r.fileName.slice(0, 180) : item.title + ".mp4";
      } else if (typeof r.videoBase64 === "string") {
        item.file = videoFromBase64(r.videoBase64);
        if (!(await checkedMp4(item.file))) throw new Error("MP4 inválido no backup.");
        item.fileSize = item.file.size;
        item.fileName = typeof r.fileName === "string" ? r.fileName.slice(0, 180) : item.title + ".mp4";
      } else {
        throw new Error("O vídeo do backup não possui arquivo ou link.");
      }
    }
    imported.push(item);
  }
  // Validate the complete archive before performing any write.
  return imported;
}

export async function restoreMindBackup(file: File, sidecars: File[] = []): Promise<MindItem[]> {
  const imported = await parseMindBackup(file, sidecars);
  for (const item of imported) await saveMindItem(item);
  return imported;
}
