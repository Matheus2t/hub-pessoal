import {test,expect} from '@playwright/test';

for(const route of ['calculadora','renda-fixa'])test(`compact panels preserve legibility and values ${route}`,async({page},info)=>{
 await page.setViewportSize({width:1366,height:1080});await page.goto('/#/'+route);
 const compound=route==='calculadora',w=page.locator(compound?'compound-calculator panel-workspace':'fixed-income-page > article > panel-workspace');
 if(compound)await page.getByRole('button',{name:'Simular investimento'}).click();
 else {const f=page.locator('fixed-income-page [slot=form] fixed-income-fields');await f.getByLabel('Valor aplicado').fill('100000000');await f.getByLabel('CDI anual').fill('12');await f.getByLabel('Percentual do CDI').fill('100');}
 await expect(w.locator('[slot=summary]').first()).toBeVisible();const original=await w.locator('[slot=summary]').first().textContent();
 await w.getByRole('button',{name:'Personalizar painel',exact:true}).first().click();
 for(const title of compound?['Resumo financeiro','Gráfico de evolução']:['Resultado líquido','Gráfico de evolução','Impostos e custos','Cenários salvos e ferramentas'])await w.getByLabel('Tamanho de '+title,{exact:true}).selectOption('small');
 await w.getByRole('button',{name:'Concluir',exact:true}).first().click();await expect(w.locator('[slot=summary]').first()).toHaveText(original!);
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  const metrics=w.locator(compound?'[slot=summary] metric-card':'[slot=summary] .rf-metrics > div');
  const rects=await metrics.evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
  expect(Math.abs(rects[0].x-rects[1].x)).toBeLessThan(2);expect(rects[1].y).toBeGreaterThan(rects[0].y);
  if(!compound)expect(await w.locator('[slot=taxes] .rf-breakdown dd').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().right<=e.closest('.workspace-panel')!.getBoundingClientRect().right))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath(`compact-${theme}.png`),fullPage:true,animations:'disabled'});
 }
});

