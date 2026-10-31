import { test, expect } from '@playwright/test';

test('panorama and advanced chart load only on demand and clean up', async ({ page }) => {
  await page.route('https://widgets.tradingview-widget.com/w/br/tv-*.js', route => {
    const tag = route.request().url().split('/').pop()!.replace('.js', '');
    return route.fulfill({ contentType: 'text/javascript', body: `customElements.define('${tag}',class extends HTMLElement {});` });
  });
  await page.goto('/#/acoes');
  await expect(page.locator('tv-market-overview')).toHaveCount(0);
  await page.locator('.market-panorama summary').click();
  await expect(page.locator('tv-market-overview')).toHaveAttribute('symbol-sectors', /BMFBOVESPA:IBOV/);
  await page.goto('/#/acoes/PETR4');
  await expect(page.locator('tv-advanced-chart')).toHaveCount(0);
  await page.getByRole('button', { name: 'Avançado', exact: true }).click();
  await expect(page.locator('tv-advanced-chart')).toHaveAttribute('symbol', 'BMFBOVESPA:PETR4');
  await expect(page.locator('tradingview-widget')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ativar tema claro' }).click();
  await expect(page.locator('tv-advanced-chart')).toHaveAttribute('theme', 'light');
  await page.getByRole('button', { name: 'Simples', exact: true }).click();
  await expect(page.locator('tv-advanced-chart')).toHaveCount(0);
  await expect(page.locator('tradingview-widget')).toHaveCount(1);
});

test('company sections are on demand and related companies exclude current symbol', async ({ page }) => {
  await page.route('https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js', route => route.fulfill({ contentType: 'text/javascript', body: "document.currentScript.parentElement.querySelector('.tradingview-widget-container__widget').appendChild(document.createElement('iframe'));" }));
  await page.route('https://widgets.tradingview-widget.com/w/br/tv-company-profile.js', route => route.fulfill({ contentType: 'text/javascript', body: "customElements.define('tv-company-profile',class extends HTMLElement {});" }));
  await page.route('https://s3.tradingview.com/external-embedding/embed-widget-financials.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto('/#/acoes/ITUB4');
  await expect(page.getByTitle('TradingView — ITUB4')).toBeAttached();
  await expect(page.locator('.related-companies a')).toHaveCount(4);
  await expect(page.locator('.related-companies')).not.toContainText('ITUB4');
  await expect(page.locator('tv-company-profile')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sobre a empresa', exact: true }).click();
  await expect(page.locator('tv-company-profile')).toHaveAttribute('symbol', 'BMFBOVESPA:ITUB4');
  await page.getByRole('button', { name: 'Fundamentos', exact: true }).click();
  await expect(page.locator('tv-company-profile')).toHaveCount(0);
  await expect.poll(() => page.locator('.tv-financials script').evaluate(el => JSON.parse(el.textContent || '{}').symbol)).toBe('BMFBOVESPA:ITUB4');
  await page.goto('/#/acoes/TOTS3');
  await expect(page.locator('.tv-financials')).toHaveCount(0);
  await expect(page.locator('.related-companies')).toContainText('Bemobi');
});
