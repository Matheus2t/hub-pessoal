import {test,expect} from '@playwright/test';
async function widgets(page:import('@playwright/test').Page){
 await page.route('https://widgets.tradingview-widget.com/w/br/*.js',r=>{const tag=r.request().url().split('/').pop()!.replace('.js','');return r.fulfill({contentType:'text/javascript',body:`if(!customElements.get('${tag}'))customElements.define('${tag}',class extends HTMLElement{connectedCallback(){this.style.cssText='display:block;min-height:200px;border:1px solid currentColor;padding:20px';this.textContent='TradingView · widget de teste';}});`})});
 await page.route('https://s3.tradingview.com/**',r=>r.fulfill({contentType:'text/javascript',body:`const f=document.createElement('iframe');f.title='Widget de teste';f.style.cssText='width:100%;height:400px;border:0';document.currentScript.parentElement.querySelector('.tradingview-widget-container__widget').append(f);`}));
}
for(const width of [1920,1366,768,390,320])test(`market terminal and saved layouts ${width}`,async({page},info)=>{
 await widgets(page);await page.setViewportSize({width,height:1080});await page.goto('/#/acoes');
 const w=page.locator('market-page panel-workspace');await expect(w).toBeVisible();await expect(page.locator('tv-advanced-chart')).toHaveAttribute('symbol','BMFBOVESPA:IBOV');
 await w.getByRole('button',{name:'Essencial',exact:true}).click();await expect(w.locator('[data-panel=chart]')).toHaveAttribute('style',/1 \/ -1/);await expect(page.locator('.stock-directory')).not.toBeVisible();
 await w.getByRole('button',{name:'Completo',exact:true}).click();await expect(page.locator('.stock-item')).toHaveCount(65);
 await w.getByRole('button',{name:'Personalizar painel',exact:true}).click();await w.getByRole('checkbox',{name:'Ações acompanhadas',exact:true}).uncheck();await w.getByRole('button',{name:'Concluir',exact:true}).click();
 await page.reload();await expect(page.locator('tradingview-widget[kind=tickers]')).not.toBeVisible();
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`terminal-${theme}.png`),fullPage:true,animations:'disabled'});}
 await page.goto('/#/acoes/PETR4');await expect(page.getByRole('button',{name:'Consultar dados CVM',exact:true})).toBeVisible();
 await expect(page.locator('market-page panel-workspace').getByRole('button',{name:'Completo',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();await expect(page.locator('.financial-metrics')).toBeVisible();await page.getByLabel('Frequência',{exact:true}).selectOption('ttm');await expect(page.locator('.financial-metrics')).toContainText('133,76');
 const asset=page.locator('market-page panel-workspace');await asset.getByRole('button',{name:'Personalizar painel',exact:true}).click();await asset.getByRole('button',{name:'Mover Indicadores e estatísticas CVM para baixo'}).click();await asset.getByRole('button',{name:'Concluir',exact:true}).click();await expect(page.getByLabel('Frequência',{exact:true})).toHaveValue('ttm');
});
