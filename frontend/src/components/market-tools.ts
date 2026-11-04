import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement,money} from '../ui';
import {projectContributions} from '../market-tools';
import {manifest,loadFinancial,formatFinancial,fields,type FinancialData} from '../financial-data';
import {stocks} from '../market-catalog';
@customElement('market-contributions')
export class MarketContributions extends LightElement {
 @state() private capital=1000;@state() private deposit=100;@state() private months=120;@state() private rates=[4,8];@state() private dividend=0;@state() private reinvest=true;@state() private show=false;
 render(){let error='',results:ReturnType<typeof projectContributions>[]=[];if(this.show)try{results=this.rates.map(rate=>projectContributions(this.capital,this.deposit,this.months,rate,this.dividend,this.reinvest))}catch(e){error=(e as Error).message}
 return html`<h1>Simulador de aportes em ações</h1><a href="#/acoes">← Ações</a><p class="market-note">Cenários matemáticos brutos. Taxas hipotéticas, sem preços históricos, impostos, custos ou previsão de retorno. Dividendos informados separadamente da valorização do preço, pagos antes do aporte mensal.</p><form class="rf-panel" @submit=${(e:Event)=>{e.preventDefault();this.show=true}}><div class="rf-fields">${(['capital','deposit','months','dividend'] as const).map((key,i)=>html`<label class="rf-field">${['Capital inicial (R$)','Aporte mensal (R$)','Prazo (meses)','Dividendos hipotéticos (% a.a.)'][i]}<input required type="number" step=${key==='months'?'1':'any'} .value=${String(this[key])} @input=${(e:Event)=>{this[key]=Number((e.target as HTMLInputElement).value);this.show=false}}></label>`)}${this.rates.map((rate,i)=>html`<label class="rf-field">Valorização do preço · cenário ${i+1} (% a.a.)<input required type="number" step="any" .value=${String(rate)} @input=${(e:Event)=>{this.rates=this.rates.map((v,j)=>i===j?Number((e.target as HTMLInputElement).value):v);this.show=false}}></label>`)}</div><label><input type="checkbox" .checked=${this.reinvest} @change=${(e:Event)=>{this.reinvest=(e.target as HTMLInputElement).checked;this.show=false}}> Reinvestir dividendos</label><button class="button primary">Simular aportes</button></form>${error?html`<p role="alert">${error}</p>`:nothing}
 ${results.length?html`<div class="rf-metrics">${results.map((rows,i)=>{const last=rows.at(-1)!;return html`<div><h2>Cenário ${i+1}</h2><p>Investido: ${money(last.invested)}</p><p>Patrimônio projetado: <strong>${money(last.total)}</strong></p><p>Ganho projetado: ${money(last.total-last.invested)}</p><p>Dividendos mantidos em caixa: ${money(last.cash)}</p></div>`})}</div><details><summary>Evolução mensal</summary><div class="rf-table-wrap"><table><thead><tr><th>Mês</th><th>Total investido</th><th>Cenário 1</th><th>Cenário 2</th></tr></thead><tbody>${results[0].map((r,i)=>html`<tr><th>${r.month}</th><td>${money(r.invested)}</td>${results.map(rows=>html`<td>${money(rows[i].total)}</td>`)}</tr>`)}</tbody></table></div></details>`:nothing}`}
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
