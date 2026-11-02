import {test,expect} from '@playwright/test';
for(const width of [1920,1366,768,390,320]) test(`expanded CVM coverage ${width}`,async({page,request},info)=>{
 await page.setViewportSize({width,height:1000});
 const m=await(await request.get('/financials/manifest.json')).json();
 expect(Object.keys(m.companies)).toHaveLength(15);
 for(const symbol of ['ABEV3','B3SA3','RENT3','LREN3','SUZB3','EGIE3','CPFE3','VIVT3','VBBR3','PRIO3']){
  await page.goto('/#/acoes/'+symbol);await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toBeVisible();
  await expect(page.locator('financial-analysis')).toContainText(m.companies[symbol].cnpj);
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
 await expect(page.locator('financial-comparison table')).toContainText('ABEV3');
 await expect(page.locator('financial-comparison table')).toContainText('LREN3');
 await page.goto('/#/acoes/rankings');await expect(page.locator('market-rankings')).toContainText('15 emissores');
});
