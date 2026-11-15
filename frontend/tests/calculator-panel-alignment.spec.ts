import { test, expect, type Page } from '@playwright/test';
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
  { route: 'calculadora', selector: 'compound-calculator', button: 'Simular investimento', resultState: 'results-chart' },
  { route: 'juros-simples', selector: 'finance-calculator', button: 'Calcular', resultState: 'results-chart' },
  { route: 'price', selector: 'finance-calculator', button: 'Calcular', resultState: 'results-summary' },
  { route: 'sac', selector: 'finance-calculator', button: 'Calcular', resultState: 'results-summary' },
  { route: 'aposentadoria', selector: 'extended-finance-calculator', button: 'Projetar aposentadoria', resultState: 'results-chart' },
  { route: 'aluguel-vs-financiamento', selector: 'extended-finance-calculator', button: 'Comparar cenários', resultState: 'results-chart' },
  { route: 'amortizacao', selector: 'extended-finance-calculator', button: 'Simular amortização', resultState: 'results-chart' },
  { route: 'custo-clt', selector: 'extended-finance-calculator', button: 'Calcular custo CLT', resultState: 'results-chart' },
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
    await expect(workspace.locator('[data-panel="table"]')).toBeVisible();

    for (const width of [1920, 1366, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['dark', 'light']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
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
          expect(Math.abs(form!.y - summary!.y)).toBeLessThan(3);
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
