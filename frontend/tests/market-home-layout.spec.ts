import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

if (process.env.MARKET_SCROLL_BROWSER_PATH) {
  test.use({ launchOptions: { executablePath: process.env.MARKET_SCROLL_BROWSER_PATH } });
}

const buildRoot = path.resolve('dist');
const origin = new URL(process.env.BASE_URL || 'http://127.0.0.1:8123').origin;
const contentTypes: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };

async function serveBuiltFiles(page: import('@playwright/test').Page) {
  await page.route(`${origin}/**`, route => {
    const url = new URL(route.request().url());
    let file = path.resolve(buildRoot, `.${decodeURIComponent(url.pathname)}`);
    if (file !== buildRoot && !file.startsWith(`${buildRoot}${path.sep}`)) return route.fulfill({ status: 403, body: '' });
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: contentTypes[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
}

async function useTradingViewFixtures(page: import('@playwright/test').Page) {
  await page.route('https://widgets.tradingview-widget.com/w/br/*.js', route => {
    const tag = new URL(route.request().url()).pathname.split('/').pop()!.replace('.js', '');
    const body = tag === 'tv-tickers'
      ? `if(!customElements.get('tv-tickers'))customElements.define('tv-tickers',class extends HTMLElement{connectedCallback(){this.style.cssText='display:grid;gap:2px;min-width:0';this.innerHTML=this.getAttribute('symbols').split(',').map(s=>'<div style="padding:10px;border-bottom:1px solid #555">'+s.split(':').pop()+'</div>').join('');}});`
      : `if(!customElements.get('${tag}'))customElements.define('${tag}',class extends HTMLElement{connectedCallback(){this.style.cssText='display:block;min-height:500px;padding:12px;border:1px solid #555';this.textContent='TradingView · ${tag}';}});`;
    return route.fulfill({ contentType: 'text/javascript', body });
  });
}

for (const width of [1920, 1366, 1024, 768, 390, 320]) {
  for (const theme of ['dark', 'light'] as const) {
    test(`homepage Ações composta em ${width}px · ${theme}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await serveBuiltFiles(page);
      await useTradingViewFixtures(page);
      await page.goto('/#/');
      if (theme === 'light') await page.getByRole('button', { name: 'Ativar tema claro' }).click();
      await page.goto('/#/acoes');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const workspace = page.locator('panel-workspace[area="actions-overview"]');
      const chart = workspace.locator('[data-panel="chart"]');
      const quotes = workspace.locator('[data-panel="quotes"]');
      const panorama = workspace.locator('[data-panel="panorama"]');
      await expect(page.locator('tv-advanced-chart')).toHaveAttribute('symbol', 'BMFBOVESPA:IBOV');
      await expect(page.locator('.market-home-tools nav a')).toHaveCount(5);
      await expect(page.locator('.market-home-tools nav')).toHaveAttribute('aria-label', 'Ferramentas de análise');
      expect(await page.locator('.market-home-tools nav a').evaluateAll(nodes => nodes.map(node => (node as HTMLAnchorElement).getAttribute('href')))).toEqual([
        '#/acoes/comparar', '#/acoes/rankings', '#/acoes/aportes', '#/acoes/proventos', '#/acoes/dy',
      ]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      const chartBox = await chart.boundingBox();
      const quotesBox = await quotes.boundingBox();
      const panoramaBox = await panorama.boundingBox();
      expect(chartBox && quotesBox && panoramaBox).toBeTruthy();
      if (width > 900) {
        expect(chartBox!.x).toBeLessThan(quotesBox!.x);
        expect(Math.abs(chartBox!.y - quotesBox!.y)).toBeLessThan(4);
        expect(Math.abs(chartBox!.y + chartBox!.height - (panoramaBox!.y + panoramaBox!.height))).toBeLessThan(115);
      } else {
        expect(chartBox!.y).toBeLessThan(quotesBox!.y);
        expect(quotesBox!.y).toBeLessThan(panoramaBox!.y);
        expect(Math.abs(chartBox!.x - quotesBox!.x)).toBeLessThan(4);
      }
      await page.screenshot({ path: info.outputPath(`acoes-home-${theme}-${width}.png`), fullPage: true, animations: 'disabled' });

      await expect(page.locator('tv-market-overview')).toHaveCount(0);
      await page.locator('.market-home-panorama summary').click();
      await expect(page.locator('tv-market-overview')).toHaveAttribute('symbol-sectors', /BMFBOVESPA:IBOV/);
      await expect(workspace).toHaveAttribute('panorama-open', '');
      const expandedChart = await chart.boundingBox();
      const expandedQuotes = await quotes.boundingBox();
      const expandedPanorama = await panorama.boundingBox();
      expect(expandedChart && expandedQuotes && expandedPanorama).toBeTruthy();
      if (width > 900) {
        // The quote rail and main chart should end together, without the empty strip seen on desktop.
        expect(Math.abs((expandedQuotes!.y + expandedQuotes!.height) - (expandedChart!.y + expandedChart!.height))).toBeLessThan(4);
        const quotePanel = await page.locator(".market-home-watchlist").boundingBox();
        const quoteFrame = await page.locator(".market-quotes-frame").boundingBox();
        expect(quotePanel && quoteFrame).toBeTruthy();
        expect(quoteFrame!.y + quoteFrame!.height).toBeLessThan(quotePanel!.y + quotePanel!.height);
        // The open panorama should be a full-width row, not a tall right rail leaving a blank area.
        const firstRowBottom = Math.max(expandedChart!.y + expandedChart!.height, expandedQuotes!.y + expandedQuotes!.height);
        expect(expandedPanorama!.y).toBeGreaterThanOrEqual(firstRowBottom);
        expect(expandedPanorama!.y - firstRowBottom).toBeLessThan(32);
        expect(Math.abs(expandedPanorama!.x - expandedChart!.x)).toBeLessThan(4);
        expect(Math.abs(expandedPanorama!.width - (expandedQuotes!.x + expandedQuotes!.width - expandedChart!.x))).toBeLessThan(4);
      } else {
        expect(expandedPanorama!.y).toBeGreaterThan(expandedQuotes!.y);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('.market-home-panorama summary').click();
      await expect(workspace).not.toHaveAttribute('panorama-open', '');
      await expect(page.locator('tv-market-overview')).toHaveCount(0);
      if (width > 900) {
        const restoredChart = await chart.boundingBox();
        const restoredQuotes = await quotes.boundingBox();
        expect(Math.abs(restoredChart!.y - restoredQuotes!.y)).toBeLessThan(4);
      }
      await page.locator('.market-directory-toggle').click();
      await expect(page.locator('.stock-item')).toHaveCount(65);
      await expect(page.getByLabel('Buscar ação', { exact: true })).toBeVisible();
      if (width > 930) {
        const fields = await page.evaluate(() => {
          const input = document.querySelector<HTMLInputElement>('#stock-search')!.getBoundingClientRect();
          const select = document.querySelector<HTMLSelectElement>('#stock-sector')!.getBoundingClientRect();
          return { input, select };
        });
        expect(fields.select.x).toBeGreaterThan(fields.input.right - fields.input.width * .2);
        expect(Math.abs(fields.select.y - fields.input.y)).toBeLessThan(8);
      }
      if (width <= 600) {
        const buttons = await page.locator('.market-directory-content .market-search button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()));
        expect(buttons).toHaveLength(2);
        expect(Math.abs(buttons[0].y - buttons[1].y)).toBeLessThan(3);
      }
      await page.getByLabel('Buscar ação', { exact: true }).fill('PETR4');
      await expect(page.locator('.stock-item')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
