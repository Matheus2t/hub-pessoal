import { test, expect } from "@playwright/test";

test("HTML, assets, API and financial result are served together", async ({
  request,
}) => {
  for (const [path, type] of [
    ["/", "text/html"],
    ["/bundle.js", "javascript"],
    ["/styles.css", "text/css"],
    ["/2t-mark.svg", "image/svg+xml"],
    ["/2t-logo.webp", "image/webp"],
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"]).toContain(type);
  }
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  const response = await request.post("/api/calculations", {
    data: {
      initial_capital: 1000,
      monthly_contribution: 100,
      monthly_rate: 1,
      months: 3,
    },
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(Number(data.final_amount)).toBe(1333.31);
  expect(data.evolution).toHaveLength(3);
});

for (const width of [1920, 1366, 768, 390, 320]) {
  test(`complete calculator and themes at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
    const exceptions: string[] = [];
    page.on("pageerror", (error) => exceptions.push(error.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Início", exact: true }),
    ).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty(
      "scrollWidth",
      await page.locator("body").evaluate((el) => el.clientWidth),
    );
    if (width === 1366 || width === 390)
      await page.screenshot({
        path: testInfo.outputPath(`home-dark-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveCount(0);
  await page.locator("home-page").getByRole("link", { name: /Calculadoras/ }).click();
  await page.getByRole("link", { name: "Abrir calculadora" }).click();
    await expect(
      page.getByRole("heading", { name: "Calculadora de juros compostos" }),
    ).toBeVisible();
    await page.getByLabel("Capital inicial", { exact: true }).fill("1.000,00");
    await page.getByLabel("Aporte mensal", { exact: true }).fill("100,00");
    await page.getByLabel("Taxa de juros mensal", { exact: true }).fill("1,00");
    await page.getByLabel("Prazo da simulação", { exact: true }).fill("3");
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/calculations") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Simular investimento" }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator("metric-card").first()).toContainText("1.333,31");
    if (width === 1920) {
      for (const selector of [".simulation-panel", ".metrics-grid"]) {
        const bounds = await page.locator(selector).boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1080);
      }
      await page.screenshot({
        path: testInfo.outputPath("calculator-1920x1080.png"),
        animations: "disabled",
      });
    }
    await expect(page.locator(".chart-balance")).toHaveAttribute("d", /^M/);
    await expect(page.locator(".chart-interest")).toHaveAttribute("d", /^M/);
    await expect(page.locator(".chart-legend")).toContainText("Juros acumulados");
    await expect(page.locator(".chart-slider")).not.toContainText(
      "Deslize ou use as setas do teclado",
    );
    await page.getByRole("slider", { name: "Mês exibido no gráfico" }).focus();
    await page.keyboard.press("Home");
    await expect(page.locator(".chart-readout")).toContainText("Mês 0");
    await page.keyboard.press("End");
    await expect(page.locator(".chart-readout")).toContainText("Mês 3");
    await expect(page.locator(".chart-readout")).toContainText("Juros:");
    await page.locator("summary").click();
    await expect(page.locator("tbody tr")).toHaveCount(3);
    await expect(page.locator("tbody tr").last()).toContainText("1.333,31");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("heading", { name: "Calculadora de juros compostos" })
      .click();
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width === 1366 || width === 390)
      await page.screenshot({
        path: testInfo.outputPath(`calculator-dark-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    await page.getByRole("button", { name: "Ativar tema claro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    if (width === 1366 || width === 390)
      await page.screenshot({
        path: testInfo.outputPath(`calculator-light-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(exceptions).toEqual([]);
  });
}

test("validation, loading, API error and 600-month pagination", async ({
  page,
}) => {
  await page.goto("/#/calculadora");
  await page.getByLabel("Prazo da simulação").fill("0");
  await page.getByRole("button", { name: "Simular investimento" }).click();
  await expect(
    page.getByText("Informe um prazo inteiro entre 1 e 600 meses."),
  ).toBeVisible();
  await page.getByLabel("Prazo da simulação").fill("600");
  await page.route("**/api/calculations", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 503,
      json: { detail: "Service unavailable" },
    });
  });
  await page.getByRole("button", { name: "Simular investimento" }).click();
  await expect(
    page.getByRole("button", { name: "Calculando…" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível concluir a simulação",
  );
  await page.unroute("**/api/calculations");
  await page.getByRole("button", { name: "Simular investimento" }).click();
  await expect(page.locator("metric-card")).toHaveCount(3);
  await expect(page.locator(".chart-panel")).toContainText("600 meses");
  await page.locator("summary").click();
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("13");
  await page.getByLabel("Capital inicial", { exact: true }).fill("2000");
  await expect(page.locator(".result-status")).toContainText(
    "Parâmetros alterados",
  );
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect(page.locator("metric-card")).toHaveCount(0);
});

