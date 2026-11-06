import {test,expect} from '@playwright/test';
async function widgets(page:import('@playwright/test').Page){
 await page.route('https://widgets.tradingview-widget.com/w/br/*.js',r=>{const tag=r.request().url().split('/').pop()!.replace('.js','');return r.fulfill({contentType:'text/javascript',body:`if(!customElements.get('${tag}'))customElements.define('${tag}',class extends HTMLElement{connectedCallback(){this.style.cssText='display:block;min-height:200px;border:1px solid currentColor;padding:20px';this.textContent='TradingView · widget de teste';}});`})});
 await page.route('https://s3.tradingview.com/**',r=>r.fulfill({contentType:'text/javascript',body:`const f=document.createElement('iframe');f.title='Widget de teste';f.style.cssText='width:100%;height:400px;border:0';document.currentScript.parentElement.querySelector('.tradingview-widget-container__widget').append(f);`}));
}
for(const width of [1920,1366,768,390,320])test(`market overview fixed layout, directory and panorama ${width}`,async({page},info)=>{
 await widgets(page);
 await page.setViewportSize({width,height:1080});
 await page.goto('/#/acoes');
 const w=page.locator('market-page panel-workspace[area="actions-overview"]');
 await expect(w).toBeVisible();
 await expect(w).toHaveAttribute('fixed-layout','');
 await expect(w.getByRole('button',{name:'Personalizar painel'})).toHaveCount(0);
 await expect(w.getByRole('group',{name:'Modo de visualização'})).toHaveCount(0);
 await expect(page.locator('tv-advanced-chart')).toHaveAttribute('symbol','BMFBOVESPA:IBOV');
 await expect(page.locator('iframe.market-quotes-frame')).toBeVisible();
 const directory=page.locator('.market-directory-details');
 await expect(directory).not.toHaveAttribute('open','');
 await expect(page.locator('.stock-item')).toHaveCount(65);
 await expect(page.getByLabel('Buscar ação',{exact:true})).not.toBeVisible();
 await directory.locator('summary').click();
 await expect(directory).toHaveAttribute('open','');
 await expect(page.getByLabel('Buscar ação',{exact:true})).toBeVisible();
 await expect(page.locator('.stock-item')).toHaveCount(65);
 await expect(page.locator('.stock-item').filter({hasText:'PETR4'}).locator('.stock-profit')).toContainText('R$');
 await expect(page.locator('.stock-item').filter({hasText:'PETR4'}).locator('.stock-roe')).toContainText('%');
 await expect(page.locator('.market-directory-source')).toContainText('2025');
 const pan=page.locator('.market-panorama');
 await pan.locator('summary').click();
 await expect(pan).toHaveAttribute('open','');
 await expect(page.locator('tv-market-overview')).toBeVisible();
 await expect(page.locator('.market-panorama-context')).toBeVisible();
 if(width>900){
  const [chartBox,quotesBox,panBox]=await Promise.all([
   w.locator('[data-panel=chart]').boundingBox(),
   w.locator('[data-panel=quotes]').boundingBox(),
   w.locator('[data-panel=panorama]').boundingBox()
  ]);
  expect(chartBox).not.toBeNull();expect(quotesBox).not.toBeNull();expect(panBox).not.toBeNull();
  expect(quotesBox!.x).toBeGreaterThan(chartBox!.x);
  expect(panBox!.y).toBeGreaterThanOrEqual(chartBox!.y+chartBox!.height-2);
  expect(Math.abs(panBox!.x-chartBox!.x)).toBeLessThan(3);
  expect(panBox!.width).toBeGreaterThan(chartBox!.width);
 }
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`terminal-${theme}.png`),fullPage:true,animations:'disabled'});
 }
 await page.goto('/#/acoes/PETR4');
 const asset=page.locator('market-page panel-workspace[area="actions-company"]');
 await expect(asset).toHaveAttribute('fixed-layout','');
 await expect(asset.getByRole('button',{name:'Personalizar painel'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Consultar dados CVM',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 await expect(page.locator('.financial-metrics')).toBeVisible();
 await page.getByLabel('Frequência',{exact:true}).selectOption('ttm');
 await expect(page.locator('.financial-metrics')).toContainText('133,76');
});

test('external chart failure keeps the CVM action in place',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('https://s3.tradingview.com/**',async r=>{await gate;await r.abort()});
 await page.setViewportSize({width:768,height:1080});await page.goto('/#/acoes/PETR4',{waitUntil:'domcontentloaded'});
 const action=page.getByRole('button',{name:'Consultar dados CVM',exact:true});await expect(action).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const before=await action.evaluate(e=>e.getBoundingClientRect().y+scrollY);release();
 await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o TradingView');
 expect(Math.abs((await action.evaluate(e=>e.getBoundingClientRect().y+scrollY))-before)).toBeLessThan(2);
 await action.click();await expect(page.locator('.financial-metrics')).toBeVisible();
});
