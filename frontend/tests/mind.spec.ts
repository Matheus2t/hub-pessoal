import { expect, test } from "@playwright/test";
import {
  assertMindVideoDownloadSize, MAX_MIND_VIDEO_BYTES, readMindVideoBlobWithinLimit,
} from "../src/mind/video";
import { serveBuiltSite } from "./helpers/serve-built-site";

test.beforeEach(async ({ page }) => {
  await serveBuiltSite(page);
  await page.goto("/#/mente");
  await expect(page.locator("#mind-title")).toHaveText("Mente");
  await expect(page.locator("#mind-title")).toHaveClass("sr-only");
  await expect(page.locator(".mind-heading .obsidian-mark")).toBeVisible();
});

test("footer positions Obsidian to the right of 2T and links back to Mente", async ({ page }) => {
  const footer = page.locator(".page-footer");
  const originalLogo = footer.locator(".footer-logo");
  const mindLink = footer.getByRole("link", { name: "Abrir Mente" });
  await expect(originalLogo).toBeVisible();
  await expect(mindLink.locator(".obsidian-mark")).toBeVisible();
  await expect(mindLink).toHaveAttribute("href", "#/mente");
  for (const [theme, expected] of [["dark", "rgb(118, 81, 170)"], ["light", "rgb(87, 50, 136)"]] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    await expect(mindLink.locator("svg")).toHaveCSS("color", expected);
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      const left = await originalLogo.boundingBox();
      const right = await mindLink.boundingBox();
      expect(left).not.toBeNull();
      expect(right).not.toBeNull();
      expect(right!.x).toBeGreaterThanOrEqual(left!.x + left!.width - 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.goto("/#/");
  await page.locator(".page-footer").getByRole("link", { name: "Abrir Mente" }).click();
  await expect(page.locator("#mind-title")).toHaveText("Mente");
});

test("the Obsidian symbol alone uses dark purple in both themes", async ({ page }) => {
  for (const [theme, expected] of [["dark", "rgb(118, 81, 170)"], ["light", "rgb(87, 50, 136)"]] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const selector of [
      ".footer-mind-link .obsidian-mark",
      ".mind-heading .obsidian-mark",
      ".mind-unselected .obsidian-mark",
    ]) {
      const mark = page.locator(selector);
      await expect(mark).toBeVisible();
      await expect(mark).toHaveCSS("color", expected);
    }
    await expect(page.locator("#mind-title")).toHaveClass("sr-only");
  }
});

test("Mente is accessible from the footer only, while its local storage remains responsive", async ({ page }) => {
  await expect(page.locator("app-sidebar a[href='#/mente']")).toHaveCount(0);
  await expect(page.locator("app-sidebar .obsidian-mark")).toHaveCount(0);
  await expect(page.locator(".page-footer a[href='#/mente'] .obsidian-mark")).toBeVisible();
  await expect(page.locator(".mind-heading h1")).toHaveClass("sr-only");
  await expect(page.locator(".breadcrumbs")).toHaveCount(0);
  await expect(page.getByRole("note")).toContainText("somente neste navegador");
  await expect(page.getByRole("button", { name: "Adicionar PDF" })).toBeVisible();
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".mind-workspace")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("notes persist after reload and support topics, search, favorite and deletion", async ({ page }) => {
  await page.getByRole("button", { name: "+ Nova nota" }).click();
  await page.getByRole("textbox", { name: "Título" }).fill("Tese de investimentos 2027");
  await page.getByRole("textbox", { name: "Assunto" }).fill("Investimentos");
  await page.getByRole("textbox", { name: /Etiquetas/ }).fill("ações, 2027, longo prazo");
  await page.getByRole("textbox", { name: "Descrição" }).fill("Hipóteses sobre empresas");
  await page.getByRole("textbox", { name: "Conteúdo" }).fill("Cenários de crescimento e risco.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Nota salva neste navegador.")).toBeVisible();
  await expect(page.locator(".mind-detail h2")).toHaveText("Tese de investimentos 2027");
  await page.reload();
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await page.getByRole("button", { name: /Tese de investimentos 2027/ }).click();
  await expect(page.locator(".mind-note-view")).toContainText("crescimento e risco");
  await page.getByRole("button", { name: /Favoritar/ }).click();
  await page.getByRole("button", { name: /Favoritos/ }).click();
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await expect(page.getByRole("combobox", { name: "Filtrar por assunto" })).toBeVisible();
  await page.getByRole("combobox", { name: "Filtrar por assunto" }).selectOption("Investimentos");
  await expect(page.locator(".mind-item")).toHaveCount(1);

  await page.getByRole("searchbox", { name: "Pesquisar na Mente" }).fill("não existe");
  await expect(page.locator(".mind-item")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Pesquisar na Mente" }).fill("2027");
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Excluir" }).click();
});

test("PDFs are stored locally and full backup can restore a deleted PDF", async ({ page }) => {
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
  await page.locator("#mind-pdf-input").setInputFiles({ name: "Estudo-ações-2027.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await expect(page.locator(".mind-detail h2")).toContainText("Estudo-ações-2027");
  const first = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar arquivo" }).click();
  expect((await first).suggestedFilename()).toBe("Estudo-ações-2027.pdf");
  await page.locator(".mind-backup summary").click();
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup" }).click();
  const backup = await backupDownload;
  expect(backup.suggestedFilename()).toMatch(/^mente-2t-manifesto-\d{4}-\d{2}-\d{2}\.json$/);
  const manifestStream = await backup.createReadStream();
  const manifestChunks: Buffer[] = [];
  for await (const chunk of manifestStream) manifestChunks.push(Buffer.from(chunk));
  const manifestBytes = Buffer.concat(manifestChunks);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as {
    format: string;
    version: number;
    records: Array<{ id: string; title: string; kind: string; assetName?: string; assetSize?: number; pdfBase64?: unknown }>;
  };
  expect(manifest.format).toBe("2t-mind");
  expect(manifest.version).toBe(3);
  const pdfRecord = manifest.records.find(record => record.title === "Estudo-ações-2027" && record.kind === "pdf");
  expect(pdfRecord).toBeDefined();
  expect(pdfRecord?.assetName).toBeTruthy();
  expect(pdfRecord?.assetSize).toBe(pdf.length);
  expect(pdfRecord).not.toHaveProperty("pdfBase64");
  await expect(page.locator(".mind-backup-assets li")).toHaveCount(1);

  const assetDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  const assetDownload = await assetDownloadPromise;
  expect(assetDownload.suggestedFilename()).toBe(pdfRecord!.assetName);
  const assetStream = await assetDownload.createReadStream();
  const assetChunks: Buffer[] = [];
  for await (const chunk of assetStream) assetChunks.push(Buffer.from(chunk));
  const assetBytes = Buffer.concat(assetChunks);
  expect(assetBytes).toEqual(pdf);

  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(0);
  await page.locator("#mind-backup-input").setInputFiles([
    { name: backup.suggestedFilename(), mimeType: "application/json", buffer: manifestBytes },
    { name: pdfRecord!.assetName!, mimeType: "application/pdf", buffer: assetBytes },
  ]);
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await page.getByRole("button", { name: /Estudo-ações-2027/ }).click();
  await expect(page.getByRole("button", { name: "Abrir PDF" })).toBeEnabled();
});

test("non-PDF uploads are rejected before being saved", async ({ page }) => {
  await page.locator("#mind-pdf-input").setInputFiles({
    name: "documento.pdf", mimeType: "application/pdf", buffer: Buffer.from("This is not a PDF"),
  });
  await expect(page.getByRole("alert")).toContainText("PDF inválido");
  await expect(page.locator(".mind-item")).toHaveCount(0);
});


test("Mente prioriza leitura no desktop e empilha biblioteca e leitor em telas menores", async ({ page }) => {
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 390, 700, 768, 900, 1200, 1366, 1440, 1920]) {
      await page.setViewportSize({ width, height: 860 });
      const facets = page.locator(".mind-facets");
      const list = page.locator(".mind-list");
      const reader = page.locator(".mind-inspector");
      await expect(facets).toBeVisible();
      await expect(list).toBeVisible();
      await expect(reader).toBeVisible();
      const a = await facets.boundingBox(), b = await list.boundingBox(), c = await reader.boundingBox();
      expect(a && b && c).toBeTruthy();
      expect(b!.y).toBeGreaterThanOrEqual(a!.y);
      if (width <= 1000) {
        expect(b!.y).toBeGreaterThan(a!.y);
        expect(c!.y).toBeGreaterThan(b!.y);
      } else {
        expect(b!.x).toBeLessThan(c!.x);
        expect(c!.width).toBeGreaterThan(b!.width * 2);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("on mobile opening a note reveals the reader without losing access to library", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 750 });
  await page.getByRole("button", { name: "+ Nova nota" }).click();
  await expect(page.locator(".mind-editor")).toBeInViewport();
  await page.getByRole("textbox", { name: "Título" }).fill("Nota mobile");
  await page.getByRole("textbox", { name: "Conteúdo" }).fill("Conteúdo acessível");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await page.locator(".mind-item").click();
  await expect(page.locator(".mind-detail")).toBeInViewport();
  await expect(page.locator(".mind-note-view")).toContainText("Conteúdo acessível");
  await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
});

test("public MP4 download validates advertised and received bytes", () => {
  expect(() => assertMindVideoDownloadSize(String(MAX_MIND_VIDEO_BYTES))).not.toThrow();
  expect(() => assertMindVideoDownloadSize(null, MAX_MIND_VIDEO_BYTES)).not.toThrow();
  expect(() => assertMindVideoDownloadSize(null, 1_024)).not.toThrow();

  expect(() => assertMindVideoDownloadSize(String(MAX_MIND_VIDEO_BYTES + 1)))
    .toThrow("O vídeo ultrapassa 50 MB.");
  expect(() => assertMindVideoDownloadSize(null, MAX_MIND_VIDEO_BYTES + 1))
    .toThrow("O vídeo ultrapassa 50 MB.");
  expect(() => assertMindVideoDownloadSize("32", MAX_MIND_VIDEO_BYTES + 1))
    .toThrow("O vídeo ultrapassa 50 MB.");

  for (const header of ["", "abc", "-1", "1.5", "9007199254740992"]) {
    expect(() => assertMindVideoDownloadSize(header))
      .toThrow("O tamanho informado para o vídeo é inválido.");
  }
});


test("public MP4 download enforces the real byte limit while streaming", async () => {
  const valid = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4]));
      controller.enqueue(new Uint8Array([5, 6, 7, 8]));
      controller.close();
    },
  }), { headers: { "content-type": "video/mp4" } });
  const blob = await readMindVideoBlobWithinLimit(valid, { maxBytes: 8 });
  expect(blob.size).toBe(8);
  expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

  let cancelled = false;
  const oversized = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4]));
      controller.enqueue(new Uint8Array([5, 6, 7, 8, 9]));
    },
    cancel() { cancelled = true; },
  }));
  await expect(readMindVideoBlobWithinLimit(oversized, { maxBytes: 8 }))
    .rejects.toThrow("O vídeo ultrapassa 50 MB.");
  expect(cancelled).toBe(true);
});

