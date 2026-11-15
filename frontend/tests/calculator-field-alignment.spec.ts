import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const origin = new URL(process.env.BASE_URL || 'http://127.0.0.1:8123').origin;
const mime: Record<string, string> = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

const calculators = [
  { route: 'calculadora', host: 'compound-calculator', grid: '.form-grid', action: 'Simular investimento' },
  { route: 'juros-simples', host: 'finance-calculator', grid: '.finance-fields', action: 'Calcular' },
  { route: 'price', host: 'finance-calculator', grid: '.finance-fields', action: 'Calcular' },
  { route: 'sac', host: 'finance-calculator', grid: '.finance-fields', action: 'Calcular' },
  { route: 'aposentadoria', host: 'extended-finance-calculator', grid: '.finance-extended-fields', action: 'Projetar aposentadoria' },
  { route: 'aluguel-vs-financiamento', host: 'extended-finance-calculator', grid: '.finance-extended-fields', action: 'Comparar cenários' },
  { route: 'amortizacao', host: 'extended-finance-calculator', grid: '.finance-extended-fields', action: 'Simular amortização' },
  { route: 'custo-clt', host: 'extended-finance-calculator', grid: '.finance-extended-fields', action: 'Calcular custo CLT' },
] as const;

async function serveBuild(page: Page) {
  await page.route(`${origin}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fallback();
    let file = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    if (file !== dist && !file.startsWith(`${dist}${path.sep}`)) return route.fulfill({ status: 403, body: '' });
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  const evolution = Array.from({ length: 24 }, (_, i) => ({
    month: i + 1, deposit: '300', interest: '10', invested: String(1000 + i * 300), balance: String(1010 + i * 310),
  }));
  await page.route('**/api/calculations/history', route => route.fulfill({ status: 200, json: [] }));
  await page.route('**/api/calculations', route => route.fulfill({ status: 200, json: {
    final_amount: '9000', total_invested: '8200', total_interest: '800', evolution,
  } }));
  await page.route('**/api/finance/simple', route => route.fulfill({ status: 200, json: {
    final_amount: '1120', total_invested: '1000', total_interest: '120', evolution,
  } }));
  for (const type of ['price', 'sac']) await page.route(`**/api/finance/${type}`, route => route.fulfill({ status: 200, json: {
    total_paid: '1066.19', total_interest: '66.19', first_payment: '88.85', last_payment: '88.85',
    schedule: evolution.map(row => ({ month: row.month, payment: '88.85', interest: '8.85', amortization: '80', balance: '500' })),
  } }));
}

test('calculator field labels align paired inputs across states, viewports and themes', async ({ page }) => {
  await serveBuild(page);
  const violations: unknown[] = [];

  for (const calculator of calculators) {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto(`/#/${calculator.route}`);
    const host = page.locator(calculator.host);
    const form = host.locator('.simulation-panel form');
    const grid = form.locator(calculator.grid).first();

    for (const state of ['empty', 'results'] as const) {
      if (state === 'results') await form.getByRole('button', { name: calculator.action }).click();
      for (const width of [1920, 1366, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const theme of ['dark', 'light']) {
          await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
          const fields = await grid.locator(':scope > form-field:visible').evaluateAll(nodes => nodes.map(node => {
            const host = node as HTMLElement;
            const label = host.querySelector('label');
            const input = host.querySelector('.field-input');
            const hostRect = host.getBoundingClientRect();
            const inputRect = input?.getBoundingClientRect();
            return {
              label: label?.textContent?.trim() || '', x: hostRect.x, y: hostRect.y,
              inputTop: inputRect?.top ?? 0, inputBottom: inputRect ? inputRect.bottom : 0,
            };
          }));
          const rows: typeof fields[] = [];
          for (const field of fields) {
            const row = rows.find(items => Math.abs(items[0].y - field.y) < 2);
            if (row) row.push(field); else rows.push([field]);
          }
          for (const row of rows.filter(items => items.length > 1)) {
            const topSpread = Math.max(...row.map(field => field.inputTop)) - Math.min(...row.map(field => field.inputTop));
            const bottomSpread = Math.max(...row.map(field => field.inputBottom)) - Math.min(...row.map(field => field.inputBottom));
            if (topSpread > 2 || bottomSpread > 2) violations.push({ route: calculator.route, state, width, theme, topSpread, bottomSpread, row });
          }
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
          if (overflow) violations.push({ route: calculator.route, state, width, theme, overflow: true });
          if (state === 'results' && width === 1366 && theme === 'dark') {
            const workspace = host.locator('panel-workspace');
            const formBox = await workspace.locator('[data-panel="form"]').boundingBox();
            const summaryBox = await workspace.locator('[data-panel="summary"]').boundingBox();
            const chartBox = calculator.route === 'price' || calculator.route === 'sac'
              ? null : await workspace.locator('[data-panel="chart"]').boundingBox();
            if (!formBox || !summaryBox) {
              violations.push({ route: calculator.route, state, width, theme, formBox, summaryBox, panelAlignment: false });
            } else {
              const resultBottom = chartBox ? chartBox.y + chartBox.height : summaryBox.y + summaryBox.height;
              if (Math.abs(formBox.y - summaryBox.y) > 2 || Math.abs(formBox.y + formBox.height - resultBottom) > 3) {
                violations.push({ route: calculator.route, state, width, theme, formBox, summaryBox, chartBox, resultBottom, panelAlignment: false });
              }
            }
          }
          if (state === 'results' && theme === 'dark' && [1366, 390].includes(width)) {
            const folder = path.resolve('test-results/calculator-field-alignment');
            fs.mkdirSync(folder, { recursive: true });
            await host.screenshot({ path: path.join(folder, `${calculator.route}-${width}-${state}-after.png`) });
          }
        }
      }
    }
  }

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
