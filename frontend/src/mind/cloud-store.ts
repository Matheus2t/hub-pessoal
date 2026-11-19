/** Private Supabase PostgREST + Storage adapter. Server RLS is the security boundary. */
import { mindApi, mindPublicApi } from "./cloud-auth";
import { checkedPdf, MAX_MIND_PDF_BYTES, type MindItem } from "./store";

const BUCKET = "mind-pdfs";
type DbItem = {
  id: string; owner_id: string; kind: "note" | "pdf"; title: string; topic: string;
  tags: string[]; description: string; content: string; favorite: boolean;
  created_at: string; updated_at: string; file_name: string | null;
  file_size: number | null; storage_path: string | null;
};
async function requireOk(response: Response, label: string): Promise<Response> {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Acesso negado. Entre novamente.");
    if (response.status === 413) throw new Error("O PDF ultrapassa o tamanho permitido.");
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
    file_name: item.kind === "pdf" ? item.fileName ?? item.title + ".pdf" : null,
    file_size: item.kind === "pdf" ? item.fileSize ?? item.file?.size ?? null : null,
  };
}
export async function listCloudMindItems(): Promise<MindItem[]> {
  const response = await requireOk(await mindPublicApi(
    "/rest/v1/mind_items?select=id,kind,title,topic,tags,description,content,favorite,created_at,updated_at,file_name,file_size,storage_path&order=updated_at.desc&limit=500",
  ), "Não foi possível carregar as notas");
  return (await response.json() as DbItem[]).map(itemFromRow);
}
async function storedPath(id: string): Promise<string> {
  const r = await requireOk(await mindApi(
    "/rest/v1/mind_items?select=storage_path&id=eq." + encodeURIComponent(id) + "&limit=1",
  ), "Arquivo indisponível");
  const data = await r.json() as Array<{ storage_path: string | null }>;
  if (!data.length || !data[0].storage_path) throw new Error("PDF não encontrado na biblioteca.");
  return data[0].storage_path;
}
export async function downloadCloudPdf(item: MindItem): Promise<Blob> {
  const path = await storedPath(item.id);
  const response = await requireOk(await mindApi(
    "/storage/v1/object/authenticated/" + BUCKET + "/" + path.split("/").map(encodeURIComponent).join("/"),
  ), "Não foi possível abrir o PDF");
  const blob = await response.blob();
  if (!(await checkedPdf(blob))) throw new Error("O PDF armazenado não pôde ser validado.");
  return blob;
}
export async function saveCloudMindItem(item: MindItem): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(item.id)) throw new Error("Identificador inválido.");
  if (!item.title.trim() || item.title.length > 180 || item.content.length > 250000 ||
      item.description.length > 3000 || item.topic.length > 80 || item.tags.length > 12) {
    throw new Error("Os dados da nota ultrapassam os limites permitidos.");
  }
  let path: string | null = null;
  // Ask the database for the owner from auth.uid(), never from untrusted UI data.
  if (item.kind === "pdf" && item.file) {
    if (!(await checkedPdf(item.file))) throw new Error("PDF inválido ou maior que 25 MB.");
    const session = await requireOk(await mindApi("/auth/v1/user"), "Sessão inválida");
    const user = await session.json() as { id: string };
    path = user.id + "/" + item.id + ".pdf";
    await requireOk(await mindApi("/storage/v1/object/" + BUCKET + "/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/pdf", "x-upsert": "true" },
      body: item.file,
    }), "Não foi possível enviar o PDF");
  }
  const existsResponse = await requireOk(await mindApi(
    "/rest/v1/mind_items?select=id&id=eq." + encodeURIComponent(item.id) + "&limit=1",
  ), "Não foi possível conferir o registro");
  const existing = (await existsResponse.json() as Array<{ id: string }>).length > 0;
  const row: Record<string, unknown> = rowFromItem(item);
  if (path) row.storage_path = path;
  const response = await mindApi(
    existing ? "/rest/v1/mind_items?id=eq." + encodeURIComponent(item.id) : "/rest/v1/mind_items",
    {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(row),
    },
  );
  await requireOk(response, "Não foi possível salvar o item");
}
export async function deleteCloudMindItem(item: MindItem): Promise<void> {
  // Remove DB record first. An occasional orphan in Storage can be cleaned up later
  // without accidentally deleting the only readable copy.
  const path = item.kind === "pdf" ? await storedPath(item.id) : null;
  await requireOk(await mindApi("/rest/v1/mind_items?id=eq." + encodeURIComponent(item.id), {
    method: "DELETE",
  }), "Não foi possível excluir o item");
  if (path) {
    const response = await mindApi("/storage/v1/object/" + BUCKET + "/" + path, { method: "DELETE" });
    await requireOk(response, "O item foi excluído, mas não foi possível limpar o PDF da nuvem");
  }
}
