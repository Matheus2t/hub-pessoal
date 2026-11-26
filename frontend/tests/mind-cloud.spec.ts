import { expect, test } from "@playwright/test";
import { readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serveBuiltSite } from "./helpers/serve-built-site";

test.skip(!/^(true|1|yes)$/i.test(process.env.MIND_CLOUD_ENABLED ?? ""), "Requer build de teste Mente Cloud");

const supabase = "https://mocktestproj.supabase.co";
const storage = "https://mocktestproj.storage.supabase.co";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer, x-upsert, tus-resumable, upload-length, upload-metadata, upload-offset, cache-control",
  "Access-Control-Expose-Headers": "Location, Tus-Resumable, Upload-Offset, Upload-Length, Tus-Version, Tus-Extension",
};
function makeTwoPagePdfWithLink() {
  const streams = [
    "BT /F1 18 Tf 40 300 Td (Mente PDF test page one) Tj ET",
    "BT /F1 18 Tf 40 300 Td (Mente PDF test page two) Tj ET",
  ];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R /Annots [8 0 R] >>",
    `<< /Length ${Buffer.byteLength(streams[0])} >>\nstream\n${streams[0]}\nendstream`,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    `<< /Length ${Buffer.byteLength(streams[1])} >>\nstream\n${streams[1]}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Annot /Subtype /Link /Rect [30 30 180 60] /Border [0 0 0] /A << /S /URI /URI (https://example.com/) >> >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}
const pdfBytes = makeTwoPagePdfWithLink();
const mp4Bytes = readFileSync("frontend/tests/fixtures/mind-h264-aac.mp4");
function makeMp4WithFreeBox(totalBytes = 26_000_000) {
  const trailingLength = totalBytes - mp4Bytes.length;
  const header = Buffer.alloc(8);
  header.writeUInt32BE(trailingLength, 0);
  header.write("free", 4, "ascii");
  return Buffer.concat([mp4Bytes, header, Buffer.alloc(trailingLength - header.length)]);
}
expect(pdfBytes.toString("ascii")).toContain("/Count 2");
expect(pdfBytes.toString("ascii")).toContain("/Subtype /Link");
const owner = "075026fa-4e9f-4e1a-8ef4-a3c443e11442";
const note = {
  id: "98a6ee58-9c8a-4a40-ae1f-3d5537bc4c5a", owner_id: owner,
  kind: "note", title: "Investimentos", topic: "Estudos", tags: ["2027"],
  description: "Cenários", content: "Estudos públicos.", favorite: false,
  file_name: null, file_size: null, storage_path: null,
  created_at: "2026-11-19T00:00:00.000Z", updated_at: "2026-11-19T00:00:00.000Z",
};
const pdf = {
  ...note, id: "e75dc2e4-2579-426d-9f21-3e1a34dc6ed4", kind: "pdf",
  title: "Relatório", content: "", file_name: "relatorio.pdf", file_size: pdfBytes.length,
  storage_path: owner + "/e75dc2e4-2579-426d-9f21-3e1a34dc6ed4.pdf",
};
async function loginAsMockAdmin(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "+ Nova nota" }).click();
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByLabel("Senha").fill("not-a-real-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".mind-editor")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
}
function mockApi(page: import("@playwright/test").Page, admin = true, options: {
  pdfStatus?: number; pdfContentType?: string; failRecordWrite?: boolean; failObjectDelete?: boolean;
  tusStatus?: number; tus401Once?: boolean; failFirstPatch?: boolean;
  holdPatches?: { value: boolean };
} = {}) {
  const requests: { path: string; method: string; auth: string | null }[] = [];
  const items = [note, pdf];
  const objects = new Set([pdf.storage_path]);
  const tusSessions = new Map<string, { path: string; size: number; offset: number }>();
  let unauthorizedUsed = false;
  let failPatchUsed = false;
  return {
    requests, objects,
    items,
    async install() {
      await page.route(storage + "/**", async route => {
        const request = route.request();
        const url = new URL(request.url());
        requests.push({ path: url.pathname + url.search, method: request.method(), auth: request.headers()["authorization"] ?? null });
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...cors, "Tus-Resumable": "1.0.0", "Tus-Version": "1.0.0", "Tus-Extension": "creation,creation-with-upload" } });
        if (url.pathname === "/storage/v1/upload/resumable" && request.method() === "POST") {
          if (options.tusStatus) return route.fulfill({ status: options.tusStatus, headers: cors, body: "simulated TUS error" });
          if (options.tus401Once && !unauthorizedUsed) { unauthorizedUsed = true; return route.fulfill({ status: 401, headers: cors }); }
          const length = Number(request.headers()["upload-length"]);
          if (!Number.isSafeInteger(length) || length <= 0 || length > 50_000_000) return route.fulfill({ status: 413, headers: cors });
          const metadata = Object.fromEntries((request.headers()["upload-metadata"] ?? "").split(",").map(pair => {
            const [key, value = ""] = pair.split(" ");
            return [key, Buffer.from(value, "base64").toString("utf8")];
          }));
          const path = metadata.objectName;
          const id = crypto.randomUUID();
          const bodyLength = request.postDataBuffer()?.length ?? 0;
          const offset = Math.min(length, bodyLength);
          tusSessions.set(id, { path, size: length, offset });
          if (offset === length) objects.add(path);
          return route.fulfill({ status: 201, headers: { ...cors, Location: `${storage}/storage/v1/upload/resumable?id=${id}`, "Tus-Resumable": "1.0.0", "Upload-Offset": String(offset), "Upload-Length": String(length), "Tus-Version": "1.0.0", "Tus-Extension": "creation,creation-with-upload" } });
        }
        const id = url.searchParams.get("id") ?? "";
        const session = tusSessions.get(id);
        if (session && request.method() === "HEAD") return route.fulfill({ status: 200, headers: { ...cors, "Tus-Resumable": "1.0.0", "Upload-Offset": String(session.offset), "Upload-Length": String(session.size), "Cache-Control": "no-store" } });
        if (session && request.method() === "PATCH") {
          const offset = Number(request.headers()["upload-offset"]);
          if (offset !== session.offset) return route.fulfill({ status: 409, headers: cors });
          if (options.failFirstPatch && !failPatchUsed) { failPatchUsed = true; return route.fulfill({ status: 503, headers: cors }); }
          session.offset = Math.min(session.size, session.offset + (request.postDataBuffer()?.length ?? 0));
          if (session.offset === session.size) objects.add(session.path);
          if (options.holdPatches?.value) await new Promise(resolve => setTimeout(resolve, 800));
          return route.fulfill({ status: 204, headers: { ...cors, "Tus-Resumable": "1.0.0", "Upload-Offset": String(session.offset) } });
        }
        return route.fulfill({ status: 404, headers: cors });
      });
      await page.route(supabase + "/**", route => {
        const request = route.request();
        const url = new URL(request.url());
        requests.push({ path: url.pathname, method: request.method(), auth: request.headers()["authorization"] ?? null });
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
        if (url.pathname === "/rest/v1/mind_items" && request.method() === "GET") {
          const id = url.searchParams.get("id")?.replace(/^eq\./, "");
          const path = url.searchParams.get("storage_path")?.replace(/^eq\./, "");
          const rows = id ? items.filter(item => item.id === id) : path ? items.filter(item => item.storage_path === path) : items;
          return route.fulfill({ status: 200, headers: cors, json: rows });
        }
        if (url.pathname === "/rest/v1/mind_items" && ["POST", "PATCH", "DELETE"].includes(request.method())) {
          if (options.failRecordWrite) return route.fulfill({ status: 500, headers: cors, json: { message: "simulated write failure" } });
          const id = url.searchParams.get("id")?.replace(/^eq\./, "");
          if (request.method() === "POST") {
            const row = { ...JSON.parse(request.postData() || "{}"), owner_id: owner };
            items.push(row);
            return route.fulfill({ status: 201, headers: { ...cors, "Content-Type": "application/json" }, json: [row] });
          }
          const index = items.findIndex(item => item.id === id);
          if (index < 0) return route.fulfill({ status: 200, headers: cors, json: [] });
          if (request.method() === "PATCH") {
            const updated = { ...items[index], ...JSON.parse(request.postData() || "{}") };
            items[index] = updated;
            return route.fulfill({ status: 200, headers: cors, json: [updated] });
          }
          const [deleted] = items.splice(index, 1);
          return route.fulfill({ status: 200, headers: cors, json: [deleted] });
        }
        if (url.pathname === "/auth/v1/token") return route.fulfill({ status: 200, headers: cors, json: {
          access_token: "mock-jwt", refresh_token: "mock-refresh", expires_in: 3600, user: { id: owner },
        } });
        if (url.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: cors, json: { id: owner } });
        if (url.pathname === "/rest/v1/rpc/mind_is_admin") return route.fulfill({ status: 200, headers: cors, json: admin });
        if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204, headers: cors });
        if (url.pathname.startsWith("/storage/v1/object/mind-pdfs/")) {
          const path = url.pathname.split("/storage/v1/object/mind-pdfs/")[1];
          if (request.method() === "POST") {
            objects.add(decodeURIComponent(path));
            return route.fulfill({ status: 200, headers: cors, json: {} });
          }
          if (request.method() === "DELETE") {
            if (options.failObjectDelete) return route.fulfill({ status: 500, headers: cors, json: {} });
            objects.delete(decodeURIComponent(path));
            return route.fulfill({ status: 200, headers: cors, json: {} });
          }
          if (request.method() === "GET") return route.fulfill({ status: 200, headers: { ...cors, "Content-Type": "application/pdf" }, body: pdfBytes });
        }
        if (url.pathname.startsWith("/storage/v1/object/mind-videos/")) {
          const path = decodeURIComponent(url.pathname.split("/storage/v1/object/mind-videos/")[1]);
          if (request.method() === "POST") {
            objects.add(path);
            return route.fulfill({ status: 200, headers: cors, json: {} });
          }
          if (request.method() === "DELETE") {
            objects.delete(path);
            return route.fulfill({ status: 200, headers: cors, json: {} });
          }
        }
        if (url.pathname.startsWith("/storage/v1/object/public/mind-videos/")) {
          const filename = url.searchParams.get("download");
          return route.fulfill({ status: 200, headers: { ...cors, "Content-Type": "video/mp4", ...(filename ? { "Content-Disposition": `attachment; filename=\"${filename}\"` } : {}) }, body: mp4Bytes });
        }
        if (url.pathname.startsWith("/storage/v1/object/public/")) {
          const filename = url.searchParams.get("download");
          return route.fulfill({ status: options.pdfStatus ?? 200, headers: { ...cors, "Content-Type": options.pdfContentType ?? "application/pdf", ...(filename ? { "Content-Disposition": `attachment; filename=\"${filename}\"` } : {}) }, body: pdfBytes });
        }
        return route.fulfill({ status: 404, headers: cors, json: {} });
      });
    },
  };
}


