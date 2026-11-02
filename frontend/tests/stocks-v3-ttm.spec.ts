import {test,expect} from '@playwright/test';

test('indicative TTM uses actual CVM filings and keeps stock balances unavailable',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.route('https://s3.tradingview.com/**',route=>route.abort());
  await page.route('https://widgets.tradingview-widget.com/**',route=>route.abort());
  await page.goto('/#/acoes/PETR4');
  await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toBeVisible();
  await page.getByLabel('Frequência',{exact:true}).selectOption('ttm');
  await expect(page.getByLabel('Referência',{exact:true})).toHaveValue('2026-06-30');
  await expect(page.locator('financial-analysis')).toContainText('TTM indicativo');
  await expect(page.locator('.financial-metrics')).toContainText('133,76');
  await expect(page.locator('financial-analysis').getByRole('link',{name:'DFP anual'})).toHaveAttribute('href',/rad\.cvm\.gov\.br/);
  await expect(page.locator('financial-analysis').getByRole('link',{name:'ITR atual'})).toHaveAttribute('href',/rad\.cvm\.gov\.br/);
  await page.getByRole('button',{name:'Balanço patrimonial',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toContainText('Não disponível');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('bank TTM has no artificial industrial revenue or margin',async({page})=>{
  await page.goto('/#/acoes/ITUB4');
  await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toBeVisible();
  await page.getByLabel('Frequência',{exact:true}).selectOption('ttm');
  await expect(page.locator('.financial-metrics')).toContainText('Lucro líquido');
  await expect(page.locator('.financial-metrics')).toContainText('Não disponível');
});
