import { test, expect } from '@playwright/test';

test('catalog lists all eight calculators and routes stay reachable', async ({ page }) => {
  await page.goto('/#/calculadoras');
  await expect(page.locator('tool-card')).toHaveCount(8);
  for (const [route, title] of [
    ['aposentadoria','Aposentadoria'],['aluguel-vs-financiamento','Aluguel x Financiamento'],
    ['amortizacao','Calculadora de amortização'],['custo-clt','Custo de funcionário CLT']
  ]) {
    await page.goto(`/#/${route}`);
    await expect(page.locator('extended-finance-calculator h1')).toHaveText(title);
    await expect(page.locator('extended-finance-calculator panel-workspace')).toHaveAttribute('fixed-layout','');
  }
});

test('retirement zero-rate example and invalid ages', async ({ page }) => {
  await page.goto('/#/aposentadoria');
  const tool = page.locator('extended-finance-calculator');
  await tool.getByLabel('Idade atual').fill('30');
  await tool.getByLabel('Idade de aposentadoria').fill('31');
  await tool.getByLabel('Patrimônio já investido').fill('1.000,00');
  await tool.getByLabel('Aporte mensal').fill('100,00');
  await tool.getByLabel('Renda mensal desejada, de hoje').fill('100');
  await tool.locator('summary').click();
  await tool.getByLabel('Rentabilidade efetiva anual').fill('0');
  await tool.getByLabel('Inflação anual estimada').fill('0');
  await tool.getByLabel('Taxa anual de retirada').fill('4');
  await tool.getByRole('button',{name:'Projetar aposentadoria'}).click();
  await expect(tool.locator('.metric-card').first()).toContainText('2.200,00');
  await expect(tool.locator('tbody tr')).toHaveCount(2);
  await tool.getByLabel('Idade de aposentadoria').fill('30');
  await tool.getByRole('button',{name:'Projetar aposentadoria'}).click();
  await expect(tool.getByText('Precisa ser maior que a idade atual.')).toBeVisible();
});

test('amortization saves interest and allows payment versus term', async ({ page }) => {
  await page.goto('/#/amortizacao');
  const tool = page.locator('extended-finance-calculator');
  await tool.getByLabel('Saldo devedor inicial').fill('1.200');
  await tool.getByLabel('Taxa efetiva anual').fill('0');
  await tool.getByLabel('Parcelas restantes').fill('12');
  await tool.getByLabel('Amortização única', {exact:true}).fill('600');
  await tool.getByLabel('Mês da amortização única').fill('1');
  await tool.getByRole('button',{name:'Simular amortização'}).click();
  await expect(tool.getByText('6 meses')).toBeVisible();
  await tool.getByLabel('Aplicar extra para').selectOption('payment');
  await tool.getByRole('button',{name:'Simular amortização'}).click();
  await expect(tool.getByText('0 meses')).toBeVisible();
});

test('CLT shows annual provisions once and switches tax regime', async ({ page }) => {
  await page.goto('/#/custo-clt');
  const tool = page.locator('extended-finance-calculator');
  await tool.locator('summary').click();
  await tool.getByLabel('FGTS', {exact:true}).fill('7,5');
  await expect(tool.locator('details.extended-advanced')).toHaveAttribute('open','');
  await tool.getByLabel('Salário bruto mensal').fill('3.000');
  await tool.getByLabel('Benefícios mensais').fill('0');
  await tool.getByLabel('Vale-transporte — custo da empresa').fill('0');
  await tool.getByLabel('Regime tributário').selectOption('simples');
  await tool.getByRole('button',{name:'Calcular custo CLT'}).click();
  await expect(tool.locator('.metric-card').first()).toContainText('3.600,00');
  await expect(tool.locator('.metric-card').nth(1)).toContainText('43.200,00');
  await expect(tool.locator('tbody tr')).toHaveCount(8);
});

test('housing compare uses same capital and monthly cashflow', async ({ page }) => {
  await page.goto('/#/aluguel-vs-financiamento');
  const tool = page.locator('extended-finance-calculator');
  await tool.getByLabel('Horizonte da comparação').fill('2');
  await tool.getByRole('button',{name:'Comparar cenários'}).click();
  await expect(tool.locator('.metric-card')).toHaveCount(3);
  await expect(tool.locator('tbody tr')).toHaveCount(2);
  await expect(tool.locator('svg[role=img]')).toBeVisible();
});

for (const width of [390,1366]) {
  test(`extended financial panels responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({width,height:850});
    for (const route of ['aposentadoria','aluguel-vs-financiamento','amortizacao','custo-clt']) {
      await page.goto(`/#/${route}`);
      await page.locator('extended-finance-calculator form button[type=submit]').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => document.documentElement.dataset.theme='light');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}


test('finance chart polish keeps keyboard, period filters and negative-value axis',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:860});
 // O servidor estático do CI não executa o FastAPI de juros simples.
 await page.route('**/api/finance/simple',route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({final_amount:'1120.00',total_invested:'1000.00',total_interest:'120.00',
     evolution:Array.from({length:12},(_,i)=>({
       month:i+1,deposit:'0',invested:'1000.00',balance:String(1010+10*i),interest:String(10*(i+1))
     }))
   })
 }));
 await page.goto('/#/juros-simples');
 const finance=page.locator('finance-calculator');
 await finance.getByRole('button',{name:'Calcular'}).click();
 const evolution=finance.locator('evolution-chart');
 await expect(evolution.locator('.chart-plot')).toBeVisible();
 await expect(evolution.locator('.chart-window-buttons')).toBeVisible();
 await evolution.getByRole('slider',{name:'Mês exibido no gráfico'}).focus();
 await page.keyboard.press('Home');
 await expect(evolution.locator('.chart-readout')).toContainText('Mês 0');
 await page.goto('/#/aposentadoria');
 const calculator=page.locator('extended-finance-calculator');
 await calculator.getByRole('button',{name:'Projetar aposentadoria'}).click();
 const graph=calculator.locator('.extended-chart-terminal');
 await expect(graph.locator('.extended-chart-top')).toBeVisible();
 await expect(graph.locator('.extended-chart-point')).toHaveCount(2);
 await graph.getByRole('slider',{name:'Período exibido no gráfico'}).focus();
 await page.keyboard.press('Home');
 await expect(graph.locator('.extended-chart-current')).toContainText('R$');
 for (const theme of ['dark','light']) {
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errors).toEqual([]);
});
