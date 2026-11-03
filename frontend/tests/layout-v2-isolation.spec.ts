import {test,expect} from '@playwright/test';

test('financial settings never enable the workspace on Home or Learn',async({page})=>{
 await page.goto('/#/calculadora');
 const w=page.locator('compound-calculator panel-workspace');await w.getByRole('button',{name:'Essencial',exact:true}).click();
 await w.getByRole('button',{name:'Personalizar painel',exact:true}).click();await expect(w.locator('dialog')).toBeVisible();
 await page.evaluate(()=>location.hash='#/');await expect(w.locator('dialog')).toBeHidden();
 for(const route of ['/','learn','learn/en','learn/ru']){
  await page.goto('/#/'+route);await expect(page.locator('.app-layout')).not.toHaveClass(/finance-workspace/);
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Personalizar painel',exact:true})).toBeHidden();
  expect(await page.locator('html').evaluate(e=>getComputedStyle(e).getPropertyValue('--ws-surface').trim())).toBe('');
 }
 await page.goto('/#/calculadora');await expect(w.getByRole('button',{name:'Essencial',exact:true})).toHaveAttribute('aria-pressed','true');
});
