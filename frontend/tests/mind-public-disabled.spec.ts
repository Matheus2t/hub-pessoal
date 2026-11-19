import { expect, test } from "@playwright/test";
import { serveBuiltSite } from "./helpers/serve-built-site";

test.skip(process.env.MIND_PUBLIC_DISABLED_BUILD !== "1", "Execute somente após gerar build público sem integração cloud.");

test("build público sem cloud não exibe rascunhos locais como biblioteca compartilhada", async ({ page }) => {
  await serveBuiltSite(page);
  await page.goto("/");
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("2t-mente-local-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("items", { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("items", "readwrite");
      tx.objectStore("items").put({
        id: "77a3a3a1-6c71-4d4a-9771-1ea145b8d1ac", kind: "note", title: "Rascunho local",
        topic: "Privado", tags: [], description: "", content: "Não deve ser publicado automaticamente.",
        favorite: false, createdAt: Date.now(), updatedAt: Date.now(),
      });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }));

  await page.goto("/#/mente");
  await expect(page.locator(".mind-local-warning")).toContainText("configuração pública não está disponível");
  await expect(page.locator(".mind-unavailable")).toContainText("não serão tratados como conteúdo publicado");
  await expect(page.getByText("Rascunho local")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ Nova nota" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Adicionar PDF" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Login do administrador" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restaurar backup" })).toHaveCount(0);
});
