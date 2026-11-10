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
