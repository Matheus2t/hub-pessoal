import {test,expect} from '@playwright/test';

for(const width of [1366,768,390,320]) test('Renda Fixa tem fluxo simples e responsivo em '+width,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:950});
 await page.goto('/#/renda-fixa');
 const root=page.locator('fixed-income-page .rf-refined');
 await expect(root.getByRole('heading',{name:'Renda Fixa',exact:true})).toBeVisible();
 const w=page.locator('fixed-income-page panel-workspace[area="fixed-income-simulator"]');
 await expect(w).toHaveAttribute('fixed-layout','');
 await expect(root.getByRole('heading',{name:'Monte sua simulação'})).toBeVisible();
 await expect(root.getByRole('heading',{name:'Seu resultado'})).toBeVisible();
 await expect(root.locator('.rf-empty-balance')).toContainText('—');
 await expect(root.locator('.rf-assumptions')).not.toHaveAttribute('open','');
 await expect(root.locator('.rf-tool-drawer')).not.toHaveAttribute('open','');
 await expect(root.locator('.rf-comparison-section')).not.toHaveAttribute('open','');
 const fields=root.locator('fixed-income-fields').first();
 await fields.getByLabel('Valor aplicado').fill('10000');
 await fields.getByLabel('CDI anual').fill('12');
 await fields.getByLabel('Percentual do CDI').fill('100');
 await fields.getByLabel('Data da aplicação').fill('2027-01-01');
 await fields.getByLabel('Vencimento',{exact:true}).fill('2028-01-01');
 await expect(root.getByTestId('rf-net')).toContainText('10.990,00');
 await expect(root.getByRole('heading',{name:'Resultado líquido'})).toBeVisible();
 await root.getByRole('button',{name:'Simular investimento'}).click();
 await expect(root.getByTestId('rf-net')).toBeVisible();
 if(width>900){
  const a=await w.locator('[data-panel=form]').boundingBox();
  const b=await w.locator('[data-panel=summary]').boundingBox();
  expect(a).not.toBeNull();expect(b).not.toBeNull();
  expect(a!.x).toBeLessThan(b!.x);
  expect(Math.abs(a!.y-b!.y)).toBeLessThanOrEqual(3);
 }
 await root.locator('.rf-breakdown > summary').click();
 await expect(root.locator('.rf-breakdown dl')).toBeVisible();
 await root.locator('.rf-tool-drawer > summary').click();
 await expect(root.getByRole('heading',{name:'Cenários salvos'})).toBeVisible();
 await root.locator('.rf-comparison-section > summary').click();
 await expect(root.locator('fixed-income-comparison')).toBeVisible();
 await root.locator('.rf-assumptions > summary').click();
 await expect(root.getByRole('heading',{name:'O que considerar'})).toBeVisible();
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('renda-fixa-'+theme+'.png'),animations:'disabled'});
 }
 expect(errors).toEqual([]);
});
