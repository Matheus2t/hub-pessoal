import { test, expect } from "@playwright/test";

test("Games catalog routes to all ten available games", async ({ page }) => {
  await page.goto("/#/games");
  await expect(page.locator(".arcade-tile")).toHaveCount(10);
  for (const slug of ["snake","sudoku","2048","breakout","pong","palavra-secreta","digitacao","jogo-da-velha","reflexos","memoria"]) {
    await page.goto("/#/games/" + slug);
    await expect(page.locator(".arcade-heading h1, .games-header h1")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  }
});
