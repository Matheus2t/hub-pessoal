import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement,money,decimal} from '../ui';
import {project,productNames,firstRedemption,type Projection} from '../fixed-income';
import {newInvestment,readInvestment,type InvestmentDraft} from '../fixed-income-form';
import './fixed-income-fields';
import './fixed-income-chart';
import './fixed-income-evolution';
import './fixed-income-comparison';
import './fixed-income-tools';
import type {Investment} from '../fixed-income';

export const fixedPercent=(n:number|null)=>n===null?'Não definida':`${decimal(n*100)}%`;
export const fixedDate=(s:string)=>s.split('-').reverse().join('/');
@customElement('fixed-income-page')
export class FixedIncomePage extends LightElement {
  @state() private draft=newInvestment();
  @state() private redemption='';
  @state() private touched=false;
  connectedCallback(){super.connectedCallback();this.classList.add('workspace-v2','fixed-workspace')}
  private result():{projection?:Projection;error?:string} {
    if(!this.touched)return {};
    try {return {projection:project(readInvestment(this.draft),this.redemption||this.draft.maturity)}}catch(e){return {error:(e as Error).message}}
  }
  render() {
    const {projection:r,error}=this.result(),p=r?.final;
    return html`<article class="rf-page rf-refined"><header class="rf-hero"><span class="rf-eyebrow">FINANÇAS / SIMULAÇÃO</span><h1>Renda Fixa</h1><p>Compare o rendimento de CDB, LCI, LCA e Tesouro com as taxas que você informar.</p></header>
      <panel-workspace fixed-layout class="rf-results" area="fixed-income-simulator" .panels=${[
        {id:'form',title:'Configuração do investimento',required:true,essential:true,size:'medium',resizable:false,role:'form'},
        {id:'empty',title:'Resultado',required:true,available:!r,size:'medium',resizable:false},
        {id:'summary',title:'Resultado líquido',essential:true,available:!!r,size:'medium'},
        {id:'chart',title:'Gráfico de evolução',essential:true,available:!!r,size:'large'},
        {id:'taxes',title:'Impostos e custos',available:!!r,size:'large'},
        {id:'table',title:'Tabela mensal',available:!!r,size:'large'},
        {id:'tools',title:'Cenários salvos e ferramentas',size:'medium'},
        {id:'comparison',title:'Comparador de investimentos',size:'medium'}
      ]}>
      <section slot="form" class="workspace-panel rf-simulation" aria-labelledby="rf-simulation"><header class="rf-section-header"><div><span class="rf-eyebrow">01 / INVESTIMENTO</span><h2 id="rf-simulation">Monte sua simulação</h2></div><button type="button" class="button button-ghost rf-reset" @click=${()=>{this.draft=newInvestment();this.redemption='';this.touched=false}}>Limpar</button></header>
        <fixed-income-fields .draft=${this.draft} @draft-change=${(e:CustomEvent<InvestmentDraft>)=>{this.draft=e.detail;this.touched=true;if(e.detail.product==='ipca')this.redemption=''}}></fixed-income-fields>
        ${this.draft.product!=='ipca'?html`<details class="rf-cost-inputs"><summary>Consultar antes do vencimento</summary><label class="rf-field rf-date-field"><span>Data pretendida de resgate</span><input type="date" .value=${this.redemption} @input=${(e:Event)=>{this.redemption=(e.target as HTMLInputElement).value;this.touched=true}} /><small>Em branco: cálculo até o vencimento. Sujeito à liquidez contratada.</small></label></details>`:nothing}
        <div class="rf-simulation-actions"><button type="button" class="button rf-primary-action" @click=${()=>{this.touched=true;this.updateComplete.then(()=>this.querySelector<HTMLElement>(this.result().projection?'[slot=summary]':'[slot=empty]')?.scrollIntoView({behavior:'smooth',block:'nearest'}))}}>Simular investimento <span aria-hidden="true">↗</span></button></div>
      </section>

      <section slot="empty" class="workspace-panel rf-result-panel rf-result-empty"><header class="rf-section-header"><div><span class="rf-eyebrow">02 / PROJEÇÃO</span><h2>Seu resultado</h2></div></header>
        <div class="rf-empty-balance"><span>Patrimônio líquido projetado</span><strong>—</strong></div>
        ${error?html`<p class="rf-alert" role="status">${error}</p>`:html`<p class="rf-empty">Preencha os dados do investimento para visualizar a projeção.</p>`}
        <div class="rf-empty-metrics" aria-hidden="true"><div><span>Rendimento líquido</span><strong>—</strong></div><div><span>Rentabilidade</span><strong>—</strong></div></div>
      </section>
      <section slot="summary" class="workspace-panel rf-result-panel" aria-live="polite">${r&&p?html`<header class="rf-section-header"><div><span class="rf-eyebrow">02 / PROJEÇÃO</span><h2 id="rf-results-title">Resultado líquido</h2></div></header><p class="rf-result-meta">${productNames[r.input.product]} · ${p.days} dias · ${fixedDate(p.date)}${r.maturedBefore?' · Vence antes da data consultada; sem reinvestimento.':''}</p>
        <dl class="rf-metrics"><div class="rf-primary"><dt>Patrimônio líquido projetado</dt><dd data-testid="rf-net">${money(p.net)}</dd></div><div><dt>Rendimento líquido</dt><dd>${money(p.netProfit)}</dd></div><div><dt>Rentabilidade líquida</dt><dd>${fixedPercent(p.netReturn)}</dd></div><div><dt>Líquida anualizada</dt><dd>${fixedPercent(p.annualized)}</dd></div></dl>
        <p class="rf-rescue" data-testid="rf-redemption">${p.status}${!p.redeemable&&r.input.product!=='ipca'?` · Primeira data possível: ${fixedDate(r.input.liquidity==='maturity'?r.input.maturity:firstRedemption(r.input))}`:''}</p>
        ${r.input.product==='ipca'?html`<dl class="rf-metrics"><div><dt>Poder de compra na data inicial</dt><dd>${money(p.purchasingPower)}</dd></div><div><dt>Rentabilidade real líquida</dt><dd>${fixedPercent(p.realReturn)}</dd></div></dl>`:nothing}
`:nothing}</section>
      <section slot="chart" class="workspace-panel rf-chart-panel">${r?html`<div class="rf-chart-heading"><span class="rf-eyebrow">03 / EVOLUÇÃO</span><h2>Evolução do investimento</h2></div><fixed-income-chart .series=${[{name:'Capital inicial',points:r.series.map(point=>({date:point.date,value:r.input.amount}))},{name:'Patrimônio bruto',points:r.series.map(point=>({date:point.date,value:point.gross}))},{name:'Patrimônio líquido estimado',points:r.series.map(point=>({date:point.date,value:point.net}))}]}></fixed-income-chart>
        <p class="rf-chart-caption">Valores intermediários são estimativas de resgate. IPCA+ usa curva projetada, não preço de venda.</p>
`:nothing}</section>
      <section slot="taxes" class="workspace-panel">${r&&p?html`<details class="rf-breakdown"><summary>Impostos e taxas</summary><dl><div><dt>Valor aplicado</dt><dd>${money(r.input.amount)}</dd></div><div><dt>Valor bruto projetado</dt><dd>${money(p.gross)}</dd></div><div><dt>Rendimento bruto</dt><dd>${money(p.profit)}</dd></div><div><dt>IOF estimado</dt><dd>${money(p.iof)}</dd></div><div><dt>IR estimado (${fixedPercent(p.irRate)})</dt><dd>${money(p.ir)}</dd></div><div><dt>Custódia B3 acumulada</dt><dd>${money(p.custody)}</dd></div><div><dt>Taxa da instituição acumulada</dt><dd>${money(p.fee)}</dd></div><div><dt>Custos totais</dt><dd>${money(p.costs)}</dd></div></dl></details>
`:nothing}</section>
      <section slot="table" class="workspace-panel">${r?html`<fixed-income-evolution .projection=${r}></fixed-income-evolution>`:nothing}</section>
      <section slot="tools" class="workspace-panel rf-utility-panel"><details class="rf-tool-drawer"><summary><span><strong>Cenários e taxa equivalente</strong><small>Salve simulações e compare taxas</small></span><span aria-hidden="true" class="rf-chevron">⌄</span></summary><fixed-income-tools .draft=${this.draft} @open-scenario=${(e:CustomEvent<Investment>)=>{const input=e.detail;this.draft=Object.fromEntries(Object.entries(input).map(([key,value])=>[key,typeof value==='number'?String(value).replace('.',','):value])) as unknown as InvestmentDraft;this.redemption='';this.touched=true}}></fixed-income-tools></details></section>
      <section slot="comparison" class="workspace-panel rf-utility-panel"><details class="rf-comparison-section"><summary><span><strong>Comparar investimentos</strong><small>Compare até quatro cenários</small></span><span class="rf-chevron" aria-hidden="true">⌄</span></summary><fixed-income-comparison></fixed-income-comparison></details>
</section>
      </panel-workspace>
      <details class="rf-assumptions" aria-label="Premissas da simulação"><summary><span><strong>Regras, condições e fontes</strong><small>Informações técnicas e limitações da simulação</small></span><span class="rf-chevron" aria-hidden="true">⌄</span></summary><div class="rf-assumptions-content"><h2>O que considerar</h2><p>${this.draft.product==='ipca'?'Tesouro IPCA+ sem juros semestrais: projeção de carregamento até o vencimento. A venda antecipada depende do preço de mercado e não é calculada nesta V1.':this.draft.product==='selic'?'Tesouro Selic: projeção simplificada pela composição dos fatores Selic e adicional, não pelo preço de negociação da LFT. Venda antecipada pode divergir da curva.':'CDI: taxa diária equivalente em base 252, com dias úteis aproximados por dias corridos × 252/365. Sem calendário de feriados. LCI e LCA: apenas CDI ou prefixadas, sem indexação a preços.'}</p>
        <p>${['selic','ipca'].includes(this.draft.product)?'Tesouro Direto não tem cobertura do FGC. Custódia e taxa da instituição são estimadas dia a dia em base 365 sobre o saldo bruto projetado; não reduzem a base do IR. Sem preços de mercado ou calendário de liquidação. No Selic, a isenção de R$ 10 mil considera o estoque informado do CPF.':'CDB, LCI e LCA podem ter cobertura do FGC: até R$ 250 mil por CPF e instituição ou conglomerado, com teto global de R$ 1 milhão em quatro anos, conforme as regras aplicáveis ao emissor. Não é cobertura ilimitada.'}</p>
        <p>Projeções, sem garantia de retorno ou recomendação. Regras verificadas em 31/10/2026, mantidas constantes; mudanças legais futuras não são antecipadas.</p>
        <details class="rf-sources"><summary>Fontes das regras</summary><ul><li><a href="https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=67494" target="_blank" rel="noopener noreferrer">Receita Federal · IR e isenções</a></li><li><a href="https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm" target="_blank" rel="noopener noreferrer">Decreto 6.306 · IOF</a></li><li><a href="https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=5215&tipo=Resolu%C3%A7%C3%A3o+CMN" target="_blank" rel="noopener noreferrer">CMN 5.215 · Prazos de LCI/LCA</a></li><li><a href="https://www.tesourodireto.com.br/sobre-o-tesouro/regras-e-regulamento" target="_blank" rel="noopener noreferrer">Tesouro Direto · Custos e tributação</a></li><li><a href="https://www.fgc.org.br/" target="_blank" rel="noopener noreferrer">FGC · Coberturas e limites</a></li></ul></details></div></details>
    </article>`;
  }
}
