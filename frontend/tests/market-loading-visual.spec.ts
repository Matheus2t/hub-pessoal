import { test, expect } from '@playwright/test';

for (const width of [1366, 390]) {
  test(`TradingView loading stays centered in its reserved panel at ${width}px`, async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => release = resolve);
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://widgets.tradingview-widget.com/w/br/*.js', async route => {
      await gate;
      await route.abort();
    });
    await page.route('https://s3.tradingview.com/**', route => route.abort());
    await page.goto('/#/acoes', { waitUntil: 'domcontentloaded' });

    const status = page.locator('market-embed .tv-loading').first();
    await expect(status).toBeVisible();
    const center = await status.evaluate(element => {
      const panel = element.closest('.tv-panel')!.getBoundingClientRect();
      const loading = element.getBoundingClientRect();
      return {
        x: Math.abs(loading.left + loading.width / 2 - (panel.left + panel.width / 2)),
        y: Math.abs(loading.top + loading.height / 2 - (panel.top + panel.height / 2)),
        panelHeight: panel.height,
      };
    });
    expect(center.panelHeight).toBeGreaterThan(400);
    expect(center.x).toBeLessThan(2);
    expect(center.y).toBeLessThan(2);

    release();
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o TradingView.' }).first()).toBeVisible();
  });
}
