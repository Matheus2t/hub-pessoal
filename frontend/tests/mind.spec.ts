import { expect, test } from "@playwright/test";
import { serveBuiltSite } from "./helpers/serve-built-site";

test.beforeEach(async ({ page }) => {
  await serveBuiltSite(page);
  await page.goto("/#/mente");
  await expect(page.getByRole("heading", { name: "Mente", exact: true })).toBeVisible();
});

test("Mente appears in main navigation, explains local-only storage and remains responsive", async ({ page }) => {
  await expect(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Mente" })).toBeVisible();
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
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup" }).click();
  const backup = await backupDownload;
  expect(backup.suggestedFilename()).toMatch(/^mente-2t-backup-/);
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator(".mind-item")).toHaveCount(0);
  const path = await backup.path();
  if (!path) throw new Error("Backup sem caminho para teste.");
  await page.locator("#mind-backup-input").setInputFiles(path);
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
