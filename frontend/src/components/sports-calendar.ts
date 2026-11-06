import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {teams,sportsDate,sportsTime,competitionName,type Team,type Game,type SportsSection} from '../sports';
import {loadOverview} from '../sports-overview';
import './team-crest';
import {aggregateGames,brasiliaDay} from '../sports-calendar';

type AgendaEntry={team:Team;game:Game};
type TeamSource={team:Team;schedule?:SportsSection;results?:SportsSection;error?:string};
const dateOnly=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value);
const matchTime=(game:Game)=>dateOnly(game.starts_at)?'Horário a definir':sportsTime(game.starts_at);
const crestFor=(entry:AgendaEntry,side:'home'|'away')=>
 side==='home'?(entry.game.home_crest||(entry.game.is_home?teams[entry.team].crest:''))
              :(entry.game.away_crest||(!entry.game.is_home?teams[entry.team].crest:''));
const aliases:Record<string,string>={
 'Philadelphia 76ers':'PHI','FC Barcelona':'BAR','São Paulo FC':'SAO',
 'São Paulo Futebol Clube':'SAO','Club Atlético de Madrid':'ATM',
 'Cleveland Cavaliers':'CLE','Chicago Bulls':'CHI','Boston Celtics':'BOS',
 'Toronto Raptors':'TOR','Brooklyn Nets':'BKN','Indiana Pacers':'IND',
 'Milwaukee Bucks':'MIL','Villarreal CF':'VIL','Fluminense FC':'FLU',
 'Botafogo FR':'BOT','Orlando Magic':'ORL'
};
const abbreviation=(name:string)=>{
 if(aliases[name])return aliases[name];
 const parts=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean);
 return (parts.find(part=>!['FC','CF','CA','CLUB','DE','DO','DA','THE'].includes(part.toUpperCase()))||name).slice(0,3).toUpperCase();
};

@customElement('sports-calendar')
export class SportsCalendar extends LightElement {
 @state() private filter='';
 @state() private view='upcoming';
 @state() private month=new Date().getMonth();
 @state() private year=new Date().getFullYear();
 @state() private day='';
 @state() private loading=true;
 @state() private sections:TeamSource[]=[];
 private generation=0;

 connectedCallback(){super.connectedCallback();void this.load()}
 disconnectedCallback(){this.generation++;super.disconnectedCallback()}

