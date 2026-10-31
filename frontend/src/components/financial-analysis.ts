import {html,nothing,svg} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {fields,formatFinancial,manifest,loadFinancial, type FinancialData,type Period} from '../financial-data';

@customElement('financial-analysis')
export class FinancialAnalysis extends LightElement {
 @property() symbol='';
 @state() private opened=false;
 @state() private loading=false;
 @state() private data:FinancialData|null=null;
 @state() private error='';
 @state() private updatedAt='';
 @state() private tab='summary';
 @state() private kind='annual';
 @state() private end='';
 @state() private series='revenue';
 @state() private point=-1;
 private controller?:AbortController;
 disconnectedCallback(){this.controller?.abort();super.disconnectedCallback();}
 protected updated(changed:Map<PropertyKey,unknown>){if(changed.has('symbol') && this.opened)void this.load();}
 private async load(){this.controller?.abort();const controller=this.controller=new AbortController();this.loading=true;this.error='';try{const m=await manifest(controller.signal);const data=await loadFinancial(m,this.symbol,controller.signal);if(controller.signal.aborted)return;this.data=data;this.updatedAt=m.processed_at;this.end='';}catch(e){if((e as Error).name!=='AbortError')this.error=(e as Error).message;}finally{if(!controller.signal.aborted)this.loading=false;}}
 render(){
 const periods=this.data?.periods.filter(p=>p.kind===this.kind) || [];
 const selected=periods.find(p=>p.end===this.end) || periods.at(-1);
 const groups:Record<string,string[]>={summary:['revenue','profit','equity','assets','roe','net_margin'],results:['revenue','costs','gross_profit','operating_profit','financial_result','profit'],balance:['assets','liabilities','equity','cash','loans','net_debt'],cash:['operating_cash','investing_cash','financing_cash'],ratios:['net_margin','operating_margin','roe','roa','loans_equity','revenue_growth','profit_growth','equity_growth']};
 return html`<section class="financial-analysis"><h2 class="market-section-title">Análise Financeira 2T</h2><button class="button secondary" aria-expanded=${this.opened} @click=${()=>{this.opened=!this.opened;if(this.opened&&!this.data)void this.load();}}> ${this.opened?'Fechar análise':'Consultar dados CVM'}</button>
 ${this.opened?html`${this.loading?html`<p role="status">Carregando demonstrações…</p>`:nothing}${this.error?html`<p role="alert">${this.error}</p><button class="button secondary" @click=${this.load}>Tentar novamente</button>`:nothing}
 ${!this.loading&&!this.error&&!this.data?html`<p>Não disponível para esta empresa na cobertura inicial.</p>`:nothing}
 ${this.data&&!this.loading&&!this.error?html`<p class="market-note">${this.data.issuer.name} · CNPJ ${this.data.issuer.cnpj} · CVM ${this.data.issuer.cvm}. Dados do emissor, não da classe da ação.</p>
 <div class="financial-controls"><label for="cvm-frequency">Frequência</label><select id="cvm-frequency" .value=${this.kind} @change=${(e:Event)=>{this.kind=(e.target as HTMLSelectElement).value;this.end='';this.point=-1;}}><option value="annual">Anual</option><option value="quarter">Trimestre isolado</option><option value="ytd">Acumulado no ano</option></select><label for="cvm-reference">Referência</label><select id="cvm-reference" .value=${selected?.end||''} @change=${(e:Event)=>{this.end=(e.target as HTMLSelectElement).value;}}>${periods.map(p=>html`<option value=${p.end} .selected=${p.end===selected?.end}>${p.start} a ${p.end}</option>`)}</select></div>
 <div class="financial-tabs" role="group" aria-label="Seções da análise">${[['summary','Visão financeira'],['results','Resultados'],['balance','Balanço patrimonial'],['cash','Fluxo de caixa'],['ratios','Indicadores']].map(([key,label])=>html`<button class="button secondary" aria-pressed=${this.tab===key} @click=${()=>{this.tab=key;}}>${label}</button>`)}</div>
 ${selected?html`<p class="market-note">Fonte: CVM · ${selected.document.scope==='con'?'Consolidado':'Individual'} · ${selected.start} a ${selected.end} · documento recebido em ${selected.document.received}, versão ${selected.document.version}. <a href=${selected.document.url} target="_blank" rel="noopener noreferrer">Documento oficial</a></p><dl class="financial-metrics">${groups[this.tab].map(key=>html`<div><dt>${fields[key][0]}</dt><dd>${formatFinancial(selected.values[key],fields[key][1])}</dd><details><summary>Metodologia e origem</summary><p>${fields[key][2]}</p>${selected.evidence[key]?html`<p>CVM ${selected.evidence[key].statement}, conta ${selected.evidence[key].account}, escala original ${selected.evidence[key].scale}, valor ${selected.evidence[key].raw}.</p>`:nothing}</details></div>`)}</dl>`:html`<p>Não disponível nesta frequência.</p>`}
 ${this.chart(periods)}<p class="market-note">Processamento: ${this.updatedAt}. Dados contábeis, sujeitos a reapresentação. Bancos não usam margens industriais. Não há P/L, P/VP ou dividend yield próprios.</p><details><summary>Limitações e licença</summary>${this.data.limitations.map(s=>html`<p>${s}</p>`)}<p>Fonte: <a href="https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp">CVM</a>. Base derivada sob <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>. Arquivos JSON e metodologia disponíveis no repositório 2T.</p></details>`:nothing}`:nothing}</section>`;
 }
 private chart(periods:Period[]){
 const rows=periods.filter(p=>p.values[this.series]!=null);const values=rows.map(p=>p.values[this.series]!);const min=Math.min(0,...values),max=Math.max(1,...values);const x=(i:number)=>40+i*620/Math.max(1,rows.length-1);const y=(v:number)=>180-(v-min)/(max-min)*150;const active=rows[this.point>=0?Math.min(this.point,rows.length-1):rows.length-1];
 return html`<div class="financial-chart"><label for="cvm-series">Evolução</label><select id="cvm-series" .value=${this.series} @change=${(e:Event)=>{this.series=(e.target as HTMLSelectElement).value;this.point=-1;}}>${['revenue','profit','equity','assets','loans','roe','net_margin','operating_margin'].map(k=>html`<option value=${k}>${fields[k][0]}</option>`)}</select>${rows.length>=2?html`<svg viewBox="0 0 700 220" role="img" aria-label=${`Evolução de ${fields[this.series][0]}`}><path class="stock-line" d=${rows.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.values[this.series]!)}`).join(' ')}></path>${rows.map((p,i)=>svg`<circle class="stock-dot" cx=${x(i)} cy=${y(p.values[this.series]!)} r="5" tabindex="0" @focus=${()=>{this.point=i;}} @pointerenter=${()=>{this.point=i;}}><title>${p.end}: ${formatFinancial(p.values[this.series],fields[this.series][1])}</title></circle>`)}<text x="40" y="210" fill="currentColor" font-size="12">${rows[0]?.end}</text><text x="660" y="210" text-anchor="end" fill="currentColor" font-size="12">${rows.at(-1)?.end}</text></svg><p role="status">${active?.end}: ${formatFinancial(active?.values[this.series],fields[this.series][1])}</p><label for="cvm-point">Consultar período</label><input id="cvm-point" type="range" min="0" max=${rows.length-1} .value=${String(this.point<0?rows.length-1:this.point)} @input=${(e:Event)=>{this.point=Number((e.target as HTMLInputElement).value);}}><details><summary>Valores do gráfico</summary><table><tbody>${rows.map(p=>html`<tr><th scope="row">${p.end}</th><td>${formatFinancial(p.values[this.series],fields[this.series][1])}</td></tr>`)}</tbody></table></details>`:html`<p>Não há dados suficientes para este gráfico.</p>`}</div>`;
 }
}
