import {test,expect} from '@playwright/test';

for(const width of [1920,1366,768,390,320])test(`financial simulator workspace ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1080});
 for(const [route,total] of [['calculadora','1.030,30'],['juros-simples','1.030,00'],['price','1.020,07'],['sac','1.020,00']]){
  await page.goto(`/#/${route}`);
  const tool=page.locator(route==='calculadora'?'compound-calculator':'finance-calculator'),w=tool.locator('panel-workspace');
  await tool.getByLabel(route==='calculadora'?'Prazo da simulação':'Prazo',{exact:true}).fill('3');
  if(route==='calculadora') {await tool.getByLabel('Aporte mensal',{exact:true}).fill('0');await tool.getByLabel('Taxa de juros mensal',{exact:true}).fill('1');}
  await tool.getByRole('button',{name:route==='calculadora'?'Simular investimento':'Calcular',exact:true}).click();
  await expect(tool.locator('metric-card').first()).toContainText(total);
  const form=await w.locator('[data-panel=form]').boundingBox(),summary=await w.locator('[data-panel=summary]').boundingBox();
  if(width>900){expect(form!.x).toBeLessThan(summary!.x);expect(Math.abs(form!.y-summary!.y)).toBeLessThan(2);}
  for(const theme of ['dark','light']) {await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`${route}-${theme}.png`),fullPage:true,animations:'disabled'});}
  await w.getByRole('button',{name:'Essencial',exact:true}).click();await expect(w.locator('[data-panel=table]')).toBeHidden();await expect(tool.locator('form')).toBeVisible();
  await w.getByRole('button',{name:'Completo',exact:true}).click();await expect(w.locator('[data-panel=table]')).toBeVisible();
  if(width===1366){
   await w.getByRole('button',{name:'Personalizar painel',exact:true}).click();
   await w.getByRole('checkbox',{name:'Resumo financeiro',exact:true}).uncheck();
   await w.getByRole('button',{name:'Concluir',exact:true}).click();await expect(tool.locator('metric-card').first()).toBeHidden();
   await page.reload();await expect(w.getByRole('button',{name:'Personalizado',exact:true})).toHaveAttribute('aria-pressed','true');
   await w.getByRole('button',{name:'Personalizar painel',exact:true}).click();await expect(w.getByRole('checkbox',{name:'Simulação',exact:true})).toBeDisabled();
   await w.getByRole('button',{name:'Restaurar layout padrão'}).click();await w.getByRole('button',{name:'Concluir',exact:true}).click();
  }
 }
});
