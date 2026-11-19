import { expect, test } from "@playwright/test";
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
      ".mind-nav-entry .obsidian-mark",
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

test("Mente appears in main navigation, explains local-only storage and remains responsive", async ({ page }) => {
  const mindNav = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Mente" });
  await expect(mindNav).toBeVisible();
  await expect(mindNav.locator(".obsidian-mark")).toBeVisible();
  await expect(mindNav).toHaveText("");
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