test("visitante assiste a vídeo YouTube e filtra Vídeos sem precisar de login", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page);
  api.items.push({
    ...note, id: "afef1b3b-7cd1-4c4a-8965-b98225fb0e32", kind: "video", title: "Aula pública",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", storage_path: null,
  } as typeof note);
  await api.install();
  await page.goto("/#/mente");
  await expect(page.locator(".mind-item")).toHaveCount(3);
  await page.getByRole("button", { name: "Vídeos", exact: true }).click();
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await page.getByRole("button", { name: /Aula pública/ }).click();
  await expect(page.locator(".mind-video-player iframe"))
    .toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  await expect(page.getByRole("link", { name: /Abrir no navegador/ }))
    .toHaveAttribute("href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await expect(page.locator(".mind-detail-footer")).toHaveCount(0);
});

test("admin publica vídeo por link, recusa domínio falso e mantém RLS no mock", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.getByRole("button", { name: "Adicionar vídeo" }).click();
  await page.getByRole("textbox", { name: "Título" }).fill("Estudo Vimeo");
  await page.locator('input[name="video-url"]').fill("https://vimeo.com.evil.test/123456");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("alert")).toContainText("link HTTPS válido");
  expect(api.items).toHaveLength(2);
  await page.locator('input[name="video-url"]').fill("https://vimeo.com/123456");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(3);
  await expect(page.locator(".mind-video-player iframe"))
    .toHaveAttribute("src", "https://player.vimeo.com/video/123456");
  expect(api.items.find(x => x.title === "Estudo Vimeo")?.kind).toBe("video");
  expect(api.requests.some(x => x.path === "/rest/v1/mind_items" && x.method === "POST" && !!x.auth)).toBe(true);
});

