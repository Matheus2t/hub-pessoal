import {test,expect,type Page} from '@playwright/test';
async function fillCdb(page:Page){
 const f=page.locator('fixed-income-page > article > .rf-panel fixed-income-fields');
 await f.getByLabel('Valor aplicado').fill('10.000,00');await f.getByLabel('CDI anual').fill('12');await f.getByLabel('Percentual do CDI').fill('100');
 await f.getByLabel('Data da aplicação').fill('2027-01-01');await f.getByLabel('Vencimento',{exact:true}).fill('2028-01-01');return f;
}
for(const width of [1920,1366,768,390,320])test(`fixed income responsive and themes ${width}`,async({page},info)=>{
 const errors:string[]=[];const forbidden:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'||/api\.bcb|brapi|tradingview|tesourodireto|api\/sports/.test(r.url()))forbidden.push(r.url())});
 await page.setViewportSize({width,height:1000});await page.goto('/#/');await page.locator('home-page a[href="#/renda-fixa"]').click();
 await expect(page.getByRole('heading',{name:'Renda Fixa',exact:true})).toBeVisible();
 const f=await fillCdb(page);await expect(page.getByTestId('rf-net')).toHaveText(/10\.990,00/);
 const chart=page.locator('.rf-results fixed-income-chart');await chart.getByRole('slider').focus();await page.keyboard.press('Home');await expect(chart.locator('.rf-chart-legend')).toContainText('10.000,00');
 await page.locator('.rf-results fixed-income-evolution > details > summary').click();await expect(page.locator('.rf-results .rf-table tbody tr')).toHaveCount(13);
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`fixed-${width}-${theme}.png`),fullPage:true,animations:'disabled'});}
 await f.getByLabel('Investimento',{exact:true}).selectOption('lci');await expect(page.getByTestId('rf-net')).toHaveText(/11\.200,00/);
 await f.getByLabel('Vencimento',{exact:true}).fill('2027-02-01');await expect(page.locator('.rf-alert')).toContainText('seis meses');await expect(page.getByTestId('rf-net')).toHaveCount(0);
 expect(errors).toEqual([]);expect(forbidden).toEqual([]);
});
test('products, zero/negative rates, IOF, custody, real return and reset',async({page})=>{
 await page.goto('/#/renda-fixa');const f=await fillCdb(page);
 await f.getByLabel('Vencimento',{exact:true}).fill('2027-01-16');await expect(page.getByTestId('rf-net')).toHaveText(/10\.018,09/);await expect(page.locator('.rf-breakdown')).toContainText('23,34');
 await f.getByLabel('Investimento',{exact:true}).selectOption('lca');await f.getByLabel('Remuneração',{exact:true}).selectOption('fixed');await f.getByLabel('Taxa prefixada').fill('10');await f.getByLabel('Vencimento',{exact:true}).fill('2028-01-01');await expect(page.getByTestId('rf-net')).toHaveText(/11\.000,00/);
 await f.getByLabel('Investimento',{exact:true}).selectOption('selic');await f.getByLabel('Selic anual').fill('0');await expect(page.getByTestId('rf-net')).toHaveText(/10\.000,00/);
 await f.getByText('Custos e condições',{exact:true}).click();await f.getByLabel('Outros títulos Tesouro Selic').fill('5000');await expect(page.getByTestId('rf-net')).toHaveText(/9\.990,00/);
 await f.getByLabel('Investimento',{exact:true}).selectOption('ipca');await f.getByLabel('IPCA anual').fill('4');await f.getByLabel('Taxa real acima do IPCA').fill('6');await f.getByLabel('Custódia B3').fill('0');
 await expect(page.getByTestId('rf-net')).toHaveText(/10\.844,80/);await expect(page.locator('.rf-results')).toContainText('Poder de compra');await expect(page.locator('.rf-assumptions')).toContainText('não é calculada');
 await f.getByLabel('Investimento',{exact:true}).selectOption('cdb');await f.getByLabel('CDI anual').fill('-5');await expect(page.getByTestId('rf-net')).toHaveText(/9\.500,00/);
 await f.getByLabel('CDI anual').fill('0');await expect(page.getByTestId('rf-net')).toHaveText(/10\.000,00/);
 await page.getByRole('button',{name:'Limpar',exact:true}).click();await expect(page.getByTestId('rf-net')).toHaveCount(0);await expect(f.getByLabel('Valor aplicado')).toHaveValue('');
});
test('comparison uses common dates, handles early maturity and locked IPCA honestly',async({page},info)=>{
 await page.goto('/#/renda-fixa');await page.locator('.rf-comparison-section > summary').click();const c=page.locator('fixed-income-comparison');
 await c.getByLabel('Valor inicial comum').fill('10000');await c.getByLabel('Data inicial comum').fill('2027-01-01');await c.getByLabel('Horizonte de comparação').fill('2028-01-01');await c.getByLabel('CDI anual comum').fill('12');
 const s1=c.getByRole('region',{name:'Cenário 1',exact:true}),s2=c.getByRole('region',{name:'Cenário 2',exact:true});
 await expect(s2.getByLabel('Investimento',{exact:true})).toHaveValue('lci');
 await s1.getByLabel('Percentual do CDI').fill('100');await s2.getByLabel('Percentual do CDI').fill('90');await expect(c.locator('.rf-comparison-table tbody tr')).toHaveCount(2);await expect(c.locator('.rf-comparison-table')).toContainText('10.990,00');
 await s1.getByLabel('Vencimento',{exact:true}).fill('2027-07-01');await expect(c.locator('.rf-comparison-table')).toContainText('Vence antes do horizonte; sem reinvestimento');
 await c.getByRole('button',{name:'Adicionar cenário'}).click();const s3=c.getByRole('region',{name:'Cenário 3',exact:true});await s3.getByLabel('Investimento',{exact:true}).selectOption('ipca');await s3.getByLabel('Taxa real acima do IPCA').fill('6');await c.getByLabel('IPCA anual comum').fill('4');await s3.getByLabel('Vencimento',{exact:true}).fill('2029-01-01');
 await expect(c.locator('.rf-comparison-table')).toContainText('Curva; venda não estimada');
 await c.getByRole('button',{name:'Adicionar cenário'}).click();await expect(c.getByRole('button',{name:'Adicionar cenário'})).toBeDisabled();await c.getByRole('region',{name:'Cenário 4',exact:true}).getByRole('button',{name:'Remover cenário 4'}).click();
 await expect(c.locator('.rf-comparison-table tbody tr')).toHaveCount(3);await expect(c.locator('.rf-chart-line')).toHaveCount(3);
 for(const width of [1366,768,390,320])for(const theme of ['dark','light']){await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`compare-${width}-${theme}.png`),fullPage:true,animations:'disabled'});}
});
test('600-month table is collapsed and paginated, locked funds are not available',async({page})=>{
 await page.goto('/#/renda-fixa');const f=await fillCdb(page);await f.getByLabel('Vencimento',{exact:true}).fill('2077-01-01');await f.getByLabel('Carência contratual').fill('400');
 await page.locator('fixed-income-page > article > .rf-panel > details > summary').click();await page.getByLabel('Data pretendida de resgate').fill('2027-07-01');await expect(page.getByTestId('rf-redemption')).toContainText('Indisponível para resgate');
 await page.getByLabel('Data pretendida de resgate').fill('');const table=page.locator('.rf-results fixed-income-evolution');await expect(table.locator('table')).not.toBeVisible();await table.locator('summary').click();await expect(table.locator('tbody tr')).toHaveCount(24);await expect(table.locator('.rf-pagination')).toContainText('Página 1 de 26');await table.getByRole('button',{name:'Próxima',exact:true}).click();await expect(table.locator('.rf-pagination')).toContainText('Página 2 de 26');
});

