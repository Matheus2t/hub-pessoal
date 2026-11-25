import {test,expect} from '@playwright/test';
import {calculateIpca,type IpcaPoint} from '../src/ipca-calculator';

const series:IpcaPoint[]=[];
for(let y=1994;y<=2026;y++){
 for(let m=1;m<=12;m++){
  const month=y+'-'+String(m).padStart(2,'0');
  if(month<'1994-06'||month>'2026-10')continue;
  const n=(y-1994)*12+m-6;
  series.push({month,index:100*Math.pow(1.01,n)});
 }
}
const fixture={source:'IBGE / SIDRA',sourceUrl:'https://sidra.ibge.gov.br/tabela/1737',referenceMonth:'2026-10',months:series,stale:false};

test('IPCA index ratio includes first and last months without compounding rounded monthly rates',()=>{
 const example:IpcaPoint[]=[{month:'1995-06',index:100},{month:'1995-07',index:110},{month:'1995-08',index:121}];
 const both=calculateIpca(example,'1995-07','1995-08',1000);
 expect(both.factor).toBeCloseTo(1.21,10);
 expect(both.finalValue).toBeCloseTo(1210,10);
 expect(both.accumulatedPercent).toBeCloseTo(21,10);
 expect(both.purchasingPower).toBeCloseTo(1000/1.21,10);
 expect(both.rows).toHaveLength(2);
 expect(both.rows[0].monthlyRate).toBeCloseTo(10,10);
 const single=calculateIpca(example,'1995-07','1995-07',1000);
 expect(single.accumulatedPercent).toBeCloseTo(10,10);
 expect(single.totalMonths).toBe(1);
});
test('date range in the user example works across 1995 to 2026 and no dates get skipped',()=>{
 const r=calculateIpca(series,'1995-07','2026-01',1000);
 expect(r.totalMonths).toBe(367);
 expect(r.finalValue).toBeCloseTo(1000*Math.pow(1.01,367),4);
 expect(r.rows[0].month).toBe('1995-07');
 expect(r.rows.at(-1)!.month).toBe('2026-01');
});
test('deflation is allowed, reversed ranges and official-data gaps fail clearly',()=>{
 const r=calculateIpca([{month:'1995-06',index:100},{month:'1995-07',index:99}],'1995-07','1995-07',100);
 expect(r.accumulatedPercent).toBeCloseTo(-1,10);
 expect(r.finalValue).toBeCloseTo(99,10);
 expect(()=>calculateIpca(series,'2026-01','1995-07',1000)).toThrow();
 expect(()=>calculateIpca(series,'1995-07','2027-01',1000)).toThrow();
 expect(()=>calculateIpca(series,'1995-07','2026-01',0)).toThrow();
 expect(()=>calculateIpca([{month:'1995-06',index:100},{month:'1995-08',index:120}],'1995-07','1995-08',1000)).toThrow();
});

test.beforeEach(async({page})=>{
 await page.route('**/api/ipca/series',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
});
test('catalog has ten calculators and IPCA form shows verified source period',async({page})=>{
 await page.goto('/#/calculadoras');
 await expect(page.locator('tool-card')).toHaveCount(10);
 await page.getByRole('link',{name:'Abrir IPCA e Inflação'}).click();
 const tool=page.locator('ipca-inflation-calculator');
 await expect(tool.getByRole('heading',{name:'IPCA e Inflação'})).toBeVisible();
 await expect(tool.getByLabel('Mês inicial')).toHaveValue('1995-07');
 await expect(tool.getByLabel('Mês final')).toHaveValue('2026-10');
 await expect(tool.locator('.ipca-data-state')).toContainText('10/2026');
 await tool.getByLabel('Mês final').fill('2026-01');
 await tool.getByRole('button',{name:'Calcular'}).click();
 await expect(tool.locator('.ipca-hero')).toContainText('Valor corrigido pelo IPCA');
 await expect(tool.locator('.ipca-hero')).toContainText('367 meses');
 await expect(tool.locator('.ipca-history')).not.toHaveAttribute('open','');
});
test('inflation mode and year jump reveal month 01/2026',async({page})=>{
 await page.goto('/#/ipca');
 const tool=page.locator('ipca-inflation-calculator');
 await tool.getByLabel('Mês final').fill('2026-01');
 await tool.getByRole('button',{name:'Calcular'}).click();
 await tool.getByRole('button',{name:'Inflação',exact:true}).click();
 await expect(tool.locator('.ipca-hero')).toContainText('Inflação acumulada');
 await expect(tool.locator('.ipca-message')).toContainText('poder de compra');
 await tool.locator('.ipca-history summary').click();
 await tool.getByRole('button',{name:'Último ano'}).click();
 await expect(tool.getByLabel('Ir para o ano')).toHaveValue('2026');
 await expect(tool.locator('.ipca-history tbody tr')).toHaveCount(1);
 await expect(tool.locator('.ipca-history tbody tr').first()).toContainText('01/2026');
 await tool.getByRole('button',{name:'Correção pelo IPCA'}).click();
 await expect(tool.locator('.ipca-hero')).toContainText('Valor corrigido pelo IPCA');
});
test('invalid periods and stale results do not display invented values',async({page})=>{
 await page.goto('/#/ipca');
 const tool=page.locator('ipca-inflation-calculator');
 await tool.getByRole('button',{name:'Calcular'}).click();
 await tool.getByLabel('Valor inicial').fill('2000');
 await expect(tool.locator('.ipca-stale')).toBeVisible();
 await tool.getByRole('button',{name:'Calcular'}).click();
 await expect(tool.locator('.ipca-stale')).toHaveCount(0);
 await tool.getByLabel('Mês inicial').fill('2026-10');
 await tool.getByLabel('Mês final').fill('1995-07');
 await tool.getByRole('button',{name:'Calcular'}).click();
 await expect(tool.getByRole('alert')).toContainText('meses');
});
for(const width of [390,768,1366])test('IPCA responsive '+width,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errs:string[]=[];page.on('pageerror',e=>errs.push(e.message));
 await page.goto('/#/ipca');
 await page.locator('ipca-inflation-calculator').getByRole('button',{name:'Calcular'}).click();
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errs).toEqual([]);
});
test('offline IBGE service produces a useful error instead of made-up inflation',async({page})=>{
 await page.unroute('**/api/ipca/series');
 await page.route('**/api/ipca/series',route=>route.fulfill({status:503,body:'Indisponível'}));
 await page.goto('/#/ipca');
 const tool=page.locator('ipca-inflation-calculator');
 await expect(tool.getByRole('alert')).toContainText('indisponíveis');
 await expect(tool.getByRole('button',{name:'Calcular'})).toBeDisabled();
 await expect(tool.locator('.ipca-hero')).toHaveCount(0);
});
