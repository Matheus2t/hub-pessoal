import {test,expect} from '@playwright/test';

for(const route of ['calculadora','renda-fixa'])test(`responsive fixed panels preserve legibility and values ${route}`,async({page},info)=>{
 for(const width of [390,600]){
  await page.setViewportSize({width,height:1080});
  await page.goto('/#/'+route);
  const compound=route==='calculadora',w=page.locator(compound?'compound-calculator panel-workspace':'fixed-income-page > article > panel-workspace');
  await expect(w).toHaveAttribute('fixed-layout','');
  if(compound)await page.getByRole('button',{name:'Simular investimento'}).click();
  else {
   const f=page.locator('fixed-income-page [slot=form] fixed-income-fields');
   await f.getByLabel('Valor aplicado').fill('10000');
   await f.getByLabel('CDI anual').fill('12');
   await f.getByLabel('Percentual do CDI').fill('100');
  }
  await expect(w.locator('[data-panel=summary]').first()).toBeVisible();
  await expect(w.locator('[data-panel=chart]').first()).toBeVisible();
  await expect(w.locator('[data-panel=table]').first()).toBeVisible();
  const original=await w.locator('[slot=summary]').first().textContent();
  await expect(w.getByRole('button',{name:'Personalizar painel'})).toHaveCount(0);
  for(const theme of ['dark','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   const metrics=w.locator(compound?'[slot=summary] metric-card':'[slot=summary] .rf-metrics > div');
   const rects=await metrics.evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
   expect(Math.abs(rects[0].x-rects[1].x)).toBeLessThan(2);
   expect(rects[1].y).toBeGreaterThan(rects[0].y);
   expect(await w.locator('[slot=summary]').first().textContent()).toBe(original);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:info.outputPath(`fixed-${width}-${theme}.png`),fullPage:true,animations:'disabled'});
  }
 }
});
