import {test,expect} from '@playwright/test';

for(const width of [1920,1366,768,390,320])test(`fixed income panel preferences ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1080});await page.goto('/#/renda-fixa');
 const w=page.locator('fixed-income-page > article > panel-workspace'),f=w.locator('[slot=form] fixed-income-fields');
 await f.getByLabel('Valor aplicado').fill('10000');await f.getByLabel('CDI anual').fill('12');await f.getByLabel('Percentual do CDI').fill('100');await f.getByLabel('Data da aplicação').fill('2027-01-01');await f.getByLabel('Vencimento',{exact:true}).fill('2028-01-01');
 await expect(page.getByTestId('rf-net')).toContainText('10.990,00');
  const form=await w.locator('[data-panel=form]').boundingBox(),summary=await w.locator('[data-panel=summary]').first().boundingBox();if(width>900){expect(form!.x).toBeLessThan(summary!.x);expect(Math.abs(form!.y-summary!.y)).toBeLessThan(2);}
 await w.getByRole('button',{name:'Essencial',exact:true}).first().click();await expect(w.locator('[data-panel=taxes]').first()).toBeHidden();await expect(w.locator('[data-panel=chart]').first()).toBeVisible();await expect(f).toBeVisible();
 await w.getByRole('button',{name:'Completo',exact:true}).first().click();await w.getByRole('button',{name:'Personalizar painel',exact:true}).first().click();
 await w.getByRole('checkbox',{name:'Impostos e custos',exact:true}).uncheck();await w.getByRole('button',{name:'Mover Gráfico de evolução para cima',exact:true}).click();await w.getByRole('button',{name:'Concluir',exact:true}).first().click();await expect(page.getByTestId('rf-net')).toContainText('10.990,00');
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await f.getByLabel('Investimento',{exact:true}).focus();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath(`fixed-${theme}.png`),fullPage:true,animations:'disabled'});}
 await page.reload();await expect(w.getByRole('button',{name:'Personalizado',exact:true}).first()).toHaveAttribute('aria-pressed','true');
 await page.locator('.rf-comparison-section > summary').click();const c=page.locator('fixed-income-comparison'),cw=c.locator('panel-workspace');
 await expect(cw.getByRole('button',{name:'Completo',exact:true})).toHaveAttribute('aria-pressed','true');
 await c.getByLabel('Valor inicial comum').fill('10000');await c.getByLabel('Data inicial comum').fill('2027-01-01');await c.getByLabel('Horizonte de comparação').fill('2028-01-01');await c.getByLabel('CDI anual comum').fill('12');
 await c.getByRole('region',{name:'Cenário 1',exact:true}).getByLabel('Percentual do CDI').fill('100');await c.getByRole('region',{name:'Cenário 2',exact:true}).getByLabel('Percentual do CDI').fill('90');
 await expect(c.locator('.rf-comparison-table')).toContainText('10.990,00');await cw.getByRole('button',{name:'Essencial',exact:true}).click();await expect(cw.locator('[data-panel=table]')).toBeHidden();
 await cw.getByRole('button',{name:'Personalizar painel',exact:true}).click();await cw.getByRole('checkbox',{name:'Resultado comparativo',exact:true}).uncheck();await cw.getByRole('button',{name:'Concluir',exact:true}).click();await expect(cw.locator('[data-panel=chart]')).toBeVisible();await expect(c.locator('.rf-comparison-table')).toBeHidden();
 await cw.getByRole('button',{name:'Personalizar painel',exact:true}).click();await cw.getByRole('button',{name:'Restaurar layout padrão'}).click();await cw.getByRole('button',{name:'Concluir',exact:true}).click();await expect(c.locator('.rf-comparison-table')).toContainText('10.990,00');
});