test("touch chart, mobile navigation and system theme preference", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("home-page").getByRole("link", { name: /Calculadoras/ }).click();
  await page.getByRole("link", { name: "Abrir calculadora" }).tap();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveCount(0);
  await page.getByRole("button", { name: "Simular investimento" }).tap();
  const plot = page.locator(".evolution-svg");
  await expect(plot).toBeVisible();
  await plot.scrollIntoViewIfNeeded();
  const bounds = await plot.boundingBox();
  if (!bounds) throw Error("Chart is not rendered");
  await page.touchscreen.tap(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await expect(page.locator(".chart-tooltip")).toBeVisible();
  await expect(page.locator(".chart-tooltip")).toContainText("Mês");
  await expect(page.locator(".chart-tooltip strong")).toContainText("R$");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("typography is readable and emphasizes key information", async ({ page }) => {
  await page.goto("/");
  const bodyFont = await page.locator("body").evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );
  expect(bodyFont).toContain("Geist");
  const brand = page.locator(".brand-logo img");
  await expect(brand).toBeVisible();
  expect(await brand.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator(".brand strong")).toHaveCount(0);
  await page.locator("home-page").getByRole("link", { name: /Calculadoras/ }).click();
  await page.getByRole("link", { name: "Abrir calculadora" }).click();
  expect(
    await page.locator(".page-heading h1").evaluate((element) =>
      Number(getComputedStyle(element).fontWeight),
    ),
  ).toBeGreaterThanOrEqual(600);
  expect(
    await page.locator(".form-field label").first().evaluate((element) =>
      Number(getComputedStyle(element).fontWeight),
    ),
  ).toBeGreaterThanOrEqual(600);
  await page.getByRole("button", { name: "Simular investimento" }).click();
  expect(
    await page.locator(".metric-card strong").first().evaluate((element) =>
      Number(getComputedStyle(element).fontWeight),
    ),
  ).toBeGreaterThanOrEqual(700);
});

test("mouse hovering each chart line shows only that series' exact monthly value", async ({ page }) => {
  await page.goto("/#/calculadora");
  await page.getByLabel("Capital inicial", { exact: true }).fill("1.000,00");
  await page.getByLabel("Aporte mensal", { exact: true }).fill("100,00");
  await page.getByLabel("Taxa de juros mensal", { exact: true }).fill("10,00");
  await page.getByLabel("Prazo da simulação", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Simular investimento" }).click();
  await expect(page.locator(".chart-interest")).toHaveAttribute("d", /^M/);

  const chart = page.locator(".evolution-svg");
  await chart.scrollIntoViewIfNeeded();
  for (const [series, title] of [
    ["balance", "Patrimônio acumulado"],
    ["invested", "Total investido"],
    ["interest", "Juros acumulados"],
  ] as const) {
    const position = await chart.evaluate((element, key) => {
      const graphic = element as SVGSVGElement;
      const path = graphic.querySelector<SVGPathElement>(`.chart-${key}`);
      if (!path) throw Error("Série não encontrada no gráfico");
      const point = path.getPointAtLength(path.getTotalLength() * 0.93);
      const matrix = graphic.getScreenCTM();
      if (!matrix) throw Error("Gráfico sem transformação de coordenadas");
      const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
      return { x: screen.x, y: screen.y };
    }, series);
    await page.mouse.move(position.x, position.y);
    const tip = page.locator(`.chart-tooltip[data-series="${series}"]`);
    await expect(tip).toBeVisible();
    await expect(tip).toContainText(title);
    await expect(tip.locator("strong")).toContainText("R$");
    await expect(page.locator(`.chart-${series}`)).toHaveClass(/is-inspected/);
  }

  // As legendas também permitem consultar séries quase sobrepostas.
  await page.getByRole("button", { name: "Ver total investido" }).hover();
  await expect(page.locator('.chart-tooltip[data-series="invested"]')).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.locator(".chart-tooltip")).toHaveCount(0);

  await page.getByRole("slider", { name: "Mês exibido no gráfico" }).focus();
  await page.keyboard.press("Home");
  await expect(page.locator(".chart-readout")).toContainText("Mês 0");
  await page.keyboard.press("End");
  await expect(page.locator(".chart-readout")).toContainText("Mês 12");
});

test("nova marca 2T aparece no cabeçalho e rodapé em ambos os temas", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const headerLogo = page.locator(".brand-logo img");
  const footerLogo = page.locator(".footer-logo img");
  await expect(headerLogo).toHaveAttribute("src", "/2t-logo.webp");
  await expect(footerLogo).toHaveAttribute("src", "/2t-logo.webp");
  await expect(footerLogo).toHaveAttribute("alt", "2T");
  for (const image of [headerLogo, footerLogo]) {
    await expect(image).toBeVisible();
    expect(await image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(headerLogo).toBeVisible();
  await expect(footerLogo).toBeVisible();
  await page.getByRole("link", { name: "Calculadoras" }).first().click();
  await expect(page.locator(".brand-logo img")).toBeVisible();
  await expect(page.locator(".footer-logo img")).toBeVisible();
});

test("footer calendar opens on demand and navigates holidays", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-31T15:00:00-03:00"));
  await page.setViewportSize({width:1366,height:900});
  await page.goto("/#/");
  await expect(page).toHaveTitle("Início · 2T");
  await expect(page.locator("home-page holiday-calendar")).toHaveCount(0);
  const trigger=page.getByRole("button",{name:"Abrir calendário de feriados"});
  await expect(trigger).toBeVisible();
  const dialog=page.getByRole("dialog",{name:"Calendário de feriados"});
  await expect(dialog).not.toBeVisible();
  const cards=page.locator("home-page .area-card");
  await expect(cards).toHaveCount(3);
  const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox(),c=await cards.nth(2).boundingBox();
  if(!a||!b||!c)throw Error("Cards da home não renderizados");
  expect(b.y).toBeGreaterThanOrEqual(a.y+a.height-1);
  expect(c.y).toBeGreaterThanOrEqual(b.y+b.height-1);
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".calendar-navigation h3")).toHaveText("Outubro de 2026");
  await expect(dialog.locator(".calendar-events")).toContainText("Nossa Senhora Aparecida");
  await dialog.getByRole("button",{name:"Próximo mês"}).click();
  await expect(dialog.locator(".calendar-navigation h3")).toHaveText("Novembro de 2026");
  await expect(dialog.locator(".calendar-events li")).toHaveCount(3);
  await expect(dialog.locator(".calendar-events")).toContainText("Consciência Negra");
  await dialog.getByRole("button",{name:"Hoje"}).click();
  await expect(dialog.locator(".calendar-navigation h3")).toHaveText("Outubro de 2026");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await dialog.getByRole("button",{name:"Fechar calendário"}).click();
  await expect(dialog).not.toBeVisible();
});

test("footer calendar shows local holidays on mobile and is available on other pages", async ({page})=>{
  await page.clock.setFixedTime(new Date("2026-07-09T12:00:00-03:00"));
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  const dialog=page.getByRole("dialog",{name:"Calendário de feriados"});
  await page.getByRole("button",{name:"Abrir calendário de feriados"}).click();
  await expect(dialog.locator(".calendar-events")).toContainText("Revolução Constitucionalista");
  await expect(dialog.locator(".calendar-events")).toContainText("Estadual");
  for(let i=0;i<6;i++)await dialog.getByRole("button",{name:"Mês anterior"}).click();
  await expect(dialog.locator(".calendar-navigation h3")).toHaveText("Janeiro de 2026");
  await expect(dialog.locator(".calendar-events")).toContainText("Aniversário de São Paulo");
  await expect(dialog.locator(".calendar-events")).toContainText("Municipal");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await dialog.getByRole("button",{name:"Fechar calendário"}).click();
  await page.locator("home-page").getByRole("link",{name:/Calculadoras/}).click();
  await page.getByRole("button",{name:"Abrir calendário de feriados"}).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
