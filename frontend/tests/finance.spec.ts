import { test, expect } from '@playwright/test';

for (const width of [1366, 390]) {
  for (const [path, expected] of [['juros-simples', '1.030,00'], ['price', '1.020,07'], ['sac', '1.020,00']]) {
    test(`${path} calculates and displays schedule at ${width}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/#/${path}`);
      const tool = page.locator('finance-calculator');
      await tool.getByLabel('Prazo', { exact: true }).fill('3');
      const response = page.waitForResponse(r => r.url().includes('/api/finance/') && r.request().method() === 'POST');
      await tool.getByRole('button', { name: 'Calcular', exact: true }).click();
      expect((await response).status()).toBe(200);
      await expect(tool.locator('metric-card').first()).toContainText(expected);
      await tool.locator('summary').click();
      await expect(tool.locator('tbody tr')).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`${path}-${width}.png`), fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Ativar tema claro' }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${path}-${width}-light.png`), fullPage: true, animations: 'disabled' });
    });
  }
}

test('catalog search, annual units and invalid period', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Buscar calculadora' }).fill('SAC');
  await expect(page.locator('tool-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Abrir Financiamento SAC' }).click();
  const tool = page.locator('finance-calculator');
  await tool.getByLabel('Taxa informada').selectOption('annual');
  await tool.getByLabel('Período em').selectOption('years');
  await tool.getByLabel('Taxa anual').fill('0');
  await tool.getByLabel('Prazo', { exact: true }).fill('51');
  await tool.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(tool.getByRole('alert')).toContainText('50 anos');
  await tool.getByLabel('Prazo', { exact: true }).fill('1');
  await tool.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(tool.locator('metric-card').first()).toContainText('1.000,00');
  await tool.locator('summary').click();
  await expect(tool.locator('tbody tr')).toHaveCount(12);
});

test('compound accepts effective annual rate and years', async ({ page }) => {
  await page.goto('/#/calculadora');
  const tool = page.locator('compound-calculator');
  await tool.getByLabel('Taxa informada').selectOption('annual');
  await tool.getByLabel('Período em').selectOption('years');
  await tool.getByLabel('Taxa de juros anual', { exact: true }).fill('12,682503013196972');
  await tool.getByLabel('Aporte mensal', { exact: true }).fill('0');
  await tool.getByLabel('Prazo da simulação', { exact: true }).fill('1');
  await tool.getByRole('button', { name: 'Simular investimento' }).click();
  await expect(tool.locator('metric-card').first()).toContainText('1.126,84');
});
