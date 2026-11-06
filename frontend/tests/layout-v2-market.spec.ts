import {test,expect} from '@playwright/test';
async function widgets(page:import('@playwright/test').Page){
 await page.route('https://widgets.tradingview-widget.com/w/br/*.js',r=>{const tag=r.request().url().split('/').pop()!.replace('.js','');return r.fulfill({contentType:'text/javascript',body:`if(!customElements.get('${tag}'))customElements.define('${tag}',class extends HTMLElement{connectedCallback(){this.style.cssText='display:block;min-height:200px;border:1px solid currentColor;padding:20px';this.textContent='TradingView · widget de teste';}});`})});
 await page.route('https://s3.tradingview.com/**',r=>r.fulfill({contentType:'text/javascript',body:`const f=document.createElement('iframe');f.title='Widget de teste';f.style.cssText='width:100%;height:400px;border:0';document.currentScript.parentElement.querySelector('.tradingview-widget-container__widget').append(f);`}));
}
for(const width of [1920,1366,768,390,320])test(`market terminal fixed and directory search at ${width}`,async({page},info)=>{
 await widgets(page);await page.setViewportSize({width,height:1080});await page.goto('/#/acoes');
 const w=page.locator('market-page panel-workspace');
 await expect(w).toHaveAttribute('fixed-layout','');
 await expect(w.getByRole('button',{name:'Personalizar painel',exact:true})).toHaveCount(0);
 await expect(page.locator('tv-advanced-chart')).toHaveAttribute('symbol','BMFBOVESPA:IBOV');
 await expect(page.locator('.market-search')).toHaveCount(0);
 await expect(w.locator('[data-panel=panorama]')).toHaveAttribute('style',/span 12/);
 await page.locator('.market-directory-toggle').click();
 await expect(page.locator('.stock-item')).toHaveCount(65);
 await expect(page.getByLabel('Buscar ação',{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.locator('.market-directory-toggle')).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('iframe.market-quotes-frame')).toBeVisible();
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`terminal-${theme}.png`),fullPage:true,animations:'disabled'});
 }
 await page.goto('/#/acoes/PETR4');
 await expect(page.locator('market-page panel-workspace')).toHaveAttribute('fixed-layout','');
 await expect(page.getByRole('button',{name:'Consultar dados CVM',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 await expect(page.locator('.financial-metrics')).toBeVisible();
 await page.getByLabel('Frequência',{exact:true}).selectOption('ttm');
 await expect(page.locator('.financial-metrics')).toContainText('133,76');
 await expect(page.locator('market-page panel-workspace').getByRole('button',{name:'Personalizar painel'})).toHaveCount(0);
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
