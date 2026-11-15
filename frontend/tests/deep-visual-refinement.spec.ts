import { expect, test } from '@playwright/test';

const widths = [320, 390, 768, 1024, 1366, 1440, 1920];
const themes = ['dark', 'light'] as const;

test('Renda Fixa mantém os painéis alinhados no desktop e usa uma coluna em telas estreitas', async ({ page }) => {
  await page.goto('/#/renda-fixa');
  const workspace = page.locator('fixed-income-page .rf-minimal panel-workspace[area="fixed-income-simulator"]');
  const grid = workspace.locator('.ws-grid');
  const form = grid.locator('.ws-cell[data-panel="form"]');
  const result = grid.locator('.ws-cell[data-panel="empty"]');

  for (const theme of themes) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(form).toBeVisible();
      await expect(result).toBeVisible();
      const layout = await page.evaluate(() => {
        const host = document.querySelector('fixed-income-page panel-workspace[area="fixed-income-simulator"]') as HTMLElement;
        const shadow = host.shadowRoot!;
        const grid = shadow.querySelector('.ws-grid')!;
        const a = shadow.querySelector('[data-panel="form"]')!.getBoundingClientRect();
        const b = shadow.querySelector('[data-panel="empty"]')!.getBoundingClientRect();
        return { columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          form: { x: a.x, y: a.y, width: a.width, height: a.height },
          result: { x: b.x, y: b.y, width: b.width, height: b.height },
          viewport: innerWidth, document: document.documentElement.scrollWidth };
      });
      expect(layout.document, `${width}px ${theme} overflow`).toBeLessThanOrEqual(layout.viewport);
      if (width > 900) {
        expect(layout.form.x).toBeLessThan(layout.result.x);
        expect(Math.abs(layout.form.y - layout.result.y)).toBeLessThanOrEqual(2);
        expect(Math.abs(layout.form.height - layout.result.height)).toBeLessThanOrEqual(3);
      } else {
        expect(layout.columns).toBe(1);
        expect(layout.result.y).toBeGreaterThanOrEqual(layout.form.y + layout.form.height - 1);
        expect(Math.abs(layout.form.x - layout.result.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(layout.form.width - layout.result.width)).toBeLessThanOrEqual(1);
      }
    }
  }
});

test('Juros Compostos usa o painel de resultados como contraponto visual ao formulário vazio', async ({ page }) => {
  await page.goto('/#/calculadora');
  const workspace = page.locator('compound-calculator panel-workspace[area="calculator-compound"]');
  const form = workspace.locator('.ws-cell[data-panel="form"]');
  const empty = workspace.locator('.ws-cell[data-panel="empty"]');
  const emptyContent = page.locator('compound-calculator').locator('.calculator-empty');

  for (const width of [320, 390, 768, 1024, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const formBox = await form.boundingBox();
    const emptyBox = await empty.boundingBox();
    expect(formBox).not.toBeNull();
    expect(emptyBox).not.toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width > 900) {
      expect(Math.abs(formBox!.height - emptyBox!.height)).toBeLessThanOrEqual(3);
      await expect(emptyContent).toHaveCSS('text-align', 'center');
    } else {
      expect(emptyBox!.y).toBeGreaterThanOrEqual(formBox!.y + formBox!.height - 1);
      expect(emptyBox!.height).toBeLessThan(220);
    }
  }
});

test('atalhos de Ações ficam inteiros e acessíveis no celular', async ({ page }) => {
  const labels = ['Comparar empresas', 'Rankings por setor', 'Simulador de aportes', 'Proventos', 'DY manual'];
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/acoes');
    const nav = page.getByRole('navigation', { name: 'Ferramentas de análise' });
    await expect(nav.getByRole('link')).toHaveCount(5);
    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    for (const label of labels) {
      const link = nav.getByRole('link', { name: label, exact: true });
      const box = await link.boundingBox();
      expect(box, `${label} em ${width}px`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(navBox!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(navBox!.x + navBox!.width + 1);
      await expect(link).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
