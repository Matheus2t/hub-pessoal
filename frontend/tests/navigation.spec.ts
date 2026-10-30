import { test, expect } from '@playwright/test';

for (const width of [1920, 1366, 768, 390, 320]) {
  test(`direct-access home at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/');
    await expect(page).toHaveTitle('Início · 2T — Ferramentas');
    await expect(page.getByRole('heading', { name: 'Ferramentas', exact: true })).toBeVisible();
    await expect(page.locator('tool-card')).toHaveCount(4);
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav.getByRole('link')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Início', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveCount(0);
    const filters = page.getByRole('group', { name: 'Filtrar por categoria' });
    await filters.getByRole('button', { name: 'Crédito', exact: true }).click();
    await expect(page.locator('tool-card')).toHaveCount(2);
    await page.getByRole('searchbox').fill('sac');
    await expect(page.locator('tool-card')).toHaveCount(1);
    await page.getByRole('searchbox').fill('inexistente');
    await expect(page.getByRole('status')).toContainText('Nenhuma calculadora');
    await page.getByRole('searchbox').fill('');
    await filters.getByRole('button', { name: 'Todas', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true, animations: 'disabled' });
    const card = page.getByRole('link', { name: 'Abrir Financiamento SAC' });
    await card.focus();
    await expect(card).toBeFocused();
    const bounds = await card.boundingBox();
    if (!bounds) throw Error('Card sem área clicável');
    await page.mouse.click(bounds.x + 5, bounds.y + 5);
    await expect(page).toHaveURL(/#\/sac$/);
    await page.getByRole('navigation', { name: 'Caminho da página' }).getByRole('link', { name: 'Início', exact: true }).click();
    await expect(page.locator('tool-card')).toHaveCount(4);
    await page.getByRole('button', { name: 'Ativar tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.screenshot({ path: info.outputPath(`home-light-${width}.png`), fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('legacy catalogs redirect home and tool routes remain accessible', async ({ page }) => {
  for (const alias of ['calculadoras', 'ferramentas']) {
    await page.goto(`/#/${alias}`);
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('tool-card')).toHaveCount(4);
  }
  for (const [route, title] of [['calculadora', 'Juros compostos'], ['juros-simples', 'Juros simples'], ['price', 'Financiamento PRICE'], ['sac', 'Financiamento SAC']]) {
    await page.goto(`/#/${route}`);
    await expect(page).toHaveTitle(`${title} · 2T — Ferramentas`);
    const crumbs = page.getByRole('navigation', { name: 'Caminho da página' });
    await expect(crumbs.getByRole('link')).toHaveCount(1);
    await crumbs.getByRole('link', { name: 'Início', exact: true }).click();
    await expect(page.locator('tool-card')).toHaveCount(4);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`#/${route}$`));
  }
});
