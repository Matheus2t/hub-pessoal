import {test,expect} from '@playwright/test';

for(const width of [1920,1366,768,390,320])test(`real PETR4 TTM, operands and themes ${width}`,async({page,request},info)=>{
 await page.setViewportSize({width,height:1000});
 await page.route('https://s3.tradingview.com/**',r=>r.abort());
 await page.route('https://widgets.tradingview-widget.com/**',r=>r.abort());
 const manifest=await(await request.get('/financials/manifest.json')).json();
 const data=await(await request.get('/financials/'+manifest.companies.PETR4.path)).json();
 expect(data.ttm_periods.map((p:any)=>p.values.profit)).toEqual([110605000000,108035000000,133756000000]);
 await page.goto('/#/acoes/PETR4');
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 await page.getByLabel('Frequência',{exact:true}).selectOption('ttm');
 await expect(page.locator('.financial-metrics')).toContainText('133,76');
 await expect(page.locator('.financial-ttm')).toContainText('2025-07-01 a 2026-06-30');
 await expect(page.locator('.financial-ttm tbody tr')).toHaveCount(4);
 await expect(page.locator('.financial-ttm tbody a')).toHaveCount(4);
 await expect(page.locator('.financial-chart circle')).toHaveCount(3);
 await page.locator('.financial-ttm summary').click();
 await expect(page.getByRole('link',{name:'Snapshot com evidências e valores exatos'})).toHaveAttribute('href','/financials/'+manifest.companies.PETR4.path);
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.financial-ttm').screenshot({path:info.outputPath(`ttm-${theme}.png`),animations:'disabled'});
 }
 await page.getByLabel('Referência',{exact:true}).selectOption('2025-12-31');
 await expect(page.locator('.financial-metrics')).toContainText('110,61');
 await page.goto('/#/acoes/WEGE3');
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 await expect(page.locator('.financial-metrics')).toBeVisible();
 await expect(page.locator('#cvm-frequency option[value=ttm]')).toHaveCount(0);
 await expect(page.locator('.financial-ttm')).toHaveCount(0);
});