test("admin envia MP4, visitante reproduz e baixa sem login", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.getByRole("button", { name: "Adicionar vídeo" }).click();
  await page.getByRole("textbox", { name: "Título" }).fill("Vídeo de estudo");
  await page.getByRole("radio", { name: "Arquivo MP4" }).check();
  await page.locator('input[name="video-file"]').setInputFiles({
    name: "aula.mp4", mimeType: "video/mp4", buffer: mp4Bytes,
  });
  await expect(page.locator(".mind-video-draft-preview video")).toBeVisible();
  await page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>(".mind-video-draft-preview video");
    return !!video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  });
  await page.getByRole("button", { name: "Publicar vídeo" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(3);
  const item = api.items.find(x => x.title === "Vídeo de estudo")!;
  expect(item.kind).toBe("video");
  expect(item.storage_path).toMatch(/\.mp4$/);
  await expect(page.locator(".mind-video-player video")).toHaveAttribute("src", new RegExp("/mind-videos/"));
  await page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>(".mind-video-player video");
    return !!video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar vídeo" }).click();
  expect((await download).suggestedFilename()).toBe("aula.mp4");
  expect(api.requests.some(x => x.path.startsWith("/storage/v1/upload/resumable") && x.method === "POST" && !!x.auth)).toBe(true);
  expect(api.requests.some(x => x.path.startsWith("/storage/v1/upload/resumable") && x.method === "PATCH" )).toBe(false);
  expect(api.requests.some(x => x.path.startsWith("/storage/v1/object/public/mind-videos/") && x.method === "GET" && !x.auth)).toBe(true);
});

