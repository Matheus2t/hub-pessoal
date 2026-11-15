import {test,expect} from '@playwright/test';

for (const width of [1920,1366,1024,768,390,320]){
 test('financial comparison redesign keeps CVM controls and tables at '+width,async({page},info)=>{
  await page.setViewportSize({width,height:960});
  await page.goto('/#/acoes/comparar');
  const compare=page.locator('financial-comparison');
  await expect(compare.getByRole('heading',{name:'Comparação financeira'})).toBeVisible();
  await expect(compare.getByRole('heading',{name:'Selecione as empresas'})).toBeVisible();
  await expect(compare.getByRole('heading',{name:'Resultados financeiros'})).toBeVisible();
  await expect(compare.getByRole('heading',{name:'Evolução financeira comparada'})).toBeVisible();
  const first=compare.getByLabel('Empresa 1',{exact:true});
  await expect(compare.locator('.cvm-chart-canvas svg')).toBeVisible();
  await page.locator('app-shell').evaluate(el=>el.querySelector<HTMLElement>('.skip-link')?.blur());
  await compare.locator('.financial-history').screenshot({path:info.outputPath(`comparison-${width}-dark.png`),animations:'disabled'});
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  await compare.locator('.financial-history').screenshot({path:info.outputPath(`comparison-${width}-light.png`),animations:'disabled'});
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');
  await expect(first).toHaveValue('PETR4');
  await expect(compare.getByLabel('Empresa 2',{exact:true})).toHaveValue('VALE3');
  await expect(compare.getByLabel('Exercício comum',{exact:true})).toHaveValue('2025-12-31');
  await expect(compare.locator('.cvm-indicators table tbody tr')).toHaveCount(8);
  await expect(compare.locator('.cvm-indicators table thead th')).toHaveCount(3);
  const years=await compare.locator('.cvm-chart-year').allTextContents();
  expect(years).toEqual(expect.arrayContaining(['2021','2025']));
  expect(await compare.locator('.cvm-chart-axis-label').count()).toBeGreaterThan(5);
  await expect(compare.locator('.cvm-chart-point')).toHaveCount(10);
  await expect(compare.getByLabel('Consultar exercício')).toBeVisible();
  await compare.getByLabel('Consultar exercício').fill('0');
  await expect(compare.locator('.cvm-chart-readout-date')).toContainText('2021-12-31');
  await compare.getByLabel('Consultar exercício').fill('4');
  await expect(compare.locator('.cvm-chart-readout-date')).toContainText('2025-12-31');
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
  await expect(compare.locator('.cvm-selection')).toHaveCSS('background-color','rgb(255, 255, 255)');
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

test('financial comparison preserves a visible break for an unavailable year',async({page,request})=>{
 const manifest=await(await request.get('/financials/manifest.json')).json();
 const file=manifest.companies.PETR4.path;
 const response=await request.get(`/financials/${file}`);
 const snapshot=await response.json();
 const missing=snapshot.periods.find((p:any)=>p.kind==='annual'&&p.end==='2023-12-31');
 expect(missing).toBeTruthy();
 missing.values.profit=null;
 await page.route(`**/${file}`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(snapshot)}));
 await page.goto('/#/acoes/comparar');
 const comparison=page.locator('financial-comparison');
 const path=comparison.locator('.cvm-series-1 .stock-line');
 await expect(path).toBeVisible();
 const segments=(await path.getAttribute('d')||'').match(/M/g)||[];
 expect(segments).toHaveLength(2);
 const row=comparison.locator('.cvm-history-table tbody tr').filter({hasText:'2023-12-31'});
 await expect(row.locator('td').first()).toHaveText('Não disponível');
});

test('single-company CVM chart keeps missing years in place and does not bridge them',async({page,request})=>{
 const manifest=await(await request.get('/financials/manifest.json')).json();
 const file=manifest.companies.PETR4.path;
 const snapshot=await(await request.get(`/financials/${file}`)).json();
 const missing=snapshot.periods.find((p:any)=>p.kind==='annual'&&p.end==='2023-12-31');
 expect(missing).toBeTruthy();
 missing.values.revenue=null;
 await page.route(`**/${file}`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(snapshot)}));
 await page.goto('/#/acoes/PETR4');
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 const analysis=page.locator('financial-analysis');
 const line=analysis.locator('.cvm-analysis-line');
 await expect(line).toBeVisible();
 expect(((await line.getAttribute('d'))||'').match(/M/g)||[]).toHaveLength(2);
 await analysis.getByLabel('Consultar período').fill('2');
 await expect(analysis.locator('.cvm-analysis-readout')).toContainText('Não disponível');
});

test('single-company chart represents real negative and positive values around zero',async({page})=>{
 await page.goto('/#/acoes/RENT3');
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 const analysis=page.locator('financial-analysis');
 await analysis.locator('#cvm-series').selectOption('operating_cash');
 const signedTicks=await analysis.locator('.cvm-analysis-chart .cvm-chart-axis-label').allTextContents();
 expect(signedTicks.some(value=>value.includes('-'))).toBe(true);
 expect(signedTicks.some(value=>!value.includes('-'))).toBe(true);
 await expect(analysis.locator('.cvm-chart-zero')).toHaveCount(1);
});
