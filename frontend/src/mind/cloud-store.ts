/** Supabase PostgREST + Storage adapter. RLS is the write authorization boundary. */
import { mindApi, mindPublicApi, publicMindPdfUrl, safeMindPdfFileName } from "./cloud-auth";
import { checkedPdf, MAX_MIND_PDF_BYTES, type MindItem } from "./store";

const BUCKET = "mind-pdfs";
const UUID = "[0-9a-f-]{36}";
const STORAGE_PATH = new RegExp(`^${UUID}/${UUID}(?:-${UUID})?\\.pdf$`, "i");
type DbItem = {
  id: string; owner_id: string; kind: "note" | "pdf"; title: string; topic: string;
  tags: string[]; description: string; content: string; favorite: boolean;
  created_at: string; updated_at: string; file_name: string | null;
  file_size: number | null; storage_path: string | null;
};
type StoredItem = { id: string; kind: "note" | "pdf"; storage_path: string | null; updated_at: string };
type CleanupResult = "removed" | "still-linked" | "pending";

async function requireOk(response: Response, label: string): Promise<Response> {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Acesso negado. Entre novamente.");
    if (response.status === 413) throw new Error("O PDF ultrapassa o tamanho permitido.");
    if (response.status === 404) throw new Error("O PDF não está mais disponível na biblioteca.");
    throw new Error(label + " (HTTP " + response.status + ").");
  }
  return response;
}

function itemFromRow(row: DbItem): MindItem {
  return {
    id: row.id, kind: row.kind, title: row.title, topic: row.topic, tags: row.tags,
    description: row.description, content: row.content, favorite: row.favorite,
    createdAt: Date.parse(row.created_at), updatedAt: Date.parse(row.updated_at),
    fileName: row.file_name ?? undefined, fileSize: row.file_size ?? undefined, storagePath: row.storage_path ?? undefined,
  };
}
function rowFromItem(item: MindItem) {
  return {
    id: item.id, kind: item.kind, title: item.title, topic: item.topic, tags: item.tags,
    description: item.description, content: item.content, favorite: item.favorite,
    created_at: new Date(item.createdAt).toISOString(), updated_at: new Date(item.updatedAt).toISOString(),
    file_name: item.kind === "pdf" ? safeMindPdfFileName(item.fileName ?? item.title + ".pdf") : null,
    file_size: item.kind === "pdf" ? item.fileSize ?? item.file?.size ?? null : null,
  };
}
function storageObjectUrl(path: string): string {
  if (!STORAGE_PATH.test(path)) throw new Error("Caminho de PDF inválido.");
  return "/storage/v1/object/" + BUCKET + "/" + path.split("/").map(encodeURIComponent).join("/");
}
async function currentItem(id: string): Promise<StoredItem | null> {
  const response = await requireOk(await mindApi(
    "/rest/v1/mind_items?select=id,kind,storage_path,updated_at&id=eq." + encodeURIComponent(id) + "&limit=1",
  ), "Não foi possível conferir o registro");
  return (await response.json() as StoredItem[])[0] ?? null;
}
async function cleanupIfUnreferenced(path: string): Promise<CleanupResult> {
  if (!STORAGE_PATH.test(path)) return "pending";
  try {
    const query = new URLSearchParams({ select: "id", storage_path: "eq." + path, limit: "1" });
    const refs = await requireOk(await mindApi("/rest/v1/mind_items?" + query.toString()), "Não foi possível verificar o vínculo do PDF");
    if ((await refs.json() as Array<{ id: string }>).length) return "still-linked";
    const response = await mindApi(storageObjectUrl(path), { method: "DELETE" });
    return response.ok || response.status === 404 ? "removed" : "pending";
  } catch {
    // Never delete a file when its database reference cannot be checked.
    return "pending";
  }
}

export async function listCloudMindItems(): Promise<MindItem[]> {
  const response = await requireOk(await mindPublicApi(
    "/rest/v1/mind_items?select=id,kind,title,topic,tags,description,content,favorite,created_at,updated_at,file_name,file_size,storage_path&order=updated_at.desc&limit=500",
  ), "Não foi possível carregar a biblioteca");
  return (await response.json() as DbItem[]).map(itemFromRow);
}

/** A public, body-free check lets the reader show an error before displaying a blank frame. */
export async function checkPublicCloudPdf(item: MindItem): Promise<void> {
  if (item.kind !== "pdf" || !item.storagePath) throw new Error("Este item não possui um PDF disponível.");
  let response: Response;
  try {
    response = await fetch(publicMindPdfUrl(item.storagePath), {
      method: "HEAD", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
      headers: { Accept: "application/pdf" },
    });
  } catch {
    throw new Error("Não foi possível acessar a prévia pública. Verifique a conexão ou abra o PDF em outra aba.");
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error("Este PDF não está mais disponível na biblioteca.");
    throw new Error("Não foi possível carregar a prévia do PDF (HTTP " + response.status + ").");
  }
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/pdf" && contentType !== "application/octet-stream") {
    throw new Error("O arquivo publicado não foi identificado como PDF.");
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (response.headers.has("content-length") &&
      (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_MIND_PDF_BYTES)) {
    throw new Error("O tamanho informado para o PDF é inválido ou ultrapassa 25 MB.");
  }
}