test("Storage 401 renova a sessão e repete a criação do upload", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page, true, { tus401Once: true }); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.getByRole("button", { name: "Adicionar vídeo" }).click();
  await page.getByRole("radio", { name: "Arquivo MP4" }).check();
  await page.locator('input[name="video-file"]').setInputFiles({ name: "sessao.mp4", mimeType: "video/mp4", buffer: mp4Bytes });
  await page.waitForFunction(() => (document.querySelector<HTMLVideoElement>(".mind-video-draft-preview video")?.readyState ?? 0) >= HTMLMediaElement.HAVE_CURRENT_DATA);
  await page.getByRole("button", { name: "Publicar vídeo" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(3);
  expect(api.requests.filter(request => request.path === "/auth/v1/token" && request.method === "POST")).toHaveLength(2);
  expect(api.requests.filter(request => request.path.startsWith("/storage/v1/upload/resumable") && request.method === "POST")).toHaveLength(2);
});

test("MP4 acima de 25 MB usa TUS em blocos e publica após a confirmação", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page, true, { failFirstPatch: true }); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.getByRole("button", { name: "Adicionar vídeo" }).click();
  await page.getByRole("radio", { name: "Arquivo MP4" }).check();
  await page.locator('input[name="video-file"]').setInputFiles({ name: "aula-longa.mp4", mimeType: "video/mp4", buffer: makeMp4WithFreeBox() });
  await page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>(".mind-video-draft-preview video");
    return !!video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  });
  await expect(page.getByRole("textbox", { name: "Título" })).toHaveValue("aula longa");
  await page.getByRole("button", { name: "Publicar vídeo" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(3);
  expect(api.requests.some(x => x.path.startsWith("/storage/v1/upload/resumable") && x.method === "PATCH")).toBe(true);
  expect(api.items.find(item => item.file_size === 26_000_000)).toBeTruthy();
});

test("envio cancelado pode ser retomado do bloco confirmado sem publicar incompleto", async ({ page }) => {
  await serveBuiltSite(page);
  const hold = { value: true };
  const api = mockApi(page, true, { holdPatches: hold }); await api.install();
  const resumablePath = join(tmpdir(), `2t-mind-video-${process.pid}-${Date.now()}.mp4`);
  writeFileSync(resumablePath, makeMp4WithFreeBox());
  const fixedTime = new Date("2024-01-01T00:00:00Z");
  utimesSync(resumablePath, fixedTime, fixedTime);
  try {
    await page.goto("/#/mente");
    await loginAsMockAdmin(page);
    await page.getByRole("button", { name: "Adicionar vídeo" }).click();
    await page.getByRole("radio", { name: "Arquivo MP4" }).check();
    await page.locator('input[name="video-file"]').setInputFiles(resumablePath);
    await page.waitForFunction(() => (document.querySelector<HTMLVideoElement>(".mind-video-draft-preview video")?.readyState ?? 0) >= HTMLMediaElement.HAVE_CURRENT_DATA);
    await page.getByRole("button", { name: "Publicar vídeo" }).click();
    await expect(page.getByRole("button", { name: "Cancelar envio" })).toBeVisible();
    await expect(page.locator(".mind-upload-progress progress")).toBeVisible();
    await expect.poll(() => api.requests.some(request => request.path.startsWith("/storage/v1/upload/resumable") && request.method === "PATCH")).toBe(true);
    await page.getByRole("button", { name: "Cancelar envio" }).click();
    await expect(page.locator(".mind-notice")).toContainText("Envio cancelado");
    expect(api.items.some(item => item.kind === "video")).toBe(false);
    hold.value = false;
    await page.locator('input[name="video-file"]').setInputFiles(resumablePath);
    await page.getByRole("button", { name: "Publicar vídeo" }).click();
    await expect(page.locator(".mind-item")).toHaveCount(3);
    expect(api.requests.some(x => x.path.startsWith("/storage/v1/upload/resumable") && x.method === "HEAD")).toBe(true);
  } finally { rmSync(resumablePath, { force: true }); }
});

