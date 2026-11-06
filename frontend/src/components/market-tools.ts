import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement,money} from '../ui';
import {projectContributions} from '../market-tools';
import {manifest,loadFinancial,formatFinancial,fields,type FinancialData} from '../financial-data';
import {stocks} from '../market-catalog';

@customElement('market-contributions')
export class MarketContributions extends LightElement {
 @state() private capital=1000;
 @state() private deposit=100;
 @state() private months=120;
 @state() private rates=[4,8];
 @state() private dividend=0;
 @state() private reinvest=true;
 @state() private selectedMonth=0;

 private compactMoney(value:number) {
  return 'R$ '+new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(value);
 }
 private renderChart(results:ReturnType<typeof projectContributions>[]) {
  const rows=results[0];
  const selected=Math.max(1,Math.min(this.selectedMonth||this.months,rows.length));
  const point=rows[selected-1],point2=results[1][selected-1];
  const left=76,right=934,top=20,bottom=272;
  const topValue=Math.max(1,...rows.map(r=>r.invested),...results.flatMap(series=>series.map(r=>r.total)))*1.05;
  const x=(index:number)=>left+(rows.length===1?0:index/(rows.length-1))*(right-left);
  const y=(amount:number)=>bottom-(amount/topValue)*(bottom-top);
  const path=(series:typeof rows,field:'total'|'invested')=>series.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(p[field]).toFixed(1)}`).join(' ');
  const ticks=[0,.25,.5,.75,1];
  const months=[...new Set([1,Math.round(rows.length/4),Math.round(rows.length/2),Math.round(rows.length*3/4),rows.length].map(v=>Math.max(1,v)))];
  return html`<section class="mc-chart-card" aria-labelledby="mc-chart-title">
   <header class="mc-section-head"><div><span class="mc-section-eyebrow">EVOLUÇÃO DO INVESTIMENTO</span><h2 id="mc-chart-title">Patrimônio ao longo do tempo</h2></div><span class="mc-period">Horizonte · ${this.months} meses</span></header>
   <div class="mc-chart-legend" aria-label="Séries do gráfico"><span><i class="mc-line-key mc-key-contributions"></i>Total aportado</span><span><i class="mc-line-key mc-key-one"></i>Cenário 1</span><span><i class="mc-line-key mc-key-two"></i>Cenário 2</span></div>
   <div class="mc-chart-area"><svg viewBox="0 0 980 314" role="img" aria-label="Evolução hipotética do capital investido e dos cenários em ${this.months} meses">
    ${ticks.map(frac=>html`<g><line class="mc-gridline" x1="${left}" y1="${y(topValue*frac)}" x2="${right}" y2="${y(topValue*frac)}"></line><text class="mc-axis-label" x="${left-12}" y="${y(topValue*frac)+4}" text-anchor="end">${this.compactMoney(topValue*frac)}</text></g>`)}
    ${months.map(month=>html`<text class="mc-axis-label" x="${x(month-1)}" y="300" text-anchor="${month===1?'start':month===rows.length?'end':'middle'}">${month}m</text>`)}
    <path class="mc-chart-path mc-path-contributions" d="${path(rows,'invested')}"></path>
    <path class="mc-chart-path mc-path-one" d="${path(rows,'total')}"></path>
    <path class="mc-chart-path mc-path-two" d="${path(results[1],'total')}"></path>
    <line class="mc-cursor" x1="${x(selected-1)}" y1="${top}" x2="${x(selected-1)}" y2="${bottom}"></line>
    <circle class="mc-point mc-point-one" cx="${x(selected-1)}" cy="${y(point.total)}" r="5"></circle>
    <circle class="mc-point mc-point-two" cx="${x(selected-1)}" cy="${y(point2.total)}" r="5"></circle>
   </svg></div>
   <div class="mc-chart-readout" aria-live="off">
    <div><span>Mês selecionado</span><strong>${selected} de ${this.months}</strong></div>
    <div><span>Total aportado</span><strong>${money(point.invested)}</strong></div>
    <div><span>Cenário 1</span><strong>${money(point.total)}</strong></div>
    <div><span>Cenário 2</span><strong>${money(point2.total)}</strong></div>
   </div>
   <label class="mc-slider-label" for="mc-month-range">Consultar mês no gráfico
    <input id="mc-month-range" type="range" min="1" max="${rows.length}" step="1" .value=${String(selected)} @input=${(e:Event)=>this.selectedMonth=Number((e.target as HTMLInputElement).value)}>
   </label>
  </section>`;
 }
 render() {
  let error='',results:ReturnType<typeof projectContributions>[]=[];
  try { results=this.rates.map(rate=>projectContributions(this.capital,this.deposit,this.months,rate,this.dividend,this.reinvest)) }
  catch(e) {error=(e as Error).message}
  const valid=results.length===2;
  const invested=this.capital+this.deposit*this.months;
  const safeInvested=Number.isFinite(invested)&&invested>=0&&invested<=1e15?money(invested):'—';
  const summary=results.map(series=>series.at(-1)!);
  const difference=valid?summary[1].total-summary[0].total:0;
  return html`<div class="mc-page">
   <header class="mc-hero">
    <div class="mc-hero-copy"><p class="mc-eyebrow">AÇÕES / PROJEÇÕES</p><h1>Simulador de aportes em ações</h1><p class="mc-lead">Compare dois cenários de valorização com aportes mensais e dividendos hipotéticos.</p></div>
    <a class="mc-back" href="#/acoes">Voltar para Ações <span aria-hidden="true">↗</span></a>
   </header>
   <form class="mc-form" @submit=${(e:Event)=>{e.preventDefault();this.querySelector<HTMLElement>('#mc-results')?.scrollIntoView({behavior:'smooth',block:'start'})}}>
    <header class="mc-form-heading"><div><span class="mc-section-eyebrow">CONFIGURAÇÃO</span><h2>Monte sua simulação</h2></div><span class="mc-form-caption">Taxas anuais definidas por você</span></header>
    <div class="mc-form-layout">
     <div class="mc-form-content">
      <div class="mc-group-head"><h3>Plano de aportes</h3><span>01 / 02</span></div>
      <div class="mc-field-grid">
       <label class="mc-field"><span>Capital inicial (R$)</span><span class="mc-control mc-with-prefix"><span class="mc-input-unit" aria-hidden="true">R$</span><input required type="number" min="0" max="1000000000000" step="any" inputmode="decimal" .value=${String(this.capital)} @input=${(e:Event)=>this.capital=Number((e.target as HTMLInputElement).value)}></span></label>
       <label class="mc-field"><span>Aporte mensal (R$)</span><span class="mc-control mc-with-prefix"><span class="mc-input-unit" aria-hidden="true">R$</span><input required type="number" min="0" max="1000000000" step="any" inputmode="decimal" .value=${String(this.deposit)} @input=${(e:Event)=>this.deposit=Number((e.target as HTMLInputElement).value)}></span></label>
       <label class="mc-field"><span>Prazo (meses)</span><span class="mc-control mc-with-suffix"><input required type="number" min="1" max="600" step="1" inputmode="numeric" .value=${String(this.months)} @input=${(e:Event)=>{this.months=Number((e.target as HTMLInputElement).value);this.selectedMonth=0}}><span class="mc-input-unit" aria-hidden="true">meses</span></span></label>
       <label class="mc-field"><span>Dividendos hipotéticos (% a.a.)</span><span class="mc-control mc-with-suffix"><input required type="number" min="0" max="100" step="any" inputmode="decimal" .value=${String(this.dividend)} @input=${(e:Event)=>this.dividend=Number((e.target as HTMLInputElement).value)}><span class="mc-input-unit" aria-hidden="true">% a.a.</span></span></label>
      </div>
      <div class="mc-group-head mc-scenario-head"><h3>Valorização hipotética do preço</h3><span>02 / 02</span></div>
      <div class="mc-field-grid">
       ${this.rates.map((rate,i)=>html`<label class="mc-field"><span>Valorização do preço · cenário ${i+1} (% a.a.)</span><span class="mc-control mc-with-suffix"><input required type="number" min="-99.99" max="100" step="any" inputmode="decimal" .value=${String(rate)} @input=${(e:Event)=>this.rates=this.rates.map((v,j)=>i===j?Number((e.target as HTMLInputElement).value):v)}><span class="mc-input-unit" aria-hidden="true">% a.a.</span></span></label>`)}
      </div>
     </div>
     <aside class="mc-plan-aside">
      <span class="mc-section-eyebrow">RESUMO DO PLANO</span>
      <p class="mc-plan-label">Capital total aportado</p><strong class="mc-plan-value">${safeInvested}</strong>
      <dl class="mc-plan-breakdown"><div><dt>Valor inicial</dt><dd>${money(this.capital)}</dd></div><div><dt>Aportes mensais</dt><dd>${money(this.deposit)}</dd></div><div><dt>Duração</dt><dd>${this.months} meses</dd></div></dl>
      <label class="mc-reinvest"><input type="checkbox" .checked=${this.reinvest} @change=${(e:Event)=>this.reinvest=(e.target as HTMLInputElement).checked}><span><strong>Reinvestir dividendos</strong><small>${this.reinvest?'Dividendos incorporados ao patrimônio.':'Dividendos acumulados separadamente em caixa.'}</small></span></label>
      <button class="button primary mc-submit" type="submit">Simular aportes <span aria-hidden="true">↗</span></button>
      <p class="mc-aside-note">Os valores são projeções matemáticas, não previsões de mercado.</p>
     </aside>
    </div>
   </form>
   ${error?html`<p class="mc-error" role="alert">${error}</p>`:nothing}
   <section id="mc-results" class="mc-results" aria-labelledby="mc-results-title" tabindex="-1">
    <header class="mc-results-heading"><div><span class="mc-section-eyebrow">COMPARAÇÃO</span><h2 id="mc-results-title">Resultado da simulação</h2></div><span class="mc-results-caption">Premissas constantes ao longo do prazo</span></header>
    ${valid?html`<div class="mc-result-grid">
     <article class="mc-result-card mc-result-invested"><span class="mc-result-eyebrow">CAPITAL APORTADO</span><strong>${money(summary[0].invested)}</strong><p>Valor inicial + aportes mensais</p></article>
     ${summary.map((last,i)=>html`<article class="mc-result-card"><span class="mc-result-eyebrow">CENÁRIO ${i+1}</span><h3>Patrimônio projetado:</h3><strong>${money(last.total)}</strong><p>Ganho sobre aportes: ${money(last.total-last.invested)}</p></article>`)}
     <article class="mc-result-card mc-result-difference"><span class="mc-result-eyebrow">DIFERENÇA ENTRE CENÁRIOS</span><strong>${money(Math.abs(difference))}</strong><p>${difference>=0?'Cenário 2 acima do cenário 1':'Cenário 1 acima do cenário 2'}</p></article>
    </div>
    ${this.renderChart(results)}
    <details class="mc-history">
     <summary><span><strong>Evolução mensal</strong><small>Consulte os ${this.months} meses da projeção</small></span><span class="mc-detail-chevron" aria-hidden="true">⌄</span></summary>
     <div class="mc-history-scroll" role="region" aria-label="Tabela de evolução mensal" tabindex="0">
      <table><thead><tr><th scope="col">Mês</th><th scope="col">Total investido</th><th scope="col">Cenário 1</th><th scope="col">Cenário 2</th>${!this.reinvest?html`<th scope="col">Dividendos em caixa (1 / 2)</th>`:nothing}</tr></thead>
       <tbody>${results[0].map((r,i)=>html`<tr><th scope="row">${r.month}</th><td>${money(r.invested)}</td><td>${money(r.total)}</td><td>${money(results[1][i].total)}</td>${!this.reinvest?html`<td>${money(r.cash)} / ${money(results[1][i].cash)}</td>`:nothing}</tr>`)}</tbody>
      </table>
     </div>
    </details>`:html`<div class="mc-empty" role="status">Preencha valores válidos para visualizar o comparativo.</div>`}
   </section>
   <p class="mc-disclaimer">Cenários matemáticos brutos, com taxas hipotéticas. Sem preços históricos, impostos, custos ou previsão de retorno. Dividendos são calculados separadamente da valorização do preço, antes do aporte mensal.</p>
  </div>`;
 }
}

@customElement('market-rankings')
export class MarketRankings extends LightElement {
 @state() private data:FinancialData[]=[];
 @state() private loading=true;
 @state() private error='';
 @state() private sector='';
 @state() private metric='roe';
 @state() private date='';
 @state() private processed='';
 private controller=new AbortController();
 connectedCallback(){super.connectedCallback();void this.load()}
 disconnectedCallback(){this.controller.abort();super.disconnectedCallback()}
 private async load(){
  try{
   const m=await manifest(this.controller.signal);
   this.processed=m.processed_at;
   const result=await Promise.all(Object.keys(m.companies).map(s=>loadFinancial(m,s,this.controller.signal)));
   if(!this.isConnected)return;
   this.data=[...new Map(result.filter((r):r is FinancialData=>!!r).map(d=>[d.issuer.cnpj,d])).values()];
  }catch{
   if(this.isConnected)this.error='Não foi possível carregar a amostra CVM.';
  }finally{
   if(this.isConnected)this.loading=false;
  }
 }
 render(){
  const dates=[...new Set(this.data.flatMap(d=>d.periods.filter(p=>p.kind==='annual').map(p=>p.end)))].sort();
  const date=this.date||dates.at(-1);
  const sectorOf=(d:FinancialData)=>stocks.find(s=>s.symbol===d.issuer.symbol)?.sector||'Sem classificação';
  const sectors=[...new Set(this.data.map(sectorOf))].sort();
  const candidates=this.data.filter(d=>!this.sector||sectorOf(d)===this.sector);
  const rows=candidates.map(d=>({d,p:d.periods.find(p=>p.kind==='annual'&&p.end===date)}))
   .filter(r=>r.p?.values[this.metric]!=null)
   .sort((a,b)=>`${sectorOf(a.d)}:${a.p!.document.scope}`.localeCompare(`${sectorOf(b.d)}:${b.p!.document.scope}`)||(b.p!.values[this.metric]!-a.p!.values[this.metric]!));
  const groups:{sector:string;scope:string;items:typeof rows}[]=[];
  for(const row of rows){
   const sector=sectorOf(row.d),scope=row.p!.document.scope;
   const group=groups.at(-1);
   if(group&&group.sector===sector&&group.scope===scope)group.items.push(row);
   else groups.push({sector,scope,items:[row]});
  }
  const visibleSectors=new Set(groups.map(g=>g.sector)).size;
  const formattedDate=date?date.split('-').reverse().join('/'):'—';
  return html`<div class="rk-page">
   <header class="rk-hero">
    <div>
     <p class="rk-eyebrow">DADOS CVM / ANÁLISE SETORIAL</p>
     <h1>Rankings por setor</h1>
     <p class="rk-lead">Explore indicadores financeiros e compare empresas dentro de seus setores.</p>
    </div>
    <a class="rk-back" href="#/acoes">← Voltar à lista de ações</a>
   </header>
   <section class="rk-panel rk-filters" aria-labelledby="rk-filters-title">
    <div class="rk-section-heading">
     <div><p class="rk-kicker">01 / FILTROS</p><h2 id="rk-filters-title">Explorar indicadores</h2></div>
     <span class="rk-source-tag">Fonte: CVM</span>
    </div>
    <div class="rk-filter-grid">
     <div class="rk-field"><label for="rk-sector">Setor</label>
      <select id="rk-sector" .value=${this.sector} @change=${(e:Event)=>this.sector=(e.target as HTMLSelectElement).value}>
       <option value="">Todos (agrupados)</option>
       ${sectors.map(s=>html`<option>${s}</option>`)}
      </select>
     </div>
     <div class="rk-field"><label for="rk-metric">Indicador</label>
      <select id="rk-metric" .value=${this.metric} @change=${(e:Event)=>this.metric=(e.target as HTMLSelectElement).value}>
       <option value="roe">Maior ROE</option>
       <option value="net_margin">Maior margem líquida</option>
       <option value="roa">Maior ROA</option>
       <option value="operating_margin">Maior margem operacional</option>
       <option value="revenue_growth">Maior crescimento de receita</option>
       <option value="profit_growth">Maior crescimento de lucro</option>
      </select>
     </div>
     <div class="rk-field"><label for="rk-date">Exercício</label>
      <select id="rk-date" .value=${date||''} @change=${(e:Event)=>this.date=(e.target as HTMLSelectElement).value}>
       ${dates.map(d=>html`<option value=${d} .selected=${d===date}>${d}</option>`)}
      </select>
     </div>
    </div>
   </section>
   ${this.loading?html`<p class="rk-status" role="status">Carregando amostra…</p>`:nothing}
   ${this.error?html`<p class="rk-status" role="alert">${this.error}</p>`:nothing}
   <div class="rk-summary" aria-label="Resumo dos rankings">
    <div><span>Empresas com dados</span><strong>${rows.length} <small>/ ${candidates.length}</small></strong></div>
    <div><span>Setores exibidos</span><strong>${visibleSectors}</strong></div>
    <div><span>Exercício selecionado</span><strong class="rk-summary-date">${formattedDate}</strong></div>
   </div>
   <details class="rk-method">
    <summary>Sobre os dados e a metodologia</summary>
    <div>
     <p>Amostra parcial de ${this.data.length} emissores com dados CVM, não representa toda a B3. Uma classe por emissor. Ordenação somente dentro de cada setor editorial, mesmo exercício e escopo contábil. Ausência não significa zero.</p>
     <p>${fields[this.metric][2]}</p>
     <p>Processamento: ${this.processed}. Preço, P/L, P/VP, DY e proventos históricos próprios não têm cobertura validada nesta fonte.</p>
    </div>
   </details>
   <section class="rk-results" aria-labelledby="rk-results-title">
    <div class="rk-section-heading rk-results-heading">
     <div><p class="rk-kicker">02 / CLASSIFICAÇÃO</p><h2 id="rk-results-title">Resultados por setor</h2></div>
     <span class="rk-results-meta">${groups.length} grupos · ${fields[this.metric][0]}</span>
    </div>
    ${groups.map((group,index)=>html`<section class="rk-group" aria-label=${`${group.sector} — ${group.scope}`}>
     <header class="rk-group-header">
      <div><span class="rk-group-index">SETOR ${String(index+1).padStart(2,'0')}</span><h3>${group.sector}</h3></div>
      <div class="rk-group-meta"><span>${group.items.length} ${group.items.length===1?'empresa':'empresas'}</span><span class="rk-scope">${group.scope==='con'?'Consolidado':'Individual'}</span></div>
     </header>
     <div class="financial-table-scroll rk-table-wrap" tabindex="0" role="region" aria-label=${`Ranking de ${group.sector}`}>
      <table class="rk-table">
       <thead><tr><th scope="col">Posição</th><th scope="col">Empresa</th><th scope="col">Valor calculado</th><th scope="col">Referência / fonte</th></tr></thead>
       <tbody>${group.items.map((r,i)=>html`<tr>
        <td class="rk-rank">${String(i+1).padStart(2,'0')}</td>
        <th scope="row" class="rk-company"><a href=${`#/acoes/${r.d.issuer.symbol}`}>${r.d.issuer.symbol}</a></th>
        <td class="rk-value">${formatFinancial(r.p!.values[this.metric],'%')}</td>
        <td class="rk-source"><a href=${r.p!.document.url} target="_blank" rel="noopener noreferrer">${r.p!.end.split('-').reverse().join('/')} · CVM v${r.p!.document.version}</a></td>
       </tr>`)}</tbody>
      </table>
     </div>
    </section>`)}
    ${!this.loading&&!rows.length?html`<p class="rk-status">Nenhum dado comparável neste filtro.</p>`:nothing}
   </section>
  </div>`;
 }
}
