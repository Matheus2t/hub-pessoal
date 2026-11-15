import { test, expect } from '@playwright/test';

for (const width of [1366, 768, 390]) {
  test(`Learn dashboard insights form a balanced ${width}px grid in both themes`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/learn/en/dashboard');
    const summary = page.locator('learn-dashboard .learn-dashboard-summary');
    await expect(summary).toBeVisible();
    const insights = summary.locator('.learn-dashboard-insight');
    await expect(insights).toHaveCount(4);
    const columns = width > 1000 ? 4 : width > 520 ? 2 : 1;

    for (const theme of ['dark', 'light']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      const boxes = await insights.evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width };
      }));
      const rowCount = new Set(boxes.map(box => Math.round(box.y))).size;
      expect(rowCount).toBe(Math.ceil(boxes.length / columns));
      for (const box of boxes) expect(box.width).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 1366 && theme === 'dark' || width === 390 && theme === 'light')
        await page.screenshot({ path: info.outputPath(`learn-dashboard-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
    }
  });
}
