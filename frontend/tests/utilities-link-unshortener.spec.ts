import { expect, test } from "@playwright/test";
import type { LinkResolveResponse, LinkResolveStatus } from "../src/utilities/types";
import { serveBuiltSite } from "./helpers/serve-built-site";

const previewBuild = /^(1|true|yes)$/i.test(process.env.UTILITIES_ENABLED ?? "") &&
  /^(1|true|yes)$/i.test(process.env.LINK_RESOLVER_ENABLED ?? "") && process.env.VERCEL !== "1";
const originalUrl = "https://short.example/s/abc";

function resolved(overrides: Partial<LinkResolveResponse> = {}): LinkResolveResponse {
  return {
    status: "resolved",
    original_url: originalUrl,
    final_url: "https://destination.example/article",
    final_status_code: 200,
    redirect_count: 1,
    redirects: [{ url: originalUrl, status_code: 302 }],
    security: { https: true, warnings: ["O domínio mudou durante a cadeia de redirecionamentos."], reputation_checked: false },
    ...overrides,
  };
}

async function openLocalPreview(page: import("@playwright/test").Page) {
  test.skip(!previewBuild, "Compile o bundle com UTILITIES_ENABLED=true e LINK_RESOLVER_ENABLED=true.");
  await serveBuiltSite(page);
  await page.route("**/api/utilities/capabilities", route => route.fulfill({
    status: 200,
    json: { utilities_enabled: true, link_resolver_enabled: true, background_remover_enabled: false },
  }));
  await page.goto("/#/utilitarios/desencurtador");
  await expect(page.getByRole("heading", { name: "Desencurtador de Links", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Endereço" })).toBeEnabled();
}

test("submits JSON with Enter, shows confirmed destination and a truthful HTTP 404", async ({ page }) => {
  await openLocalPreview(page);
  let observedRequest: { method: string; contentType: string | undefined; body: unknown } | undefined;
  const response = resolved({
    final_url: "https://destination.example/article?ref=short",
    final_status_code: 404,
    redirect_count: 2,
    redirects: [
      { url: originalUrl, status_code: 301 },
      { url: "https://bridge.example/r/9", status_code: 302 },
    ],
  });
  await page.route("**/api/utilities/links/resolve", async route => {
    observedRequest = {
      method: route.request().method(),
      contentType: route.request().headers()["content-type"],
      body: route.request().postDataJSON(),
    };
    await route.fulfill({ status: 200, json: response });
  });

  await page.getByRole("textbox", { name: "Endereço" }).fill(originalUrl);
  await page.getByRole("textbox", { name: "Endereço" }).press("Enter");
  const resultHeading = page.getByRole("heading", { name: "destination.example", exact: true });
  await expect(resultHeading).toBeFocused();
  expect(await resultHeading.evaluate(element => getComputedStyle(element).outlineStyle)).toBe("solid");
  await expect(page.locator(".link-result-message")).toHaveText("Destino identificado, mas o servidor respondeu com HTTP 404.");
  await expect(page.locator(".link-result-url")).toHaveText(response.final_url!);
  await expect(page.locator(".link-result-meta")).toContainText("HTTPS");
  await expect(page.locator(".link-result-meta")).toContainText("404");
  await expect(page.getByText("O endereço redirecionou para outro domínio.")).toBeVisible();
  expect(observedRequest).toEqual({ method: "POST", contentType: "application/json", body: { url: originalUrl } });

  await page.locator(".link-path summary").press("Enter");
  await expect(page.locator(".link-path-list")).toContainText("HTTP 301");
  await expect(page.locator(".link-path-list")).toContainText("HTTP 302");
  await expect(page.locator(".link-path-list")).toContainText("Destino final");
  await expect(page.getByRole("button", { name: /Copiar endereço/ })).toBeVisible();
});

test("validates empty, malformed, unsupported, credentialed, and oversized input before POST", async ({ page }) => {
  await openLocalPreview(page);
  let requests = 0;
  await page.route("**/api/utilities/links/resolve", async route => {
    requests++;
    await route.fulfill({ status: 200, json: resolved() });
  });
  const input = page.getByRole("textbox", { name: "Endereço" });
  const submit = page.getByRole("button", { name: "Analisar endereço" });

  await submit.click();
  await expect(page.getByRole("alert")).toHaveText("Informe um endereço para analisar.");
  await expect(input).toBeFocused();
  await input.fill("example.com/path");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("URL completa");
  await input.fill("javascript:alert(1)");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("http:// ou https://");
  await input.fill("https://user:secret@example.com/path");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("sem usuário ou senha");
  await input.fill(`https://example.com/${"a".repeat(2050)}`);
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("2.048 caracteres");
  expect(requests).toBe(0);
});

test("renders only observed partial paths and maps backend failures without claiming a final destination", async ({ page }) => {
  await openLocalPreview(page);
  const cases: Array<{ status: LinkResolveStatus; message: RegExp }> = [
    { status: "blocked_url", message: /bloqueado pela política/ },
    { status: "timeout", message: /excedeu o tempo limite/ },
    { status: "redirect_loop", message: /ciclo de redirecionamentos/ },
    { status: "redirect_limit", message: /ultrapassou o limite/ },
    { status: "tls_error", message: /certificado|TLS/ },
    { status: "unresolved", message: /não foi possível confirmar/i },
    { status: "service_unavailable", message: /indisponível/ },
    { status: "invalid_url", message: /endereço informado é inválido/ },
  ];
  let current = 0;
  await page.route("**/api/utilities/links/resolve", async route => {
    const status = cases[current++].status;
    await route.fulfill({
      status: 200,
      json: {
        status,
        original_url: originalUrl,
        // For a failed resolution this field is only the last observed response, not a confirmed final URL.
        final_url: "https://observed-intermediate.example/",
        final_status_code: 302,
        redirect_count: 1,
        redirects: [{ url: originalUrl, status_code: 302 }],
        security: { https: true, warnings: [], reputation_checked: false },
      } satisfies LinkResolveResponse,
    });
  });

  const input = page.getByRole("textbox", { name: "Endereço" });
  for (const item of cases) {
    await input.fill(originalUrl);
    await page.getByRole("button", { name: "Analisar endereço" }).click();
    await expect(page.getByRole("heading", { name: "Destino final não confirmado", exact: true })).toBeVisible();
    await expect(page.locator(".link-result-message")).toHaveText(item.message);
    await expect(page.locator(".link-result-url")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Copiar endereço/ })).toHaveCount(0);
    await expect(page.locator(".link-result")).not.toContainText("observed-intermediate.example");
    await expect(page.locator(".link-path-unconfirmed")).toContainText("Destino final não confirmado");
  }
});

test("handles cancel, disables duplicate submissions, and keeps a newer result after an older request resolves late", async ({ page }) => {
  await openLocalPreview(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
  let requestCount = 0;
  await page.route("**/api/utilities/links/resolve", async route => {
    requestCount++;
    if (requestCount === 1) {
      await firstGate;
      try { await route.fulfill({ status: 200, json: resolved({ final_url: "https://old.example/" }) }); } catch { /* the UI canceled this request */ }
      return;
    }
    await route.fulfill({ status: 200, json: resolved({ final_url: "https://new.example/current" }) });
  });

  const input = page.getByRole("textbox", { name: "Endereço" });
  await input.fill(originalUrl);
  const firstRequest = page.waitForRequest(request => request.url().includes("/api/utilities/links/resolve") && request.method() === "POST");
  await page.getByRole("button", { name: "Analisar endereço" }).click();
  await firstRequest;
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeVisible();
  expect(await page.locator(".link-progress-mark").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  await expect(page.getByRole("button", { name: "Analisando…" })).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Análise cancelada." })).toBeVisible();

  await input.fill("https://new.example/request");
  await page.getByRole("button", { name: "Analisar endereço" }).click();
  await expect(page.getByRole("heading", { name: "new.example", exact: true })).toBeVisible();
  releaseFirst();
  await page.waitForTimeout(50);
  await expect(page.getByRole("heading", { name: "new.example", exact: true })).toBeVisible();
  expect(requestCount).toBe(2);
});

test("copies without changing the URL and safely renders untrusted URL text", async ({ page }) => {
  await openLocalPreview(page);
  const maliciousPath = "/<img src=x onerror=window.__linkXss=true>";
  await page.route("**/api/utilities/links/resolve", route => route.fulfill({
    status: 200,
    json: resolved({ final_url: `https://safe.example${maliciousPath}?token=keep-this-value`, redirect_count: 0, redirects: [] }),
  }));
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value: string) => { (window as Window & { copiedValue?: string }).copiedValue = value; } },
    });
  });
  await page.getByRole("textbox", { name: "Endereço" }).fill(originalUrl);
  await page.getByRole("button", { name: "Analisar endereço" }).click();
  await page.getByRole("button", { name: /Copiar endereço/ }).click();
  const expected = `https://safe.example${maliciousPath}?token=keep-this-value`;
  await expect(page.locator(".link-copy-feedback")).toHaveText("Endereço copiado.");
  expect(await page.evaluate(() => (window as Window & { copiedValue?: string }).copiedValue)).toBe(expected);
  const component = page.locator("utility-link-unshortener");
  await expect(component.locator("img, iframe, script")).toHaveCount(0);
  await expect(component.locator('a[href^="https://"]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("link-resolver-url"))).toBeNull();
  expect(await page.evaluate(() => (window as Window & { __linkXss?: boolean }).__linkXss)).toBeUndefined();
});

