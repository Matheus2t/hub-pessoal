import {test,expect} from '@playwright/test';

test('La Liga display, crest alignment and no unsupported lineups',async({page},info)=>{
 await page.route('**/api/sports/**',route=>route.fulfill({json:{season:'2026-2027',sections:{schedule:{state:'available',items:[{id:'test',starts_at:'2099-01-01T20:00:00Z',home:'Barcelona',away:'Opponent',is_home:true,competition:'Primera División',season:'2098-2099',status:'Agendado',away_crest:'/teams/spfc.png'}],note:'Test',updated_at:''},results:{state:'empty',items:[],note:'',updated_at:''},standings:{state:'available',items:[{team:'Barcelona',is_team:true,rank:1,points:30,played:10,crest:'/teams/barcelona.png'}],competition:'Primera Division',season:'2026-2027',note:'',updated_at:''},statistics:{state:'empty',items:[],note:'',updated_at:''},roster:{state:'unavailable',items:[],note:'',updated_at:''}}}}));
 for(const width of [1366,390,320]){
  await page.setViewportSize({width,height:900});await page.goto('/#/barcelona');
  await expect(page.locator('.sports-schedule')).toContainText('La Liga');
  await expect(page.locator('.sports-standings')).toContainText('La Liga');
  await expect(page.locator('.sports-match team-crest img')).toBeVisible();
  await expect(page.locator('.sports-table team-crest img')).toBeVisible();
  await expect(page.locator('.sports-lineup')).toHaveCount(0);
  const label=page.getByLabel('Competição da classificação');const caption=page.locator('sports-standings .sports-competition');
  expect((await caption.boundingBox())!.y).toBeGreaterThan((await label.boundingBox())!.y+(await label.boundingBox())!.height);
  for(const theme of ['dark','light']) {
   await page.evaluate(theme=>{document.documentElement.dataset.theme=theme},theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:info.outputPath(`polish-${width}-${theme}.png`),fullPage:true});
  }
 }
 await page.goto('/#/spfc');await expect(page.locator('.sports-roster')).toHaveCount(0);
});

test('team pages never show rosters or formations, even when API includes them', async ({ page }) => {
  const confirmed = { sport: 'football', confirmed: true, formation: '4-3-3', rows: [[{ name: 'Player', position: 'GK', number: 1 }]] };
  await page.route('**/api/sports/**', route => route.fulfill({ json: {
    season: '2026-2027', sections: {
      schedule: { state: 'available', items: [{ id: 'one', starts_at: '2099-01-01T20:00:00Z', home: 'Home', away: 'Away', is_home: true, competition: 'La Liga', status: 'Agendado', lineup: confirmed }], note: '', updated_at: '' },
      results: { state: 'empty', items: [], note: '', updated_at: '' },
      standings: { state: 'empty', items: [], note: '', updated_at: '' },
      statistics: { state: 'empty', items: [], note: '', updated_at: '' },
      roster: { state: 'available', items: [{ name: 'Player', position: 'GK', number: 1 }], note: 'Historical players', updated_at: '' }
    }
  } }));
  for (const team of ['76ers', 'spfc', 'barcelona']) {
    await page.goto('/#/' + team);
    await expect(page.locator('.sports-schedule')).toBeVisible();
    await expect(page.locator('.sports-roster, .sports-lineup')).toHaveCount(0);
    await page.locator('.sports-coverage summary').click();
    await expect(page.locator('.sports-coverage')).not.toContainText('Historical players');
    await expect(page.locator('.sports-coverage')).not.toContainText('Elenco');
  }
});
