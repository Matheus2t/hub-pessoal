import {test,expect} from '@playwright/test';
import {incomeTaxCdbRate, simulateCdiDollar, type CdiDollarInput} from '../src/cdi-dollar';

const base:CdiDollarInput = {
 principal:10000,cdiAnnualPercent:12,cdiParticipation:100,
 days:365,initialFx:5,finalFx:5.6,taxMode:'taxable'
};

test('tax bands are defined by elapsed calendar days',()=>{
 expect(incomeTaxCdbRate(180)).toBe(.225);
 expect(incomeTaxCdbRate(181)).toBe(.20);
 expect(incomeTaxCdbRate(360)).toBe(.20);
 expect(incomeTaxCdbRate(361)).toBe(.175);
 expect(incomeTaxCdbRate(720)).toBe(.175);
 expect(incomeTaxCdbRate(721)).toBe(.15);
});

test('CDI benefit, FX breakeven and dollar return follow the same net balance',()=>{
 const r=simulateCdiDollar(base);
 expect(r.irRate).toBe(.175);
 expect(r.grossBRL).toBeGreaterThan(11000);
 expect(r.netBRL).toBeLessThan(r.grossBRL);
 expect(r.fxBreakeven).toBeCloseTo(5*r.netBRL/10000,10);
 expect(r.fxBreakevenAppreciation).toBeCloseTo(r.nominalNetReturn,10);
 expect(r.netDollarReturn).toBeCloseTo((r.netBRL/5.6)/(10000/5)*100-100,10);
 expect(r.rows[0].cdiNetBRL).toBe(10000);
 expect(r.rows[0].dollarHoldBRL).toBe(10000);
 expect(r.rows.at(-1)!.elapsedDays).toBe(365);
 expect(r.rows.at(-1)!.cdiNetBRL).toBeCloseTo(r.netBRL,10);
 expect(r.cdiDifferenceBRL).toBeLessThan(0);
 const equality=simulateCdiDollar({...base,finalFx:r.fxBreakeven});
 expect(equality.cdiDifferenceBRL).toBeCloseTo(0,8);
});

test('IR is only on gains, exemption helps, and zero CDI does not protect from devaluation',()=>{
 const exempt=simulateCdiDollar({...base,taxMode:'exempt'});
 const taxable=simulateCdiDollar(base);
 expect(exempt.irAmount).toBe(0);
 expect(exempt.netBRL).toBeGreaterThan(taxable.netBRL);
 expect(exempt.fxBreakeven).toBeGreaterThan(taxable.fxBreakeven);
 const zero=simulateCdiDollar({...base,cdiAnnualPercent:0,finalFx:6});
 expect(zero.netBRL).toBe(10000);
 expect(zero.irAmount).toBe(0);
 expect(zero.fxBreakeven).toBe(5);
 expect(zero.netDollarReturn).toBeCloseTo(-16.66666666666667,9);
 const lowerDollar=simulateCdiDollar({...base,finalFx:4.8});
 expect(lowerDollar.cdiDifferenceBRL).toBeGreaterThan(0);
});

test('rejects invalid inputs and never claims an IOF-free application below 30 days',()=>{
 for(const override of [
  {principal:0},{initialFx:0},{finalFx:0},{days:29},{days:3651},
  {cdiAnnualPercent:-1},{cdiParticipation:301},{days:180.5}
 ])expect(()=>simulateCdiDollar({...base,...override})).toThrow();
});

