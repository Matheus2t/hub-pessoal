import { test, expect } from "@playwright/test";

test("Catálogo lista os dez jogos", async ({ page }) => {
  await page.goto("/#/games");
  await expect(page.locator(".arcade-tile")).toHaveCount(10);
  await page.getByRole("link", { name: "Jogar Sudoku" }).click();
  await expect(page.locator("arcade-sudoku .arcade-sudoku .sudoku-cell")).toHaveCount(81);
});

test("Todas as páginas de jogos carregam", async ({ page }) => {
  for (const slug of ["snake","sudoku","2048","breakout","pong","palavra-secreta","digitacao","jogo-da-velha","reflexos","memoria"]) {
    await page.goto("/#/games/" + slug);
    await expect(page.locator(".arcade-heading h1, .games-header h1")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  }
});

test("Tabuleiros, campos e botões principais aparecem", async ({ page }) => {
  await page.goto("/#/games/2048");
  await expect(page.locator(".arcade-2048 .tile")).toHaveCount(16);
  await page.goto("/#/games/sudoku");
  await expect(page.locator(".arcade-sudoku .sudoku-cell")).toHaveCount(81);
  await page.goto("/#/games/palavra-secreta");
  await expect(page.locator(".arcade-letters button")).toHaveCount(26);
  await page.goto("/#/games/jogo-da-velha");
  await expect(page.locator(".arcade-tic-board button")).toHaveCount(9);
  await page.locator(".arcade-tic-board button").first().click();
  await expect(page.locator(".arcade-tic-board button").first()).toHaveText("X");
  await page.goto("/#/games/memoria");
  await expect(page.locator(".arcade-memory-board button")).toHaveCount(16);
  await page.goto("/#/games/digitacao");
  await expect(page.locator(".arcade-typing textarea")).toBeVisible();
  await page.goto("/#/games/reflexos");
  await page.locator(".arcade-reflex-area").click();
  await expect(page.locator(".arcade-reflex-area")).toContainText("Aguarde");
  await page.goto("/#/games/breakout");
  await expect(page.locator("arcade-breakout canvas")).toBeVisible();
  await page.goto("/#/games/pong");
  await expect(page.locator("arcade-pong canvas")).toBeVisible();
});

test("Snake continua jogável", async ({ page }) => {
  await page.goto("/#/games/snake");
  await expect(page.locator(".snake-board .snake-cell")).toHaveCount(400);
  await page.getByRole("button", { name: "Começar", exact: true }).click();
  await expect(page.locator(".snake-overlay")).toHaveCount(0);
});

test("Catálogo filtra por categoria e nome", async ({ page }) => {
  await page.goto("/#/games");
  await page.getByRole("button", { name: "Lógica", exact: true }).click();
  await expect(page.locator(".arcade-tile")).toHaveCount(2);
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await page.getByRole("searchbox", { name: "Buscar jogos" }).fill("Pong");
  await expect(page.locator(".arcade-tile")).toHaveCount(1);
  await page.getByRole("link", { name: "Jogar Pong" }).click();
  await expect(page.locator("arcade-pong canvas")).toBeVisible();
});

test("Layouts Games sem rolagem horizontal no celular e desktop", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const slug of ["", "snake", "sudoku", "2048", "breakout", "pong", "palavra-secreta", "digitacao", "jogo-da-velha", "reflexos", "memoria"]) {
      await page.goto("/#/games" + (slug ? "/" + slug : ""));
      await expect(page.locator(slug ? ".arcade-game, .games-section" : ".arcade-hub")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow no game ${slug || "catálogo"} em ${width}px`).toBeLessThanOrEqual(2);
    }
  }
});
