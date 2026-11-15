import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const buildRoot = path.resolve('dist');
const origin = new URL(process.env.BASE_URL || 'http://127.0.0.1:8123').origin;
const contentTypes: Record<string, string> = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
};

const pages = [
  { id: 'overview', route: '#/acoes', heading: 'Mercado de Ações' },
  { id: 'company', route: '#/acoes/PETR4', heading: 'PETR4' },
  { id: 'comparison', route: '#/acoes/comparar', heading: 'Comparação financeira' },
  { id: 'rankings', route: '#/acoes/rankings', heading: 'Rankings por setor' },
  { id: 'contributions', route: '#/acoes/aportes', heading: 'Simulador de aportes em ações' },
  { id: 'distributions', route: '#/acoes/proventos', heading: 'Proventos' },
  { id: 'yield', route: '#/acoes/dy', heading: 'DY — simulação manual' },
  { id: 'simulator', route: '#/acoes/simulador-dividendos', heading: 'Simulador de proventos anunciados' },
] as const;

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
  await page.route('https://widgets.tradingview-widget.com/w/br/tv-*.js', route => {
    const tag = new URL(route.request().url()).pathname.split('/').pop()!.replace('.js', '');
    return route.fulfill({ contentType: 'text/javascript', body: `if(!customElements.get('${tag}'))customElements.define('${tag}',class extends HTMLElement{});` });
  });
  await page.route('https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js', route => route.fulfill({
    contentType: 'text/javascript', body: "const f=document.createElement('iframe');f.title='TradingView preview';f.style.cssText='width:100%;height:100%;border:0;background:#0c0c0c';document.currentScript.parentElement.querySelector('.tradingview-widget-container__widget').appendChild(f);",
  }));
  await page.route('https://www.tradingview-widget.com/embed-widget/**', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#0c0c0c;color:#aaa;font:13px sans-serif">TradingView preview</body></html>',
  }));
}

for (const width of [1920, 1366, 1024, 768, 390, 320]) {
  for (const theme of ['dark', 'light'] as const) {
    test(`Mercado de Ações mantém layout ${theme} sem overflow em ${width}px`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await useBuiltPreview(page);
      await page.goto(`${origin}/`);
      if (theme === 'light') await page.getByRole('button', { name: 'Ativar tema claro' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      for (const view of pages) {
        await page.goto(`${origin}/${view.route}`);
        await expect(page.getByRole('heading', { name: view.heading, exact: true })).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view.id} overflowed at ${width}px`).toBe(true);

        if (view.id === 'overview') {
          const directory = page.locator('.market-directory-toggle');
          await directory.click();
          await expect(page.locator('.stock-directory .stock-item')).toHaveCount(65);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
        if (view.id === 'company') {
          await page.getByRole('button', { name: 'Consultar dados CVM' }).click();
          await expect(page.locator('.financial-metrics')).toBeVisible();
          await expect(page.getByRole('group', { name: 'Tipo de gráfico' })).toBeVisible();
          await expect(page.getByText('Classificação setorial editorial')).toHaveCount(0);
          await expect(page.locator('.financial-controls > .financial-control')).toHaveCount(2);
          await expect(page.getByLabel('Frequência', { exact: true })).toBeVisible();
          await expect(page.getByLabel('Referência', { exact: true })).toBeVisible();
          await expect(page.locator('.financial-metrics > div')).toHaveCount(6);
          const companyGrid = await page.locator('panel-workspace[area="actions-company"]').evaluate(host => {
            const root = host.shadowRoot!;
            return ['chart', 'financial', 'company'].map(id => {
              const cell = root.querySelector<HTMLElement>(`.ws-cell[data-panel="${id}"]`)!;
              const style = getComputedStyle(cell);
              return { id, start: style.gridColumnStart, end: style.gridColumnEnd };
            });
          });
          expect(companyGrid.find(cell => cell.id === 'chart')?.end).toBe('-1');
          expect(companyGrid.find(cell => cell.id === 'financial')?.start).toBe('1');
          expect(companyGrid.find(cell => cell.id === 'financial')?.end).toBe('-1');
        }
        if (view.id === 'distributions') {
          const columnCount = await page.locator('.dp-filter-fields').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
          expect(columnCount).toBe(width > 1100 ? 4 : width <= 360 ? 1 : 2);
          if (width > 360 && width <= 580) {
            const spans = await page.locator('.dp-filter-fields .distribution-basis, .dp-filter-fields .distribution-date-nature').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).gridColumnEnd));
            expect(spans).toEqual(['-1', '-1']);
          }
        }
        if (view.id === 'simulator') {
          const columnCount = await page.locator('.distributions form.rf-panel .rf-fields').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
          expect(columnCount).toBe(width > 900 ? 4 : width <= 360 ? 1 : 2);
        }
        if (process.env.CAPTURE_MARKET_REVIEW === '1' && [1366, 390].includes(width)) {
          await page.screenshot({
            path: info.outputPath(`${view.id}-${theme}-${width}.png`),
            fullPage: true,
            animations: 'disabled',
          });
        }
      }
    });
  }
}
