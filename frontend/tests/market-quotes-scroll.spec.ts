import {test,expect} from '@playwright/test';

// Regression for #/acoes: scrolling across Ações acompanhadas must remain
// part of the document even when an external ticker temporarily grows.
for(const width of [1366,390])test(`featured tickers never capture the document wheel at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.route('https://widgets.tradingview-widget.com/w/br/*.js',route=>{
  const tag=route.request().url().split('/').pop()!.replace('.js','');
  const height=tag==='tv-tickers'?950:500;
  return route.fulfill({contentType:'text/javascript',body:`if(!customElements.get('${tag}'))customElements.define('${tag}',class extends HTMLElement{connectedCallback(){this.style.cssText='display:block;height:${height}px';this.textContent='External widget fixture';}})`});
 });
 await page.goto('/#/acoes');
 const quotes=page.locator('market-page panel-workspace[area="actions-overview"] [slot="quotes"]');
 await expect(quotes).toBeVisible();
 await expect(quotes).toHaveCSS('overflow-y','clip');
 await page.locator('market-page .stock-item').first().waitFor();
 await quotes.scrollIntoViewIfNeeded();
 await page.waitForTimeout(180);
 const rect=await quotes.boundingBox();expect(rect).not.toBeNull();
 const start=await page.evaluate(()=>scrollY);
 // Use the card's 10px padding strip; no widget iframe can intercept the wheel.
 await page.mouse.move(rect!.x+10,rect!.y+Math.min(110,rect!.height-15));
 await page.mouse.wheel(0,200);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(start+100);
 expect(await quotes.evaluate(e=>e.scrollTop)).toBe(0);
 await expect(page.locator('market-page .stock-item')).toHaveCount(65);
});
