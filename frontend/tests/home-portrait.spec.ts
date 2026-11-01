import {test,expect} from '@playwright/test';
for(const width of [1920,1366,768,390,320])test(`portrait home ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1080});await page.goto('/#/');
 for(const theme of ['dark','light']){
 await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
 const boxes=await page.locator('home-page .area-card').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
 expect(boxes).toHaveLength(4);for(const b of boxes)expect(b.h/b.w).toBeGreaterThan(1.2);
 expect(Math.abs(boxes[0].h-boxes[2].h)).toBeLessThan(2);
 if(width>1000)expect(Math.abs(boxes[0].y-boxes[2].y)).toBeLessThan(2);
 if(width===768){expect(boxes[0].y).toBe(boxes[1].y);expect(boxes[2].y).toBeGreaterThan(boxes[0].y);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`${width}-${theme}.png`),fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Abrir calendário de feriados'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 }
});