test("MP4 acima de 50 MB é rejeitado antes de iniciar TUS", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.getByRole("button", { name: "Adicionar vídeo" }).click();
  await page.getByRole("radio", { name: "Arquivo MP4" }).check();
  const tooLarge = Buffer.alloc(50_000_001);
  mp4Bytes.copy(tooLarge, 0, 0, 12);
  await page.locator('input[name="video-file"]').setInputFiles({ name: "acima-do-limite.mp4", mimeType: "video/mp4", buffer: tooLarge });
  await expect(page.getByRole("alert")).toContainText("50 MB");
  expect(api.requests.some(x => x.path.startsWith("/storage/v1/upload/resumable"))).toBe(false);
});

test("falha HTTP 413 do Storage fica clara e não cria registro publicado", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page, true, { tusStatus: 413 }); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.getByRole("button", { name: "Adicionar vídeo" }).click();
  await page.getByRole("radio", { name: "Arquivo MP4" }).check();
  await page.locator('input[name="video-file"]').setInputFiles({ name: "aula.mp4", mimeType: "video/mp4", buffer: mp4Bytes });
  await page.waitForFunction(() => (document.querySelector<HTMLVideoElement>(".mind-video-draft-preview video")?.readyState ?? 0) >= HTMLMediaElement.HAVE_CURRENT_DATA);
  await page.getByRole("button", { name: "Publicar vídeo" }).click();
  await expect(page.getByRole("alert")).toContainText("Storage recusou o vídeo");
  expect(api.items.some(item => item.kind === "video")).toBe(false);
});

test("backup v3 exporta manifesto e sidecar separados e restaura em conjunto", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.locator(".mind-backup summary").click();
  const manifestDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup" }).click();
  const manifestDownload = await manifestDownloadPromise;
  const manifestStream = await manifestDownload.createReadStream();
  const manifestChunks: Buffer[] = [];
  for await (const chunk of manifestStream) manifestChunks.push(Buffer.from(chunk));
  const manifestBytes = Buffer.concat(manifestChunks);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as { version: number; records: Array<{ id: string; assetName?: string; assetSize?: number }> };
  expect(manifest.version).toBe(3);
  const pdfRecord = manifest.records.find(item => item.id === pdf.id)!;
  expect(pdfRecord.assetName).toBeTruthy();
  expect(pdfRecord.assetSize).toBe(pdfBytes.length);
  await expect(page.locator(".mind-backup-assets li")).toHaveCount(1);
  const sidecarDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  const sidecarDownload = await sidecarDownloadPromise;
  expect(sidecarDownload.suggestedFilename()).toBe(pdfRecord.assetName);
  const sidecarStream = await sidecarDownload.createReadStream();
  const sidecarChunks: Buffer[] = [];
  for await (const chunk of sidecarStream) sidecarChunks.push(Buffer.from(chunk));
  const sidecar = Buffer.concat(sidecarChunks);
  page.on("dialog", dialog => dialog.accept());
  await page.locator("#mind-backup-input").setInputFiles([
    { name: manifestDownload.suggestedFilename(), mimeType: "application/json", buffer: manifestBytes },
    { name: pdfRecord.assetName!, mimeType: "application/pdf", buffer: sidecar },
  ]);
  await expect(page.locator(".mind-notice")).toContainText("itens restaurados na biblioteca pública");
  expect(api.items.find(item => item.id === pdf.id)?.file_size).toBe(pdfBytes.length);
});

