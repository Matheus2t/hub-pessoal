import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement,money,parseBrazilian} from '../ui';
import {calculateIpca,type IpcaPoint,type IpcaResult} from '../ipca-calculator';
import './panel-workspace';

type Series={source:string;referenceMonth:string;months:IpcaPoint[];stale?:boolean};
const pct=(n:number)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+'%';
const ym=(s:string)=>s?s.slice(5)+'/'+s.slice(0,4):'';
const parseMoney=(s:string)=>{const t=s.trim().replace(/R\$|\s/g,'');return /^\d{1,3}(\.\d{3})+$/.test(t)?Number(t.replace(/\./g,'')):parseBrazilian(s);};

@customElement('ipca-inflation-calculator')
export class IpcaInflationCalculator extends LightElement {
  @state() private series:Series|null=null;
  @state() private loading=true;
  @state() private loadError='';
  @state() private mode:'adjust'|'inflation'='adjust';
  @state() private start='1995-07';
  @state() private end='2026-01';
  @state() private amount='1.000,00';
  @state() private result:IpcaResult|null=null;
  @state() private stale=false;
  @state() private error='';
  @state() private year='1995';
  private controller:AbortController|null=null;
  connectedCallback(){super.connectedCallback();this.classList.add('workspace-v2','calculator-workspace','ipca-calculator');if(!this.series)void this.load();}
  disconnectedCallback(){this.controller?.abort();super.disconnectedCallback();}
  private async load(){
    this.controller?.abort();const c=new AbortController();this.controller=c;this.loading=true;this.loadError='';
    try{
      const response=await fetch('/api/ipca/series',{signal:c.signal});
      if(!response.ok)throw Error('Os dados oficiais do IPCA estão temporariamente indisponíveis.');
      const data=await response.json() as Series;
      if(!data.referenceMonth||!Array.isArray(data.months)||data.months.length<12||!data.months.some(p=>p.month==='1994-06'))throw Error('A série oficial está incompleta.');
      if(c.signal.aborted)return;
      this.series=data;this.end=data.referenceMonth;
    }catch(e){if(!c.signal.aborted)this.loadError=e instanceof Error?e.message:'Falha ao consultar o IBGE.';}
    finally{if(!c.signal.aborted)this.loading=false;}
  }
  private touched(){this.stale=!!this.result;this.error='';}
  private compute(event:Event){
    event.preventDefault();this.error='';
    if(!this.series){this.error='Dados oficiais indisponíveis.';return;}
    try{this.result=calculateIpca(this.series.months,this.start,this.end,parseMoney(this.amount));this.year=this.start.slice(0,4);this.stale=false;}
    catch(e){this.error=e instanceof Error?e.message:'Não foi possível calcular.';}
  }
  private summary(r:IpcaResult){
    const inflation=this.mode==='inflation';
    return html`<div class="section-heading result-heading"><h2>${inflation?'Inflação e poder de compra':'Correção pelo IPCA'}</h2>
      ${this.stale?html`<span class="result-status stale">Simule novamente</span>`:nothing}</div>
      ${this.stale?html`<p class="ipca-stale">Valores da simulação anterior. Clique em Calcular para atualizar.</p>`:nothing}
      <div class="ipca-hero"><span>${inflation?'Inflação acumulada':'Valor corrigido pelo IPCA'}</span>
        <strong>${inflation?pct(r.accumulatedPercent):money(r.finalValue)}</strong>
        <small>${ym(r.startMonth)} até ${ym(r.endMonth)} · ${r.totalMonths} meses</small></div>
      <div class="ipca-figures">
        <div><span>${inflation?'Poder de compra sem reajuste':'Valor inicial'}</span>
          <strong>${money(inflation?r.purchasingPower:r.initialValue)}</strong></div>
        <div><span>${inflation?'Valor necessário para acompanhar a inflação':'Inflação no período'}</span>
          <strong>${inflation?money(r.finalValue):pct(r.accumulatedPercent)}</strong></div>
      </div>
      <p class="ipca-message">${inflation?
        html`Se o valor ${money(r.initialValue)} não fosse reajustado, o poder de compra no mês final equivaleria a <strong>${money(r.purchasingPower)}</strong> no mês inicial.`:
        html`O valor de ${money(r.initialValue)} no mês inicial equivale a <strong>${money(r.finalValue)}</strong> no mês final para comprar a mesma cesta de produtos e serviços.`}</p>
      <details class="ipca-details"><summary>Como o IPCA é calculado?</summary>
        <p>IPCA mede a inflação: as duas visualizações usam a mesma série de dados do IBGE.</p>
        <p>O número-índice do mês final é dividido pelo número-índice do mês anterior ao inicial, incluindo os dois meses escolhidos.</p>
        <p>Fator acumulado: <strong>${r.factor.toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:6})}</strong>.</p>
      </details>`;
  }
  render(){
    const r=this.result;
    const years=r?[...new Set(r.rows.map(p=>p.month.slice(0,4)))]:[];
    const active=years.includes(this.year)?this.year:(years[0]??'');
    const rows=r?.rows.filter(p=>p.month.startsWith(active))??[];
    return html`<div class="ws-page-heading"><h1>IPCA e Inflação</h1>
      <p class="ipca-intro">Corrija um valor entre dois meses ou entenda a perda do poder de compra.</p></div>
      <panel-workspace fixed-layout area="calculator-ipca" .panels=${[
        {id:'form',title:'Período',required:true,essential:true,size:'small',resizable:false,role:'form'},
        {id:'empty',title:'Resultado',required:true,available:!r,size:'medium',resizable:false},
        {id:'summary',title:'Resultado',essential:true,available:!!r,size:'medium'},
        {id:'table',title:'Histórico',available:!!r,size:'large'}
      ]}>
        <section slot="form" class="workspace-panel simulation-panel">
          <div class="panel-heading"><h2>Simulação</h2></div>
          <div class="ipca-switch" role="group" aria-label="Tipo de cálculo">
            <button type="button" aria-pressed=${this.mode==='adjust'} @click=${()=>this.mode='adjust'}>Correção pelo IPCA</button>
            <button type="button" aria-pressed=${this.mode==='inflation'} @click=${()=>this.mode='inflation'}>Inflação</button>
          </div>
          <form novalidate @submit=${this.compute}>
            <label class="ipca-field">Mês inicial
              <input type="month" aria-label="Mês inicial" min="1994-07" max=${this.series?.referenceMonth??'2026-10'}
                .value=${this.start} @change=${(e:Event)=>{this.start=(e.target as HTMLInputElement).value;this.touched();}}/>
            </label>
            <label class="ipca-field">Mês final
              <input type="month" aria-label="Mês final" min="1994-07" max=${this.series?.referenceMonth??'2026-10'}
                .value=${this.end} @change=${(e:Event)=>{this.end=(e.target as HTMLInputElement).value;this.touched();}}/>
            </label>
            <label class="ipca-field">Valor inicial (R$)
              <input type="text" aria-label="Valor inicial" inputmode="decimal" autocomplete="off" .value=${this.amount}
                @input=${(e:Event)=>{this.amount=(e.target as HTMLInputElement).value;this.touched();}}/>
            </label>
            <div class="ipca-data-state">
              ${this.loading?html`<span role="status">Consultando o IBGE...</span>`:
                this.loadError?html`<p role="alert">${this.loadError} <button type="button" @click=${()=>void this.load()}>Tentar novamente</button></p>`:
                html`<span>IPCA até <strong>${ym(this.series!.referenceMonth)}</strong>${this.series?.stale?' · cache anterior':''}</span>`}
            </div>
            <div class="form-bottom"><button type="submit" class="button primary" ?disabled=${this.loading||!!this.loadError}>Calcular</button></div>
            ${this.error?html`<p role="alert" class="message error">${this.error}</p>`:nothing}
          </form>
          <p class="ipca-note">Série oficial desde o Plano Real (07/1994). Não representa previsão ou rentabilidade.</p>
        </section>
        <section slot="empty" class="workspace-panel calculator-empty"><div><h2>Resultado</h2><p>Escolha as datas e o valor para calcular.</p></div></section>
        <section slot="summary" class="workspace-panel">${r?this.summary(r):nothing}</section>
        <section slot="table" class="workspace-panel">
          ${r?html`<div class="ipca-table-shell"><details class="ipca-history">
            <summary>Ver IPCA mês a mês <span>${r.totalMonths} meses</span></summary>
            <div class="ipca-year-nav">
              <label>Ir para o ano <select aria-label="Ir para o ano" .value=${active}
                @change=${(e:Event)=>this.year=(e.target as HTMLSelectElement).value}>
                ${years.map(y=>html`<option value=${y}>${y}</option>`)}
              </select></label>
              <button type="button" class="button secondary" ?disabled=${active===years[0]} @click=${()=>this.year=years[0]}>Primeiro</button>
              <button type="button" class="button secondary" ?disabled=${active===years.at(-1)} @click=${()=>this.year=years.at(-1)!}>Último ano</button>
            </div>
            <div class="table-scroll" role="region" tabindex="0" aria-label="IPCA mensal">
              <table><thead><tr><th scope="col">Mês</th><th scope="col">IPCA mensal</th>
                <th scope="col">Inflação acumulada</th><th scope="col">Valor corrigido</th></tr></thead>
                <tbody>${rows.map(p=>html`<tr><th scope="row">${ym(p.month)}</th><td>${pct(p.monthlyRate)}</td>
                  <td>${pct(p.accumulatedPercent)}</td><td>${money(p.updatedValue)}</td></tr>`)}</tbody></table>
            </div>
          </details>
          <p class="ipca-credit">Fonte: <a href="https://sidra.ibge.gov.br/tabela/1737" target="_blank" rel="noopener noreferrer">IBGE/SIDRA · tabela 1737, variável 2266</a>.</p>
          </div>`:nothing}
        </section>
      </panel-workspace>`;
  }
}
