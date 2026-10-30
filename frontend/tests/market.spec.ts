import { test, expect } from '@playwright/test';
import { findStock, searchStocks } from '../src/market-catalog';

test('local catalog resolves known companies and rejects unknown codes', () => {
  expect(findStock('itub4')?.tradingView).toBe('BMFBOVESPA:ITUB4');
  expect(searchStocks('itau')[0].symbol).toBe('ITUB4');
  expect(searchStocks('magazine')[0].symbol).toBe('MGLU3');
  expect(findStock('ABCD3')).toBeUndefined();
});

const tickersStub = `
  if (!customElements.get("tv-tickers")) customElements.define("tv-tickers", class extends HTMLElement {
    connectedCallback() { this.style.minHeight = "90px"; this.textContent = "TradingView test container"; }
    disconnectedCallback() { window.__tvDisposed = (window.__tvDisposed || 0) + 1; }
  });
`;
const overviewStub = `
  (() => {
  const frame = document.createElement("iframe");
  frame.src = "https://www.tradingview-widget.com/embed-widget/symbol-overview/?fixture=true";
  frame.style.cssText = "width:100%;height:100%;border:0";
  document.currentScript.parentElement.querySelector(".tradingview-widget-container__widget").appendChild(frame);
  })();
`;

// These stubs exercise our adapter and lifecycle; they contain no market prices.
for (const width of [1366, 390, 320]) {
  test(`TradingView adapter, search and themes at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    let brapiRequests = 0, tickerModules = 0;
    await page.route('**/api/market/**', route => { brapiRequests++; return route.abort(); });
    await page.route('https://widgets.tradingview-widget.com/w/br/tv-tickers.js', async route => {
      tickerModules++; await route.fulfill({ contentType: 'text/javascript', body: tickersStub });
    });
    await page.route('https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js', route =>
      route.fulfill({ contentType: 'text/javascript', body: overviewStub }));
    await page.route('https://www.tradingview-widget.com/embed-widget/**', route =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>TradingView test frame</title><p>Integration fixture</p>' }));
    await page.goto('/');
    expect(tickerModules).toBe(0);
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Ações', exact: true }).click();
    await expect(page.locator('tv-tickers')).toHaveAttribute('symbols', 'BMFBOVESPA:ITUB4,BMFBOVESPA:PETR4,BMFBOVESPA:VALE3,BMFBOVESPA:MGLU3');
    await expect(page.locator('.stock-item')).toHaveCount(4);
    await expect(page.locator('tv-tickers')).toHaveAttribute('direction', width < 700 ? 'vertical' : 'horizontal');
    await page.getByRole('button', { name: 'Ativar tema claro' }).click();
    await expect(page.locator('tv-tickers')).toHaveAttribute('theme', 'light');
    expect(tickerModules).toBe(1);
    await page.getByLabel('Buscar ação', { exact: true }).fill('itau');
    await expect(page.getByLabel('Buscar ação', { exact: true })).toHaveValue('ITAU');
    await expect(page.locator('.stock-suggestions')).toContainText('ITUB4');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page).toHaveURL(/#\/acoes\/ITUB4$/);
    await expect(page.getByRole('heading', { name: 'Itaú Unibanco', exact: true })).toBeVisible();
    await expect(page.getByTitle('TradingView — ITUB4')).toBeVisible();
    const config = () => page.locator('script[src*="embed-widget-symbol-overview.js"]').evaluate(el => JSON.parse(el.textContent || '{}'));
    expect((await config()).symbols[0][1]).toBe('BMFBOVESPA:ITUB4|1D');
    expect((await config()).dateRanges).toEqual(['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M']);
    expect((await config()).locale).toBe('br');
    await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
    await expect.poll(async () => (await config()).colorTheme).toBe('dark');
    await expect(page.locator('.tv-mount iframe')).toHaveCount(1);
    await expect(page.locator('.tradingview-widget-copyright a')).toContainText('TradingView');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`market-${width}.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: '← Voltar à lista de ações' }).click();
    await expect(page.locator('tv-tickers')).toBeAttached();
    expect(tickerModules).toBe(1);
    await page.getByLabel('Buscar ação', { exact: true }).fill('ABCD3');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Ação não encontrada no catálogo');
    expect(brapiRequests).toBe(0);
    await page.goto('/#/acoes/PETR4');
    await expect(page.getByTitle('TradingView — PETR4')).toBeVisible();
    await page.goto('/#/acoes/VALE3');
    await expect(page.getByTitle('TradingView — VALE3')).toBeVisible();
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Início', exact: true }).click();
    await expect(page.locator('tradingview-widget')).toHaveCount(0);
  });
}

test('external script failure has a fallback and retry', async ({ page }) => {
  await page.route('https://s3.tradingview.com/external-embedding/**', route => route.abort());
  await page.goto('/#/acoes/ITUB4');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o TradingView');
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await expect(page.locator('.tradingview-widget-copyright a')).toHaveAttribute('href', /tradingview.com/);
  await page.unroute('https://s3.tradingview.com/external-embedding/**');
  await page.route('https://s3.tradingview.com/external-embedding/**', route => route.fulfill({ contentType: 'text/javascript', body: overviewStub }));
  await page.route('https://www.tradingview-widget.com/embed-widget/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>TradingView test</title>' }));
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByTitle('TradingView — ITUB4')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.goto('/#/acoes/ABCD3');
  await expect(page.getByRole('heading', { name: 'Ação não encontrada', exact: true })).toBeVisible();
  await expect(page.locator('tradingview-widget')).toHaveCount(0);
});
test('brapi public distribution remains blocked and independent of widgets', async ({ request }) => {
  const status = await request.get('/api/market/status');
  expect(status.status()).toBe(200);
  expect((await status.json()).available).toBe(false);
  expect((await request.get('/api/market/quote/ITUB4')).status()).toBe(503);
});
