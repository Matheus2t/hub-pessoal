import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { LightElement, money, parseBrazilian } from '../ui';
import { simulateCdiDollar, type CdiDollarInput, type CdiDollarOutput, type CdiDollarTaxMode } from '../cdi-dollar';
import './form-field';
import './panel-workspace';
import './year-navigation';

const fields = [
  {name:'principal',label:'Quanto você quer investir?',unit:'R$',value:'10.000,00',min:0.01,max:1e12},
  {name:'cdiAnnualPercent',label:'CDI estimado por ano',unit:'% a.a.',value:'12',min:0,max:100},
  {name:'cdiParticipation',label:'Quanto o investimento paga do CDI?',unit:'% do CDI',value:'100',min:0,max:300},
  {name:'days',label:'Por quantos dias investir?',unit:'dias',value:'365',min:30,max:3650,integer:true},
  {name:'initialFx',label:'Dólar no início (R$ por US$ 1)',unit:'R$/US$',value:'5,00',min:0.01,max:1000},
  {name:'finalFx',label:'Dólar estimado ao final (R$ por US$ 1)',unit:'R$/US$',value:'5,60',min:0.01,max:1000},
] as const;
type FieldKey = typeof fields[number]['name'];
const moneyUsd = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(v);
const percent = (v:number) => new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)+'%';
const exchange = (v:number) => money(v)+'/US$';
const parseField = (value:string,key:FieldKey) => {
  const raw = value.trim().replace(/R\$|\s/g,'');
  if (key === 'principal' && /^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g,''));
  return parseBrazilian(value);
};

/**
 * Explicit currency comparison, not an actual FX hedge.
 * Layout follows fixed-panel 2T calculators (inputs, summary, chart, monthly table).
 */
