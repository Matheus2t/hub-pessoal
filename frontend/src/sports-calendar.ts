import type {Team,Game,SportsSection} from './sports';
export const brasiliaDay=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function aggregateGames(sections:{team:Team;section:SportsSection}[],results=false,now=Date.now()){
 const rows=sections.flatMap(({team,section})=>section.items.filter((i):i is Game=>'starts_at'in i&&Number.isFinite(Date.parse(i.starts_at))).map(game=>({team,game})));
 return [...new Map(rows.map(row=>[`${row.team}:${row.game.id}`,row])).values()].filter(({game})=>results?true:Date.parse(game.starts_at)>=now).sort((a,b)=>(Date.parse(a.game.starts_at)-Date.parse(b.game.starts_at))*(results?-1:1)||a.game.id.localeCompare(b.game.id));
}
