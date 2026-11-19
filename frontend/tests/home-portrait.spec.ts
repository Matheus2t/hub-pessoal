import {test,expect} from '@playwright/test';

for(const width of [1920,1366,1024,768,600,390,320])test(`editorial home, theme and calendar at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:1080});await page.goto('/#/');
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await expect(page.locator('home-page .home-call[href="#/call"]')).toBeVisible();
  await expect(page.locator('home-page .home-call[href="#/games"]')).toBeVisible();
  const teamsMenu=page.locator('app-sidebar .teams-menu');
  await teamsMenu.locator('summary').click();
  await expect(teamsMenu.getByRole('link')).toHaveCount(4);
  await expect(teamsMenu.getByRole('link',{name:'FC Barcelona'})).toBeVisible();
  await page.keyboard.press('Escape');
  const cards=page.locator('home-page .area-card');await expect(cards).toHaveCount(4);
  const quickLinks=page.locator('home-page .home-utilities .home-call');await expect(quickLinks).toHaveCount(3);
  const resolver=page.locator('home-page .home-resolver-entry');
  await expect(resolver).toContainText('Desencurtador de Links');
  await expect(resolver).toContainText('Em preparação');
  await expect(page.locator('home-page a[href="#/utilitarios/desencurtador"]')).toHaveCount(0);
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
  const quickBoxes=await quickLinks.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));
  if(width>700)expect(Math.abs(quickBoxes[0].y-quickBoxes[1].y)).toBeLessThan(2);
  else expect(quickBoxes[1].y).toBeGreaterThan(quickBoxes[0].y);
  if(width>1100)expect(Math.abs(quickBoxes[1].y-quickBoxes[2].y)).toBeLessThan(2);
  else expect(quickBoxes[2].y).toBeGreaterThan(quickBoxes[1].y);
  expect(quickBoxes[0].y).toBeGreaterThan(Math.max(...boxes.map(b=>b.y+b.h)));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`${width}-${theme}.png`),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Abrir calendário de feriados'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
 }
});
