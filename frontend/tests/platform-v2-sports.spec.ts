import {test,expect} from '@playwright/test';
import {aggregateGames,brasiliaDay} from '../src/sports-calendar';
import type {Game,SportsSection} from '../src/sports';
const game=(id:string,date:string,status='Agendado'):Game=>({id,starts_at:date,home:'Casa',away:'Visitante',competition:'Liga',season:'2026',venue:'',is_home:true,status,home_score:null,away_score:null,outcome:null});
const section=(items:Game[]):SportsSection=>({items,state:'available',note:'Amostra de teste',source:'fixture',updated_at:'2026-11-02T12:00:00Z'});
test('agenda preserves postponements, deduplicates only by team/id, orders dates and respects Brasilia',()=>{
 const rows=aggregateGames([{team:'spfc',section:section([game('a','2026-11-03T00:30:00Z','Adiado'),game('a','2026-11-03T00:30:00Z','Adiado'),game('b','2026-11-04T20:00:00Z')])}],false,Date.parse('2026-11-02T00:00:00Z'));
 expect(rows.map(r=>r.game.id)).toEqual(['a','b']);expect(rows[0].game.status).toBe('Adiado');expect(brasiliaDay(rows[0].game.starts_at)).toBe('2026-11-02');expect(brasiliaDay('2026-11-03')).toBe('2026-11-03');
});
test('one unavailable team never removes other schedules; calendar, filter and links work',async({page})=>{
 await page.route('**/api/sports/*',r=>{if(r.request().url().includes('/spfc?'))return r.fulfill({status:503});return r.fulfill({json:{season:'2026',sections:{schedule:section([game('future','2099-05-02T20:00:00Z')]),results:section([{...game('past','2026-10-01T20:00:00Z','Encerrado'),home_score:2,away_score:1}])}}})});
 await page.goto('/#/times');await expect(page.getByText('Carregando agenda…')).toHaveCount(0);await expect(page.locator('.sports-agenda-list li')).toHaveCount(2);await page.getByRole('group',{name:'Filtrar equipe'}).getByRole('button',{name:'FC Barcelona',exact:true}).click();await expect(page.locator('.sports-agenda-list li')).toHaveCount(1);await expect(page.locator('.sports-agenda-list a')).toHaveAttribute('href','#/barcelona');await page.getByRole('button',{name:'Últimos resultados',exact:true}).click();await expect(page.locator('.sports-agenda-list')).toContainText('2 – 1');await page.getByRole('button',{name:'Calendário',exact:true}).click();await expect(page.locator('.sports-month')).toBeVisible();await page.getByRole('button',{name:'Próximo mês da agenda'}).click();await page.getByRole('group',{name:'Filtrar equipe'}).getByRole('button',{name:'Todos',exact:true}).click();await page.getByText('Cobertura e fontes').click();await expect(page.getByText('Fonte indisponível.',{exact:false})).toBeVisible();
});
