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
  await expect(page.locator(".termo-keyboard .termo-key")).toHaveCount(26);
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

test("TERMO tem 6 linhas, teclado e feedback por posição", async ({page}) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto("/#/games/palavra-secreta");
  await expect(page.locator(".termo-row")).toHaveCount(6);
  await expect(page.locator(".termo-cell")).toHaveCount(30);
  for (const letter of ["L","I","V","R","O"]) {
    await page.getByRole("button",{name:"Letra "+letter,exact:true}).click();
  }
  await page.getByRole("button",{name:"Confirmar"}).click();
  await expect(page.locator(".termo-row").first().locator(".is-correct")).toHaveCount(5);
  await expect(page.locator(".termo-result")).toContainText("LIVRO");
  await page.getByRole("button",{name:"Nova palavra"}).click();
  await expect(page.locator(".termo-result")).toHaveCount(0);
});

test("2048 combina valores e pode desfazer", async ({page}) => {
  await page.addInitScript(() => {
    localStorage.removeItem("2t.games.2048.session.v2");
    Math.random = () => 0;
  });
  await page.goto("/#/games/2048");
  await expect(page.locator(".g2048-grid .tile")).toHaveCount(16);
  await expect(page.locator(".g2048-grid .tile").first()).toHaveText("2");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".g2048-grid .tile").first()).toHaveText("4");
  await expect(page.locator(".g2048-scorebar").first()).toContainText("4");
  await page.getByRole("button",{name:"Desfazer movimento"}).click();
  await expect(page.locator(".g2048-grid .tile").first()).toHaveText("2");
});

test("Memória tem prévia e inicia com cartas fechadas", async ({page}) => {
  await page.goto("/#/games/memoria");
  await expect(page.locator(".memory-grid .memory-card")).toHaveCount(16);
  await page.getByRole("button",{name:"Começar partida"}).click();
  await expect(page.locator(".memory-grid .is-face-up")).toHaveCount(16);
  await expect(page.locator(".memory-board-message")).toHaveCount(0,{timeout:5000});
  await page.locator(".memory-grid .memory-card").first().click();
  await expect(page.locator(".memory-grid .is-face-up")).toHaveCount(1);
  await page.getByRole("button",{name:"Reiniciar"}).click();
  await expect(page.getByRole("button",{name:"Começar partida"})).toBeVisible();
});

test("Sudoku destaca contexto e mostra progresso",async ({page})=>{
  await page.goto("/#/games/sudoku");
  await expect(page.locator(".sudoku-progress-track")).toBeVisible();
  await page.locator(".arcade-sudoku .sudoku-cell").nth(12).click();
  await expect(page.locator(".arcade-sudoku .sudoku-cell").nth(12)).toHaveClass(/selected/);
  expect(await page.locator(".arcade-sudoku .sudoku-cell.related").count()).toBeGreaterThan(10);
});
