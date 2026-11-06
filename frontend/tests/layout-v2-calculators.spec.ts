import {test,expect} from '@playwright/test';

for(const width of [1920,1366,768,390,320])test(`financial simulator fixed workspace ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1080});
 for(const [route,total] of [['calculadora','1.030,30'],['juros-simples','1.030,00'],['price','1.020,07'],['sac','1.020,00']]){
  await page.goto(`/#/${route}`);
  const tool=page.locator(route==='calculadora'?'compound-calculator':'finance-calculator'),w=tool.locator('panel-workspace');
  await expect(w).toHaveAttribute('fixed-layout','');
  await expect(w.getByRole('button',{name:'Personalizar painel'})).toHaveCount(0);
  await expect(w.getByRole('group',{name:'Modo de visualização'})).toHaveCount(0);
  await tool.getByLabel(route==='calculadora'?'Prazo da simulação':'Prazo',{exact:true}).fill('3');
  if(route==='calculadora') {await tool.getByLabel('Aporte mensal',{exact:true}).fill('0');await tool.getByLabel('Taxa de juros mensal',{exact:true}).fill('1');}
  await tool.getByRole('button',{name:route==='calculadora'?'Simular investimento':'Calcular',exact:true}).click();
  await expect(tool.locator('metric-card').first()).toContainText(total);
  await expect(w.locator('[data-panel=summary]')).toBeVisible();
  await expect(w.locator('[data-panel=table]')).toBeVisible();
  if(['calculadora','juros-simples'].includes(route))await expect(w.locator('[data-panel=chart]')).toBeVisible();
  const form=await w.locator('[data-panel=form]').boundingBox(),summary=await w.locator('[data-panel=summary]').boundingBox();
  if(width>900){expect(form!.x).toBeLessThan(summary!.x);expect(Math.abs(form!.y-summary!.y)).toBeLessThan(2);}
  for(const theme of ['dark','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:info.outputPath(`${route}-${theme}.png`),fullPage:true,animations:'disabled'});
  }
  if(width===1366){
   await page.reload();
   await expect(w.getByRole('button',{name:'Personalizar painel'})).toHaveCount(0);
   await expect(w.locator('[data-panel=form]')).toBeVisible();
  }
 }
});
