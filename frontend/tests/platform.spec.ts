import { test, expect } from "@playwright/test";

test("HTML, assets, API and financial result are served together", async ({
  request,
}) => {
  for (const [path, type] of [
    ["/", "text/html"],
    ["/bundle.js", "javascript"],
    ["/styles.css", "text/css"],
    ["/2t-mark.svg", "image/svg+xml"],
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
    await page.setViewportSize({ width, height: 900 });
    const exceptions: string[] = [];
    page.on("pageerror", (error) => exceptions.push(error.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Ferramentas", exact: true }),
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
    if (width <= 900) {
      await page.getByRole("button", { name: "Abrir menu" }).click();
      await expect(
        page.getByRole("navigation", { name: "Navegação principal" }),
      ).toBeVisible();
      await expect(page.locator("body")).toHaveJSProperty(
        "scrollWidth",
        await page.locator("body").evaluate((el) => el.clientWidth),
      );
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Abrir menu" }),
      ).toBeFocused();
    }
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
    await expect(page.locator(".chart-balance")).toHaveAttribute("d", /^M/);
    await page.getByRole("slider", { name: "Mês exibido no gráfico" }).focus();
    await page.keyboard.press("Home");
    await expect(page.locator(".chart-readout")).toContainText("Mês 0");
    await page.keyboard.press("End");
    await expect(page.locator(".chart-readout")).toContainText("Mês 3");
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
  await page.getByRole("button", { name: "Abrir menu" }).tap();
  await page.getByRole("link", { name: "Juros compostos", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
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
  await expect(page.locator(".chart-tooltip")).toContainText(
    "Total investido:",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
