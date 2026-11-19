import { expect, test } from "@playwright/test";
import { serveBuiltSite } from "./helpers/serve-built-site";

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
  let rows = [item];
  const requested: string[] = [];
  await page.route(supabase + "/**", async route => {
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
  await page.route(supabase + "/**", route => {
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
