import { expect, test } from "@playwright/test";
import { serveBuiltSite } from "./helpers/serve-built-site";

// The general browser-regression workflow uses the standard (local-first) build.
// These cases must run exclusively against the explicit Cloud preview, otherwise
// they fail by design and report unrelated regressions.
test.skip(!/^(true|1|yes)$/i.test(process.env.MIND_CLOUD_ENABLED ?? ""), "Requer build de teste Mente Cloud");


const supabase = "https://mocktestproj.supabase.co";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer, x-upsert",
  "Access-Control-Max-Age": "600",
};
const item = {
  id: "98a6ee58-9c8a-4a40-ae1f-3d5537bc4c5a",
  owner_id: "075026fa-4e9f-4e1a-8ef4-a3c443e11442",
  kind: "note",
  title: "Investimentos",
  topic: "Estudos",
  tags: ["2027"],
  description: "Cenários",
  content: "Estudos salvos de forma privada.",
  favorite: false,
  file_name: null,
  file_size: null,
  storage_path: null,
  created_at: "2026-11-19T00:00:00.000Z",
  updated_at: "2026-11-19T00:00:00.000Z",
};

test("visitantes podem abrir a Mente, mas não acessar o IndexedDB nem a biblioteca sem login", async ({ page }) => {
  await serveBuiltSite(page);
  const sensitiveRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("supabase.co")) sensitiveRequests.push(request.url()); });
  await page.goto("/#/mente");
  await expect(page.getByRole("heading", { name: "Mente" })).toBeAttached();
  await expect(page.getByRole("button", { name: "Acessar biblioteca" })).toBeVisible();
  await expect(page.locator(".mind-workspace")).toHaveCount(0);
  expect(sensitiveRequests).toEqual([]);
  await page.getByRole("button", { name: "Acessar biblioteca" }).click();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.locator(".mind-workspace")).toHaveCount(0);
});

test("administrador autenticado acessa, pesquisa e sai; um visitante não recebe dados", async ({ page }) => {
  await serveBuiltSite(page);
  page.on('requestfailed', r => console.log('MIND REQUEST FAILED', r.method(), r.url(), r.failure()?.errorText));
  page.on('console', m => { if(m.type()==='error') console.log('MIND CONSOLE', m.text()); });
  let rows = [item];
  const requested: string[] = [];
  await page.route(supabase + "/**", async route => {
    console.log("MIND MOCK", route.request().method(), route.request().url());
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(route.request().url());
    requested.push(url.pathname);
    if (url.pathname === "/auth/v1/token") {
      return route.fulfill({ headers: cors, status: 200, json: {
        access_token: "test-jwt-not-real", refresh_token: "test-refresh-not-real",
        expires_in: 3600, user: { id: item.owner_id },
      } });
    }
    if (url.pathname === "/auth/v1/user") return route.fulfill({ headers: cors, status: 200, json: { id: item.owner_id } });
    if (url.pathname === "/rest/v1/rpc/mind_is_admin") return route.fulfill({ headers: cors, status: 200, json: true });
    if (url.pathname === "/rest/v1/mind_items" && route.request().method() === "GET") {
      return route.fulfill({ headers: cors, status: 200, json: url.searchParams.get("select") === "id" ? rows.map(x => ({ id: x.id })) : rows });
    }
    if (url.pathname === "/rest/v1/mind_items" && route.request().method() === "DELETE") {
      rows = [];
      return route.fulfill({ headers: cors, status: 204 });
    }
    if (url.pathname === "/auth/v1/logout") return route.fulfill({ headers: cors, status: 204 });
    return route.fulfill({ headers: cors, status: 404, json: {} });
  });
  await page.goto("/#/mente");
  await page.getByRole("button", { name: "Acessar biblioteca" }).click();
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByLabel("Senha").fill("not-a-real-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".mind-item")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Pesquisar na Mente" }).fill("Investimentos");
  await expect(page.locator(".mind-item")).toHaveCount(1);
  expect(requested).toContain("/rest/v1/rpc/mind_is_admin");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.locator(".mind-workspace")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Acessar biblioteca" })).toBeVisible();
});

test("conta sem privilégio de administrador jamais vê as notas privadas", async ({ page }) => {
  await serveBuiltSite(page);
  page.on('requestfailed', r => console.log('DENIED REQUEST FAILED', r.method(), r.url(), r.failure()?.errorText));
  await page.route(supabase + "/**", route => {
    console.log("DENIED MOCK", route.request().method(), route.request().url());
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/token") return route.fulfill({ headers: cors, status: 200, json: {
      access_token: "test-not-real", refresh_token: "test-refresh-not-real",
      expires_in: 3600, user: { id: item.owner_id },
    } });
    if (url.pathname === "/auth/v1/user") return route.fulfill({ headers: cors, status: 200, json: { id: item.owner_id } });
    if (url.pathname === "/rest/v1/rpc/mind_is_admin") return route.fulfill({ headers: cors, status: 200, json: false });
    return route.fulfill({ headers: cors, status: 204 });
  });
  await page.goto("/#/mente");
  await page.getByRole("button", { name: "Acessar biblioteca" }).click();
  await page.getByLabel("E-mail").fill("other@example.com");
  await page.getByLabel("Senha").fill("invalid-placeholder");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toContainText("não possui permissão de administrador");
  await expect(page.locator(".mind-workspace")).toHaveCount(0);
});


test("the private Mente login stays compact in mobile and desktop themes", async ({ page }) => {
  await serveBuiltSite(page);
  await page.goto("/#/mente");
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.getByRole("button", { name: "Acessar biblioteca" })).toBeVisible();
      await expect(page.locator(".mind-workspace")).toHaveCount(0);
      const heading = await page.locator(".mind-private-preview h2").boundingBox();
      expect(heading).not.toBeNull();
      expect(heading!.x).toBeGreaterThanOrEqual(0);
      expect(heading!.x + heading!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.getByRole("button", { name: "Acessar biblioteca" }).click();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.locator(".mind-workspace")).toHaveCount(0);
});
