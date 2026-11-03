import {test,expect} from '@playwright/test';

for(const width of [1366,768,390,320]) {
 test('rankings layout and CVM filters at '+width,async({page})=>{
  await page.setViewportSize({width,height:960});
  await page.goto('/#/acoes/rankings');
  const rankings=page.locator('market-rankings');
  await expect(rankings.getByRole('heading',{name:'Rankings por setor'})).toBeVisible();
  await expect(rankings.getByRole('heading',{name:'Explorar indicadores'})).toBeVisible();
  await expect(rankings.getByRole('heading',{name:'Resultados por setor'})).toBeVisible();
  await expect(rankings.getByLabel('Setor',{exact:true})).toBeVisible();
  await expect(rankings.getByLabel('Indicador',{exact:true})).toHaveValue('roe');
  await expect(rankings.getByLabel('Exercício',{exact:true})).toHaveValue('2025-12-31');
  await expect(rankings.locator('.rk-group')).not.toHaveCount(0);
  const rows=rankings.locator('.rk-table tbody tr');
  await expect(rows).toHaveCount(56);
  await expect(rankings.locator('.rk-summary')).toContainText('56');
  await expect(rankings.locator('.rk-source a').first()).toHaveAttribute('target','_blank');
  await expect(rankings.locator('.rk-company a').first()).toHaveAttribute('href',/#\/acoes\//);
  await expect(rankings.locator('.rk-method')).not.toHaveAttribute('open');
  await rankings.locator('.rk-method summary').click();
  await expect(rankings.locator('.rk-method')).toHaveAttribute('open');
  await expect(rankings.locator('.rk-method')).toContainText('não representa toda a B3');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const sectorControl=rankings.getByLabel('Setor',{exact:true});
  const specific=await sectorControl.locator('option').nth(1).textContent();
  await sectorControl.selectOption({index:1});
  await expect(rankings.locator('.rk-group-header h3').first()).toHaveText(specific||'');
  const filtered=await rows.count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(56);
  await rankings.getByLabel('Indicador',{exact:true}).selectOption('net_margin');
  await expect(rankings.getByLabel('Indicador',{exact:true})).toHaveValue('net_margin');
  await rankings.getByLabel('Exercício',{exact:true}).selectOption('2024-12-31');
  await expect(rankings.getByLabel('Exercício',{exact:true})).toHaveValue('2024-12-31');
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(rankings.locator('.rk-panel')).toHaveCSS('background-color','rgb(242, 242, 242)');
 });
}