/** Public and anonymous download. No admin session or bearer token is sent. */
export async function downloadPublicCloudPdf(item: MindItem): Promise<Blob> {
  if (item.kind !== "pdf" || !item.storagePath) throw new Error("Este item não possui um PDF disponível.");
  let response: Response;
  try {
    response = await fetch(publicMindPdfUrl(item.storagePath), {
      method: "GET", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
      headers: { Accept: "application/pdf" },
    });
  } catch {
    throw new Error("Não foi possível acessar o PDF público. Verifique a conexão ou use “Abrir no navegador”.");
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error("Este PDF não está mais disponível na biblioteca.");
    throw new Error("Não foi possível baixar o PDF (HTTP " + response.status + ").");
  }
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/pdf" && contentType !== "application/octet-stream") {
    throw new Error("O arquivo recebido não é um PDF.");
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (response.headers.has("content-length")) {
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0) throw new Error("O tamanho informado para o PDF é inválido.");
    if (contentLength > MAX_MIND_PDF_BYTES) throw new Error("O PDF ultrapassa o tamanho permitido.");
  }
  const blob = await response.blob();
  if (!(await checkedPdf(blob))) throw new Error("O PDF recebido está inválido ou ultrapassa 25 MB.");
  return blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
}

/** Authenticated read is used for administrator backups and local-to-cloud migration only. */
export async function downloadCloudPdf(item: MindItem): Promise<Blob> {
  const record = await currentItem(item.id);
  if (!record || record.kind !== "pdf" || !record.storage_path) throw new Error("PDF não encontrado na biblioteca.");
  const response = await requireOk(await mindApi(storageObjectUrl(record.storage_path)), "Não foi possível abrir o PDF");
  const blob = await response.blob();
  if (!(await checkedPdf(blob))) throw new Error("O PDF armazenado não pôde ser validado.");
  return blob;
}

/** Returns true when a replaced file could not be safely removed and needs admin attention. */
export async function saveCloudMindItem(item: MindItem): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(item.id)) throw new Error("Identificador inválido.");
  if (!item.title.trim() || item.title.length > 180 || item.content.length > 250000 ||
      item.description.length > 3000 || item.topic.length > 80 || item.tags.length > 12) {
    throw new Error("Os dados da nota ultrapassam os limites permitidos.");
  }

  const previous = await currentItem(item.id);
  let newPath: string | null = null;
  if (item.kind === "pdf" && item.file) {
    if (!(await checkedPdf(item.file))) throw new Error("PDF inválido ou maior que 25 MB.");
    const session = await requireOk(await mindApi("/auth/v1/user"), "Sessão inválida");
    const user = await session.json() as { id?: string };
    if (!user.id || !/^[0-9a-f-]{36}$/i.test(user.id)) throw new Error("A sessão administrativa é inválida.");
    // A unique path keeps the current published file intact until the row points to the replacement.
    newPath = user.id + "/" + item.id + "-" + crypto.randomUUID() + ".pdf";
    try {
      await requireOk(await mindApi(storageObjectUrl(newPath), {
        method: "POST", headers: { "Content-Type": "application/pdf" }, body: item.file,
      }), "Não foi possível enviar o PDF");
    } catch (error) {
      const cleanup = await cleanupIfUnreferenced(newPath);
      if (cleanup === "pending") {
        throw new Error((error instanceof Error ? error.message : "Falha ao enviar o PDF.") + " O upload foi preservado porque não foi possível confirmar com segurança se o arquivo está vinculado.");
      }
      if (cleanup === "still-linked") {
        throw new Error("O envio retornou uma resposta inconclusiva, mas o PDF consta vinculado. Atualize a biblioteca antes de tentar novamente.");
      }
      throw error;
    }
  }

  const row: Record<string, unknown> = rowFromItem(item);
  if (newPath) row.storage_path = newPath;
  try {
    const response = await requireOk(await mindApi(
      previous
        ? "/rest/v1/mind_items?id=eq." + encodeURIComponent(item.id) + "&updated_at=eq." + encodeURIComponent(previous.updated_at)
        : "/rest/v1/mind_items",
      {
        method: previous ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(row),
      },
    ), "Não foi possível salvar o item");
    const saved = await response.json() as Array<{ id: string }>;
    if (!saved.some(record => record.id === item.id)) throw new Error("O banco não confirmou a gravação do item.");
  } catch (error) {
    if (newPath) {
      const cleanup = await cleanupIfUnreferenced(newPath);
      if (cleanup === "pending") {
        throw new Error((error instanceof Error ? error.message : "Falha ao salvar o item.") + " O upload foi preservado porque não foi possível confirmar com segurança se o arquivo está vinculado.");
      }
      if (cleanup === "still-linked") {
        throw new Error("A resposta do banco foi inconclusiva, mas o PDF consta vinculado. Atualize a biblioteca antes de tentar novamente.");
      }
    }
    throw error;
  }

  if (newPath && previous?.storage_path && previous.storage_path !== newPath) {
    return (await cleanupIfUnreferenced(previous.storage_path)) === "pending";
  }
  return false;
}

/** Returns true when the item was removed but its public PDF still needs safe cleanup. */
export async function deleteCloudMindItem(item: MindItem): Promise<boolean> {
  const previous = await currentItem(item.id);
  if (!previous) throw new Error("Item não encontrado ou sem permissão para excluí-lo.");
  const response = await requireOk(await mindApi("/rest/v1/mind_items?id=eq." + encodeURIComponent(item.id) +
    "&updated_at=eq." + encodeURIComponent(previous.updated_at), {
    method: "DELETE", headers: { Prefer: "return=representation" },
  }), "Não foi possível excluir o item");
  const deleted = await response.json() as Array<{ id: string }>;
  if (!deleted.some(record => record.id === item.id)) throw new Error("O banco não confirmou a exclusão do item.");
  if (previous.storage_path) return (await cleanupIfUnreferenced(previous.storage_path)) === "pending";
  return false;
}