test("backups v1 e v2 com PDF e MP4 Base64 continuam compatíveis", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  page.on("dialog", dialog => dialog.accept());
  const legacyPdf = {
    format: "2t-mind", version: 1, records: [{
      id: "3080f2b9-4d61-4e39-88a8-7233a54e23cf", kind: "pdf", title: "PDF legado",
      topic: "Estudos", tags: [], description: "", content: "", favorite: false,
      createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000, fileName: "legado.pdf",
      pdfBase64: pdfBytes.toString("base64"),
    }],
  };
  await page.locator("#mind-backup-input").setInputFiles({ name: "backup-v1.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(legacyPdf)) });
  await expect(page.locator(".mind-item")).toHaveCount(3);
  expect(api.items.find(item => item.id === legacyPdf.records[0].id)?.file_size).toBe(pdfBytes.length);

  const legacyVideo = {
    format: "2t-mind", version: 2, records: [{
      id: "a1a1fc56-25b0-49d5-b551-d2f7a66a8c33", kind: "video", title: "MP4 legado",
      topic: "Estudos", tags: [], description: "", content: "", favorite: false,
      createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000, fileName: "legado.mp4",
      videoBase64: mp4Bytes.toString("base64"),
    }],
  };
  await page.locator("#mind-backup-input").setInputFiles({ name: "backup-v2.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(legacyVideo)) });
  await expect(page.locator(".mind-item")).toHaveCount(4);
  expect(api.items.find(item => item.id === legacyVideo.records[0].id)?.file_size).toBe(mp4Bytes.length);
});

test("visitante acessa notas e PDFs públicos sem login, sem controles de edição", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await expect(page.locator(".mind-item")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "+ Nova nota" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
  await expect(page.locator(".mind-backup")).toHaveCount(0);
  await page.getByRole("button", { name: /Investimentos/ }).click();
  await expect(page.locator(".mind-note-view")).toContainText("Estudos públicos.");
  await expect(page.getByRole("button", { name: "Excluir" })).toHaveCount(0);
  expect(api.requests.some(r => r.path === "/rest/v1/mind_items" && !r.auth)).toBe(true);
  expect(api.requests.some(r => r.path.startsWith("/auth/v1/token"))).toBe(false);
});

test("visitante abre um PDF real de duas páginas com link e mantém a opção externa", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  const actualFrameResponse = page.waitForResponse(response =>
    response.request().resourceType() === "document" && response.url().includes("/storage/v1/object/public/mind-pdfs/"),
  );
  await page.getByRole("button", { name: /Relatório/ }).click();
  await expect(page.getByRole("button", { name: "Fechar visualização" })).toBeVisible();
  const iframe = page.locator(".mind-pdf-embed iframe");
  await expect(iframe).toBeVisible();
  await page.getByRole("button", { name: "Expandir leitura" }).click();
  await expect(page.locator(".mind-workspace")).toHaveClass(/mind-workspace--pdf-expanded/);
  await expect(page.getByRole("complementary", { name: "Navegação da Mente" })).toBeHidden();
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 390, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: 850 });
      await expect(iframe).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const viewer = await iframe.boundingBox();
      expect(viewer && viewer.width).toBeLessThanOrEqual(width + 1);
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.setViewportSize({ width: 1366, height: 900 });
  if (process.env.MIND_VISUAL_SCREENSHOT_PATH) await page.screenshot({ path: process.env.MIND_VISUAL_SCREENSHOT_PATH, fullPage: true });
  await page.getByRole("button", { name: "Voltar à biblioteca" }).click();
  await expect(page.locator(".mind-workspace")).not.toHaveClass(/mind-workspace--pdf-expanded/);
  await expect(page.getByRole("complementary", { name: "Navegação da Mente" })).toBeVisible();
  await expect(iframe).toHaveAttribute("src", supabase + "/storage/v1/object/public/mind-pdfs/" + pdf.storage_path);
  await expect(page.getByRole("link", { name: /Abrir no navegador/ })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: /Abrir no navegador/ })).toHaveAttribute("href", supabase + "/storage/v1/object/public/mind-pdfs/" + pdf.storage_path);
  const pdfResponse = await actualFrameResponse;
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  // Chromium's PDF viewer exposes an internal HTML document as the iframe body;
  // fetch the same public object directly to inspect its actual bytes.
  const fetchedPdf = await page.evaluate(async url => {
    const response = await fetch(url, { credentials: "omit" });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, contentType: response.headers.get("content-type"), signature: Array.from(bytes.slice(0, 5)), size: bytes.length, hasLink: new TextDecoder().decode(bytes).includes("/Subtype /Link") };
  }, supabase + "/storage/v1/object/public/mind-pdfs/" + pdf.storage_path);
  expect(fetchedPdf.status).toBe(200);
  expect(fetchedPdf.contentType).toContain("application/pdf");
  expect(fetchedPdf.signature).toEqual(Array.from(Buffer.from("%PDF-")));
  expect(fetchedPdf.size).toBeGreaterThan(100);
  expect(fetchedPdf.hasLink).toBe(true);
  await expect(page.locator(".mind-pdf-embed [role='status']")).toContainText(/Abrindo|Documento aberto/i);
  await page.getByRole("button", { name: "Fechar visualização" }).click();
  await expect(iframe).toHaveCount(0);
});

