import { expect, test } from "@playwright/test";
import { serveBuiltSite } from "./helpers/serve-built-site";
import { resolveUtilityAccess } from "../src/utilities/flags";

const previewBuild = /^(1|true|yes)$/i.test(process.env.UTILITIES_ENABLED ?? "") &&
  /^(1|true|yes)$/i.test(process.env.LINK_RESOLVER_ENABLED ?? "") &&
  /^(1|true|yes)$/i.test(process.env.BACKGROUND_REMOVER_ENABLED ?? "") && process.env.VERCEL !== "1";
const publicPreviewBuild = process.env.VERCEL === "1" && /^(1|true|yes)$/i.test(process.env.LINK_RESOLVER_PUBLIC_UI_ENABLED ?? "");

test("utility access requires loopback and combines the three flags independently", () => {
  expect(resolveUtilityAccess("matheus2t.com.br", { utilities: true, linkResolver: true, backgroundRemover: true }))
    .toEqual({ loopback: false, utilities: false, linkResolver: false, backgroundRemover: false });
  expect(resolveUtilityAccess("127.0.0.1", { utilities: true, linkResolver: false, backgroundRemover: true }))
    .toEqual({ loopback: true, utilities: true, linkResolver: false, backgroundRemover: true });
  expect(resolveUtilityAccess("[::1]", { utilities: true, linkResolver: true, backgroundRemover: false }))
    .toEqual({ loopback: true, utilities: true, linkResolver: true, backgroundRemover: false });
  expect(resolveUtilityAccess("localhost", { utilities: false, linkResolver: true, backgroundRemover: true }))
    .toEqual({ loopback: true, utilities: false, linkResolver: false, backgroundRemover: false });
  expect(resolveUtilityAccess("matheus2t.com.br", { utilities: true, linkResolver: true, backgroundRemover: true }, true))
    .toEqual({ loopback: false, utilities: true, linkResolver: true, backgroundRemover: false });
});

test("direct utility routes and query parameters stay unavailable in a public/default build", async ({ page }) => {
  test.skip(previewBuild || publicPreviewBuild, "O bundle atual está configurado para uma prévia explícita.");
  await serveBuiltSite(page);
  await page.goto("/?utilities-preview=1#/utilitarios");
  await expect(page.getByRole("heading", { name: "Início", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Utilitários" })).toHaveCount(0);
  await page.goto("/?utilities-preview=1#/utilitarios/desencurtador");
  await expect(page.locator("utility-link-unshortener")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Início", exact: true })).toBeVisible();
  await page.goto("/#/utilitarios/remover-fundo?preview=1");
  await expect(page.locator("utility-background-remover")).toHaveCount(0);
});

test("explicit public build exposes only the resolver after backend capabilities confirm it", async ({ page }) => {
  test.skip(!publicPreviewBuild, "Compile com VERCEL=1 e LINK_RESOLVER_PUBLIC_UI_ENABLED=true.");
  const publicOrigin = "https://matheus2t.com.br";
  await serveBuiltSite(page, undefined, publicOrigin);
  await page.route("**/api/utilities/capabilities", route => route.fulfill({
    status: 200,
    json: { utilities_enabled: true, link_resolver_enabled: true, background_remover_enabled: false },
  }));
  await page.goto(`${publicOrigin}/#/utilitarios`);
  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  await navigation.getByText("Áreas", { exact: true }).click();
  await expect(navigation.getByRole("link", { name: "Utilitários", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Desencurtador de Links/ })).toBeVisible();
  await expect(page.getByText("Removedor de Fundo", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: /Desencurtador de Links/ }).click();
  await expect(page.getByRole("heading", { name: "Desencurtador de Links", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Endereço" })).toBeEnabled();
  await expect(page.locator(".link-service-status")).toContainText("A URL é enviada à API 2T");
});

test("local catalogue and navigation use the resolver API without loading external destinations", async ({ page }) => {
  test.skip(!previewBuild, "Este bundle não foi compilado com UTILITIES_ENABLED=true.");
  await serveBuiltSite(page);
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.route("**/api/utilities/capabilities", route => route.fulfill({
    status: 200,
    json: { utilities_enabled: true, link_resolver_enabled: true, background_remover_enabled: true },
  }));
  await page.route("**/api/utilities/links/resolve", route => route.fulfill({
    status: 200,
    json: {
      status: "resolved",
      original_url: "https://example.com/short",
      final_url: "https://example.com/short",
      final_status_code: 200,
      redirect_count: 0,
      redirects: [],
      security: { https: true, warnings: [], reputation_checked: false },
    },
  }));
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/#/utilitarios");
  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  await navigation.getByText("Áreas", { exact: true }).click();
  await expect(navigation.getByRole("link", { name: "Utilitários", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Utilitários", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Desencurtador de Links/ })).toHaveAttribute("href", "#/utilitarios/desencurtador");
  await expect(page.getByRole("link", { name: /Removedor de Fundo/ })).toHaveAttribute("href", "#/utilitarios/remover-fundo");

  await page.getByRole("link", { name: /Desencurtador de Links/ }).click();
  await expect(page.getByRole("heading", { name: "Desencurtador de Links", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Caminho da página" }).getByRole("link", { name: "Utilitários" })).toBeVisible();
  await page.getByRole("textbox", { name: "Endereço" }).fill("https://example.com/short");
  await page.getByRole("textbox", { name: "Endereço" }).press("Enter");
  await expect(page.getByRole("heading", { name: "example.com", exact: true })).toBeVisible();
  await expect(page.getByText("Este endereço não apresentou redirecionamentos HTTP.")).toBeVisible();
  await expect(page.getByText("A ferramenta identifica redirecionamentos, mas não verifica se o site é confiável.")).toBeVisible();
  expect(requests.some(url => url.startsWith("https://example.com/"))).toBe(false);

  await page.getByRole("link", { name: "Utilitários", exact: true }).last().click();
  await page.getByRole("link", { name: /Removedor de Fundo/ }).click();
  await expect(page.getByRole("heading", { name: "Removedor de Fundo", exact: true })).toBeVisible();
  await expect(page.getByText("Nenhuma imagem é enviada ou processada nesta fase.")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  expect(requests.some(url => url.includes("/api/utilities/"))).toBe(true);
  expect(requests.filter(url => /^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(url))).toEqual([]);
});

test("local utility pages remain responsive in light and dark themes", async ({ page }, info) => {
  test.skip(!previewBuild, "Este bundle não foi compilado com UTILITIES_ENABLED=true.");
  await serveBuiltSite(page);
  await page.route("**/api/utilities/capabilities", route => route.fulfill({
    status: 200,
    json: { utilities_enabled: true, link_resolver_enabled: true, background_remover_enabled: true },
  }));
  for (const width of [320, 390, 768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["dark", "light"]) {
      await page.goto("/#/utilitarios");
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await expect(page.getByRole("heading", { name: "Utilitários", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const selector of [".utilities-heading", ".utility-entry"]) {
        const boxes = await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
          const { x, width: boxWidth } = node.getBoundingClientRect();
          return { x, right: x + boxWidth };
        }));
        expect(boxes.every(box => box.x >= 0 && box.right <= width + 1)).toBe(true);
      }
      if ([390, 1366].includes(width)) await page.screenshot({
        path: info.outputPath(`utilities-${width}-${theme}.png`), fullPage: true, animations: "disabled",
      });
    }
  }
});
