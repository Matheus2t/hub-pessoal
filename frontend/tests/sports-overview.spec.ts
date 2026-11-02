import { test, expect } from '@playwright/test';

test('rapid club navigation reuses one aggregate request per team', async ({ page }) => {
  const calls: Record<string, number> = {};
  let individual = 0;
  await page.route('**/api/sports/**', async route => {
    const url = new URL(route.request().url());
    const team = url.pathname.split('/')[3];
    if (url.search !== '?include=all') { individual++; return route.abort(); }
    calls[team] = (calls[team] || 0) + 1;
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ json: { season: '2026', sections: Object.fromEntries(['schedule', 'results', 'standings', 'statistics'].map(kind => [kind, { state: kind === 'statistics' ? 'rate_limited' : 'empty', items: [], note: 'Test only', updated_at: '' }])) } });
  });
  await page.goto('/#/76ers');
  for (const team of ['spfc','barcelona','76ers','spfc','barcelona','76ers']) {
    await page.locator('.teams-menu summary').click();
    await page.locator(`team-shortcuts a[href="#/${team}"]`).click();
  }
  await expect(page.locator('.sports-panel[aria-busy="true"]')).toHaveCount(0);
  await expect(page.locator('.sports-standings, .sports-statistics')).toHaveCount(0);
  await page.locator('.teams-menu summary').click();
  await page.locator('team-shortcuts a[href="#/barcelona"]').click();
  await expect(page.locator('.sports-statistics')).toContainText('Limite de consultas');
  await expect(page.locator('.sports-roster, .sports-lineup')).toHaveCount(0);
  expect(calls).toEqual({ '76ers': 1, spfc: 1, barcelona: 1 });
  expect(individual).toBe(0);
});
