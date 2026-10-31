import { test, expect } from '@playwright/test';

async function mockSports(page: import('@playwright/test').Page) {
  await page.route('**/api/sports/**', async route => {
    const parts = new URL(route.request().url()).pathname.split('/');
    const team = parts[3]; const kind = parts[4];
    if (!kind) return route.fulfill({ json: { season: team === 'spfc' ? '2026' : '2026-2027' } });
    const base = { state: 'available', note: 'Dados simulados apenas no teste.', updated_at: '2026-10-31T10:00:00Z', items: [] as unknown[], competition: 'Liga de teste', season: '2026' };
    if (kind === 'schedule') base.items = Array.from({ length: 10 }, (_, i) => ({ id: String(i), starts_at: `2026-11-${String(i+1).padStart(2,'0')}T00:30:00Z`, home: 'Time de teste', away: `Adversário ${i+1}`, competition: 'Liga de teste', season: '2026', venue: 'Arena de teste', is_home: true, status: 'Agendado' }));
    if (kind === 'standings') base.items = [{ team: 'Time de teste', is_team: true, rank: 1, points: 30, played: 10, wins: 10, draws: 0, losses: 0, goal_difference: 20 }];
    if (kind === 'roster') base.items = [{ name: 'Atleta de teste', position: 'Atacante', number: 9 }];
    if (kind === 'results') base.items = [{ id: 'old', starts_at: '2026-10-30T22:00:00Z', home: 'Time de teste', away: 'Outro time', competition: 'Liga de teste', season: '2026', is_home: true, home_score: 2, away_score: 1, outcome: 'V', status: 'Encerrado' }];
    if (kind === 'statistics') Object.assign(base, { state: 'unavailable', note: 'Estatísticas não cobertas.' });
    return route.fulfill({ json: base });
  });
}

for (const width of [1920, 1366, 768, 390, 320]) test(`team pages responsive ${width}`, async ({ page }, info) => {
  await mockSports(page);
  await page.setViewportSize({ width, height: 1080 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/');
  const nav = page.getByRole('navigation', { name: 'Times', exact: true });
  await expect(nav.getByRole('link')).toHaveCount(3);
  await expect(nav.locator('img')).toHaveCount(3);
  await expect.poll(() => nav.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  for (const [name, route] of [['Philadelphia 76ers', '76ers'], ['São Paulo Futebol Clube', 'spfc'], ['FC Barcelona', 'barcelona']]) {
    await nav.getByRole('link', { name, exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#/${route}$`));
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('.sports-schedule .sports-games li')).toHaveCount(10);
    await expect(page.locator('.sports-schedule .sports-games li').first()).toContainText('31/10/2026');
    await expect(page.locator('.sports-schedule .sports-games li').first()).toContainText('21:30');
    await expect(page.locator('.sports-table .is-team')).toHaveCount(1);
    await expect(page.locator('.sports-players')).toContainText('Atleta de teste');
    await expect(page.locator('.sports-results')).toContainText('Vitória');
    await expect(page.locator('.sports-statistics')).toContainText('Estatísticas não cobertas.');
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${route}-${theme}.png`), fullPage: true, animations: 'disabled' });
    }
  }
  expect(errors).toEqual([]);
});

test('independent errors and missing sports data', async ({ page }) => {
  await mockSports(page);
  await page.route('**/api/sports/spfc/roster', route => route.fulfill({ json: { state: 'rate_limited', items: [], note: 'Limite de consultas atingido.', updated_at: '' } }));
  await page.goto('/#/spfc');
  await expect(page.locator('.sports-roster')).toContainText('Limite de consultas atingido.');
  await expect(page.locator('.sports-schedule .sports-games li')).toHaveCount(10);
  await expect(page.locator('.sports-roster button')).toHaveText('Tentar novamente');
});

test('season indicators render when covered and errors do not hang', async ({ page }) => {
  await mockSports(page);
  await page.route('**/api/sports/barcelona/statistics', route => route.fulfill({ json: { state: 'available', items: [{ label: 'Gols marcados', value: 40 }, { label: 'Empates', value: 0 }], note: 'Indicadores de teste.', competition: 'Liga de teste', season: '2026', updated_at: '' } }));
  await page.route('**/api/sports/barcelona/roster', route => route.fulfill({ status: 503, json: { detail: 'Teste' } }));
  await page.goto('/#/barcelona');
  await expect(page.locator('.sports-metrics')).toContainText('Gols marcados40');
  await expect(page.locator('.sports-metrics')).toContainText('Empates0');
  await expect(page.locator('.sports-roster')).toContainText('Não foi possível consultar a fonte agora.');
  await expect(page.locator('.sports-panel[aria-busy="true"]')).toHaveCount(0);
});
