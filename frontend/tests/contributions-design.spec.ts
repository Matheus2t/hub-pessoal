import {test,expect} from '@playwright/test';

for (const width of [1366,768,390,320]) {
 test('simulador de aportes com resultados e gráfico responsivos em '+width,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:900});
  await page.goto('/#/acoes/aportes');
  const simulator=page.locator('market-contributions');
  await expect(simulator.getByRole('heading',{name:'Simulador de aportes em ações'})).toBeVisible();
  await expect(simulator.locator('.mc-form')).toBeVisible();
  await expect(simulator.locator('.mc-result-card')).toHaveCount(4);
  await expect(simulator.locator('.mc-chart-path')).toHaveCount(3);
  await expect(simulator.locator('.mc-plan-value')).toContainText('13.000');
  await expect(simulator.getByText('Patrimônio projetado:').first()).toBeVisible();
  await simulator.getByLabel('Aporte mensal (R$)').fill('200');
  await expect(simulator.locator('.mc-plan-value')).toContainText('25.000');
  await expect(simulator.locator('.mc-result-invested')).toContainText('25.000');
  await simulator.getByLabel('Dividendos hipotéticos (% a.a.)').fill('6');
  await simulator.getByLabel('Reinvestir dividendos').uncheck();
  await expect(simulator.locator('.mc-reinvest')).toContainText('acumulados separadamente');
  await simulator.locator('.mc-history summary').click();
  await expect(simulator.locator('.mc-history tbody tr')).toHaveCount(120);
  await expect(simulator.locator('.mc-history th')).toContainText(['Mês','Total investido','Cenário 1','Cenário 2','Dividendos em caixa (1 / 2)']);
  await simulator.locator('#mc-month-range').fill('12');
  await expect(simulator.locator('.mc-chart-readout')).toContainText('12 de 120');
  await simulator.getByRole('button',{name:'Simular aportes'}).click();
  await expect(simulator.locator('.mc-results')).toBeVisible();
  for(const theme of ['dark','light']){
   await page.evaluate(v=>document.documentElement.dataset.theme=v,theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:info.outputPath('aportes-'+theme+'.png'),animations:'disabled'});
  }
  expect(errors).toEqual([]);
 });
}
