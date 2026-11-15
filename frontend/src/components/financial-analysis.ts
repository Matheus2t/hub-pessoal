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
 private snapshotPath='';
 @state() private tab='summary';
 @state() private kind='annual';
 @state() private end='';
 @state() private series='revenue';
 @state() private point=-1;
 @state() private window='all';
 @state() private chartWidth=760;
 private controller?:AbortController;
 private chartObserver?:ResizeObserver;
 private chartTarget?:Element;
 disconnectedCallback(){this.controller?.abort();this.chartObserver?.disconnect();this.chartTarget=undefined;super.disconnectedCallback();}
 protected updated(changed:Map<PropertyKey,unknown>){
  if(changed.has('symbol') && this.opened)void this.load();
  const target=this.renderRoot.querySelector('.cvm-analysis-chart');
  if(target===this.chartTarget)return;
  this.chartObserver?.disconnect();this.chartObserver=undefined;this.chartTarget=target||undefined;
  if(target&&typeof ResizeObserver!=='undefined'){
   this.chartObserver=new ResizeObserver(entries=>{const next=Math.max(220,Math.floor(entries[0]?.contentRect.width||220));if(next!==this.chartWidth)this.chartWidth=next;});
   this.chartObserver.observe(target);
  }
 }
 private async load(){this.controller?.abort();const controller=this.controller=new AbortController();this.loading=true;this.error='';try{const m=await manifest(controller.signal);const data=await loadFinancial(m,this.symbol,controller.signal);if(controller.signal.aborted)return;this.data=data;this.snapshotPath=m.companies[this.symbol]?.path||'';this.updatedAt=m.processed_at;this.end='';if(this.kind==='ttm'&&!data?.ttm_periods?.length)this.kind='annual';}catch(e){if((e as Error).name!=='AbortError')this.error=(e as Error).message;}finally{if(!controller.signal.aborted)this.loading=false;}}
 render(){
 const periods=[...(this.data?.periods||[]),...(this.data?.ttm_periods||[])].filter(p=>p.kind===this.kind);
 const selected=periods.find(p=>p.end===this.end) || periods.at(-1);
 const groups:Record<string,string[]>={summary:['revenue','profit','equity','assets','roe','net_margin'],results:['revenue','costs','gross_profit','operating_profit','financial_result','profit'],balance:['assets','liabilities','equity','cash','loans','net_debt'],cash:['operating_cash','investing_cash','financing_cash'],ratios:['net_margin','operating_margin','roe','roa','loans_equity','revenue_growth','profit_growth','equity_growth']};
 return html`<section class="financial-analysis"><h2 class="market-section-title">Análise Financeira 2T</h2><button class="button secondary" aria-expanded=${this.opened} @click=${()=>{this.opened=!this.opened;if(this.opened&&!this.data)void this.load();}}> ${this.opened?'Fechar análise':'Consultar dados CVM'}</button>
 ${this.opened?html`${this.loading?html`<p role="status">Carregando demonstrações…</p>`:nothing}${this.error?html`<p role="alert">${this.error}</p><button class="button secondary" @click=${this.load}>Tentar novamente</button>`:nothing}
 ${!this.loading&&!this.error&&!this.data?html`<p>Não disponível para esta empresa na cobertura inicial.</p>`:nothing}
 ${this.data&&!this.loading&&!this.error?html`<p class="market-note">${this.data.issuer.name} · CNPJ ${this.data.issuer.cnpj} · CVM ${this.data.issuer.cvm}. Dados do emissor, não da classe da ação.</p>
 <div class="financial-controls"><div class="financial-control"><label for="cvm-frequency">Frequência</label><select id="cvm-frequency" .value=${this.kind} @change=${(e:Event)=>{this.kind=(e.target as HTMLSelectElement).value;this.end='';this.point=-1;if(this.kind==='ttm')this.series='profit';}}><option value="annual">Anual</option><option value="quarter">Trimestre isolado</option><option value="ytd">Acumulado no ano</option>${this.data.ttm_periods?.length?html`<option value="ttm">Últimos 12 meses (TTM)</option>`:nothing}</select></div><div class="financial-control"><label for="cvm-reference">Referência</label><select id="cvm-reference" .value=${selected?.end||''} @change=${(e:Event)=>{this.end=(e.target as HTMLSelectElement).value;}}>${periods.map(p=>html`<option value=${p.end} .selected=${p.end===selected?.end}>${p.start} a ${p.end}</option>`)}</select></div></div>
 <div class="financial-tabs" role="group" aria-label="Seções da análise">${[['summary','Visão financeira'],['results','Resultados'],['balance','Balanço patrimonial'],['cash','Fluxo de caixa'],['ratios','Indicadores']].map(([key,label])=>html`<button class="button secondary" aria-pressed=${this.tab===key} @click=${()=>{this.tab=key;}}>${label}</button>`)}</div>
 ${selected?html`<p class="market-note">Fonte: CVM · ${selected.document.scope==='con'?'Consolidado':'Individual'} · ${selected.start} a ${selected.end} · documento recebido em ${selected.document.received}, versão ${selected.document.version}. <a href=${selected.document.url} target="_blank" rel="noopener noreferrer">Documento oficial</a></p><dl class="financial-metrics">${(this.kind==='ttm'?['profit']:groups[this.tab]).map(key=>html`<div><dt>${key==='profit'&&selected.document.scope==='ind'?'Lucro líquido individual':fields[key][0]}</dt><dd>${formatFinancial(selected.values[key],fields[key][1])}</dd><details><summary>Metodologia e origem</summary><p>${fields[key][2]}</p>${selected.evidence[key]&&!selected.evidence[key].operation?html`<p>CVM ${selected.evidence[key].statement}, conta ${selected.evidence[key].account}, escala original ${selected.evidence[key].scale}, valor ${selected.evidence[key].raw}.</p>`:nothing}</details></div>`)}</dl>`:html`<p>Não disponível nesta frequência.</p>`}
 ${this.data.issuer.scope_review?html`<p class="market-note">${this.data.issuer.scope_review.reason}</p>`:nothing}${this.data.issuer.identity_review?html`<details><summary>Identificação do emissor</summary><p>${this.data.issuer.identity_review.finding}</p>${this.data.issuer.identity_review.sources.map(url=>html`<p><a href=${url} target="_blank" rel="noopener noreferrer">Fonte oficial de identificação</a></p>`)}</details>`:nothing}${this.renderTTM(selected)}${this.renderDerived()}${this.chart(periods)}<p class="market-note">Processamento: ${this.updatedAt}. Dados contábeis, sujeitos a reapresentação. Bancos não usam margens industriais. Não há P/L, P/VP ou dividend yield próprios.</p><details><summary>Limitações e licença</summary>${this.data.limitations.map(s=>html`<p>${s}</p>`)}<p>Fonte: <a href="https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp">CVM</a>. Base derivada sob <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>. Arquivos JSON e metodologia disponíveis no repositório 2T.</p></details>`:nothing}`:nothing}</section>`;
 }


 private renderTTM(selected?:Period){
  if(selected?.kind!=='ttm')return nothing;
  const ev=selected.evidence.profit;
  const sources=selected.sources||[];
  return html`<section class="financial-ttm"><h3>Lucro dos últimos 12 meses</h3>
   <p class="market-note">${selected.start} a ${selected.end}. Soma de quatro trimestres consecutivos. Lucro consolidado total, incluindo não controladores. Sem anualização ou estimativa. Cobertura TTM parcial: somente lucro de PETR4.</p>
   <p class="market-note">4T25 = DFP 2025 − ITR de nove meses, conferido no release oficial (página 7). Janelas de 2026 também conciliam os comparativos dos ITRs atuais. Outros indicadores TTM permanecem indisponíveis.</p>
   <div class="financial-table-scroll" tabindex="0"><table><caption>Operandos do TTM</caption><thead><tr><th scope="col">Trimestre</th><th scope="col">Lucro</th><th scope="col">Documento e versão</th></tr></thead><tbody>${ev.operands?.map(f=>{const d=sources.find(d=>d.id===f.document);return html`<tr><th scope="row">${f.start} a ${f.end}</th><td>${formatFinancial(f.value)}</td><td>${d?html`<a href=${d.url} target="_blank" rel="noopener noreferrer">${f.document} · v${f.version}</a>`:f.document}</td></tr>`})}</tbody></table></div>
   <details><summary>Evidências e fontes do TTM</summary><p>Revisão ${ev.review_sha256}. Escopos, contas, escalas, versões selecionadas, controle independente e comparativos preservados no JSON.</p><a href=${'/financials/'+this.snapshotPath} target="_blank" rel="noopener noreferrer">Snapshot com evidências e valores exatos</a><ul>${[...new Map(sources.map(d=>[d.url,d])).values()].map(d=>html`<li><a href=${d.url} target="_blank" rel="noopener noreferrer">${d.reference} · documento ${d.id} · v${d.version}</a></li>`)}</ul></details>
  </section>`;
 }

 private renderDerived(){
  const entries=(this.data?.derived_periods||[]).filter(p=>p.kind==='derived-quarter'&&Object.keys(p.evidence).length);
  if(!entries.length)return nothing;
  return html`<details class="financial-derived">
   <summary>Trimestres conciliados com documentos CVM (${entries.length})</summary>
   <p class="market-note">Diferenças conferidas contra trimestres informados nos documentos oficiais. Estes registros não representam TTM; as janelas de 12 meses possuem validação separada.</p>
   <div class="financial-table-scroll" tabindex="0"><table>
    <thead><tr><th scope="col">Período</th><th scope="col">Lucro reconciliado</th><th scope="col">Documentos oficiais</th></tr></thead>
    <tbody>${entries.map(p=>{const evidence=p.evidence.profit||Object.values(p.evidence)[0];const d=evidence?.validation;
      return html`<tr><th scope="row">${p.start} a ${p.end}</th><td>${formatFinancial(p.values.profit,'BRL')}</td><td>
       ${d?html`<a href=${d.current_document.url} target="_blank" rel="noopener noreferrer">DFP / ITR acumulado</a> · <a href=${d.previous_document.url} target="_blank" rel="noopener noreferrer">ITR anterior</a> · <a href=${d.reported_control_document.url} target="_blank" rel="noopener noreferrer">Trimestre de controle</a>`:nothing}
      </td></tr>`})}</tbody></table></div>
   <p class="market-note">Fonte: documentos CVM selecionados e evidências de conciliação anexadas ao snapshot público. Os históricos originais foram preservados.</p>
  </details>`;
 }
 private chart(periods:Period[]){
 const latest=periods.at(-1)?.end;const cutoff=latest&&this.window!=='all'?Number(latest.slice(0,4))-Number(this.window)+1:0;
 const rows=periods.filter(p=>Number(p.end.slice(0,4))>=cutoff),values=rows.map(p=>p.values[this.series]??null),nums=values.filter((v):v is number=>v!=null),hasValues=nums.length>0,rawMin=hasValues?Math.min(...nums):0,rawMax=hasValues?Math.max(...nums):1,span=Math.max(rawMax-rawMin,Math.abs(rawMin)*.06,Math.abs(rawMax)*.06,1),min=Math.min(0,rawMin-span*.03),max=Math.max(0,rawMax+span*.03);
 const width=this.chartWidth,height=width<500?270:320,left=Math.min(76,Math.max(54,width*.13)),right=width-16,top=22,bottom=height-42,x=(i:number)=>left+i*(right-left)/Math.max(1,rows.length-1),y=(v:number)=>bottom-(v-min)/(max-min)*(bottom-top);
 const activeIndex=Math.min(this.point<0?rows.length-1:this.point,rows.length-1),active=rows[activeIndex],ticks=Array.from({length:5},(_,i)=>{const value=max-(max-min)*i/4,py=top+(bottom-top)*i/4;return {value,py};}),tickCount=width<420?3:width<700?4:6,xTicks=[...new Set(Array.from({length:Math.min(rows.length,tickCount)},(_,i)=>Math.round(i*(rows.length-1)/Math.max(1,Math.min(rows.length,tickCount)-1))))];
 const line=values.map((v,i)=>v==null?'':`${i&&values[i-1]!=null?'L':'M'}${x(i)},${y(v)}`).join(' ');
 const displayValue=(v:number|null|undefined)=>formatFinancial(v,fields[this.series][1]);
 return html`<div class="financial-chart cvm-analysis-chart-wrap">
  <div class="cvm-analysis-controls"><label for="cvm-window">Histórico<select id="cvm-window" .value=${this.window} @change=${(e:Event)=>{this.window=(e.target as HTMLSelectElement).value;this.point=-1;}}><option value="3">Últimos 3 anos</option><option value="5">Últimos 5 anos</option><option value="all">Histórico disponível</option></select></label><label for="cvm-series">Indicador<select id="cvm-series" .value=${this.series} @change=${(e:Event)=>{this.series=(e.target as HTMLSelectElement).value;this.point=-1;}}>${(this.kind==='ttm'?['profit']:['revenue','profit','equity','assets','cash','loans','roe','roa','net_margin','operating_margin','operating_cash']).map(k=>html`<option value=${k}>${fields[k][0]}</option>`)}</select></label></div>
  ${rows.length>=2&&hasValues?html`<div class="cvm-analysis-chart"><svg viewBox=${`0 0 ${width} ${height}`} role="group" aria-label=${`Evolução de ${fields[this.series][0]}`}>
   ${ticks.map(t=>svg`<g><line class="cvm-chart-gridline" x1=${left} x2=${right} y1=${t.py} y2=${t.py}></line><text class="cvm-chart-axis-label" x=${left-8} y=${t.py+4} text-anchor="end">${formatFinancial(t.value,fields[this.series][1])}</text></g>`)}
   ${min<0&&max>0?svg`<line class="cvm-chart-zero" x1=${left} x2=${right} y1=${y(0)} y2=${y(0)}></line>`:nothing}
   <line class="cvm-chart-guide" x1=${x(activeIndex)} x2=${x(activeIndex)} y1=${top} y2=${bottom}></line><path class="stock-line cvm-analysis-line" d=${line}></path>
   ${values.map((v,i)=>v==null?nothing:svg`<circle class="stock-dot cvm-analysis-dot${i===activeIndex?' is-active':''}" cx=${x(i)} cy=${y(v)} r=${i===activeIndex?5:3.5} tabindex="0" aria-label=${`${rows[i].end}: ${displayValue(v)}`} @focus=${()=>this.point=i} @pointerenter=${()=>this.point=i}><title>${rows[i].end}: ${displayValue(v)}</title></circle>`)}
   ${xTicks.map(i=>svg`<text class="cvm-chart-axis-label cvm-chart-year" x=${x(i)} y=${height-12} text-anchor=${i===0?'start':i===rows.length-1?'end':'middle'} aria-label=${rows[i].end}>${rows[i].end.slice(0,4)}</text>`)}
  </svg></div><p class="cvm-analysis-readout" role="status" aria-live="polite"><time datetime=${active?.end||''}>${active?.end}</time><strong>${displayValue(active?.values[this.series])}</strong></p>
  <label class="cvm-analysis-inspector" for="cvm-point">Consultar período<input id="cvm-point" type="range" min="0" max=${rows.length-1} .value=${String(activeIndex)} aria-valuetext=${`${active?.end||'Período'}: ${displayValue(active?.values[this.series])}`} @input=${(e:Event)=>this.point=Number((e.target as HTMLInputElement).value)}></label>
  <details class="cvm-analysis-values"><summary>Valores do gráfico</summary><div class="financial-table-scroll" tabindex="0"><table><tbody>${rows.map(p=>html`<tr><th scope="row">${p.end}</th><td>${displayValue(p.values[this.series])}</td></tr>`)}</tbody></table></div></details>`:html`<p class="cvm-empty">${rows.length<2?'Não há períodos suficientes para este gráfico.':'Não há valores disponíveis para o indicador neste intervalo.'}</p>`}
 </div>`;
 }
}
