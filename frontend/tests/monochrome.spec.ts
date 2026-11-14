import { test, expect } from '@playwright/test';
import { filterTools, getCategories, tools } from '../src/catalog';

test('new categories are derived automatically and Todas remains last', () => {
  const future = [...tools, { ...tools[0], id: 'files', name: 'Arquivo', category: 'Arquivos' }, { ...tools[0], id: 'utilities', name: 'Utilidade', category: 'Utilitários' }];
  expect(getCategories()).toEqual(['Calculadoras', 'Todas']);
  expect(getCategories(future)).toEqual(['Arquivos', 'Calculadoras', 'Utilitários', 'Todas']);
  expect(filterTools('Calculadoras', '', future)).toHaveLength(8);
  expect(filterTools('Todas', '', future)).toHaveLength(10);
  expect(filterTools('Todas', 'utilidade', future)).toHaveLength(1);
});

for (const theme of ['dark', 'light']) {
  test(`painted UI remains monochrome in ${theme} theme`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('2t:theme', value), theme);
    await page.route('**/api/calculations', route => route.fulfill({status:200,json:{total_invested:'1300.00',total_interest:'33.31',final_amount:'1333.31',evolution:[{month:1,interest:'10.00',deposit:'100.00',balance:'1110.00',invested:'1100.00'},{month:2,interest:'11.10',deposit:'100.00',balance:'1221.10',invested:'1200.00'},{month:3,interest:'12.21',deposit:'100.00',balance:'1333.31',invested:'1300.00'}]}}));
    await page.route('**/api/finance/**', route => route.fulfill({status:200,json:route.request().url().endsWith('/simple')?{total_invested:'1000.00',total_interest:'120.00',final_amount:'1120.00',evolution:[{month:1,interest:'10.00',deposit:0,balance:'1010.00',invested:'1000.00'}]}:{total_paid:'1066.67',total_interest:'66.67',first_payment:'88.89',last_payment:'88.89',schedule:[{month:1,payment:'88.89',amortization:'80.00',interest:'8.89',balance:'920.00'}]}}));
    const check = async () => {
      // Check actual browser styles, including SVG strokes/fills and focus outlines.
      const colored = await page.evaluate(() => {
        const bad: string[] = [];
        for (const element of document.querySelectorAll('body *')) {
          // Official team badge frames keep their established club colors.
          if (!element.getClientRects().length || element.matches('.team-crest-frame')) continue;
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
        await expect(page.locator('.category-filters')).toHaveCount(0);
        await expect(page.locator('calculator-catalog tool-card')).toHaveCount(8);
        await check();
        await page.screenshot({ path: `test-results/catalog-${theme}.png` });
      } else if (route === 'acoes/comparar') {
        await expect(page.locator('financial-comparison table').first()).toBeVisible();
        await check();
      } else if (!route) {
        const card = page.locator('home-page').getByRole('link', { name: /Calculadoras/ });
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