test("visitante baixa PDF público sem sessão, validando bytes e nome original", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await page.getByRole("button", { name: /Relatório/ }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("relatorio.pdf");
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  expect((await readFile(downloadedPath!)).subarray(0, 5).toString("ascii")).toBe("%PDF-");
  const requests = api.requests.filter(r => r.path.startsWith("/storage/v1/object/public/"));
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every(r => r.auth === null)).toBe(true);
  await expect(page.locator(".mind-notice")).toContainText("Download iniciado");
});

test("PDF removido ou indisponível produz erro claro e não inicia download", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page, true, { pdfStatus: 404 }); await api.install();
  await page.goto("/#/mente");
  await page.getByRole("button", { name: /Relatório/ }).click();
  await expect(page.locator(".mind-detail .mind-error")).toContainText("PDF não está mais disponível");
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  await expect(page.locator(".mind-page > .mind-error")).toContainText("PDF não está mais disponível");
});

test("prévia não mostra iframe vazio quando a origem devolve conteúdo que não é PDF", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page, true, { pdfContentType: "text/html" }); await api.install();
  await page.goto("/#/mente");
  await page.getByRole("button", { name: /Relatório/ }).click();
  await expect(page.locator(".mind-detail .mind-error")).toContainText("não foi identificado como PDF");
  await expect(page.locator(".mind-pdf-embed iframe")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Abrir no navegador/ })).toBeVisible();
});

test("adicionar conteúdo exige login, administrador pode editar e sair sem ocultar leitura", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await expect(page.locator(".mind-item")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Sair da conta" })).toHaveCount(0);
  await page.getByRole("button", { name: "+ Nova nota" }).click();
  await expect(page.getByRole("heading", { name: "Entrar para editar" })).toBeVisible();
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByLabel("Senha").fill("not-a-real-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".mind-editor")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
  await page.getByRole("textbox", { name: "Título" }).fill("Nota publicada");
  await page.getByRole("textbox", { name: "Conteúdo" }).fill("Conteúdo público após salvar.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(3);
  await expect(page.locator(".mind-note-view")).toContainText("Conteúdo público após salvar.");
  await page.reload();
  await expect(page.locator(".mind-item")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
  await page.getByRole("button", { name: /Nota publicada/ }).click();
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("textbox", { name: "Conteúdo" }).fill("Edição persistida.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.locator(".mind-note-view")).toContainText("Edição persistida.");
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText("Item removido");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page.getByRole("button", { name: "Sair da conta" })).toHaveCount(0);
  await expect(page.locator(".mind-item")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Login do administrador" })).toBeVisible();
  expect(api.requests.some(r => r.path === "/rest/v1/rpc/mind_is_admin")).toBe(true);
});

test("conta sem permissão não obtém acesso à edição", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page, false); await api.install();
  await page.goto("/#/mente");
  await page.getByRole("button", { name: "Adicionar PDF" }).click();
  await page.getByLabel("E-mail").fill("other@example.com");
  await page.getByLabel("Senha").fill("invalid-placeholder");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("não possui permissão de administrador");
  await expect(page.locator(".mind-item")).toHaveCount(2);
  await expect(page.locator(".mind-editor")).toHaveCount(0);
  expect(api.requests.some(r => ["POST", "PATCH", "DELETE"].includes(r.method) && r.path === "/rest/v1/mind_items")).toBe(false);
});

test("login iniciado por Adicionar PDF retoma a seleção do arquivo", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await page.getByRole("button", { name: "Adicionar PDF" }).click();
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByLabel("Senha").fill("not-a-real-password");
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "publicado.pdf", mimeType: "application/pdf", buffer: pdfBytes });
  await expect(page.locator(".mind-item")).toHaveCount(3);
  await expect(page.locator(".mind-notice")).toContainText("PDF publicado na biblioteca 2T");
  expect(api.requests.some(request => request.method === "POST" && request.path.startsWith("/storage/v1/object/mind-pdfs/"))).toBe(true);
});

test("upload público usa caminho versionado e exclusão da linha remove apenas seu objeto vinculado", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.locator("#mind-pdf-input").setInputFiles({ name: "novo arquivo.pdf", mimeType: "application/pdf", buffer: pdfBytes });
  await expect(page.locator(".mind-item")).toHaveCount(3);
  const uploaded = api.items.find(item => item.title === "novo arquivo")!;
  expect(uploaded.storage_path).toMatch(new RegExp("^" + owner + "/" + uploaded.id + "-[0-9a-f-]{36}\\.pdf$", "i"));
  expect(api.objects.has(uploaded.storage_path)).toBe(true);
  // Deterministic destructive-action confirmation even when the embedded PDF viewer is present.
  await page.evaluate(() => { window.confirm = () => true; });
  await page.getByRole("button", { name: /novo arquivo/ }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(2);
  expect(api.objects.has(uploaded.storage_path)).toBe(false);
});

