import {test,expect} from '@playwright/test';

for(const width of [1366,390,320])test(`microcopy do catálogo de ações em ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});
 await page.route('https://s3.tradingview.com/**',route=>route.abort());
 await page.route('https://widgets.tradingview-widget.com/**',route=>route.abort());
 await page.goto('/#/acoes');

 const toggle=page.locator('.market-directory-toggle');
 const title=page.locator('.market-directory-heading strong');
 const count=page.locator('.market-directory-heading small');
 const action=page.locator('.market-directory-action');
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(title).toHaveText('Catálogo de empresas');
 await expect(count).toHaveText('65 ações disponíveis');
 await expect(action).toHaveText('Explorar empresas');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(action).toHaveText('Ocultar lista');
 await expect(page.locator('.stock-item')).toHaveCount(65);
 await page.getByLabel('Buscar ação',{exact:true}).fill('PETR4');
 await expect(count).toHaveText('1 ação disponível');
 await expect(page.locator('.stock-item')).toHaveCount(1);
 await page.getByRole('button',{name:'Limpar',exact:true}).click();
 await expect(count).toHaveText('65 ações disponíveis');
 await expect(page.locator('.stock-item')).toHaveCount(65);

 await toggle.scrollIntoViewIfNeeded();
 for(const theme of ['dark','light']){
  await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const bounds=await page.evaluate(()=>{
   const heading=document.querySelector('.market-directory-heading')!.getBoundingClientRect();
   const action=document.querySelector('.market-directory-action')!.getBoundingClientRect();
   return {headingRight:heading.right,actionLeft:action.left};
  });
  expect(bounds.headingRight).toBeLessThanOrEqual(bounds.actionLeft+1);
  await page.screenshot({path:info.outputPath(`catalog-${theme}.png`),animations:'disabled'});
 }
});
