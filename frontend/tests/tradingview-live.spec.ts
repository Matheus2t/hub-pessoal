import { test, expect } from '@playwright/test';

// Opt-in, unmocked provider inspection. Screenshots must also be reviewed by a human:
// an iframe/canvas existing alone does not prove that a licensed quote was rendered.
test('official TradingView widgets render all four B3 symbols (live)', async ({ page }, info) => {
  test.skip(process.env.TV_LIVE !== '1', 'Enable TV_LIVE=1 for real external-provider inspection.');
  test.setTimeout(180000);
  const errors: string[] = [];
  let brapiRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Optional analytics must remain blocked by our CSP. This specific third-party
    // telemetry attempt is not a widget failure; all other console errors still fail.
    const blockedTelemetry = text.startsWith("Connecting to 'https://snowplow-pixel.tradingview.com/com.tradingview/track'")
      && text.includes('violates the following Content Security Policy directive:')
      && text.includes('connect-src') && text.includes('The action has been blocked.');
    if (!blockedTelemetry) errors.push(text);
  });
  page.on('request', request => { if (request.url().includes('/api/market/')) brapiRequests++; });
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.goto('/#/acoes');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).not.toHaveAttribute('content', /snowplow-pixel/);
  await expect(page.locator('tv-tickers')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('tradingview-widget [role="status"]')).toHaveCount(0, { timeout: 30000 });
  await page.waitForTimeout(4000); // Allow the provider's private datafeed to paint; no values are read.
  await page.screenshot({ path: info.outputPath('tickers-real-desktop.png') });
  for (const symbol of ['ITUB4', 'PETR4', 'VALE3', 'MGLU3']) {
    await page.goto(`/#/acoes/${symbol}`);
    const frame = page.getByTitle(`TradingView — ${symbol}`);
    await expect(frame).toBeVisible({ timeout: 30000 });
    await expect(page.frameLocator(`iframe[title="TradingView — ${symbol}"]`).locator('canvas').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.tv-mount iframe')).toHaveCount(1);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: info.outputPath(`${symbol}-real-desktop.png`) });
    if (symbol === 'ITUB4') {
      await page.frameLocator('iframe[title="TradingView — ITUB4"]').getByRole('button', { name: '1M', exact: true }).click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: info.outputPath('ITUB4-real-1month.png') });
      await page.frameLocator('iframe[title="TradingView — ITUB4"]').getByRole('button', { name: '3M', exact: true }).click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: info.outputPath('ITUB4-real-3months.png') });
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#/acoes/PETR4');
  await expect(page.getByTitle('TradingView — PETR4')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: 'Ativar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('tradingview-widget [role="status"]')).toHaveCount(0, { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: info.outputPath('PETR4-real-mobile-light.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/#/acoes');
  await expect(page.locator('tv-tickers')).toHaveAttribute('direction', 'vertical', { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.locator('.tv-tickers').screenshot({ path: info.outputPath('tickers-real-mobile-light.png') });
  expect(brapiRequests).toBe(0);
  expect(errors).toEqual([]);
});
