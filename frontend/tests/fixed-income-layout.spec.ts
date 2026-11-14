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
 await expect(root.locator('fixed-income-tools')).not.toBeVisible();
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
 await expect(root.locator('.rf-tool-scenarios')).toBeVisible();
 await expect(root.locator('.rf-tool-equivalent')).toBeVisible();
 await expect(root.locator('.rf-utility-comparison .rf-scenarios .rf-scenario')).toHaveCount(2);
 const toolBox=await w.locator('.ws-grid > .ws-cell[data-panel=tools]').boundingBox();
 const comparisonBox=await w.locator('.ws-grid > .ws-cell[data-panel=comparison]').boundingBox();
 const savedBox=await root.locator('.rf-tool-scenarios').boundingBox();
 const equivalentBox=await root.locator('.rf-tool-equivalent').boundingBox();
 expect(toolBox).not.toBeNull();
 expect(comparisonBox).not.toBeNull();
 expect(savedBox).not.toBeNull();
 expect(equivalentBox).not.toBeNull();
 expect(Math.abs(toolBox!.x-comparisonBox!.x)).toBeLessThan(3);
 expect(Math.abs(toolBox!.width-comparisonBox!.width)).toBeLessThan(3);
 expect(comparisonBox!.y).toBeGreaterThanOrEqual(toolBox!.y+toolBox!.height-2);
 if(width>900){
  expect(equivalentBox!.x).toBeGreaterThan(savedBox!.x+savedBox!.width-3);
  expect(Math.abs(savedBox!.y-equivalentBox!.y)).toBeLessThan(3);
 }else{
  expect(equivalentBox!.y).toBeGreaterThanOrEqual(savedBox!.y+savedBox!.height-2);
 }
 await root.locator('.rf-tool-equivalent select').selectOption('lci');
 await root.getByRole('button',{name:'Calcular taxa equivalente'}).click();
 await expect(root.locator('.rf-equivalence-result strong')).toContainText('% do CDI');
 await expect(root.locator('.rf-equivalence-result details')).not.toHaveAttribute('open','');
 await root.locator('.rf-equivalence-result details summary').click();
 await expect(root.locator('.rf-equivalence-result details p')).toContainText('Líquidos:');
 await root.locator('.rf-assumptions > summary').click();
 await expect(root.getByRole('heading',{name:'O que considerar'})).toBeVisible();
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  const overflow=await page.evaluate(()=>({
   width:innerWidth,document:document.documentElement.scrollWidth,
   nodes:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2}).slice(0,12).map(e=>({tag:e.tagName,class:e.className?.toString().slice(0,90),right:Math.round(e.getBoundingClientRect().right)}))
  }));
  if(overflow.document>overflow.width)console.log('RF_OVERFLOW',width,theme,JSON.stringify(overflow));
  expect(overflow.document<=overflow.width).toBe(true);
  await page.screenshot({path:info.outputPath('renda-fixa-'+theme+'.png'),animations:'disabled'});
 }
 expect(errors).toEqual([]);
});


for (const width of [1366,390,320]) test('Renda Fixa minimalista mostra o essencial e mantém detalhes acessíveis em '+width,async({page})=>{
 const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message));
 await page.setViewportSize({width,height:900});
 await page.goto('/#/renda-fixa');
 const root=page.locator('fixed-income-page .rf-minimal');
 const workspace=root.locator('panel-workspace[area="fixed-income-simulator"]');
 const form=root.locator('[slot=form]');
 await expect(root.getByRole('heading',{name:'Renda Fixa',exact:true})).toBeVisible();
 await expect(root.getByRole('heading',{name:'Monte sua simulação'})).toBeVisible();
 await expect(root.getByRole('heading',{name:'Seu resultado'})).toBeVisible();
 await expect(form.locator('.rf-advanced-fields')).not.toHaveAttribute('open','');
 await expect(form.getByText('Liquidez contratada')).not.toBeVisible();
 await form.locator('.rf-advanced-fields > summary').click();
 await expect(form.getByText('Liquidez contratada')).toBeVisible();
 await form.locator('.rf-advanced-fields > summary').click();
 const fields=form.locator('fixed-income-fields');
 await fields.getByLabel('Valor aplicado').fill('10000');
 await fields.getByLabel('CDI anual').fill('12');
 await fields.getByLabel('Percentual do CDI').fill('100');
 await fields.getByLabel('Data da aplicação').fill('2027-01-01');
 await fields.getByLabel('Vencimento',{exact:true}).fill('2028-01-01');
 await expect(root.getByTestId('rf-net')).toContainText('10.990,00');
 await expect(workspace.locator('[data-panel=chart]')).toBeVisible();
 await expect(root.locator('fixed-income-chart .rf-chart-surface')).toBeVisible();
 await expect(root.getByRole('heading',{name:'Mais detalhes'})).toHaveCount(1);
 for(const selector of ['.rf-breakdown','.rf-evolution','.rf-tool-drawer','.rf-comparison-section','.rf-assumptions'])
   await expect(root.locator(selector)).not.toHaveAttribute('open','');
 await root.locator('.rf-breakdown > summary').click();
 await expect(root.locator('.rf-breakdown dl')).toBeVisible();
 await root.locator('.rf-breakdown > summary').click();
 await root.locator('.rf-comparison-section > summary').click();
 await expect(root.locator('fixed-income-comparison')).toBeVisible();
 await root.locator('.rf-comparison-section > summary').click();
 for (const theme of ['dark','light']) {
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 }
 if(width>900){
  const a=await workspace.locator('[data-panel=form]').boundingBox();
  const b=await workspace.locator('[data-panel=summary]').boundingBox();
  const chart=await workspace.locator('[data-panel=chart]').boundingBox();
  expect(a).not.toBeNull();expect(b).not.toBeNull();expect(chart).not.toBeNull();
  expect(a!.x).toBeLessThan(b!.x);
  expect(Math.abs(a!.y-b!.y)).toBeLessThan(3);
  expect(chart!.y).toBeGreaterThanOrEqual(Math.max(a!.y+a!.height,b!.y+b!.height)-1);
 }
 expect(errors).toEqual([]);
});
