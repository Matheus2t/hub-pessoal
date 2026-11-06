import {test,expect} from '@playwright/test';
import type {Game,SportsSection,Team} from '../src/sports';

const game=(id:string,starts_at:string,home:string,away:string,competition='NBA',options:Partial<Game>={}):Game=>({
 id,starts_at,home,away,competition,season:'2026',venue:'',is_home:false,
 status:'Agendado',home_score:null,away_score:null,outcome:null,...options
});
const section=(items:Game[]):SportsSection=>({
 state:items.length?'available':'empty',items,note:'Fixture de teste',source:'Teste',updated_at:'2026-11-06T10:00:00Z'
});
const fixtures:Record<Team,{schedule:Game[],results:Game[]}>={
 '76ers':{
  schedule:[
   game('cavs','2026-11-07T00:30:00Z','Cleveland Cavaliers','Philadelphia 76ers','NBA',{away_crest:'/teams/76ers.svg'}),
   game('bulls','2026-11-08T20:30:00Z','Chicago Bulls','Philadelphia 76ers'),
   game('bucks','2026-11-21T20:00:00Z','Philadelphia 76ers','Milwaukee Bucks','NBA',{is_home:true})
  ],
  results:[game('last','2026-11-02T22:00:00Z','Philadelphia 76ers','Boston Celtics','NBA',{is_home:true,status:'Encerrado',home_score:105,away_score:99})]
 },
 spfc:{
  schedule:[game('flu','2026-11-20T00:30:00Z','São Paulo FC','Fluminense FC','Brasileirão Série A',{is_home:true})],
  results:[]
 },
 barcelona:{
  schedule:[
   game('atm','2026-11-08T20:00:00Z','Club Atlético de Madrid','FC Barcelona','La Liga'),
   game('vil','2026-11-22T13:00:00Z','FC Barcelona','Villarreal CF','La Liga',{is_home:true})
  ],
  results:[game('old','2026-11-04T18:00:00Z','FC Barcelona','Real Madrid','La Liga',{is_home:true,status:'Encerrado',home_score:2,away_score:1})]
 }
};
async function mockSports(page:import('@playwright/test').Page){
 await page.clock.setFixedTime(new Date('2026-11-06T14:00:00Z'));
 await page.route('**/api/sports/**',async route=>{
  const team=new URL(route.request().url()).pathname.split('/').at(-1) as Team;
  const data=fixtures[team];
  if(!data)return route.fulfill({status:404,body:'Unknown team'});
  return route.fulfill({json:{season:'2026',sections:{schedule:section(data.schedule),results:section(data.results)}}});
 });
}
test('calendar shows real month grid, selected fixtures and month navigation',async({page})=>{
 await mockSports(page);
 await page.goto('/#/times');
 await expect(page.locator('.sports-agenda-list li')).toHaveCount(6);
 await page.getByRole('group',{name:'Visualização da agenda'}).getByRole('button',{name:'Calendário',exact:true}).click();
 await expect(page.locator('.sports-calendar-title h2')).toHaveText('novembro de 2026');
 await expect(page.locator('.sports-month-day')).toHaveCount(30);
 await expect(page.locator('.sports-month-weekday')).toHaveCount(7);
 await expect(page.locator('.sports-month-day[aria-current="date"]')).toHaveCount(1);
 await expect(page.locator('.sports-calendar-detail')).toBeVisible();
 const eighth=page.getByRole('button',{name:'8 de novembro de 2026, 2 jogos'});
 await expect(eighth).toHaveAttribute('data-matches','2');
 await eighth.click();
 await expect(eighth).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.sports-calendar-detail-heading h2')).toContainText('08 de novembro de 2026');
 await expect(page.locator('.sports-calendar-matches li')).toHaveCount(2);
 await expect(page.locator('.sports-calendar-detail')).toContainText('Club Atlético de Madrid');
 await expect(page.locator('.sports-calendar-detail')).toContainText('Chicago Bulls');
 await expect(page.locator('.sports-calendar-matches a[href="#/barcelona"]')).toHaveCount(1);
 await expect(page.locator('.sports-calendar-matches a[href="#/76ers"]')).toHaveCount(1);
 await page.getByRole('group',{name:'Filtrar equipe'}).getByRole('button',{name:'FC Barcelona',exact:true}).click();
 await expect(page.getByRole('button',{name:'8 de novembro de 2026, 1 jogo'})).toBeVisible();
 await page.getByRole('button',{name:'8 de novembro de 2026, 1 jogo'}).click();
 await expect(page.locator('.sports-calendar-matches li')).toHaveCount(1);
 await page.getByRole('button',{name:'Mês anterior da agenda'}).click();
 await expect(page.locator('.sports-calendar-title h2')).toHaveText('outubro de 2026');
 await expect(page.locator('.sports-month-day')).toHaveCount(31);
 await expect(page.locator('.sports-calendar-no-matches')).toBeVisible();
 await page.getByRole('button',{name:'Próximo mês da agenda'}).click();
 await expect(page.locator('.sports-calendar-title h2')).toHaveText('novembro de 2026');
 await page.getByRole('button',{name:'Hoje',exact:true}).click();
 await expect(page.locator('.sports-calendar-title h2')).toHaveText('novembro de 2026');
 await page.getByRole('button',{name:'6 de novembro de 2026, 0 jogos',exact:true}).click();
 await expect(page.locator('.sports-calendar-no-matches')).toContainText('Sem jogos neste dia');
 await page.getByRole('group',{name:'Filtrar equipe'}).getByRole('button',{name:'Todos',exact:true}).click();
 await page.getByRole('group',{name:'Visualização da agenda'}).getByRole('button',{name:'Últimos resultados',exact:true}).click();
 await expect(page.locator('.sports-agenda-list li')).toHaveCount(2);
 await expect(page.locator('.sports-agenda-list')).toContainText('105 – 99');
});
for(const width of [1366,768,390,320])for(const theme of ['dark','light']){
 test('sports calendar visual and keyboard '+width+' '+theme,async({page},info)=>{
  await mockSports(page);await page.setViewportSize({width,height:900});
  await page.goto('/#/times');
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await page.getByRole('group',{name:'Visualização da agenda'}).getByRole('button',{name:'Calendário',exact:true}).click();
  await expect(page.locator('.sports-calendar-board')).toBeVisible();
  const cell=page.getByRole('button',{name:'8 de novembro de 2026, 2 jogos'});
  await cell.focus();await expect(cell).toBeFocused();await page.keyboard.press('Enter');
  await expect(cell).toHaveAttribute('aria-pressed','true');
  const layout=await page.locator('.sports-calendar-shell').evaluate(shell=>{
   const board=shell.querySelector('.sports-calendar-board')!.getBoundingClientRect();
   const detail=shell.querySelector('.sports-calendar-detail')!.getBoundingClientRect();
   return {boardLeft:board.left,detailLeft:detail.left,boardTop:board.top,detailTop:detail.top};
  });
  if(width>1100)expect(layout.boardLeft).toBeLessThan(layout.detailLeft);
  else expect(layout.boardTop).toBeLessThan(layout.detailTop);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.sports-calendar-matches li')).toHaveCount(2);
  await expect(page.locator('.sports-month-day[aria-pressed="true"]')).toHaveCount(1);
  if((width===1366&&theme==='dark')||(width===390&&theme==='light')){
   await page.screenshot({path:info.outputPath('times-calendar-'+width+'-'+theme+'.png'),fullPage:true,animations:'disabled'});
  }
 });
}
