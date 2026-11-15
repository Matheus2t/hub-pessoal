import { test, expect, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const buildRoot = path.resolve('dist');
const origin = new URL(process.env.BASE_URL || 'http://127.0.0.1:8123').origin;
const contentTypes: Record<string, string> = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.woff2': 'font/woff2',
};

async function useBuiltPreview(page: Page) {
  await page.route(`${origin}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fallback();
    let file = path.resolve(buildRoot, `.${decodeURIComponent(url.pathname)}`);
    if (file !== buildRoot && !file.startsWith(`${buildRoot}${path.sep}`)) return route.fulfill({ status: 403, body: '' });
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: contentTypes[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });

  const evolution = Array.from({ length: 24 }, (_, index) => ({
    month: index + 1, deposit: '100.00', interest: `${(index + 10).toFixed(2)}`,
    balance: `${1100 + index * 110}.00`, invested: `${1100 + index * 100}.00`,
  }));
  await page.route('**/api/calculations/history', route => route.fulfill({ status: 200, json: [] }));
  await page.route('**/api/calculations', route => route.fulfill({ status: 200, json: {
    final_amount: '3760.00', total_invested: '3400.00', total_interest: '360.00', evolution,
  } }));
  await page.route('**/api/finance/simple', route => route.fulfill({ status: 200, json: {
    final_amount: '1120.00', total_invested: '1000.00', total_interest: '120.00', evolution,
  } }));
  for (const kind of ['price', 'sac']) await page.route(`**/api/finance/${kind}`, route => route.fulfill({ status: 200, json: {
    total_paid: '1066.19', total_interest: '66.19', first_payment: '88.85', last_payment: '88.85',
    schedule: Array.from({ length: 24 }, (_, index) => ({
      month: index + 1, payment: '88.85', interest: '8.85', amortization: '80.00', balance: `${1000 - index * 40}.00`,
    })),
  } }));
}

async function assertEmptyLayout(page: Page, tool: ReturnType<Page['locator']>) {
  const workspace = tool.locator('panel-workspace');
  await expect(workspace).toHaveAttribute('data-calculator-state', 'empty');
  const form = await workspace.locator('[data-panel="form"]').boundingBox();
  const empty = await workspace.locator('[data-panel="empty"]').boundingBox();
  expect(form && empty).toBeTruthy();
  expect(Math.abs(form!.x - empty!.x)).toBeLessThan(2);
  expect(Math.abs(form!.width - empty!.width)).toBeLessThan(2);
  expect(empty!.y).toBeGreaterThanOrEqual(form!.y + form!.height - 1);
}

const calculators = [
  { route: 'calculadora', selector: 'compound-calculator', button: 'Simular investimento', resultState: 'results-chart', tableTitle: 'Evolução do investimento' },
  { route: 'juros-simples', selector: 'finance-calculator', button: 'Calcular', resultState: 'results-chart', tableTitle: 'Evolução do investimento' },
  { route: 'price', selector: 'finance-calculator', button: 'Calcular', resultState: 'results-summary', tableTitle: 'Evolução do financiamento' },
  { route: 'sac', selector: 'finance-calculator', button: 'Calcular', resultState: 'results-summary', tableTitle: 'Evolução do financiamento' },
  { route: 'aposentadoria', selector: 'extended-finance-calculator', button: 'Projetar aposentadoria', resultState: 'results-chart', tableTitle: 'Evolução da aposentadoria' },
  { route: 'aluguel-vs-financiamento', selector: 'extended-finance-calculator', button: 'Comparar cenários', resultState: 'results-chart', tableTitle: 'Comparação de cenários' },
  { route: 'amortizacao', selector: 'extended-finance-calculator', button: 'Simular amortização', resultState: 'results-chart', tableTitle: 'Evolução da amortização' },
  { route: 'custo-clt', selector: 'extended-finance-calculator', button: 'Calcular custo CLT', resultState: 'results-chart', tableTitle: 'Evolução do custo CLT' },
] as const;

for (const calculator of calculators) {
  test(`${calculator.route}: simulation/output alignment from empty through monthly detail`, async ({ page }) => {
    await useBuiltPreview(page);
    const tool = page.locator(calculator.selector);
    for (const width of [1366, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/#/${calculator.route}`);
      await assertEmptyLayout(page, tool);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }

    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto(`/#/${calculator.route}`);
    await tool.getByRole('button', { name: calculator.button, exact: false }).click();
    const workspace = tool.locator('panel-workspace');
    await expect(workspace).toHaveAttribute('data-calculator-state', calculator.resultState);
    const summaryPanel = workspace.locator('[data-panel="summary"]');
    await expect(summaryPanel).toBeVisible();
    await expect(summaryPanel).not.toContainText('NaN');
    const tablePanel = workspace.locator('[data-panel="table"]');
    await expect(tablePanel).toBeVisible();
    let monthlyTable: Locator;
    if (calculator.route === 'calculadora' || calculator.route === 'juros-simples') {
      const summary = tool.locator('results-table summary');
      await summary.click();
      await expect(summary).toContainText(calculator.tableTitle);
      await expect(tool.locator('results-table summary small')).toHaveCount(0);
      monthlyTable = tool.locator('results-table table');
    } else if (calculator.route === 'price' || calculator.route === 'sac') {
      await expect(tool.locator('.loan-ledger-header h2')).toHaveText(calculator.tableTitle);
      await expect(tool.locator('.loan-ledger-header p')).toHaveCount(0);
      monthlyTable = tool.locator('.loan-ledger table');
    } else {
      await expect(tool.locator('.extended-table-top h2')).toHaveText(calculator.tableTitle);
      await expect(tool.locator('.extended-table-kicker,.extended-table-count')).toHaveCount(0);
      monthlyTable = tool.locator('.extended-table table');
    }
    const pagination = tool.locator('year-navigation');
    await expect(pagination).toBeVisible();
    await expect(pagination.getByRole('button', { name: 'Ano 1', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(pagination.getByText('PERÍODO CONSULTADO')).toHaveCount(0);
    await expect(pagination.getByLabel('Ir para o ano')).toHaveCount(0);
    const tableBox = await monthlyTable.boundingBox();
    const paginationBox = await pagination.boundingBox();
    expect(tableBox && paginationBox).toBeTruthy();
    expect(paginationBox!.y).toBeGreaterThanOrEqual(tableBox!.y + tableBox!.height);
    expect(paginationBox!.y - tableBox!.y - tableBox!.height).toBeLessThan(22);
    await pagination.getByRole('button', { name: 'Ano 2', exact: true }).click();
    await expect(pagination.getByRole('button', { name: 'Ano 2', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(monthlyTable.locator('tbody tr').first().locator('th').first()).toHaveText('13');

    for (const width of [1920, 1366, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['dark', 'light']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        const form = await workspace.locator('[data-panel="form"]').boundingBox();
        const summary = await workspace.locator('[data-panel="summary"]').boundingBox();
        const chart = calculator.resultState === 'results-chart'
          ? await workspace.locator('[data-panel="chart"]').boundingBox() : null;
        const table = await workspace.locator('[data-panel="table"]').boundingBox();
        const grid = await workspace.locator('.ws-grid').boundingBox();
        const debug = await workspace.locator('.ws-grid').evaluate(node => {
          const root = node as HTMLElement, formCell = root.querySelector<HTMLElement>('[data-panel="form"]');
          return { alignItems: getComputedStyle(root).alignItems, formGridRow: formCell && getComputedStyle(formCell).gridRow, formStyle: formCell?.getAttribute('style'), rows: getComputedStyle(root).gridTemplateRows };
        });
        expect(form && summary && table && grid).toBeTruthy();
        const resultBottom = chart ? chart.y + chart.height : summary!.y + summary!.height;
        if (width > 900) {
          expect(Math.abs(form!.y - summary!.y), JSON.stringify({ route: calculator.route, width, theme, form, summary, chart, scrollY: await page.evaluate(() => scrollY) })).toBeLessThan(3);
          expect(Math.abs(form!.y + form!.height - resultBottom), JSON.stringify({ width, form, summary, chart, resultBottom, debug })).toBeLessThan(3);
          expect(Math.abs(table!.x - grid!.x)).toBeLessThan(3);
          expect(Math.abs(table!.width - grid!.width)).toBeLessThan(3);
          expect(table!.y).toBeGreaterThanOrEqual(resultBottom - 1);
          expect(table!.y - resultBottom).toBeLessThan(24);
        } else {
          expect(summary!.y).toBeGreaterThanOrEqual(form!.y + form!.height - 1);
          if (chart) expect(chart.y).toBeGreaterThanOrEqual(summary!.y + summary!.height - 1);
          expect(table!.y).toBeGreaterThanOrEqual((chart?.y ?? summary!.y) + (chart?.height ?? summary!.height) - 1);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
        if (process.env.CAPTURE_CALCULATOR_LAYOUTS === '1' && [390, 1366].includes(width)) {
          const directory = path.resolve('test-results/calculator-alignment');
          fs.mkdirSync(directory, { recursive: true });
          await workspace.locator('.ws-grid').screenshot({ path: path.join(directory, `${calculator.route}-${width}-${theme}.png`) });
        }
      }
    }
  });
}

test('year pagination stays compact for 50 years and exposes every page', async ({ page }) => {
  await useBuiltPreview(page);
  await page.goto('/#/calculadora');
  const calculator = page.locator('compound-calculator');
  await calculator.getByRole('button', { name: 'Simular investimento' }).click();
  const results = calculator.locator('results-table');
  await calculator.locator('results-table summary').click();
  await results.evaluate(element => {
    (element as HTMLElement & { rows: unknown[] }).rows = Array.from({ length: 600 }, (_, index) => ({
      month: index + 1, deposit: '100', interest: '10', invested: String((index + 1) * 100), balance: String((index + 1) * 110),
    }));
  });
  const pagination = calculator.locator('year-navigation');
  await expect(pagination.getByRole('button', { name: 'Ano 50', exact: true })).toBeVisible();
  await expect(pagination.locator('.year-page-jump')).toHaveCount(1);
  expect(await pagination.getByRole('button').allTextContents()).toEqual(['1', '2', '3', '4', '…', '50']);
  const year25 = pagination.getByRole('button', { name: 'Ano 25', exact: true });
  for (let index = 0; index < 8; index++) {
    if (await year25.count()) {
      if (await year25.getAttribute('aria-current') === 'page') break;
      await year25.click();
    } else await pagination.locator('.year-page-jump').last().click();
  }
  await expect(year25).toHaveAttribute('aria-current', 'page');
  expect(await pagination.getByRole('button').allTextContents()).toEqual(['1', '…', '24', '25', '26', '…', '50']);
  await expect(pagination.locator('.year-page-jump')).toHaveCount(2);
  await pagination.getByRole('button', { name: 'Ano 50', exact: true }).click();
  await expect(results.locator('tbody tr').first().locator('th')).toHaveText('589');

  await page.goto('/#/custo-clt');
  const clt = page.locator('extended-finance-calculator');
  await clt.getByRole('button', { name: 'Calcular custo CLT' }).click();
  const fiveYearPagination = clt.locator('year-navigation');
  expect(await fiveYearPagination.getByRole('button').allTextContents()).toEqual(['1', '2', '3', '4', '5']);
  await expect(fiveYearPagination.locator('.year-page-jump')).toHaveCount(0);
  await fiveYearPagination.getByRole('button', { name: 'Ano 3', exact: true }).click();
  await expect(clt.locator('.extended-table tbody tr').first().locator('th')).toHaveText('25');
});
