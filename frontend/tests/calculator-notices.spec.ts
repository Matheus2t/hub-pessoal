import { test, expect } from '@playwright/test';

// All four catalog calculators share these two UI components.
// Verify the generic footer copy stays hidden without changing calculations.
for (const route of ['calculadora', 'juros-simples', 'price', 'sac']) {
  test(`calculator ${route} omits generic notices and keeps its form`, async ({page}) => {
    await page.goto(`/#/${route}`);
    const calculator = page.locator(route === 'calculadora' ? 'compound-calculator' : 'finance-calculator');
    await expect(calculator.locator('form')).toBeVisible();
    await expect(calculator.locator('.privacy-note')).toHaveCount(0);
    await expect(calculator.locator(':scope > .disclaimer')).toHaveCount(0);
    await expect(page.getByText(/histórico público (?:de simulações )?(?:está )?desativado/i)).toHaveCount(0);
    await expect(page.getByText(/não representam garantia de rentabilidade|não garante rendimentos/i)).toHaveCount(0);
    await expect(calculator.locator('panel-workspace')).toBeVisible();
  });
}
