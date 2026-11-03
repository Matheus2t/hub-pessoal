import {test,expect} from '@playwright/test';

for (const width of [1366,768,390,320]){
 test('financial comparison redesign keeps CVM controls and tables at '+width,async({page})=>{
  await page.setViewportSize({width,height:960});
  await page.goto('/#/acoes/comparar');
  const compare=page.locator('financial-comparison');
  await expect(compare.getByRole('heading',{name:'Comparação financeira'})).toBeVisible();
  await expect(compare.getByRole('heading',{name:'Selecione as empresas'})).toBeVisible();
  await expect(compare.getByRole('heading',{name:'Resultados financeiros'})).toBeVisible();
  await expect(compare.getByRole('heading',{name:'Evolução financeira comparada'})).toBeVisible();
  const first=compare.getByLabel('Empresa 1',{exact:true});
  await expect(first).toHaveValue('PETR4');
  await expect(compare.getByLabel('Empresa 2',{exact:true})).toHaveValue('VALE3');
  await expect(compare.getByLabel('Exercício comum',{exact:true})).toHaveValue('2025-12-31');
  await expect(compare.locator('.cvm-indicators table tbody tr')).toHaveCount(8);
  await expect(compare.locator('.cvm-indicators table thead th')).toHaveCount(3);
  await expect(compare.locator('.cvm-chart-canvas svg')).toBeVisible();
  await expect(compare.locator('.cvm-chart-legend .cvm-legend-item')).toHaveCount(2);
  await expect(compare.locator('.cvm-documents a')).toHaveCount(2);
  await expect(compare.locator('.cvm-selection')).toHaveCSS('background-color','rgb(17, 17, 17)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await compare.getByLabel('Empresa 3',{exact:true}).selectOption('ITUB4');
  await expect(compare.locator('.cvm-indicators table thead th')).toHaveCount(4);
  await expect(compare.locator('.cvm-chart-legend .cvm-legend-item')).toHaveCount(3);
  await compare.getByLabel('Normalizar em base 100').check();
  await expect(compare.locator('.cvm-history-table caption')).toContainText('base 100');
  await compare.getByLabel('Indicador histórico').selectOption('revenue');
  await expect(compare.locator('.cvm-history-table caption')).toContainText('Receita');
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(compare.locator('.cvm-selection')).toHaveCSS('background-color','rgb(242, 242, 242)');
  const l=compare.locator('.cvm-table-scroll');
  await l.evaluate(el=>el.scrollLeft=999);
  expect(await l.evaluate(el=>el.scrollLeft)).toBeGreaterThanOrEqual(0);
 });
}

test('comparador mostra somente data final sob cada ticker no cabeçalho',async({page})=>{
 await page.goto('/#/acoes/comparar');
 const comparator=page.locator('financial-comparison');
 await comparator.getByLabel('Empresa 1',{exact:true}).selectOption('ITUB4');
 await comparator.getByLabel('Empresa 2',{exact:true}).selectOption('B3SA3');
 const headers=comparator.locator('.cvm-indicators .cvm-table thead th');
 await expect(headers).toHaveCount(3);
 await expect(headers.nth(1)).toHaveText('ITUB431/12/2025');
 await expect(headers.nth(2)).toHaveText('B3SA331/12/2025');
 for(const header of [headers.nth(1),headers.nth(2)]){
   await expect(header.locator('.cvm-period-caption')).toHaveCount(1);
   await expect(header).not.toContainText('Consolidado');
   await expect(header).not.toContainText('Individual');
   await expect(header).not.toContainText('2025-01-01');
 }
 await expect(comparator.locator('.cvm-indicators table tbody tr')).toHaveCount(8);
 await expect(comparator.getByRole('heading',{name:'Evolução financeira comparada'})).toBeVisible();
});
