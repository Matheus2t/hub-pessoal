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