test("reports clipboard fallback failures accessibly", async ({ page }) => {
  await openLocalPreview(page);
  await page.route("**/api/utilities/links/resolve", route => route.fulfill({ status: 200, json: resolved() }));
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } });
    document.execCommand = () => false;
  });
  await page.getByRole("textbox", { name: "Endereço" }).fill(originalUrl);
  await page.getByRole("button", { name: "Analisar endereço" }).click();
  await page.getByRole("button", { name: /Copiar endereço/ }).click();
  await expect(page.locator(".link-copy-feedback")).toContainText("Não foi possível copiar");
});

test("keeps aligned form controls and result readable at all supported widths and themes", async ({ page }, info) => {
  await openLocalPreview(page);
  await page.route("**/api/utilities/links/resolve", route => route.fulfill({ status: 200, json: resolved() }));
  await page.getByRole("textbox", { name: "Endereço" }).fill(originalUrl);
  await page.getByRole("button", { name: "Analisar endereço" }).click();
  await expect(page.getByRole("heading", { name: "destination.example", exact: true })).toBeVisible();

  for (const width of [320, 390, 768, 1024, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["dark", "light"]) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await expect(page.getByRole("heading", { name: "destination.example", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const rects = await page.locator("#link-address, .link-resolver-form .utility-submit").evaluateAll(nodes => nodes.map(node => {
        const { x, y, width: boxWidth, height } = node.getBoundingClientRect();
        return { x, y, right: x + boxWidth, bottom: y + height };
      }));
      expect(rects[0].x).toBeGreaterThanOrEqual(0);
      expect(rects.every(rect => rect.right <= width + 1)).toBe(true);
      if (width > 480) expect(Math.abs(rects[0].bottom - rects[1].bottom)).toBeLessThanOrEqual(1);
      if ([390, 1366].includes(width)) {
        await page.screenshot({ path: info.outputPath(`link-interface-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
      }
    }
  }
});

test("a backend without the resolver flag keeps submission disabled", async ({ page }) => {
  await openLocalPreview(page);
  await page.route("**/api/utilities/capabilities", route => route.fulfill({
    status: 200,
    json: { utilities_enabled: true, link_resolver_enabled: false, background_remover_enabled: false },
  }));
  await page.reload();
  await expect(page.getByRole("button", { name: "Analisar endereço" })).toBeDisabled();
  await expect(page.locator(".link-service-status")).toContainText("desativado neste backend local");
});
