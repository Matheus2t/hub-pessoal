import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.skip(process.env.MIND_PRODUCTION_SMOKE !== "1", "Teste read-only da biblioteca PDF implantada; habilite explicitamente com MIND_PRODUCTION_SMOKE=1 e BASE_URL oficial.");

test("PDF publicado pode ser lido, aberto e baixado anonimamente no domínio oficial", async ({ page }) => {
  const publicRequests: { method: string; hasAuthorization: boolean }[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.hostname.endsWith(".supabase.co") &&
        (url.pathname.startsWith("/rest/v1/mind_items") || url.pathname.startsWith("/storage/v1/object/public/mind-pdfs/"))) {
      publicRequests.push({ method: request.method(), hasAuthorization: Boolean(request.headers()["authorization"]) });
    }
  });

  await page.goto("/#/mente", { waitUntil: "domcontentloaded" });
  const pdfItem = page.locator(".mind-item").filter({ has: page.locator(".mind-item-symbol", { hasText: "PDF" }) }).first();
  await expect(pdfItem).toBeVisible();
  const frameResponsePromise = page.waitForResponse(response =>
    response.request().resourceType() === "document" && response.url().includes("/storage/v1/object/public/mind-pdfs/"),
  );
  await pdfItem.click();
  const iframe = page.locator(".mind-pdf-embed iframe");
  await expect(iframe).toBeVisible();
  const frameResponse = await frameResponsePromise;
  expect(frameResponse.status()).toBe(200);
  expect(frameResponse.headers()["content-type"]?.toLowerCase()).toContain("application/pdf");
  expect((frameResponse.headers()["x-frame-options"] ?? "").toLowerCase()).not.toMatch(/deny|sameorigin/);
  expect((frameResponse.headers()["content-security-policy"] ?? "").toLowerCase()).not.toMatch(/frame-ancestors\s+'none'/);
  const contentLength = Number(frameResponse.headers()["content-length"]);
  expect(!Number.isFinite(contentLength) || contentLength <= 25 * 1024 * 1024).toBe(true);
  const fetchedPdf = await page.evaluate(async url => {
    const response = await fetch(url, { credentials: "omit" });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, type: response.headers.get("content-type"), signature: Array.from(bytes.slice(0, 5)), size: bytes.length };
  }, frameResponse.url());
  expect(fetchedPdf.status).toBe(200);
  expect(fetchedPdf.type?.toLowerCase()).toContain("application/pdf");
  expect(fetchedPdf.signature).toEqual(Array.from(Buffer.from("%PDF-")));
  expect(fetchedPdf.size).toBeGreaterThan(5);
  await expect(page.getByRole("status")).toContainText("visualizador");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  expect((await readFile(downloadedPath!)).subarray(0, 5).toString("ascii")).toBe("%PDF-");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: /Abrir no navegador/ }).click();
  const popup = await popupPromise;
  await expect.poll(() => new URL(popup.url()).pathname).toContain("/storage/v1/object/public/mind-pdfs/");
  expect(publicRequests.length).toBeGreaterThan(0);
  expect(publicRequests.every(request => !request.hasAuthorization)).toBe(true);
});