test("public MP4 download cancels invalid declarations and supports caller cancellation", async () => {
  let invalidCancelled = false;
  const invalid = new Response(new ReadableStream<Uint8Array>({
    start() {},
    cancel() { invalidCancelled = true; },
  }), { headers: { "content-length": "9" } });
  await expect(readMindVideoBlobWithinLimit(invalid, { maxBytes: 8 }))
    .rejects.toThrow("O vídeo ultrapassa 50 MB.");
  expect(invalidCancelled).toBe(true);

  let callerCancelled = false;
  const pending = new Response(new ReadableStream<Uint8Array>({
    start() {},
    cancel() { callerCancelled = true; },
  }));
  const controller = new AbortController();
  const read = readMindVideoBlobWithinLimit(pending, { maxBytes: 8, signal: controller.signal });
  controller.abort();
  await expect(read).rejects.toThrow("Download do vídeo cancelado.");
  expect(callerCancelled).toBe(true);
});

test("public MP4 download times out when a response stops yielding bytes", async () => {
  const stalled = new Response(new ReadableStream<Uint8Array>({ start() {} }));
  await expect(readMindVideoBlobWithinLimit(stalled, { maxBytes: 8, idleTimeoutMs: 25 }))
    .rejects.toThrow("O download do vídeo excedeu o tempo limite.");
});