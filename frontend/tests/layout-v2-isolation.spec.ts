import {test,expect} from '@playwright/test';

test('old calculator preferences cannot hide panels, while actions customization remains independent',async({page})=>{
 await page.goto('/#/');
 await page.evaluate(()=>localStorage.setItem('2t:panels:v1:calculator-compound',JSON.stringify({
  version:1,mode:'custom',panels:[
   {id:'form',visible:true,size:'small'},
   {id:'summary',visible:false,size:'small'},
   {id:'chart',visible:false,size:'small'},
   {id:'table',visible:false,size:'small'}
  ]
 })));
 await page.goto('/#/calculadora');
 const w=page.locator('compound-calculator panel-workspace');
 await expect(w).toHaveAttribute('fixed-layout','');
 await expect(w.getByRole('button',{name:'Personalizar painel'})).toHaveCount(0);
 await page.getByRole('button',{name:'Simular investimento'}).click();
 for(const id of ['summary','chart','table'])await expect(w.locator(`[data-panel=${id}]`)).toBeVisible();

 for(const route of ['/','learn','learn/en','learn/ru']){
  await page.goto('/#/'+route);
  await expect(page.locator('.app-layout')).not.toHaveClass(/finance-workspace/);
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Personalizar painel'})).toBeHidden();
  expect(await page.locator('html').evaluate(e=>getComputedStyle(e).getPropertyValue('--ws-surface').trim())).toBe('');
 }
 await page.goto('/#/acoes');
 const stocks=page.locator('market-page panel-workspace');
 await expect(stocks.getByRole('button',{name:'Personalizar painel'})).toBeVisible();
 await stocks.getByRole('button',{name:'Personalizar painel'}).click();
 await expect(stocks.getByRole('dialog',{name:'Personalizar painel'})).toBeVisible();
 await page.evaluate(()=>location.hash='#/');
 await expect(stocks.getByRole('dialog',{name:'Personalizar painel'})).toBeHidden();
});
