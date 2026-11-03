import {html,nothing,svg} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {stocks} from '../market-catalog';
import {manifest,loadFinancial,fields,formatFinancial,type FinancialData} from '../financial-data';

@customElement('financial-comparison')
export class FinancialComparison extends LightElement {
 @state() private selected=['PETR4','VALE3','',''];
 @state() private data:FinancialData[]=[];
 @state() private error='';
 @state() private loading=false;
 @state() private period='';
 @state() private historyMetric='profit';
 @state() private normalized=false;
 private controller?:AbortController;
 connectedCallback(){super.connectedCallback();void this.load();}
 disconnectedCallback(){this.controller?.abort();super.disconnectedCallback();}
 private async load(){this.controller?.abort();const controller=this.controller=new AbortController();this.loading=true;this.error='';try{const m=await manifest(controller.signal);const result=await Promise.all(this.selected.filter(Boolean).map(s=>loadFinancial(m,s,controller.signal)));if(controller.signal.aborted)return;const unique=new Map<string,FinancialData>();for(const d of result)if(d)unique.set(d.issuer.cnpj,d);this.data=[...unique.values()];if(result.some(d=>!d))this.error='Uma das empresas não possui cobertura CVM nesta versão.';this.period='';}catch(e){if((e as Error).name!=='AbortError')this.error=(e as Error).message;}finally{if(!controller.signal.aborted)this.loading=false;}}
 render(){
 const common=this.data[0]?.periods.filter(p=>p.kind==='annual'&&this.data.every(d=>d.periods.some(other=>other.kind==='annual'&&other.end===p.end))).map(p=>p.end)||[];
 const date=this.period||common.at(-1);const periods=this.data.map(d=>d.periods.find(p=>p.kind==='annual'&&p.end===date));
 return html`<div class="cvm-comparison">
  <header class="cvm-hero">
   <div>
    <p class="cvm-eyebrow">DADOS CVM / COMPARAÇÃO</p>
    <h1>Comparação financeira</h1>
    <p class="cvm-lead">Compare resultados, indicadores e evolução anual de empresas brasileiras.</p>
   </div>
   <a class="market-back cvm-return" href="#/acoes">← Voltar à lista de ações</a>
  </header>
  <section class="cvm-panel cvm-selection" aria-labelledby="cvm-selection-title">
   <div class="cvm-panel-heading">
    <div><p class="cvm-kicker">01 / EMPRESAS</p><h2 id="cvm-selection-title">Selecione as empresas</h2></div>
    <span class="cvm-selection-count">${this.selected.filter(Boolean).length} de 4 posições</span>
   </div>
   <p class="cvm-support">Dados contábeis anuais da CVM. Cada emissor aparece uma vez, independentemente da classe da ação.</p>
   <div class="financial-controls cvm-company-grid">
    ${this.selected.map((s,i)=>html`<div class="cvm-company-field"><label for=${`cvm-company-${i}`}>Empresa ${i+1}</label>
     <select id=${`cvm-company-${i}`} .value=${s} @change=${(e:Event)=>{this.selected=this.selected.map((v,j)=>i===j?(e.target as HTMLSelectElement).value:v);void this.load();}}>
      <option value="" .selected=${!s}>${i>=2?'Opcional':'Selecione'}</option>
      ${stocks.map(stock=>html`<option value=${stock.symbol} .selected=${s===stock.symbol}>${stock.symbol} · ${stock.name}</option>`)}
     </select>
    </div>`)}
   </div>
  </section>
  ${this.loading?html`<p class="cvm-status" role="status">Carregando comparação…</p>`:nothing}
  ${this.error?html`<p class="cvm-status cvm-error" role="alert">${this.error}</p>`:nothing}
  ${!this.loading&&this.data.length>=2&&common.length?html`
   <section class="cvm-panel cvm-indicators" aria-labelledby="cvm-indicators-title">
    <div class="cvm-panel-heading cvm-panel-heading-responsive">
     <div><p class="cvm-kicker">02 / INDICADORES</p><h2 id="cvm-indicators-title">Resultados financeiros</h2></div>
     <div class="cvm-period"><label for="cvm-common-period">Exercício comum</label>
      <select id="cvm-common-period" .value=${date||''} @change=${(e:Event)=>{this.period=(e.target as HTMLSelectElement).value;}}>
       ${common.map(d=>html`<option value=${d} .selected=${d===date}>${d}</option>`)}
      </select>
     </div>
    </div>
    <p class="market-note cvm-context">Setores e estruturas contábeis podem ser diferentes. Receita e margens industriais ficam indisponíveis para bancos. ROE usa PL médio e inclui não controladores.</p>
    <div class="financial-table-scroll cvm-table-scroll" tabindex="0" role="region" aria-label="Tabela comparativa de indicadores financeiros">
     <table class="cvm-table">
      <thead><tr><th scope="col">Indicador</th>
       ${this.data.map((d,i)=>html`<th scope="col"><span class="cvm-ticker">${d.issuer.symbol}</span><span class="cvm-period-caption">${periods[i]?.start} a ${periods[i]?.end}</span><span class="cvm-period-caption">${periods[i]?.document.scope==='con'?'Consolidado':'Individual'} · v${periods[i]?.document.version}</span></th>`)}
      </tr></thead>
      <tbody>${['revenue','profit','equity','roe','net_margin','revenue_growth','profit_growth','loans_equity'].map(k=>html`<tr><th scope="row"><span title=${fields[k][2]}>${fields[k][0]}</span></th>${periods.map(p=>html`<td>${formatFinancial(p?.values[k],fields[k][1])}</td>`)}</tr>`)}</tbody>
     </table>
    </div>
    <p class="market-note cvm-footnote">Comparação de valores consolidados e individuais não deve ser tratada como equivalente. Consulte a metodologia de cada emissor em sua análise.</p>
   </section>
   ${this.history()}
   <section class="cvm-documents" aria-label="Documentos de referência"><h3>Fontes da comparação</h3>
    <ul>${this.data.map((d,i)=>html`<li><strong>${d.issuer.symbol}</strong><span>Recebido em ${periods[i]?.document.received}</span><a href=${periods[i]?.document.url||'#'} target="_blank" rel="noopener noreferrer">Documento oficial CVM</a></li>`)}</ul>
   </section>
  `:!this.loading?html`<div class="cvm-empty" role="status">Selecione de dois a quatro emissores com dados no mesmo exercício. Ausência não representa zero.</div>`:nothing}
 </div>`;
 }
 private history(){
  const dates=[...new Set(this.data.flatMap(d=>d.periods.filter(p=>p.kind==='annual').map(p=>p.end)))].sort();
  const values=this.data.map(d=>dates.map(date=>{const p=d.periods.find(p=>p.kind==='annual'&&p.end===date);const peers=this.data.map(other=>other.periods.find(p=>p.kind==='annual'&&p.end===date));return p&&peers.every(other=>other&&other.start===p.start&&other.document.scope===p.document.scope)?p.values[this.historyMetric]??null:null}));
  const base=dates.findIndex((_,i)=>values.every(v=>v[i]!=null&&v[i]!>0));
  const series=values.map(v=>v.map((n,i)=>this.normalized?(base>=0&&i>=base&&n!=null?n/v[base]!*100:null):n));
  const nums=series.flat().filter((v):v is number=>v!=null),min=Math.min(0,...nums),max=Math.max(1,...nums);
  const x=(i:number)=>40+i*620/Math.max(1,dates.length-1),y=(v:number)=>180-(v-min)/(max-min)*150;
  return html`<section class="financial-chart financial-history cvm-panel" aria-labelledby="cvm-history-title">
   <div class="cvm-panel-heading"><div><p class="cvm-kicker">03 / EVOLUÇÃO</p><h2 id="cvm-history-title">Evolução financeira comparada</h2></div></div>
   <div class="cvm-chart-toolbar">
    <label>Indicador histórico
     <select .value=${this.historyMetric} @change=${(e:Event)=>this.historyMetric=(e.target as HTMLSelectElement).value}>
      ${['revenue','profit','equity','roe','roa','net_margin','cash','loans','operating_cash'].map(k=>html`<option value=${k} .selected=${k===this.historyMetric}>${fields[k][0]}</option>`)}
     </select>
    </label>
    <label class="financial-normalize"><input type="checkbox" .checked=${this.normalized} @change=${(e:Event)=>this.normalized=(e.target as HTMLInputElement).checked}> Normalizar em base 100</label>
   </div>
   <p class="market-note cvm-chart-note">Somente períodos com início, fim e escopo compatíveis. Lacunas interrompem as linhas. Base 100 exige valor inicial positivo para todos os emissores; não representa retorno da ação.</p>
   <div class="cvm-chart-canvas">
    ${this.normalized&&base<0?html`<p class="cvm-empty">Sem base positiva comum para normalizar.</p>`:html`<svg viewBox="0 0 700 220" role="img" aria-label="Comparação histórica financeira">
      <line class="cvm-chart-gridline" x1="40" x2="660" y1="40" y2="40"></line>
      <line class="cvm-chart-gridline" x1="40" x2="660" y1="110" y2="110"></line>
      <line class="cvm-chart-gridline" x1="40" x2="660" y1="180" y2="180"></line>
      ${series.map((v,j)=>svg`<path class="stock-line" stroke-dasharray=${['none','8 4','2 4','10 3 2 3'][j]} d=${v.map((n,i)=>n==null?'':`${i&&v[i-1]!=null?'L':'M'}${x(i)},${y(n)}`).join(' ')}><title>${this.data[j].issuer.symbol}</title></path>`)}
      <text fill="currentColor" font-size="12" x="40" y="210">${dates[0]}</text><text fill="currentColor" font-size="12" x="660" y="210" text-anchor="end">${dates.at(-1)}</text>
     </svg>`}
   </div>
   <div class="cvm-chart-legend" aria-label="Empresas no gráfico">
    ${this.data.map((d,i)=>html`<span class="cvm-legend-item"><span class="cvm-legend-line cvm-legend-line-${i+1}" aria-hidden="true"></span><strong>${d.issuer.symbol}</strong><small>${['contínua','tracejada','pontilhada','traço e ponto'][i]}</small></span>`)}
   </div>
   <div class="financial-table-scroll cvm-history-table" tabindex="0" role="region" aria-label="Tabela de evolução financeira">
    <table class="cvm-table"><caption>${fields[this.historyMetric][0]} · ${this.normalized?'Índice base 100':fields[this.historyMetric][1]}</caption><thead><tr><th scope="col">Exercício</th>${this.data.map(d=>html`<th scope="col">${d.issuer.symbol}</th>`)}</tr></thead><tbody>${dates.map((date,i)=>html`<tr><th scope="row">${date}</th>${series.map(v=>html`<td>${this.normalized?(v[i]==null?'Não disponível':v[i]!.toLocaleString('pt-BR',{maximumFractionDigits:2})):formatFinancial(v[i],fields[this.historyMetric][1])}</td>`)}</tr>`)}</tbody></table>
   </div>
  </section>`;
 }

}
