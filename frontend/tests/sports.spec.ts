import { test, expect } from '@playwright/test';

async function mockSports(page: import('@playwright/test').Page) {
  await page.route('**/api/sports/**', async route => {
    const parts = new URL(route.request().url()).pathname.split('/');
    const team = parts[3]; const kind = parts[4];
    if (!kind) return route.fulfill({ json: { season: team === 'spfc' ? '2026' : '2026-2027' } });
    const base = { state: 'available', note: 'Dados simulados apenas no teste.', updated_at: '2026-10-31T10:00:00Z', items: [] as unknown[], competition: 'Liga de teste', season: '2026' };
    if (kind === 'schedule') base.items = Array.from({ length: 10 }, (_, i) => ({ id: String(i), starts_at: `2026-11-${String(i+1).padStart(2,'0')}T00:30:00Z`, home: 'Time de teste', away: `Adversário ${i+1}`, competition: 'Liga de teste', season: '2026', venue: 'Arena de teste', is_home: true, status: 'Agendado' }));
    if (kind === 'standings') base.items = [{ team: 'Time de teste', is_team: true, rank: 1, points: 30, played: 10, wins: 10, draws: 0, losses: 0, goal_difference: 20 }];
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
  await page.locator('.teams-menu summary').click();
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.locator('img')).toHaveCount(3);
  await expect.poll(() => nav.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  for (const [name, route] of [['Philadelphia 76ers', '76ers'], ['São Paulo Futebol Clube', 'spfc'], ['FC Barcelona', 'barcelona']]) {
    if(!await page.locator('.teams-menu').evaluate(e=>(e as HTMLDetailsElement).open))await page.locator('.teams-menu summary').click();
    await nav.getByRole('link', { name, exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#/${route}$`));
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('.sports-schedule .sports-games li')).toHaveCount(10);
    await expect(page.locator('.sports-schedule time').first()).toHaveAttribute('aria-label', /31\/10\/2026/);
    await expect(page.locator('.sports-schedule .sports-games li').first()).toContainText('21:30');
    if (route === '76ers') {
      await expect(page.locator('.sports-standings, .sports-statistics')).toHaveCount(0);
    } else {
      await expect(page.locator('.sports-table .is-team')).toHaveCount(1);
    }
    await expect(page.locator('.sports-roster, .sports-lineup')).toHaveCount(0);
    await expect(page.locator('.sports-results')).toContainText('Vitória');
    if (route !== '76ers') await expect(page.locator('.sports-statistics')).toContainText('Estatísticas ainda não disponíveis.');
    await expect(page.locator('.sports-next .sports-contender')).toHaveCount(2);
    await expect(page.locator('.sports-results .sports-score')).toHaveAttribute('aria-label', 'Time de teste: 2. Outro time: 1.');
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('.teams-menu summary').click();
      const badge = await nav.locator('[data-team="76ers"]').evaluate(element => ({
        background: getComputedStyle(element).backgroundColor,
        radius: getComputedStyle(element).borderRadius,
        imageWidth: (element.querySelector('img') as HTMLImageElement).getBoundingClientRect().width,
      }));
      expect(badge.background).not.toBe('rgb(244, 244, 244)');
      expect(badge.radius).toBe('9px');
      expect(badge.imageWidth).toBe(30);
      await expect(nav.locator('[data-team="76ers"] img')).toHaveAttribute('src', '/teams/76ers-contrast.svg');
      expect(await nav.locator('[data-team="76ers"]').evaluate(element => getComputedStyle(element).backgroundImage)).toContain('gradient');
      await page.locator('.teams-menu summary').click();
      await page.screenshot({ path: info.outputPath(`${route}-${theme}.png`), fullPage: true, animations: 'disabled' });
    }
  }
  expect(errors).toEqual([]);
});

test('single fixture and compact unavailable sections keep coverage accessible', async ({ page }) => {
  await mockSports(page);
  await page.route('**/api/sports/spfc/schedule', route => route.fulfill({ json: { state: 'available', items: [{ id: 'one', starts_at: '2026-11-05T00:30:00Z', home: 'São Paulo', away: 'Corinthians', competition: 'Brasileirão', season: '2026', venue: 'Morumbi', is_home: true, status: 'Agendado' }], partial: true, note: 'Fonte gratuita limitada a uma partida.', updated_at: '2026-10-31T10:00:00Z' } }));
  await page.goto('/#/spfc');
  await expect(page.locator('.sports-schedule .sports-games li')).toHaveCount(1);
  await expect(page.locator('.sports-schedule .sports-count')).toHaveCount(0);
  await expect(page.locator('.sports-kickoff')).toContainText('21:30');
  await expect(page.locator('.sports-kickoff')).toContainText('04/11/2026');
  await expect(page.locator('.sports-roster')).toHaveCount(0);
  await expect(page.getByText('Fonte gratuita limitada a uma partida.', { exact: true })).not.toBeVisible();
  await page.getByText('Cobertura dos dados', { exact: false }).click();
  await expect(page.getByText('Fonte gratuita limitada a uma partida.', { exact: true })).toBeVisible();
});

test('football retry only reloads failed standings and empty calendar has no invented match', async ({ page }) => {
  await mockSports(page);
  let scheduleCalls = 0, standingCalls = 0;
  await page.route('**/api/sports/barcelona/schedule', route => { scheduleCalls++; return route.fulfill({ json: { state: 'empty', items: [], note: 'Sem jogos anunciados.', updated_at: '' } }); });
  await page.route('**/api/sports/barcelona/standings', route => { standingCalls++; return route.fulfill({ json: { state: standingCalls === 1 ? 'error' : 'unavailable', items: [], note: 'Cobertura insuficiente.', updated_at: '' } }); });
  await page.goto('/#/barcelona');
  await expect(page.locator('.sports-next')).toContainText('Nenhuma partida confirmada na fonte.');
  await expect(page.locator('.sports-contender')).toHaveCount(0);
  await page.locator('.sports-standings').getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.sports-standings')).toContainText('Classificação não coberta pela fonte atual.');
  expect(scheduleCalls).toBe(1); expect(standingCalls).toBe(2);
});

test('away result keeps the selected team score first', async ({ page }) => {
  await mockSports(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route('**/api/sports/76ers/results', route => route.fulfill({ json: { state: 'available', items: [{ id: 'away', starts_at: '2026-10-30T23:30:00Z', home: 'Charlotte Hornets', away: 'Philadelphia 76ers', competition: 'NBA', season: '2026-2027', is_home: false, home_score: 99, away_score: 112, outcome: 'V', status: 'Encerrado' }], note: 'Teste de resultado fora de casa.', updated_at: '' } }));
  await page.goto('/#/76ers');
  await expect(page.locator('.sports-score')).toHaveAttribute('aria-label', 'Philadelphia 76ers: 112. Charlotte Hornets: 99.');
  await expect(page.locator('.sports-result')).toContainText('Vitória');
  await expect(page.locator('.sports-standings, .sports-statistics')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('football table scroll stays internal on mobile', async ({ page }) => {
  await mockSports(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/#/spfc');
  const table = page.getByRole('region', { name: 'Tabela de classificação' });
  await table.evaluate(element => { element.scrollLeft = element.scrollWidth; });
  expect(await table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await expect(page.locator('.sports-table tbody th')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('76ers displays results beside upcoming games on desktop and below on mobile', async ({ page }) => {
  await mockSports(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/#/76ers');
  const upcoming = page.locator('.sports-schedule');
  const previous = page.locator('.sports-results');
  await expect(upcoming).toBeVisible();
  await expect(previous).toBeVisible();
  await expect(page.locator('.sports-standings, .sports-statistics')).toHaveCount(0);
  const a = await upcoming.boundingBox();
  const b = await previous.boundingBox();
  expect(a && b && b.x >= a.x + a.width - 1).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 900 });
  const smallA = await upcoming.boundingBox();
  const smallB = await previous.boundingBox();
  expect(smallA && smallB && smallB.y >= smallA.y + smallA.height - 1).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('independent errors and missing sports data', async ({ page }) => {
  await mockSports(page);
  await page.route('**/api/sports/barcelona/standings', route => route.fulfill({ json: { state: 'rate_limited', items: [], note: 'Limite de consultas atingido.', updated_at: '' } }));
  await page.goto('/#/barcelona');
  await expect(page.locator('.sports-standings')).toContainText('Limite de consultas atingido.');
  await expect(page.locator('.sports-schedule .sports-games li')).toHaveCount(10);
  await expect(page.locator('.sports-standings button')).toHaveText('Tentar novamente');
});

test('season indicators render when covered and errors do not hang', async ({ page }) => {
  await mockSports(page);
  await page.route('**/api/sports/barcelona/statistics', route => route.fulfill({ json: { state: 'available', items: [{ label: 'Gols marcados', value: 40 }, { label: 'Empates', value: 0 }], note: 'Indicadores de teste.', competition: 'Liga de teste', season: '2026', updated_at: '' } }));
  await page.route('**/api/sports/barcelona/results', route => route.fulfill({ status: 503, json: { detail: 'Teste' } }));
  await page.goto('/#/barcelona');
  await expect(page.locator('.sports-metrics')).toContainText('Gols marcados40');
  await expect(page.locator('.sports-metrics')).toContainText('Empates0');
  await expect(page.locator('.sports-results')).toContainText('Não foi possível consultar a fonte agora.');
  await expect(page.locator('.sports-panel[aria-busy="true"]')).toHaveCount(0);
});

test('Champions selection queries coverage without mixing league summary', async ({ page }) => {
  await mockSports(page);
  let calls=0;
  await page.route('**/api/sports/barcelona/standings?competition=CL',route=>{calls++;return route.fulfill({json:{state:'unavailable',items:[],note:'Competição não coberta pelo plano.',source:'https://www.football-data.org/',updated_at:'2026-10-31T10:00:00Z'}})});
  await page.goto('/#/barcelona');
  await page.getByLabel('Competição da classificação').selectOption('CL');
  await expect(page.locator('.sports-standings')).toContainText('Classificação não coberta pela fonte atual.');
  await expect(page.locator('.sports-record')).toHaveCount(0);
  await expect(page.locator('.sports-schedule li')).toHaveCount(10);
  await page.locator('.sports-coverage summary').click();
  await expect(page.locator('.sports-coverage')).toContainText('https://www.football-data.org/');
  expect(calls).toBe(1);
});
