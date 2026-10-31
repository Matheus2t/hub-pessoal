import {test,expect} from '@playwright/test';
for(const width of [1920,1366,768,390,320])test(`financial composition ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1080});
 for(const route of ['calculadora','price','sac','renda-fixa']){
 await page.goto('/#/'+route);
 if(route==='calculadora'){await page.getByRole('button',{name:'Simular investimento'}).click();await expect(page.locator('metric-card:visible').first()).toBeVisible();}
 else if(route==='price'||route==='sac'){await page.getByRole('button',{name:'Calcular',exact:true}).click();await expect(page.locator('metric-card:visible').first()).toBeVisible();}
 else {const f=page.locator('fixed-income-fields').first();await f.getByLabel('Valor aplicado').fill('10000');await f.getByLabel('CDI anual').fill('12');await f.getByLabel('Percentual do CDI').fill('100');await expect(page.getByTestId('rf-net')).toBeVisible();}
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`${route}-${theme}.png`),fullPage:true,animations:'disabled'});}
 }
 await page.goto('/#/');await page.getByRole('button',{name:'Abrir calendário de feriados'}).click();await page.screenshot({path:info.outputPath('calendar.png'),fullPage:true,animations:'disabled'});await page.keyboard.press('Escape');
});

