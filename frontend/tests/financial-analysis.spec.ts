import {test,expect} from '@playwright/test';

for(const width of [1366,390]) test(`CVM analysis and comparison work without TradingView at ${width}`,async({page,request},info)=>{
 await page.setViewportSize({width,height:1000});
 await page.route('https://s3.tradingview.com/**',route=>route.abort());
 await page.route('https://widgets.tradingview-widget.com/**',route=>route.abort());
 const manifest=await (await request.get('/financials/manifest.json')).json();
 expect(Object.keys(manifest.companies)).toHaveLength(5);
 for(const symbol of ['ITUB4','PETR4','VALE3','WEGE3','TOTS3']){
  await page.goto(`/#/acoes/${symbol}`);
  await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toBeVisible();
  await expect(page.getByLabel('Referência',{exact:true})).toHaveValue('2025-12-31');
  await expect(page.locator('financial-analysis')).toContainText(manifest.companies[symbol].cnpj);
  await expect(page.locator('financial-analysis')).toContainText('Consolidado');
  await page.getByRole('button',{name:'Balanço patrimonial',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toContainText('Não disponível');
  await page.getByRole('button',{name:'Indicadores',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toContainText('ROE');
  await page.getByLabel('Evolução',{exact:true}).selectOption('equity');
  await expect(page.locator('.financial-chart svg')).toBeVisible();
  await page.locator('.financial-chart circle').first().focus();
  await expect(page.locator('.financial-chart [role="status"]')).toContainText('2023-12-31');
  await page.getByLabel('Frequência',{exact:true}).selectOption('quarter');
  await expect(page.locator('.financial-metrics')).toContainText('Não disponível');
 }
 await page.locator('financial-analysis').scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`cvm-${width}-dark.png`)});
 await page.getByRole('button',{name:'Ativar tema claro'}).click();
 await page.screenshot({path:info.outputPath(`cvm-${width}-light.png`)});
 await page.goto('/#/acoes/ABEV3');await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 await expect(page.locator('financial-analysis')).toContainText('Não disponível para esta empresa');
 await page.goto('/#/acoes/comparar');
 await expect(page.locator('financial-comparison table')).toBeVisible();
 await expect(page.getByLabel('Empresa 1',{exact:true})).toHaveValue('PETR4');
 await expect(page.getByLabel('Exercício comum',{exact:true})).toHaveValue('2025-12-31');
 await page.getByLabel('Empresa 3',{exact:true}).selectOption('PETR4');
 await expect(page.locator('financial-comparison thead th')).toHaveCount(3);
 await page.getByLabel('Empresa 3',{exact:true}).selectOption('ITUB4');
 await expect(page.locator('financial-comparison thead th')).toHaveCount(4);
 await expect(page.locator('financial-comparison table')).toContainText('Não disponível');
 await page.screenshot({path:info.outputPath(`comparison-${width}.png`)});
});

test('CVM loading failure can be retried without external widgets',async({page})=>{
 await page.route('**/financials/manifest.json',route=>route.fulfill({status:503,body:'unavailable'}));
 await page.goto('/#/acoes/ITUB4');
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 await expect(page.locator('financial-analysis [role="alert"]')).toContainText('Não foi possível');
 await page.unroute('**/financials/manifest.json');
 await page.locator('financial-analysis').getByRole('button',{name:'Tentar novamente',exact:true}).click();
 await expect(page.locator('.financial-metrics')).toBeVisible();
});
