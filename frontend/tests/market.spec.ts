import { test, expect } from '@playwright/test';

// Isolated HTTP fixtures for interaction/error coverage, never shipped as app data.
for (const width of [1366, 390, 320]) {
  test(`market UI with isolated API fixtures at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const ranges: string[] = [];
    await page.route('**/api/market/**', async route => {
      const url = new URL(route.request().url());
      let body: unknown;
      if (url.pathname.endsWith('/status')) body = { available: true, extended_symbols: false };
      else if (url.pathname.endsWith('/search')) body = [{ symbol: 'ITUB4', name: 'Itaú Unibanco' }];
      else if (url.pathname.includes('/history/')) { ranges.push(url.searchParams.get('range')!); body = { points: [{ date: '2026-10-28T15:00:00Z', close: 20 }, { date: '2026-10-29T15:00:00Z', close: 21 }, { date: '2026-10-30T15:00:00Z', close: 19 }] }; }
      else if (url.pathname.includes('ABCD3')) { await route.fulfill({ status: 404, json: { detail: 'Ação não encontrada.' } }); return; }
      else body = { symbol: 'ITUB4', name: 'Itaú Unibanco', price: 19, change: -2, change_percent: -9.52, quoted_at: '2026-10-30T15:00:00Z', fetched_at: '2026-10-30T16:00:00Z', open: 21, high: 22, low: 18, volume: 1000, market_cap: null, previous_close: 21 };
      await route.fulfill({ json: body });
    });
    await page.goto('/#/acoes');
    await expect(page.getByRole('heading', { name: 'Mercado de Ações', exact: true })).toBeVisible();
    await expect(page.locator('.stock-item')).toContainText('R$ 19,00');
    await page.getByLabel('Buscar ação', { exact: true }).fill('itub4');
    await expect(page.getByLabel('Buscar ação', { exact: true })).toHaveValue('ITUB4');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page).toHaveURL(/#\/acoes\/ITUB4$/);
    await expect(page.locator('.stock-price')).toContainText('19,00');
    await expect(page.locator('.stock-quote')).toContainText('não são cotações em tempo real');
    await expect(page.locator('.stock-facts')).toContainText('Não disponível');
    await expect(page.locator('.stock-line')).toHaveAttribute('d', /^M/);
    await page.getByRole('button', { name: '3 meses', exact: true }).click();
    await expect.poll(() => ranges).toEqual(['1mo', '3mo']);
    await page.getByRole('button', { name: '7 dias', exact: true }).click();
    await expect.poll(() => ranges).toEqual(['1mo', '3mo', '7d']);
    const slider = page.getByRole('slider', { name: 'Data do histórico' });
    await slider.focus(); await page.keyboard.press('Home');
    await expect(page.locator('.stock-readout')).toContainText('28/10/2026');
    await page.keyboard.press('End');
    await expect(page.locator('.stock-readout')).toContainText('R$ 19,00');
    await expect(page.getByRole('tooltip')).toContainText('R$ 19,00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`market-${width}.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Ativar tema claro' }).click();
    await page.screenshot({ path: info.outputPath(`market-light-${width}.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: '← Voltar à lista de ações' }).click();
    await page.getByLabel('Buscar ação', { exact: true }).fill('Itaú');
    await expect(page.locator('.stock-suggestions')).toContainText('ITUB4');
    await page.getByLabel('Buscar ação', { exact: true }).fill('ABCD3');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Ação não encontrada');
  });
}

test('licensing restriction prevents quote requests in UI', async ({ page }) => {
  let requested = false;
  await page.route('**/api/market/**', async route => {
    if (!route.request().url().endsWith('/status')) requested = true;
    await route.fulfill({ json: { available: false, extended_symbols: false } });
  });
  await page.goto('/#/acoes/ITUB4');
  await expect(page.getByRole('status')).toContainText('Cotações públicas ainda não disponíveis');
  await expect(page.locator('.stock-price')).toHaveCount(0);
  expect(requested).toBe(false);
});

test('market routes, navigation and deployed public licensing gate', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link')).toHaveText(['Início', 'Calculadoras', 'Ações']);
  await page.getByRole('link', { name: 'Mercado de Ações Consultar ações da B3 →' }).click();
  await expect(page).toHaveURL(/#\/acoes$/);
  const status = await request.get('/api/market/status');
  expect(status.status()).toBe(200);
  const body = await status.json();
  if (!body.available) {
    await expect(page.getByRole('status')).toContainText('Cotações públicas ainda não disponíveis');
    expect((await request.get('/api/market/quote/ITUB4')).status()).toBe(503);
  }
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Calculadoras', exact: true }).click();
  await expect(page).toHaveURL(/#\/calculadoras$/);
  await expect(page.getByRole('heading', { name: 'Calculadoras', exact: true })).toBeVisible();
});
