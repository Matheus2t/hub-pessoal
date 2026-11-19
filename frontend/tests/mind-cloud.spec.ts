import { expect, test } from "@playwright/test";
import { serveBuiltSite } from "./helpers/serve-built-site";

test.skip(!/^(true|1|yes)$/i.test(process.env.MIND_CLOUD_ENABLED ?? ""), "Requer build de teste Mente Cloud");

const supabase = "https://mocktestproj.supabase.co";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer, x-upsert",
};
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
  title: "Relatório", content: "", file_name: "relatorio.pdf", file_size: 2048,
  storage_path: owner + "/e75dc2e4-2579-426d-9f21-3e1a34dc6ed4.pdf",
};
function mockApi(page: import("@playwright/test").Page, admin = true) {
  const requests: { path: string; method: string; auth: string | null }[] = [];
  return {
    requests,
    async install() {
      await page.route(supabase + "/**", route => {
        const request = route.request();
        const url = new URL(request.url());
        requests.push({ path: url.pathname, method: request.method(), auth: request.headers()["authorization"] ?? null });
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
        if (url.pathname === "/rest/v1/mind_items" && request.method() === "GET") {
          return route.fulfill({ status: 200, headers: cors, json: [note, pdf] });
        }
        if (url.pathname === "/auth/v1/token") return route.fulfill({ status: 200, headers: cors, json: {
          access_token: "mock-jwt", refresh_token: "mock-refresh", expires_in: 3600, user: { id: owner },
        } });
        if (url.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: cors, json: { id: owner } });
        if (url.pathname === "/rest/v1/rpc/mind_is_admin") return route.fulfill({ status: 200, headers: cors, json: admin });
        if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204, headers: cors });
        if (url.pathname.startsWith("/storage/v1/object/public/")) {
          return route.fulfill({ status: 200, headers: { ...cors, "Content-Type": "application/pdf" }, body: "%PDF-1.4\n%%EOF" });
        }
        return route.fulfill({ status: 404, headers: cors, json: {} });
      });
    },
  };
}

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

test("visitante visualiza PDF na 2T e encontra link externo direto", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await page.getByRole("button", { name: /Relatório/ }).click();
  await expect(page.getByRole("button", { name: "Fechar visualização" })).toBeVisible();
  const iframe = page.locator(".mind-pdf-embed iframe");
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute("src", supabase + "/storage/v1/object/public/mind-pdfs/" + pdf.storage_path);
  await expect(page.getByRole("link", { name: /Abrir no navegador/ })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: /Abrir no navegador/ })).toHaveAttribute("href", supabase + "/storage/v1/object/public/mind-pdfs/" + pdf.storage_path);
  await page.getByRole("button", { name: "Fechar visualização" }).click();
  await expect(iframe).toHaveCount(0);
});

test("adicionar conteúdo exige login, administrador pode editar e sair sem ocultar leitura", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await expect(page.locator(".mind-item")).toHaveCount(2);
  await page.getByRole("button", { name: "+ Nova nota" }).click();
  await expect(page.getByRole("heading", { name: "Entrar para editar" })).toBeVisible();
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByLabel("Senha").fill("not-a-real-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".mind-editor")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair da administração" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Sair da administração" }).click();
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
});

test("biblioteca pública é responsiva nos temas claro e escuro", async ({ page }) => {
  await serveBuiltSite(page);
  const api = mockApi(page); await api.install();
  await page.goto("/#/mente");
  await expect(page.locator(".mind-item")).toHaveCount(2);
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.locator(".mind-workspace")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
