import {test,expect} from '@playwright/test';

for(const width of [1366,768,390,320]) {
 test('DY manual redesigned: inputs, result and accessibility at '+width,async({page},info)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:900});
  await page.goto('/#/acoes/dy');
  const dy=page.locator('distributions-page .dy-page');
  await expect(dy.getByRole('heading',{name:'DY — simulação manual'})).toBeVisible();
  await expect(dy.locator('.dy-form')).toBeVisible();
  await expect(dy.locator('.dy-result')).toContainText('—%');
  await dy.getByLabel('Proventos brutos por ação no período (R$)').fill('2');
  await dy.getByLabel('Preço de referência informado (R$)').fill('40');
  await dy.getByLabel('Início do período de proventos').fill('2025-11-01');
  await dy.getByLabel('Fim do período de proventos').fill('2026-10-31');
  await dy.getByLabel('Data do preço informado').fill('2026-11-02');
  await dy.getByRole('button',{name:'Calcular DY manual'}).click();
  await expect(dy.getByRole('status')).toContainText('5%');
  await expect(dy).toContainText('Não é Dividend Yield atual de mercado');
  await dy.getByLabel('Proventos brutos por ação no período (R$)').fill('4');
  await expect(dy.getByRole('status')).toHaveCount(0);
  for (const theme of ['dark','light']) {
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:info.outputPath('dy-'+theme+'.png'),animations:'disabled'});
  }
  expect(errors).toEqual([]);
 });
 test('Proventos redesigned: filter table and calendar at '+width,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:900});
  await page.goto('/#/acoes/proventos');
  const listing=page.locator('distributions-page .dp-history');
  await expect(listing.getByRole('heading',{name:'Proventos',exact:true})).toBeVisible();
  await expect(listing.getByRole('heading',{name:'Filtrar proventos'})).toBeVisible();
  await expect(listing.getByRole('heading',{name:'Resultados da consulta'})).toBeVisible();
  await expect(listing.locator('.dp-results-content tbody tr')).toHaveCount(25);
  await expect(listing.locator('.dp-results-counter')).toContainText('26 registros');
  await listing.getByLabel('Empresa',{exact:true}).selectOption('PETR4');
  await expect(listing.locator('.dp-results-content tbody')).toContainText('PETR4');
  await listing.getByRole('button',{name:'Calendário',exact:true}).click();
  await expect(listing.locator('.distribution-month')).toBeVisible();
  for (const theme of ['dark','light']) {
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:info.outputPath('proventos-'+theme+'.png'),animations:'disabled'});
  }
  expect(errors).toEqual([]);
 });
}
