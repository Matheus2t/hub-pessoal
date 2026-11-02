import {test,expect} from '@playwright/test';

test('PETR4 exposes document-verified reconciled quarters',async({page,request})=>{
 const m=await(await request.get('/financials/manifest.json')).json();
 const count=m.derived_coverage.PETR4;expect(count).toBeGreaterThanOrEqual(3);
 await page.setViewportSize({width:390,height:900});
 await page.route('https://s3.tradingview.com/**',route=>route.abort());
 await page.route('https://widgets.tradingview-widget.com/**',route=>route.abort());
 await page.goto('/#/acoes/PETR4');
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 await expect(page.locator('financial-analysis .financial-metrics')).toBeVisible();
 const reconciliations=page.locator('financial-analysis details.financial-derived');
 await expect(reconciliations).toHaveCount(1);
 await reconciliations.locator('summary').click();
 await expect(reconciliations.locator('tbody tr')).toHaveCount(count);
 await expect(reconciliations).toContainText('2025-04-01 a 2025-06-30');
 await expect(reconciliations).toContainText('2025-07-01 a 2025-09-30');
 await expect(reconciliations).toContainText('2026-04-01 a 2026-06-30');
 await expect(reconciliations).toContainText('não representam TTM');
 await expect(reconciliations.getByRole('link',{name:'Trimestre de controle'})).toHaveCount(count);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('unreconciled company does not display a fake derived-quarter section',async({page})=>{
 await page.goto('/#/acoes/WEGE3');
 await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
 await expect(page.locator('financial-analysis .financial-metrics')).toBeVisible();
 await expect(page.locator('financial-analysis details.financial-derived')).toHaveCount(0);
});
