import {test,expect} from '@playwright/test';
for(const width of [1920,1366,768,390,320]) test(`expanded CVM coverage ${width}`,async({page,request},info)=>{
 await page.setViewportSize({width,height:1000});
 const m=await(await request.get('/financials/manifest.json')).json();
 expect(Object.keys(m.companies)).toHaveLength(25);
 for(const symbol of ['ABEV3','B3SA3','RENT3','LREN3','SUZB3','EGIE3','CPFE3','VIVT3','VBBR3','PRIO3','CPLE3','EQTL3','CMIG3','GGBR3','MGLU3','ASAI3','FLRY3','HYPE3','DXCO3','CYRE3']){
  await page.goto('/#/acoes/'+symbol);await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toBeVisible();
  await expect(page.locator('financial-analysis')).toContainText(m.companies[symbol].cnpj);
  await expect(page.locator('#cvm-reference option')).toHaveCount(5);
  await page.getByLabel('Histórico',{exact:true}).selectOption('3');await expect(page.locator('.financial-chart circle')).toHaveCount(3);
  await page.getByLabel('Histórico',{exact:true}).selectOption('5');await expect(page.locator('.financial-chart circle')).toHaveCount(5);
 }
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('financial-analysis').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath(`cvm-${width}-${theme}.png`),animations:'disabled'});
 }
 await page.goto('/#/acoes/comparar');
 await page.getByLabel('Empresa 1',{exact:true}).selectOption('ABEV3');
 await page.getByLabel('Empresa 2',{exact:true}).selectOption('LREN3');
 await expect(page.locator('financial-comparison table').first()).toContainText('ABEV3');
 await expect(page.locator('financial-comparison table').first()).toContainText('LREN3');
 await expect(page.getByRole('heading',{name:'Evolução financeira comparada'})).toBeVisible();
 await expect(page.locator('financial-comparison .financial-chart tbody tr')).toHaveCount(5);
 await page.getByLabel('Normalizar em base 100').check();await expect(page.locator('financial-comparison .financial-chart caption')).toContainText('base 100');
 await page.goto('/#/acoes/rankings');await expect(page.locator('market-rankings')).toContainText('25 emissores');
});
