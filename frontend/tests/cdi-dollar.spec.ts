import {test,expect} from '@playwright/test';
import {incomeTaxCdbRate,simulateCdiDollar,type CdiDollarInput} from '../src/cdi-dollar';

const base:CdiDollarInput={
 principal:10000,cdiAnnualPercent:12,cdiParticipation:100,
 days:365,initialFx:5,finalFx:5.6,taxMode:'taxable'
};

test('tax brackets stay correct for custom day periods',()=>{
 expect(incomeTaxCdbRate(180)).toBe(.225);
 expect(incomeTaxCdbRate(181)).toBe(.20);
 expect(incomeTaxCdbRate(360)).toBe(.20);
 expect(incomeTaxCdbRate(361)).toBe(.175);
 expect(incomeTaxCdbRate(720)).toBe(.175);
 expect(incomeTaxCdbRate(721)).toBe(.15);
});

test('breakeven and dollar return use net CDI, independent of the selected timeframe UI',()=>{
 const r=simulateCdiDollar(base);
 expect(r.irRate).toBe(.175);
 expect(r.grossBRL).toBeGreaterThan(11000);
 expect(r.netBRL).toBeLessThan(r.grossBRL);
 expect(r.fxBreakeven).toBeCloseTo(5*r.netBRL/10000,10);
 expect(r.fxBreakevenAppreciation).toBeCloseTo(r.nominalNetReturn,10);
 expect(r.netDollarReturn).toBeCloseTo((r.netBRL/5.6)/(10000/5)*100-100,10);
 expect(r.rows[0].cdiNetBRL).toBe(10000);
 expect(r.rows.at(-1)!.elapsedDays).toBe(365);
 const equality=simulateCdiDollar({...base,finalFx:r.fxBreakeven});
 expect(equality.cdiDifferenceBRL).toBeCloseTo(0,8);
});

test('multi-year simulations respect final calendar days and IR at redemption',()=>{
 for(const [days,expectedYears] of [[365,1],[730,2],[1095,3],[1825,5],[3650,10]]){
  const out=simulateCdiDollar({...base,days});
  expect(out.rows.at(-1)!.elapsedDays).toBe(days);
  expect(out.rows.length-1).toBe(expectedYears*12);
  expect(out.irRate).toBe(days<=720?.175:.15);
 }
});

test('IR is only on gains, exemption helps and zero CDI does not protect against USD inflation',()=>{
 const exempt=simulateCdiDollar({...base,taxMode:'exempt'});
 const taxable=simulateCdiDollar(base);
 expect(exempt.irAmount).toBe(0);
 expect(exempt.netBRL).toBeGreaterThan(taxable.netBRL);
 const zero=simulateCdiDollar({...base,cdiAnnualPercent:0,finalFx:6});
 expect(zero.netBRL).toBe(10000);
 expect(zero.irAmount).toBe(0);
 expect(zero.fxBreakeven).toBe(5);
 expect(zero.netDollarReturn).toBeCloseTo(-16.66666666666667,9);
});

test('invalid period and negative values are rejected',()=>{
 for(const override of [
  {principal:0},{initialFx:0},{finalFx:0},{days:29},{days:3651},
  {cdiAnnualPercent:-1},{cdiParticipation:301},{days:180.5}
 ])expect(()=>simulateCdiDollar({...base,...override})).toThrow();
});

test('catalog, reduced form and concise summary match 2T layout',async({page})=>{
 await page.goto('/#/calculadoras');
 await expect(page.locator('tool-card')).toHaveCount(10);
 await page.getByRole('link',{name:'Abrir CDI x Dólar'}).click();
 const tool=page.locator('cdi-dollar-calculator');
 await expect(tool.getByRole('heading',{name:'CDI x Dólar'})).toBeVisible();
 await expect(tool.locator('panel-workspace')).toHaveAttribute('fixed-layout','');
 await expect(tool.getByLabel('CDI estimado por ano')).toBeVisible();
 await expect(tool.getByLabel('Dólar inicial')).toBeVisible();
 await expect(tool.getByLabel('Prazo do investimento')).toHaveValue('365');
 await expect(tool.locator('.cdi-dollar-advanced')).not.toHaveAttribute('open','');
 await tool.getByRole('button',{name:'Comparar'}).click();
 await expect(tool.locator('.cdi-dollar-hero')).toContainText('Até qual cotação o CDI compensa a alta do dólar?');
 await expect(tool.locator('.cdi-dollar-hero')).toContainText('alta máxima estimada');
 await expect(tool.locator('.cdi-dollar-verdict')).toContainText('dólar rende mais');
 await expect(tool.locator('.cdi-dollar-compare')).toContainText('Comprando dólares');
 await expect(tool.locator('.cdi-dollar-details')).not.toHaveAttribute('open','');
 await expect(tool.locator('.cdi-dollar-table-details')).not.toHaveAttribute('open','');
 await expect(tool.locator('.cdi-dollar-evolution')).not.toHaveAttribute('open','');
 await tool.locator('.cdi-dollar-evolution summary').click();
 await expect(tool.getByRole('slider',{name:'Mês exibido no gráfico'})).toBeVisible();
 await tool.getByRole('slider',{name:'Mês exibido no gráfico'}).focus();
 await page.keyboard.press('Home');
 await expect(tool.locator('.cdi-dollar-chart-top')).toContainText('Início');
});

