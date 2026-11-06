import {test,expect} from '@playwright/test';

test.use({launchOptions:{executablePath:process.env.MARKET_SCROLL_BROWSER_PATH}});

async function openDirectory(page:import('@playwright/test').Page) {
 const toggle=page.locator('.market-directory-toggle');
 if (await toggle.getAttribute('aria-expanded') !== 'true') {
  await toggle.scrollIntoViewIfNeeded();
  // Embedded charts above have their own lifecycle; finish scrolling before clicking.
  await page.waitForTimeout(300);
  await toggle.click();
 }
 await expect(toggle).toHaveAttribute('aria-expanded','true');
}

async function isolatedProvider(page:import('@playwright/test').Page){
 await page.route('https://www.tradingview-widget.com/embed-widget/scroll-fixture/**',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><button>Chart control</button><script>addEventListener('wheel',e=>e.preventDefault(),{passive:false});document.querySelector('button').onclick=()=>document.body.dataset.clicked='true';</script>`}));
 await page.route('https://widgets.tradingview-widget.com/w/br/*.js',r=>{
  const tag=r.request().url().split('/').pop()!.replace('.js','');
  // A test-only iframe consumes the wheel just as the real chart does.
  const body=`if(!customElements.get('${tag}'))customElements.define('${tag}',class extends HTMLElement{connectedCallback(){this.style.cssText='display:block;height:${tag==='tv-tickers'?'440px':'100%'}';if('${tag}'==='tv-tickers'){this.textContent='Isolated ticker';}else{this.attachShadow({mode:'open'}).innerHTML=\`<iframe title="Isolated provider" style="width:100%;height:100%;border:0" src="https://www.tradingview-widget.com/embed-widget/scroll-fixture/${tag}"></iframe>\`;}}});`;
  return r.fulfill({contentType:'text/javascript',body});
 });
 await page.route('https://s3.tradingview.com/**',r=>r.abort());
}

for(const width of [1920,1366,768,390,320])test(`scroll crosses loaded chart without involuntary movement ${width}`,async({page},info)=>{
 test.setTimeout(60000);
 await page.setViewportSize({width,height:1080});
 if(process.env.MARKET_SCROLL_LIVE!=='1')await isolatedProvider(page);
 await page.goto('/#/acoes');await openDirectory(page);
 await expect(page.locator('.stock-item')).toHaveCount(65);
 await expect(page.locator('tv-advanced-chart')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 if(process.env.MARKET_SCROLL_LIVE==='1')await page.waitForTimeout(10000);
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  if(process.env.MARKET_SCROLL_LIVE==='1')await page.waitForTimeout(3500);
  else await page.frameLocator('tv-advanced-chart iframe').getByRole('button',{name:'Chart control'}).waitFor();
  await page.evaluate(()=>{
   const chart=document.querySelector('market-page [slot=chart]')!,directory=document.querySelector('market-page [slot=directory]')!;
   const initial={chart:chart.getBoundingClientRect().y+scrollY,directory:directory.getBoundingClientRect().y+scrollY,ch:chart.getBoundingClientRect().height,dh:directory.getBoundingClientRect().height};
   const samples:any[]=[];(window as any).scrollCheck={initial,samples};
   (window as any).scrollCheck.frame=requestAnimationFrame(function tick(t){const c=chart.getBoundingClientRect(),d=directory.getBoundingClientRect();samples.push({t,y:scrollY,c:c.y+scrollY,d:d.y+scrollY,ch:c.height,dh:d.height});(window as any).scrollCheck.frame=requestAnimationFrame(tick)});
   scrollTo(0,directory.getBoundingClientRect().y+scrollY+500);
  });
  await page.waitForTimeout(350);
  const start=await page.evaluate(()=>scrollY);await page.mouse.move(Math.min(width*.36,500),480);
  let previous=start;
  for(let i=0;i<Math.ceil(start/100)+4;i++){
   await page.mouse.wheel(0,-100);await page.waitForTimeout(45);
   const current=await page.evaluate(()=>scrollY);
   expect(current).toBeLessThanOrEqual(previous+1);
   expect(previous-current).toBeLessThanOrEqual(102);
   previous=current;
  }
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await page.waitForTimeout(350);
  await expect(page.locator('market-page')).not.toHaveClass(/is-page-scrolling/);
  expect(await page.locator('market-page market-embed').first().evaluate(e=>getComputedStyle(e).pointerEvents)).toBe('auto');
  if(process.env.MARKET_SCROLL_LIVE!=='1'){
   const control=page.frameLocator('tv-advanced-chart iframe').getByRole('button',{name:'Chart control'});await control.click();
   await expect(page.frameLocator('tv-advanced-chart iframe').locator('body')).toHaveAttribute('data-clicked','true');
  }
  const stopped=await page.evaluate(()=>scrollY);await page.waitForTimeout(250);expect(await page.evaluate(()=>scrollY)).toBe(stopped);
  const measurement=await page.evaluate(()=>{const p=(window as any).scrollCheck;cancelAnimationFrame(p.frame);return p});
  for(const key of ['c','d','ch','dh']){const values=measurement.samples.map((s:any)=>s[key]);expect(Math.max(...values)-Math.min(...values),key).toBeLessThan(2)}
  await info.attach(`scroll-${theme}.json`,{body:JSON.stringify(measurement),contentType:'application/json'});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath(`market-${theme}.png`),fullPage:true,animations:'disabled'});
 }
});

test('scroll protection is released on route change with fixed market layout',async({page})=>{
 await isolatedProvider(page);await page.goto('/#/acoes');
 const w=page.locator('market-page panel-workspace');
 await expect(w).toHaveAttribute('fixed-layout','');
 await expect(w.getByRole('button',{name:'Personalizar painel'})).toHaveCount(0);
 await openDirectory(page);
 await page.evaluate(()=>scrollTo(0,900));
 await expect(page.locator('market-page')).toHaveClass(/is-page-scrolling/);
 await page.evaluate(()=>location.hash='#/');
 await expect(page.locator('market-page')).toHaveCount(0);
 await page.evaluate(()=>scrollTo(0,0));
 expect(await page.locator('.is-page-scrolling').count()).toBe(0);
 await page.goto('/#/acoes');
 await expect(page.locator('market-page [slot=panorama]')).toBeVisible();
 await openDirectory(page);
 await expect(page.locator('.stock-item')).toHaveCount(65);
});

test('downward page gesture reaches the catalog across loaded widgets',async({page})=>{
 test.setTimeout(90000);
 if(process.env.MARKET_SCROLL_LIVE!=='1')await isolatedProvider(page);
 for(const width of [1366,390]){
  await page.setViewportSize({width,height:1080});await page.goto('/#/acoes');await openDirectory(page);
  await expect(page.locator('.stock-item')).toHaveCount(65);await page.evaluate(()=>document.fonts.ready);
  if(process.env.MARKET_SCROLL_LIVE==='1')await page.waitForTimeout(10000);
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(350);
  const before=await page.locator('[slot=directory]').evaluate(e=>e.getBoundingClientRect().y+scrollY);
  await page.mouse.move(width*.36,180);
  let previous=0;
  for(let i=0;i<25;i++){
   await page.mouse.wheel(0,120);await page.waitForTimeout(50);
   const current=await page.evaluate(()=>scrollY);expect(current).toBeGreaterThanOrEqual(previous-1);expect(current-previous).toBeLessThanOrEqual(122);previous=current;
  }
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(3000);
  const after=await page.locator('[slot=directory]').evaluate(e=>e.getBoundingClientRect().y+scrollY);expect(Math.abs(after-before)).toBeLessThan(2);
  await page.waitForTimeout(350);await expect(page.locator('market-page')).not.toHaveClass(/is-page-scrolling/);
 }
});

// Stress regression: TradingView is permitted to alter its own internal height.
// This must never move the catalogue below or reverse the user's document scroll.
test('ticker widget intrinsic height changes cannot jolt the stock directory',async({page})=>{
 if(process.env.MARKET_SCROLL_LIVE!=='1')await isolatedProvider(page);
 await page.setViewportSize({width:1366,height:900});
 await page.goto('/#/acoes');await openDirectory(page);
 await expect(page.locator('market-page .stock-item')).toHaveCount(65);
 const ticker=page.frameLocator('iframe.market-quotes-frame').locator('tv-tickers');
 await expect(ticker).toBeVisible({timeout:30000});
 if(process.env.MARKET_SCROLL_LIVE==='1'){
  await expect(page.locator('iframe.market-quotes-frame')).toBeVisible({timeout:30000});
  await page.waitForTimeout(3500);
 }
 await expect(page.locator('market-page')).toHaveCSS('overflow-anchor','none');
 const directory=page.locator('market-page [slot=directory]');
 await page.evaluate(()=>{const d=document.querySelector('market-page [slot=directory]')!;scrollTo(0,d.getBoundingClientRect().top+scrollY+250)});
 await page.waitForTimeout(150);
 const initial=await page.evaluate(()=>{const d=document.querySelector('market-page [slot=directory]')!;return {scroll:scrollY,offset:d.getBoundingClientRect().top+scrollY}});
 for(const height of [950,440,1100,440,950,440]){
  await ticker.evaluate((e,h)=>(e as HTMLElement).style.height=h+'px',height);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  const now=await page.evaluate(()=>{const d=document.querySelector('market-page [slot=directory]')!;return {scroll:scrollY,offset:d.getBoundingClientRect().top+scrollY}});
  expect(Math.abs(now.scroll-initial.scroll),`scroll after ${height}px widget`).toBeLessThan(2);
  expect(Math.abs(now.offset-initial.offset),`directory after ${height}px widget`).toBeLessThan(2);
 }
 await page.reload();
 await openDirectory(page);
 await expect(page.locator('market-page .stock-item')).toHaveCount(65);
});


// Regression for #/acoes: scrolling across Ações acompanhadas must remain
// part of the document even when an external ticker temporarily grows.
for(const width of [1366,390])test(`featured tickers never capture the document wheel at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.route('https://widgets.tradingview-widget.com/w/br/*.js',route=>{
  const tag=route.request().url().split('/').pop()!.replace('.js','');
  const height=tag==='tv-tickers'?950:500;
  return route.fulfill({contentType:'text/javascript',body:`if(!customElements.get('${tag}'))customElements.define('${tag}',class extends HTMLElement{connectedCallback(){this.style.cssText='display:block;height:${height}px';this.textContent='External widget fixture';}})`});
 });
 await page.goto('/#/acoes');await openDirectory(page);
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

test('Ações default uses isolated live ticker with stable geometry and links', async ({page}) => {
 await page.route('https://widgets.tradingview-widget.com/w/br/tv-tickers.js',r=>r.fulfill({
  contentType:'text/javascript',
  body:"if(!customElements.get('tv-tickers'))customElements.define('tv-tickers',class extends HTMLElement{connectedCallback(){this.style.display='block';this.textContent='Ticker test'}})"
 }));
 await page.route('https://widgets.tradingview-widget.com/w/br/tv-advanced-chart.js',r=>r.fulfill({
  contentType:'text/javascript',
  body:"if(!customElements.get('tv-advanced-chart'))customElements.define('tv-advanced-chart',class extends HTMLElement{connectedCallback(){this.style.display='block';this.style.height='500px'}})"
 }));
 await page.goto('/#/acoes');await openDirectory(page);
 const frame=page.locator('iframe.market-quotes-frame');
 await expect(frame).toBeVisible();
 const ticker=page.frameLocator('iframe.market-quotes-frame').locator('tv-tickers');
 await expect(ticker).toHaveAttribute('direction','vertical');
 await expect(ticker).toHaveAttribute('symbols','BMFBOVESPA:ITUB4,BMFBOVESPA:PETR4,BMFBOVESPA:VALE3,BMFBOVESPA:MGLU3');
 await expect(ticker).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await expect(frame).toHaveCSS('border-top-width','0px');
 await expect(page.locator('market-page [slot=chart] tv-advanced-chart')).toBeVisible();
 await expect(page.locator('market-page [slot=directory] .stock-item')).toHaveCount(65);
 await page.evaluate(()=>document.documentElement.dataset.theme='light');
 await expect(ticker).toHaveAttribute('theme','light');
 await ticker.evaluate(el=>el.dispatchEvent(new CustomEvent('tv-link-open',{cancelable:true,detail:{context:{symbol:'BMFBOVESPA:PETR4'}}})));
 await expect(page).toHaveURL(/#\/acoes\/PETR4$/);
});


test('wheel inside quotes iframe scrolls the parent page without losing clicks',async({page})=>{
 await isolatedProvider(page);
 await page.setViewportSize({width:390,height:900});
 await page.goto('/#/acoes');await openDirectory(page);
 const frame=page.locator('iframe.market-quotes-frame');
 await expect(frame).toBeVisible();
 await frame.scrollIntoViewIfNeeded();
 await page.waitForTimeout(350);
 const rect=await frame.boundingBox();
 expect(rect).toBeTruthy();
 const px=rect!.x+rect!.width/2, py=rect!.y+Math.min(60,rect!.height/2);
 expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName,{x:px,y:py})).toBe('IFRAME');
 await page.mouse.move(px,py);
 const before=await page.evaluate(()=>scrollY);
 await page.mouse.wheel(0,180);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+80);
 await expect(page.frameLocator('iframe.market-quotes-frame').locator('tv-tickers')).toHaveCount(1);
});

test('Ações omits avisos textuais sem remover os gráficos',async({page})=>{
 await isolatedProvider(page);
 await page.goto('/#/acoes');await openDirectory(page);
 await expect(page.locator('market-page [slot=chart] tv-advanced-chart')).toBeVisible();
 await expect(page.locator('market-page iframe.market-quotes-frame')).toBeVisible();
 await expect(page.locator('market-page .tv-availability')).toHaveCount(0);
 await expect(page.locator('market-page')).not.toContainText('Dados fornecidos pelo TradingView. Cotações da B3 com atraso de 15 minutos.');
 await expect(page.locator('market-page')).not.toContainText('Se o ativo não estiver disponível no widget');
 await page.goto('/#/acoes/PETR4');
 await expect(page.locator('market-page [slot=chart]')).toBeVisible();
 await expect(page.locator('market-page .tv-availability')).toHaveCount(0);
 await expect(page.locator('market-page')).not.toContainText('Dados fornecidos pelo TradingView. Cotações da B3 com atraso de 15 minutos.');
 await expect(page.locator('market-page')).not.toContainText('Se o ativo não estiver disponível no widget');
});