test("substituir PDF publica primeiro o novo objeto e limpa o anterior sem duplicar o registro", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  const archive = {
    format: "2t-mind", version: 1, exportedAt: new Date().toISOString(), records: [{
      id: pdf.id, kind: "pdf", title: "Relatório atualizado", topic: "Estudos", tags: [], description: "",
      content: "", favorite: false, createdAt: Date.parse(pdf.created_at), updatedAt: Date.now() + 1000,
      fileName: "relatorio-atualizado.pdf", fileSize: pdfBytes.length, pdfBase64: pdfBytes.toString("base64"),
    }],
  };
  page.on("dialog", dialog => dialog.accept());
  await page.locator("#mind-backup-input").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(archive)) });
  await expect(page.locator(".mind-notice")).toContainText("itens restaurados na biblioteca pública");
  await expect(page.locator(".mind-item")).toHaveCount(2);
  const replaced = api.items.find(item => item.id === pdf.id)!;
  expect(replaced.storage_path).not.toBe(pdf.storage_path);
  expect(replaced.storage_path).toMatch(new RegExp("^" + owner + "/" + pdf.id + "-[0-9a-f-]{36}\\.pdf$", "i"));
  expect(api.objects.has(replaced.storage_path)).toBe(true);
  expect(api.objects.has(pdf.storage_path)).toBe(false);
  expect(api.items.filter(item => item.id === pdf.id)).toHaveLength(1);
});

test("editar metadados de PDF não substitui nem desconecta o objeto", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.getByRole("button", { name: /Relatório/ }).click();
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("textbox", { name: "Título" }).fill("Relatório com título atualizado");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.locator(".mind-detail h2")).toHaveText("Relatório com título atualizado");
  expect(api.items.find(item => item.id === pdf.id)?.storage_path).toBe(pdf.storage_path);
  expect(api.objects.has(pdf.storage_path)).toBe(true);
  expect(api.requests.some(request => request.method === "POST" && request.path.startsWith("/storage/v1/object/mind-pdfs/"))).toBe(false);
});

test("falha ao salvar substituição preserva PDF anterior e limpa o upload novo", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page, true, { failRecordWrite: true }); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  const archive = {
    format: "2t-mind", version: 1, exportedAt: new Date().toISOString(), records: [{
      id: pdf.id, kind: "pdf", title: "Relatório atualizado", topic: "Estudos", tags: [], description: "",
      content: "", favorite: false, createdAt: Date.parse(pdf.created_at), updatedAt: Date.now() + 1000,
      fileName: "relatorio-atualizado.pdf", fileSize: pdfBytes.length, pdfBase64: pdfBytes.toString("base64"),
    }],
  };
  page.on("dialog", dialog => dialog.accept());
  await page.locator("#mind-backup-input").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(archive)) });
  await expect(page.getByRole("alert")).toContainText("HTTP 500");
  expect(api.items.find(item => item.id === pdf.id)?.storage_path).toBe(pdf.storage_path);
  expect([...api.objects]).toEqual([pdf.storage_path]);
});

test("se o Storage falha após a exclusão, biblioteca recarrega e informa limpeza pendente", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page, true, { failObjectDelete: true }); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: /Relatório/ }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("arquivo público ficou pendente de limpeza");
  expect(api.objects.has(pdf.storage_path)).toBe(true);
});

test("biblioteca pública é responsiva nos temas claro e escuro", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await expect(page.locator(".mind-item")).toHaveCount(2);
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 390, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.locator(".mind-workspace")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("formulário de upload MP4 permanece legível e sem overflow em desktop, tablet e celular", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await loginAsMockAdmin(page);
  await page.getByRole("button", { name: "Adicionar vídeo" }).click();
  await expect(page.locator(".mind-editor h2")).toHaveText("Novo vídeo");
  await page.getByRole("radio", { name: "Arquivo MP4" }).check();
  await page.locator('input[name="video-file"]').setInputFiles({ name: "prévia.mp4", mimeType: "video/mp4", buffer: mp4Bytes });
  await expect(page.locator(".mind-video-draft-preview video")).toBeVisible();

  for (const theme of ["dark", "light"] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 390, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator(".mind-editor")).toBeVisible();
      await expect(page.locator(".mind-video-dropzone")).toBeVisible();
      await expect(page.getByRole("button", { name: "Publicar vídeo" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