test('year presets change simulation from 1 to 10 years without exposing day complexity',async({page})=>{
 await page.goto('/#/cdi-vs-dolar');
 const tool=page.locator('cdi-dollar-calculator');
 const duration=tool.getByLabel('Prazo do investimento');
 for(const [days,label,months] of [
   ['365','1 ano','12 meses'],['730','2 anos','24 meses'],
   ['1095','3 anos','36 meses'],['1825','5 anos','60 meses'],
   ['3650','10 anos','120 meses']
 ]){
  await duration.selectOption({label});
  await expect(duration).toHaveValue(days);
  await expect(tool.getByLabel('Prazo personalizado')).toHaveCount(0);
  await tool.getByRole('button',{name:'Comparar'}).click();
  await expect(tool.locator('.cdi-dollar-table-details summary')).toContainText(months);
 }
 await tool.locator('.cdi-dollar-table-details summary').click();
 const nav=tool.locator('year-navigation');
 await nav.getByRole('button',{name:'Ano 10'}).click();
 await expect(nav.getByRole('button',{name:'Ano 10'})).toHaveAttribute('aria-current','page');
 await expect(tool.locator('.cdi-dollar-table tbody tr').first().locator('th')).toHaveText('109');
 await expect(tool.locator('.cdi-dollar-table tbody tr').last().locator('th')).toHaveText('120');
});

test('custom days, 6-month preset, invalid period and return to annual presets',async({page})=>{
 await page.goto('/#/cdi-vs-dolar');
 const tool=page.locator('cdi-dollar-calculator');
 const duration=tool.getByLabel('Prazo do investimento');
 await duration.selectOption('180');
 await tool.getByRole('button',{name:'Comparar'}).click();
 await expect(tool.locator('.cdi-dollar-table-details summary')).toContainText('6 meses');
 await duration.selectOption('custom');
 const days=tool.getByLabel('Prazo personalizado');
 await expect(days).toBeVisible();
 await days.fill('29');
 await tool.getByRole('button',{name:'Comparar'}).click();
 await expect(tool.getByRole('alert')).toContainText('Revise os campos');
 await days.fill('30');
 await tool.getByRole('button',{name:'Comparar'}).click();
 await expect(tool.locator('.cdi-dollar-table-details summary')).toContainText('1 meses');
 await duration.selectOption('730');
 await expect(days).toHaveCount(0);
 await tool.getByRole('button',{name:'Comparar'}).click();
 await expect(tool.locator('.cdi-dollar-table-details summary')).toContainText('24 meses');
});

test('advanced IR and CDI percentage remain editable, technical content stays available',async({page})=>{
 await page.goto('/#/cdi-vs-dolar');
 const tool=page.locator('cdi-dollar-calculator');
 const advanced=tool.locator('.cdi-dollar-advanced');
 await advanced.locator('summary').click();
 await tool.getByLabel('Quanto rende em relação ao CDI?').fill('110');
 await tool.getByLabel('Tributação do investimento').selectOption('exempt');
 await tool.getByRole('button',{name:'Comparar'}).click();
 const details=tool.locator('.cdi-dollar-details');
 await expect(details).not.toHaveAttribute('open','');
 await details.locator('summary').click();
 await expect(details).toContainText('IR estimado (0,00%)');
 await expect(details).toContainText('Retorno do CDI medido em dólares');
 await tool.getByLabel('Dólar ao final').fill('5,05');
 await expect(tool.locator('.cdi-dollar-stale')).toContainText('resultados abaixo são anteriores');
 await tool.getByRole('button',{name:'Comparar'}).click();
 await expect(tool.locator('.cdi-dollar-stale')).toHaveCount(0);
 await expect(tool.locator('.cdi-dollar-verdict')).toContainText('CDI rende mais');
});

for(const width of [390,768,1366]){
 test('compact layout does not overflow in '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#/cdi-vs-dolar');
  const tool=page.locator('cdi-dollar-calculator');
  await tool.getByRole('button',{name:'Comparar'}).click();
  for(const theme of ['light','dark']){
   await page.evaluate(value=>{document.documentElement.dataset.theme=value},theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
 });
}