test('catalog and currency comparison follow 2T calculator layout',async({page})=>{
 await page.goto('/#/calculadoras');
 await expect(page.locator('tool-card')).toHaveCount(9);
 await page.getByRole('link',{name:'Abrir CDI x Dólar'}).click();
 const tool=page.locator('cdi-dollar-calculator');
 await expect(tool.getByRole('heading',{name:'CDI x Dólar'})).toBeVisible();
 await expect(tool.locator('panel-workspace')).toHaveAttribute('fixed-layout','');
 await expect(tool.getByLabel('CDI estimado por ano')).toBeVisible();
 await expect(tool.getByLabel('Dólar no início (R$ por US$ 1)')).toBeVisible();
 await tool.getByRole('button',{name:'Calcular proteção'}).click();
 await expect(tool.locator('.metric-card')).toHaveCount(3);
 await expect(tool.locator('.metric-card').first()).toContainText('Dólar máximo para o CDI empatar');
 await expect(tool.locator('.cdi-dollar-verdict')).toContainText('guardar dólares');
 await expect(tool.locator('.cdi-dollar-compare')).toContainText('COMPRANDO DÓLARES E MANTENDO');
 await expect(tool.locator('.cdi-dollar-table tbody tr')).toHaveCount(12);
 await expect(tool.getByRole('slider',{name:'Mês exibido no gráfico'})).toBeVisible();
 await tool.getByRole('slider',{name:'Mês exibido no gráfico'}).focus();
 await page.keyboard.press('Home');
 await expect(tool.locator('.cdi-dollar-chart-top')).toContainText('Início');
});

test('comparison switches winner, taxation and recomputes stale inputs',async({page})=>{
 await page.goto('/#/cdi-vs-dolar');
 const tool=page.locator('cdi-dollar-calculator');
 await tool.getByRole('button',{name:'Calcular proteção'}).click();
 await expect(tool.locator('.cdi-dollar-verdict')).toContainText('guardar dólares');
 await tool.getByLabel('Dólar estimado ao final (R$ por US$ 1)').fill('5,05');
 await expect(tool.locator('.cdi-dollar-stale')).toContainText('simulação anterior');
 await tool.getByRole('button',{name:'Calcular proteção'}).click();
 await expect(tool.locator('.cdi-dollar-verdict')).toContainText('CDI rende mais');
 await expect(tool.locator('.cdi-dollar-stale')).toHaveCount(0);
 await tool.getByLabel('Tributação do investimento').selectOption('exempt');
 await tool.getByRole('button',{name:'Calcular proteção'}).click();
 await expect(tool.locator('.cdi-dollar-compare')).toContainText('IR estimado: R$ 0,00');
});

test('jump directly to third year of monthly projections',async({page})=>{
 await page.goto('/#/cdi-vs-dolar');
 const tool=page.locator('cdi-dollar-calculator');
 await tool.getByLabel('Por quantos dias investir?').fill('1095');
 await tool.getByRole('button',{name:'Calcular proteção'}).click();
 const nav=tool.locator('year-navigation');
 await nav.getByRole('button',{name:'Ano 3'}).click();
 await expect(nav.getByRole('button',{name:'Ano 3'})).toHaveAttribute('aria-current','page');
 await expect(tool.locator('.cdi-dollar-table tbody tr').first().locator('th')).toHaveText('25');
 await expect(tool.locator('.cdi-dollar-table tbody tr').last().locator('th')).toHaveText('36');
});

for (const width of [390,1366]) test('CDI x dólar responsive '+width,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/#/cdi-vs-dolar');
 const tool=page.locator('cdi-dollar-calculator');
 await tool.getByRole('button',{name:'Calcular proteção'}).click();
 for (const theme of ['light','dark']){
  await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errors).toEqual([]);
});

test('invalid numeric inputs do not calculate or corrupt other tools',async({page})=>{
 await page.goto('/#/cdi-vs-dolar');
 const tool=page.locator('cdi-dollar-calculator');
 await tool.getByLabel('Por quantos dias investir?').fill('29');
 await tool.getByRole('button',{name:'Calcular proteção'}).click();
 await expect(tool.getByRole('alert')).toContainText('Revise os campos');
 await expect(tool.locator('.metric-card')).toHaveCount(0);
 await tool.getByLabel('Por quantos dias investir?').fill('30');
 await tool.getByRole('button',{name:'Calcular proteção'}).click();
 await expect(tool.locator('.metric-card')).toHaveCount(3);
});