@customElement('cdi-dollar-calculator')
export class CdiDollarCalculator extends LightElement {
  @state() private values: Record<FieldKey,string> = Object.fromEntries(fields.map(f=>[f.name,f.value])) as Record<FieldKey,string>;
  @state() private taxMode: CdiDollarTaxMode = 'taxable';
  @state() private errors: Partial<Record<FieldKey,string>> = {};
  @state() private output: CdiDollarOutput | null = null;
  @state() private error = '';
  @state() private stale = false;
  @state() private yearPage = 0;
  @state() private chosenMonth = -1;
  connectedCallback() { super.connectedCallback(); this.classList.add('workspace-v2','calculator-workspace','extended-calculator','cdi-dollar-calculator'); }
  private change(event:CustomEvent<{name:FieldKey;value:string}>) {
    if(!fields.some(f=>f.name===event.detail.name)) return;
    this.values={...this.values,[event.detail.name]:event.detail.value};
    this.errors={...this.errors,[event.detail.name]:''};
    this.stale=!!this.output;
    this.error='';
  }
  private calculate(event:Event) {
    event.preventDefault();
    const numbers:Record<string,number>={};
    const errors:Partial<Record<FieldKey,string>>={};
    for(const f of fields) {
      const n=parseField(this.values[f.name] ?? '',f.name);
      numbers[f.name]=n;
      if(!Number.isFinite(n)||n<f.min||n>f.max||('integer' in f&&f.integer&&!Number.isInteger(n)))
        errors[f.name]=`Informe um valor válido entre ${f.min} e ${f.max}.`;
    }
    this.errors=errors;
    if(Object.keys(errors).length) { this.error='Revise os campos destacados.'; return; }
    try {
      this.output=simulateCdiDollar({...numbers,taxMode:this.taxMode} as CdiDollarInput);
      this.error='';this.stale=false;this.yearPage=0;this.chosenMonth=-1;
    } catch (err) {this.error=err instanceof Error?err.message:'Não foi possível simular.';}
  }
  private formField(f:typeof fields[number]) {
    return html`<form-field .name=${f.name} idPrefix="cdi-dollar" .label=${f.label} .unit=${f.unit} .value=${this.values[f.name]}
      .integer=${'integer' in f && !!f.integer} .error=${this.errors[f.name]||''}></form-field>`;
  }
  private chart(out:CdiDollarOutput) {
    const points=out.rows;
    const left=20,top=20,width=654,height=188,max=Math.max(1,...points.flatMap(p=>[p.cdiNetBRL,p.dollarHoldBRL]))*1.07;
    const px=(i:number)=>left+(i/Math.max(1,points.length-1))*width;
    const py=(v:number)=>top+height-(v/max)*height;
    const line=(key:'cdiNetBRL'|'dollarHoldBRL')=>points.map((p,i)=>`${px(i).toFixed(2)},${py(p[key]).toFixed(2)}`).join(' ');
    const index=this.chosenMonth<0?points.length-1:Math.max(0,Math.min(points.length-1,this.chosenMonth));
    const selected=points[index];
    const displayMonth=index===0?'Início':`Mês ${index}`;
    return html`<div class="cdi-dollar-chart">
      <div class="cdi-dollar-chart-top">
        <div><span>${displayMonth} · PATRIMÔNIO EM REAIS</span><strong>${money(selected.cdiNetBRL)}</strong><small>CDI líquido de IR no resgate simulado</small></div>
        <div><span>Dólar comprado no início</span><strong>${money(selected.dollarHoldBRL)}</strong><small>Cotação: ${exchange(selected.fx)}</small></div>
      </div>
      <svg viewBox="0 0 760 250" role="img" aria-label="Evolução do investimento em CDI versus dólares comprados no início">
        <title>CDI líquido comparado ao valor em reais de dólares mantidos</title>
        ${[0.25,0.5,0.75,1].map(f=>html`<line x1=${left} x2=${left+width} y1=${py(max*f)} y2=${py(max*f)} class="cdi-dollar-gridline"></line>
          <text class="cdi-dollar-axis" x="744" text-anchor="end" y=${py(max*f)+4}>${new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(max*f)}</text>`)}
        <polyline class="cdi-dollar-line-dollar" points=${line('dollarHoldBRL')}></polyline>
        <polyline class="cdi-dollar-line-cdi" points=${line('cdiNetBRL')}></polyline>
        <line class="cdi-dollar-chart-cursor" x1=${px(index)} x2=${px(index)} y1=${top} y2=${top+height}></line>
        <circle class="cdi-dollar-chart-dot" cx=${px(index)} cy=${py(selected.cdiNetBRL)} r="4"></circle>
        <circle class="cdi-dollar-chart-dot secondary" cx=${px(index)} cy=${py(selected.dollarHoldBRL)} r="4"></circle>
        <text class="cdi-dollar-axis" x=${left} y="240">Início</text>
        <text class="cdi-dollar-axis" x=${left+width} text-anchor="end" y="240">${points.length-1} ${points.length===2?'mês':'meses'}</text>
      </svg>
      <div class="cdi-dollar-chart-legend"><span>CDI líquido</span><span>Dólar mantido</span></div>
      <label class="cdi-dollar-chart-range">Explorar mês a mês
        <input type="range" min="0" max=${points.length-1} step="1" .value=${String(index)}
          aria-label="Mês exibido no gráfico" @input=${(e:Event)=>this.chosenMonth=Number((e.target as HTMLInputElement).value)}/>
      </label>
    </div>`;
  }
  private summary(out:CdiDollarOutput) {
    const cdiWins=out.cdiDifferenceBRL>0.005;
    const dollarWins=out.cdiDifferenceBRL< -0.005;
    return html`<div class="section-heading result-heading"><h2>Resultados</h2>
      <span class="result-status ${this.stale?'stale':''}">${this.stale?'Valores alterados. Simule novamente.':'Simulação concluída'}</span></div>
      ${this.stale?html`<p class="cdi-dollar-stale" role="status">Os resultados abaixo são da simulação anterior. Clique em <strong>Calcular proteção</strong> para atualizar.</p>`:nothing}
      <div class="metrics-grid cdi-dollar-metrics">
        <article class="metric-card accent"><span class="metric-label">Dólar máximo para o CDI empatar</span><strong>${money(out.fxBreakeven)}</strong><p>Para US$ 1 no fim do prazo</p></article>
        <article class="metric-card"><span class="metric-label">Alta do dólar compensada pelo CDI</span><strong>${percent(out.fxBreakevenAppreciation)}</strong><p>Rentabilidade líquida estimada em reais</p></article>
        <article class="metric-card"><span class="metric-label">Retorno do CDI medido em dólares</span><strong>${percent(out.netDollarReturn)}</strong><p>Ao câmbio final que você informou</p></article>
      </div>
      <div class="cdi-dollar-verdict" aria-live="polite">
        <strong>${cdiWins?'Nesse cenário, o CDI rende mais que simplesmente guardar dólares.':dollarWins?'Nesse cenário, guardar dólares preserva mais valor que o CDI.':'Nesse cenário, CDI e dólar terminam empatados.'}</strong>
        <p>O dólar ${out.dollarAppreciation>=0?'subiu':'caiu'} <strong>${percent(Math.abs(out.dollarAppreciation))}</strong> no período.
          O CDI líquido cresceu <strong>${percent(out.nominalNetReturn)}</strong> em reais.
          Diferença entre as alternativas: <strong>${money(Math.abs(out.cdiDifferenceBRL))}</strong>.</p>
      </div>
      <div class="cdi-dollar-compare">
        <section><span>DEIXANDO O DINHEIRO NO CDI</span><strong>${money(out.netBRL)}</strong>
          <p>Investimento inicial: ${money(out.principal)} · Rendimento bruto: ${money(out.gainBRL)} · IR estimado: ${money(out.irAmount)} (${percent(out.irRate*100)})</p></section>
        <section><span>COMPRANDO DÓLARES E MANTENDO</span><strong>${money(out.dollarHoldBRL)}</strong>
          <p>${moneyUsd(out.initialDollars)} comprados a ${exchange(out.initialFx)}; avaliados no câmbio final, sem remuneração em USD</p></section>
      </div>
      <p class="cdi-dollar-method">O câmbio de equilíbrio é o preço futuro do dólar que faria as duas opções terminarem com o mesmo valor em reais. Isso <strong>não</strong> é uma proteção cambial contratada.</p>`;
  }
  render() {
    const out=this.output;
    const pages=out?Math.ceil((out.rows.length-1)/12):0;
    const rows=out?.rows.slice(this.yearPage*12+1,this.yearPage*12+13)??[];
    return html`<div class="ws-page-heading"><h1>CDI x Dólar</h1><p class="cdi-dollar-intro">Até quanto o dólar pode subir antes de superar o rendimento líquido do seu investimento?</p></div>
      <panel-workspace fixed-layout .area=${'calculator-cdi-dollar'} .panels=${[
        {id:'form',title:'Simulação',required:true,essential:true,size:'small',resizable:false,role:'form'},
        {id:'empty',title:'Resultados',required:true,available:!out,size:'medium',resizable:false},
        {id:'summary',title:'Comparação CDI e dólar',essential:true,available:!!out,size:'medium'},
        {id:'chart',title:'Evolução comparada',essential:true,available:!!out,size:'medium'},
        {id:'table',title:'Evolução mês a mês',available:!!out,size:'large'},
      ]}>
        <section slot="form" class="workspace-panel simulation-panel" aria-label="Parâmetros da comparação">
          <div class="panel-heading"><h2>Simulação</h2></div>
          <form novalidate @field-input=${this.change} @submit=${this.calculate}>
            <div class="form-grid cdi-dollar-fields">${fields.map(f=>this.formField(f))}</div>
            <label class="cdi-dollar-tax-label">Como tratar o imposto sobre o rendimento?
              <select aria-label="Tributação do investimento" .value=${this.taxMode} @change=${(e:Event)=>{this.taxMode=(e.target as HTMLSelectElement).value as CdiDollarTaxMode;this.stale=!!this.output;}}>
                <option value="taxable">Com IR regressivo (ex.: CDB)</option>
                <option value="exempt">Sem IR (ex.: LCI/LCA)</option>
              </select>
            </label>
            <p class="form-note cdi-dollar-note">Taxas e cotação editáveis. O CDI informado é uma hipótese constante; não são consultados preços em tempo real. Prazo mínimo de 30 dias para não haver IOF.</p>
            <div class="form-bottom"><button type="submit" class="button primary">Calcular proteção</button></div>
            ${this.error?html`<p class="message error" role="alert">${this.error}</p>`:nothing}
          </form>
        </section>
        <section slot="empty" class="workspace-panel calculator-empty"><div><h2>Resultados</h2><p>Informe o valor, o CDI e as cotações para comparar as alternativas.</p></div></section>
        <section slot="summary" class="workspace-panel">${out?this.summary(out):nothing}</section>
        <section slot="chart" class="workspace-panel">${out?this.chart(out):nothing}</section>
        <section slot="table" class="workspace-panel">
          ${out?html`<div class="extended-table cdi-dollar-table">
            <div class="extended-table-top"><h2>Evolução mês a mês</h2></div>
            <div class="table-scroll" role="region" tabindex="0" aria-label="Projeção mensal de CDI e dólar">
              <table><thead><tr>
                <th scope="col">Mês</th><th scope="col">Dias</th><th scope="col">Dólar (R$/US$)</th>
                <th scope="col">CDI líquido em R$</th><th scope="col">Dólar em R$</th><th scope="col">CDI em US$</th><th scope="col">Diferença</th>
              </tr></thead><tbody>
                ${rows.map(p=>html`<tr><th scope="row">${p.month}</th><td>${p.elapsedDays}</td><td>${money(p.fx)}</td>
                  <td>${money(p.cdiNetBRL)}</td><td>${money(p.dollarHoldBRL)}</td>
                  <td>${moneyUsd(p.netDollarEquivalent)}</td><td>${money(p.balanceDifferenceBRL)}</td></tr>`)}
              </tbody></table>
            </div>
            <year-navigation .year=${this.yearPage+1} .years=${pages}
              @year-change=${(e:CustomEvent<number>)=>this.yearPage=e.detail-1}></year-navigation>
          </div>
          <p class="extended-disclosure cdi-dollar-disclosure">Projeção, não garantia. O CDI e o dólar são interpolados com taxas constantes; a tributação do CDI é simulada no resgate de cada período. Não inclui spread, tarifas, impostos ou custos de comprar/manter/vender dólares, nem rentabilidade de aplicações em USD. CDI não é hedge cambial.</p>`:nothing}
        </section>
      </panel-workspace>`;
  }
}
