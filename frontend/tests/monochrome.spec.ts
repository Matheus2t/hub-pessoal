import { test, expect } from '@playwright/test';
import { filterTools, getCategories, tools } from '../src/catalog';

test('new categories are derived automatically and Todas remains last', () => {
  const future = [...tools, { ...tools[0], id: 'files', name: 'Arquivo', category: 'Arquivos' }, { ...tools[0], id: 'utilities', name: 'Utilidade', category: 'Utilitários' }];
  expect(getCategories()).toEqual(['Calculadoras', 'Todas']);
  expect(getCategories(future)).toEqual(['Arquivos', 'Calculadoras', 'Utilitários', 'Todas']);
  expect(filterTools('Calculadoras', '', future)).toHaveLength(4);
  expect(filterTools('Todas', '', future)).toHaveLength(6);
  expect(filterTools('Todas', 'utilidade', future)).toHaveLength(1);
});

for (const theme of ['dark', 'light']) {
  test(`painted UI remains monochrome in ${theme} theme`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('2t:theme', value), theme);
    const check = async () => {
      // Check actual browser styles, including SVG strokes/fills and focus outlines.
      const colored = await page.evaluate(() => {
        const bad: string[] = [];
        for (const element of document.querySelectorAll('body *')) {
          if (!element.getClientRects().length) continue;
          for (const pseudo of [null, '::before', '::after']) {
            const style = getComputedStyle(element, pseudo);
            for (const property of ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'fill', 'stroke', 'accent-color', 'text-decoration-color']) {
              const value = style.getPropertyValue(property);
              const match = value.match(/^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
              if (match && (match[1] !== match[2] || match[2] !== match[3])) bad.push(`${element.tagName}.${element.getAttribute('class') || ''} ${property}: ${value}`);
            }
          }
        }
        return [...new Set(bad)];
      });
      expect(colored).toEqual([]);
    };
    for (const route of ['', 'calculadoras', 'acoes/comparar', 'calculadora', 'juros-simples', 'price', 'sac']) {
      await page.goto(`/#/${route}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      if (route === 'calculadoras') {
        await expect(page.locator('.category-filters button')).toHaveText(['Calculadoras', 'Todas']);
        await expect(page.getByRole('button', { name: 'Calculadoras', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('tool-card')).toHaveCount(4);
        await page.getByRole('button', { name: 'Todas', exact: true }).click();
        await expect(page.locator('tool-card')).toHaveCount(4);
        await check();
        await page.screenshot({ path: `test-results/catalog-${theme}.png` });
      } else if (route === 'acoes/comparar') {
        await expect(page.locator('financial-comparison table')).toBeVisible();
        await check();
      } else if (!route) {
        const card = page.getByRole('link', { name: 'Abrir calculadora' });
        await card.hover();
        await card.focus();
        await check();
      } else {
        const tool = page.locator(route === 'calculadora' ? 'compound-calculator' : 'finance-calculator');
        await tool.getByRole('button', { name: route === 'calculadora' ? 'Simular investimento' : 'Calcular', exact: true }).click();
        await expect(tool.locator('metric-card').first()).toBeVisible();
        await check();
        if (route === 'calculadora') {
          await tool.getByLabel('Prazo da simulação', { exact: true }).fill('0');
          await tool.getByRole('button', { name: 'Simular investimento' }).click();
          await expect(tool.locator('[aria-invalid="true"]')).toBeVisible();
          await check();
        }
      }
    }
  });
}