 private async load(){
  const generation=++this.generation;
  this.loading=true;
  const keys=Object.keys(teams) as Team[];
  const results=await Promise.allSettled(keys.map(team=>loadOverview(team)));
  if(!this.isConnected||generation!==this.generation)return;
  this.sections=results.map((result,i)=>result.status==='fulfilled'
   ?{team:keys[i],schedule:result.value.sections?.schedule,results:result.value.sections?.results}
   :{team:keys[i],error:'Fonte indisponível. As demais equipes permanecem acessíveis.'});
  this.loading=false;
 }
 private shift(delta:number){
  const d=new Date(this.year,this.month+delta,1);
  this.year=d.getFullYear();this.month=d.getMonth();this.day='';
 }
 private currentMonth(){
  const now=new Date(),brasilia=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'numeric'}).formatToParts(now);
  const number=(type:string)=>Number(brasilia.find(p=>p.type===type)?.value||0);
  this.year=number('year');this.month=number('month')-1;this.day='';
 }
 private sources(){
  return this.sections.filter(s=>!this.filter||s.team===this.filter);
 }
 private entries(sources:TeamSource[],type:'upcoming'|'results'|'calendar'):AgendaEntry[]{
  const schedule=sources.flatMap(s=>s.schedule?[{team:s.team,section:s.schedule}]:[]);
  const results=sources.flatMap(s=>s.results?[{team:s.team,section:s.results}]:[]);
  if(type==='upcoming')return aggregateGames(schedule) as AgendaEntry[];
  if(type==='results')return aggregateGames(results,true) as AgendaEntry[];
  const all=new Map<string,AgendaEntry>();
  for(const row of aggregateGames(schedule,false,Number.NEGATIVE_INFINITY) as AgendaEntry[])all.set(`${row.team}:${row.game.id}`,row);
  // Finished games take precedence if the same fixture is in both sections.
  for(const row of aggregateGames(results,true) as AgendaEntry[])all.set(`${row.team}:${row.game.id}`,row);
  return [...all.values()].sort((a,b)=>Date.parse(a.game.starts_at)-Date.parse(b.game.starts_at));
 }
 private renderMatch(entry:AgendaEntry){
  const {team,game}=entry;
  return html`<li class="sports-agenda-game">
   <time datetime=${game.starts_at}>${sportsDate(dateOnly(game.starts_at)?game.starts_at+'T12:00:00-03:00':game.starts_at)}<span>${matchTime(game)}</span></time>
   <div class="sports-agenda-game-main">
    <div class="sports-agenda-opponents"><team-crest .src=${crestFor(entry,'home')}></team-crest><strong>${game.home}</strong><span>×</span><team-crest .src=${crestFor(entry,'away')}></team-crest><strong>${game.away}</strong></div>
    <p>${competitionName(game.competition)} · ${game.status}</p><a href=${`#/${team}`}>${teams[team].name}</a>
   </div>
   ${game.home_score!==null&&game.away_score!==null?html`<strong class="sports-agenda-score">${game.home_score} – ${game.away_score}</strong>`:nothing}
  </li>`;
 }
 private renderMonth(entries:AgendaEntry[]){
  const month=`${this.year}-${String(this.month+1).padStart(2,'0')}`;
  const monthTitle=new Date(this.year,this.month,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const days=new Date(this.year,this.month+1,0).getDate();
  const offset=new Date(this.year,this.month,1).getDay();
  const total=Math.ceil((offset+days)/7)*7;
  const current=brasiliaDay(new Date().toISOString());
  const rows=entries.filter(entry=>brasiliaDay(entry.game.starts_at).startsWith(month));
  const byDay=new Map<string,AgendaEntry[]>();
  for(const row of rows){
   const key=brasiliaDay(row.game.starts_at);
   const matches=byDay.get(key)||[];matches.push(row);byDay.set(key,matches);
  }
  const firstFuture=[...byDay.keys()].sort().find(date=>date>=current);
  const chosen=this.day.startsWith(month)?this.day:(firstFuture||[...byDay.keys()].sort()[0]||(current.startsWith(month)?current:`${month}-01`));
  const selected=byDay.get(chosen)||[];
  const chosenNum=Number(chosen.slice(-2));
  const selectedTitle=new Date(this.year,this.month,chosenNum).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const months=rows.length;
  return html`<div class="sports-calendar-shell">
   <section class="sports-calendar-board" aria-label="Calendário mensal">
    <header class="sports-calendar-navigation">
     <button type="button" class="sports-calendar-arrow" aria-label="Mês anterior da agenda" @click=${()=>this.shift(-1)}>←</button>
     <div class="sports-calendar-title"><h2>${monthTitle}</h2><span>${months} ${months===1?'jogo':'jogos'} no mês</span></div>
     <div class="sports-calendar-nav-right"><button type="button" class="sports-calendar-today" @click=${()=>this.currentMonth()}>Hoje</button><button type="button" class="sports-calendar-arrow" aria-label="Próximo mês da agenda" @click=${()=>this.shift(1)}>→</button></div>
    </header>
    <div class="sports-month" aria-label=${`Dias de ${monthTitle}`}>
     ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(label=>html`<span class="sports-month-weekday">${label}</span>`)}
     ${Array.from({length:total},(_,index)=>{
      const number=index-offset+1;
      if(number<1||number>days){
       const outside=new Date(this.year,this.month,number).getDate();
       return html`<span class="sports-month-outside" aria-hidden="true">${outside}</span>`;
      }
      const date=`${month}-${String(number).padStart(2,'0')}`,matches=byDay.get(date)||[];
      const isToday=date===current,isSelected=date===chosen;
      const label=`${number} de ${monthTitle}, ${matches.length} ${matches.length===1?'jogo':'jogos'}`;
      return html`<button type="button" class="sports-month-day" aria-label=${label} aria-pressed=${isSelected} aria-current=${isToday?'date':nothing} data-matches=${matches.length} @click=${()=>this.day=date}>
       <span class="sports-month-number">${number}</span>
       <span class="sports-month-events" aria-hidden="true">
        ${matches.slice(0,2).map(entry=>html`<span class="sports-month-event"><team-crest .src=${crestFor(entry,'home')}></team-crest><span>${abbreviation(entry.game.home)} × ${abbreviation(entry.game.away)}</span></span>`)}
        ${matches.length>2?html`<span class="sports-month-more">+${matches.length-2} jogos</span>`:nothing}
       </span>
       ${matches.length?html`<span class="sports-month-count" aria-hidden="true">${matches.length}</span>`:nothing}
      </button>`;
     })}
    </div>
   </section>
   <aside class="sports-calendar-detail" aria-live="polite" aria-label="Jogos do dia selecionado">
    <header class="sports-calendar-detail-heading">
     <p>AGENDA DO DIA</p><h2>${selectedTitle}</h2>
     <span>${selected.length} ${selected.length===1?'jogo':'jogos'} na agenda</span>
    </header>
    ${selected.length?html`<ol class="sports-calendar-matches">
     ${selected.map(entry=>html`<li>
      <div class="sports-calendar-match-meta"><span>${competitionName(entry.game.competition)}</span><time datetime=${entry.game.starts_at}>${matchTime(entry.game)}</time></div>
      <div class="sports-calendar-match-team"><team-crest .src=${crestFor(entry,'home')}></team-crest><strong>${entry.game.home}</strong></div>
      <div class="sports-calendar-match-team"><team-crest .src=${crestFor(entry,'away')}></team-crest><strong>${entry.game.away}</strong></div>
      <div class="sports-calendar-match-footer"><span>${entry.game.home_score!==null&&entry.game.away_score!==null?`${entry.game.home_score} – ${entry.game.away_score}`:entry.game.status}</span><a href=${`#/${entry.team}`}>Ver time →</a></div>
     </li>`)}
    </ol>`:html`<div class="sports-calendar-no-matches"><strong>Sem jogos neste dia</strong><p>Selecione uma data com partidas para ver os confrontos.</p></div>`}
   </aside>
  </div>`;
 }
 render(){
  const sources=this.sources();
  const view=this.view;
  const entries=this.entries(sources,view==='calendar'?'calendar':view==='results'?'results':'upcoming');
  return html`<article class="sports-agenda">
   <header class="sports-agenda-header"><div><span class="sports-agenda-eyebrow">AGENDA ESPORTIVA</span><h1>Times</h1><p>Agenda unificada · horários de Brasília</p></div></header>
   <div class="category-filters sports-team-filters" role="group" aria-label="Filtrar equipe">
    ${([['','Todos'],...Object.entries(teams).map(([key,team])=>[key,team.name])] as string[][]).map(([key,label])=>html`<button type="button" class="button" aria-pressed=${this.filter===key} @click=${()=>{this.filter=key;this.day=''}}>
      ${key?html`<team-crest .src=${teams[key as Team].crest}></team-crest>`:nothing}${label}</button>`)}
   </div>
   <nav class="category-filters sports-agenda-tabs" role="group" aria-label="Visualização da agenda">
    ${([['upcoming','Próximos jogos'],['calendar','Calendário'],['results','Últimos resultados']] as string[][]).map(([key,label])=>html`<button type="button" class="button" aria-pressed=${this.view===key} @click=${()=>{this.view=key;this.day=''}}>${label}</button>`)}
   </nav>
   ${this.loading?html`<p class="sports-agenda-loading" role="status">Carregando agenda…</p>`:nothing}
   ${view==='calendar'?this.renderMonth(entries):html`<ol class="sports-agenda-list">${entries.map(entry=>this.renderMatch(entry))}</ol>
    ${!this.loading&&!entries.length?html`<p class="sports-agenda-empty">Nenhum jogo disponível neste período e filtro.</p>`:nothing}`}
   <footer class="sports-agenda-footer"><details><summary>Cobertura e fontes</summary>
    ${sources.map(s=>html`<p><strong>${teams[s.team].name}</strong>: ${s.error||[s.schedule,s.results].filter(Boolean).map(section=>`${section!.source||'Fonte não informada'} · ${section!.state} · atualização ${section!.updated_at||'não informada'} · ${section!.note||''}`).join(' / ')||'Sem cobertura disponível.'}</p>`)}
   </details><button type="button" class="button sports-agenda-refresh" ?disabled=${this.loading} @click=${()=>this.load()}>Atualizar agenda</button></footer>
  </article>`;
 }
}
