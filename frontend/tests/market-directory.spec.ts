import {test,expect} from '@playwright/test';
import {stocks} from '../src/market-catalog';

for (const width of [1366,390]) test(`ações: catálogo recolhível e panorama amplo (${width}px)`, async ({page,request}) => {
  await page.setViewportSize({width,height:900});
  await page.route('https://widgets.tradingview-widget.com/w/br/tv-*.js', route => {
    const tag = route.request().url().split('/').pop()!.replace('.js','');
    return route.fulfill({contentType:'text/javascript',body:`if (!customElements.get('${tag}')) customElements.define('${tag}',class extends HTMLElement {});`});
  });
  await page.goto('/#/acoes');
  const workspace = page.locator('panel-workspace[area="actions-overview"]');
  await expect(workspace).toHaveAttribute('fixed-layout','');
  await expect(page.locator('.market-directory-toggle')).toContainText('Empresas');
  await expect(page.locator('.market-directory-toggle')).toContainText(String(stocks.length));
  await expect(page.locator('.market-search')).toHaveCount(0);
  await expect(page.locator('.stock-item')).toHaveCount(0);
  await expect(workspace.locator('[data-panel=panorama]')).toHaveAttribute('style',/span 12/);
  await page.locator('.market-panorama summary').click();
  await expect(page.locator('tv-market-overview')).toHaveAttribute('symbol-sectors',/BMFBOVESPA:IBOV/);
  const summary = await request.get('/financials/directory-summary.json');
  expect(summary.status()).toBe(200);
  const json = await summary.json();
  expect(Object.keys(json.companies)).toHaveLength(56);
  expect(json.companies.ITUB4.year).toBe('2025');
  expect(json.companies.ITUB4.profit).toBeGreaterThan(0);
  await page.locator('.market-directory-toggle').click();
  await expect(page.locator('.stock-item')).toHaveCount(stocks.length);
  await expect(page.locator('.stock-item').filter({hasText:'ITUB4'})).toContainText('2025');
  await page.getByLabel('Setor',{exact:true}).selectOption('Saúde');
  await expect(page.locator('.stock-item')).toHaveCount(4);
  await page.getByLabel('Buscar ação',{exact:true}).fill('fleury');
  await expect(page.locator('.stock-item')).toHaveCount(1);
  await page.locator('.market-directory-toggle').click();
  await expect(page.locator('.market-search')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
