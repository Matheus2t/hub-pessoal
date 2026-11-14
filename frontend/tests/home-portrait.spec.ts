import {test,expect} from '@playwright/test';

for(const width of [1920,1366,1024,768,600,390,320])test(`editorial home, theme and calendar at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:1080});await page.goto('/#/');
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await expect(page.locator('home-page .home-call[href="#/call"]')).toBeVisible();
  await expect(page.locator('home-page .home-call[href="#/games"]')).toBeVisible();
  const icons=page.locator('app-sidebar .nav-team-icons a');
  await expect(icons).toHaveCount(3);
  await expect.poll(()=>icons.locator('img').evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  const cards=page.locator('home-page .area-card');await expect(cards).toHaveCount(4);
  const boxes=await cards.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
  for(const b of boxes)expect(b.w).toBeGreaterThan(0);
  if(width>=1200){
   expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(2);
   expect(Math.abs(boxes[2].y-boxes[3].y)).toBeLessThan(2);
   expect(boxes[0].w).toBeGreaterThan(boxes[1].w*1.2);
   expect(boxes[3].w).toBeGreaterThan(boxes[2].w*1.2);
  }else if(width>700){
   expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(2);
   expect(Math.abs(boxes[2].y-boxes[3].y)).toBeLessThan(2);
   expect(Math.abs(boxes[0].w-boxes[1].w)).toBeLessThan(2);
  }else{
   for(let i=1;i<boxes.length;i++)expect(boxes[i].y).toBeGreaterThan(boxes[i-1].y);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`${width}-${theme}.png`),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Abrir calendário de feriados'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
 }
});
