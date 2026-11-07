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
  await tool.getByLabel('Amortização única').fill('600');
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
