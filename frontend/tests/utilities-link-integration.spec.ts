import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const previewBuild = /^(1|true|yes)$/i.test(process.env.UTILITIES_ENABLED ?? "") &&
  /^(1|true|yes)$/i.test(process.env.LINK_RESOLVER_ENABLED ?? "") && process.env.VERCEL !== "1";
async function reserveLoopbackPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve loopback port.");
  const port = address.port;
  await new Promise<void>((resolvePromise, reject) => server.close(error => error ? reject(error) : resolvePromise()));
  return port;
}

test("Lit UI resolves through FastAPI, pinned transport, and a real loopback TLS handshake", async ({ page }) => {
  test.skip(!previewBuild, "O bundle atual não está habilitado para prévia local dos Utilitários.");
  const port = await reserveLoopbackPort();
  const apiOrigin = `http://127.0.0.1:${port}`;
  const backend = spawn(process.env.PYTHON || "python", [
    resolve("backend/tests/link_resolver_browser_server.py"), String(port),
  ], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ["pipe", "ignore", "pipe"],
  });
  let stderr = "";
  let spawnError = "";
  backend.stderr?.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-2000); });
  backend.on("error", error => { spawnError = error.message; });

  try {
    let ready = false;
    const deadline = Date.now() + 15_000;
    while (!ready && Date.now() < deadline) {
      if (spawnError) throw new Error(`Could not start test API: ${spawnError}`);
      if (backend.exitCode !== null) throw new Error(`Test API exited before readiness: ${stderr}`);
      try {
        const response = await fetch(`${apiOrigin}/api/utilities/capabilities`);
        ready = response.ok;
      } catch {
        await new Promise(resolvePromise => setTimeout(resolvePromise, 150));
      }
    }
    expect(ready, `Test API did not become ready: ${stderr}`).toBe(true);

    const externalBrowserRequests: string[] = [];
    const apiFailures: string[] = [];
    page.on("requestfailed", request => {
      if (request.url().includes("/api/utilities/")) apiFailures.push(`${request.url()} :: ${request.failure()?.errorText}`);
    });
    page.on("console", message => {
      if (message.type() === "error") apiFailures.push(`console :: ${message.text()}`);
    });
    page.on("request", request => {
      if (!["localhost", "127.0.0.1", "::1"].includes(new URL(request.url()).hostname) && !request.url().startsWith("data:")) {
        externalBrowserRequests.push(request.url());
      }
    });
    await page.goto(`${apiOrigin}/#/utilitarios/desencurtador`);
    await expect(page.locator(".link-service-status")).toContainText("A análise consulta o destino", { timeout: 10_000 }).catch(async () => {
      const probe = await page.evaluate(async () => {
        try {
          const response = await fetch("/api/utilities/capabilities", { cache: "no-store" });
          return { status: response.status, body: await response.text() };
        } catch (error) { return { error: String(error) }; }
      });
      throw new Error(`Capabilities not ready: status=${await page.locator(".link-service-status").textContent()}; probe=${JSON.stringify(probe)}; failures=${apiFailures.join(" | ")}`);
    });
    await expect(page.getByRole("button", { name: "Analisar endereço" })).toBeEnabled();
    await page.getByRole("textbox", { name: "Endereço" }).fill("https://resolver.test/short");
    await page.getByRole("button", { name: "Analisar endereço" }).click();

    await expect(page.getByRole("heading", { name: "resolver.test", exact: true })).toBeVisible();
    await expect(page.getByText("Destino identificado, mas o servidor respondeu com HTTP 404.")).toBeVisible();
    await expect(page.locator(".link-result-meta")).toContainText("404");
    await page.getByText("Caminho do link").click();
    await expect(page.locator(".link-path-list")).toContainText("https://resolver.test/landing");
    await expect(page).toHaveURL(/#\/utilitarios\/desencurtador$/);
    expect(externalBrowserRequests).toEqual([]);
  } finally {
    if (backend.exitCode === null) {
      backend.stdin?.end();
      const stopped = await Promise.race([
        once(backend, "exit").then(() => true),
        new Promise<boolean>(resolvePromise => setTimeout(() => resolvePromise(false), 5000)),
      ]);
      if (!stopped) {
        backend.kill();
        await once(backend, "exit");
      }
    }
  }
});
