import { test, expect } from '@playwright/test';

for (const width of [1366, 390, 320]) {
  test(`platform home and calculator area at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/');
    await expect(page).toHaveTitle('Início · 2T — Ferramentas');
    await expect(page.getByRole('heading', { name: 'Sua plataforma de ferramentas' })).toBeVisible();
    await expect(page.locator('calculator-catalog')).toHaveCount(0);
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Explorar calculadoras' }).click();
    await expect(page).toHaveURL(/#\/calculadoras$/);
    await expect(page.getByRole('heading', { name: 'Calculadoras', exact: true })).toBeVisible();
    await expect(page.locator('tool-card')).toHaveCount(4);
    const filters = page.getByRole('group', { name: 'Filtrar por categoria' });
    await filters.getByRole('button', { name: 'Crédito', exact: true }).click();
    await expect(page.locator('tool-card')).toHaveCount(2);
    await page.getByRole('searchbox').fill('sac');
    await expect(page.locator('tool-card')).toHaveCount(1);
    await page.getByRole('searchbox').fill('inexistente');
    await expect(page.getByRole('status')).toContainText('Nenhuma calculadora');
    await page.getByRole('searchbox').fill('');
    await filters.getByRole('button', { name: 'Todas', exact: true }).click();
    await page.screenshot({ path: info.outputPath(`catalog-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Abrir Financiamento SAC' }).click();
    const breadcrumbs = page.getByRole('navigation', { name: 'Caminho da página' });
    await expect(breadcrumbs).toContainText('Financiamento SAC');
    await expect(page.locator('app-sidebar a[aria-current="page"]')).toHaveText('02Calculadoras');
    await breadcrumbs.getByRole('link', { name: 'Calculadoras', exact: true }).click();
    await expect(page.locator('tool-card')).toHaveCount(4);
    await page.getByRole('button', { name: 'Ativar tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.screenshot({ path: info.outputPath(`catalog-light-${width}.png`), fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('legacy catalog redirects and all tool links retain area context', async ({ page }) => {
  await page.goto('/#/ferramentas');
  await expect(page).toHaveURL(/#\/calculadoras$/);
  for (const [route, title] of [['calculadora', 'Juros compostos'], ['juros-simples', 'Juros simples'], ['price', 'Financiamento PRICE'], ['sac', 'Financiamento SAC']]) {
    await page.goto(`/#/${route}`);
    await expect(page).toHaveTitle(`${title} · 2T — Ferramentas`);
    await expect(page.locator('app-sidebar a[aria-current="page"]')).toHaveAttribute('href', '#/calculadoras');
    await page.getByRole('navigation', { name: 'Caminho da página' }).getByRole('link', { name: 'Calculadoras', exact: true }).click();
    await expect(page.locator('tool-card')).toHaveCount(4);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`#/${route}$`));
  }
});
