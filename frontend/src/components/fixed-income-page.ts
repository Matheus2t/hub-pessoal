import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement,money,decimal} from '../ui';
import {project,productNames,firstRedemption,type Projection} from '../fixed-income';
import {newInvestment,readInvestment,type InvestmentDraft} from '../fixed-income-form';
import './fixed-income-fields';
import './fixed-income-chart';
import './fixed-income-evolution';
import './fixed-income-comparison';

export const fixedPercent=(n:number|null)=>n===null?'Não definida':`${decimal(n*100)}%`;
export const fixedDate=(s:string)=>s.split('-').reverse().join('/');
@customElement('fixed-income-page')
export class FixedIncomePage extends LightElement {
  @state() private draft=newInvestment();
  @state() private redemption='';
  @state() private touched=false;
  private result():{projection?:Projection;error?:string} {
    if(!this.touched)return {};
    try {return {projection:project(readInvestment(this.draft),this.redemption||this.draft.maturity)}}catch(e){return {error:(e as Error).message}}
  }
  render() {
    const {projection:r,error}=this.result(),p=r?.final;
    return html`<article class="rf-page"><header class="rf-heading"><h1>Renda Fixa</h1><p>Simule investimentos, compare rendimentos e entenda o impacto dos impostos.</p></header>
      <p class="rf-note">Taxas manuais e constantes. Simulação para pessoa física residente no Brasil. Cálculos no seu navegador.</p>
      <section class="rf-panel" aria-labelledby="rf-simulation"><header class="rf-section-header"><h2 id="rf-simulation">Simulação</h2><button class="button button-ghost" @click=${()=>{this.draft=newInvestment();this.redemption='';this.touched=false}}>Limpar</button></header>
        <fixed-income-fields .draft=${this.draft} @draft-change=${(e:CustomEvent<InvestmentDraft>)=>{this.draft=e.detail;this.touched=true;if(e.detail.product==='ipca')this.redemption=''}}></fixed-income-fields>
        ${this.draft.product!=='ipca'?html`<details class="rf-cost-inputs"><summary>Consultar antes do vencimento</summary><label class="rf-field rf-date-field"><span>Data pretendida de resgate</span><input type="date" .value=${this.redemption} @input=${(e:Event)=>{this.redemption=(e.target as HTMLInputElement).value;this.touched=true}} /><small>Em branco: cálculo até o vencimento. Sujeito à liquidez contratada.</small></label></details>`:nothing}
      </section>
      ${error?html`<p class="rf-alert" role="status">${error}</p>`:nothing}
      ${r&&p?html`<section class="rf-results" aria-labelledby="rf-results-title"><h2 id="rf-results-title">Resultado líquido</h2><p class="rf-note">${productNames[r.input.product]} · ${p.days} dias · ${fixedDate(p.date)}${r.maturedBefore?' · Vence antes da data consultada; sem reinvestimento.':''}</p>
        <dl class="rf-metrics"><div class="rf-primary"><dt>Patrimônio líquido projetado</dt><dd data-testid="rf-net">${money(p.net)}</dd></div><div><dt>Rendimento líquido</dt><dd>${money(p.netProfit)}</dd></div><div><dt>Rentabilidade líquida</dt><dd>${fixedPercent(p.netReturn)}</dd></div><div><dt>Líquida anualizada</dt><dd>${fixedPercent(p.annualized)}</dd></div></dl>
        <p class="rf-rescue" data-testid="rf-redemption">${p.status}${!p.redeemable&&r.input.product!=='ipca'?` · Primeira data possível: ${fixedDate(r.input.liquidity==='maturity'?r.input.maturity:firstRedemption(r.input))}`:''}</p>
        ${r.input.product==='ipca'?html`<dl class="rf-metrics"><div><dt>Poder de compra na data inicial</dt><dd>${money(p.purchasingPower)}</dd></div><div><dt>Rentabilidade real líquida</dt><dd>${fixedPercent(p.realReturn)}</dd></div></dl>`:nothing}
        <details class="rf-breakdown" open><summary>Impostos e taxas</summary><dl><div><dt>Valor aplicado</dt><dd>${money(r.input.amount)}</dd></div><div><dt>Valor bruto projetado</dt><dd>${money(p.gross)}</dd></div><div><dt>Rendimento bruto</dt><dd>${money(p.profit)}</dd></div><div><dt>IOF estimado</dt><dd>${money(p.iof)}</dd></div><div><dt>IR estimado (${fixedPercent(p.irRate)})</dt><dd>${money(p.ir)}</dd></div><div><dt>Custódia B3 acumulada</dt><dd>${money(p.custody)}</dd></div><div><dt>Taxa da instituição acumulada</dt><dd>${money(p.fee)}</dd></div><div><dt>Custos totais</dt><dd>${money(p.costs)}</dd></div></dl></details>
        <fixed-income-chart .series=${[{name:'Capital inicial',points:r.series.map(point=>({date:point.date,value:r.input.amount}))},{name:'Patrimônio bruto',points:r.series.map(point=>({date:point.date,value:point.gross}))},{name:'Patrimônio líquido estimado',points:r.series.map(point=>({date:point.date,value:point.net}))}]}></fixed-income-chart>
        <p class="rf-note">Saldos líquidos intermediários usam impostos hipotéticos daquela data. Valores durante a carência não são resgatáveis. Tesouro IPCA+: projeção pela curva, sem preço de venda.</p>
        <fixed-income-evolution .projection=${r}></fixed-income-evolution>
      </section>`:!error?html`<p class="rf-empty">Informe o valor, as taxas e o prazo para simular.</p>`:nothing}
      <details class="rf-comparison-section"><summary>Comparar investimentos</summary><fixed-income-comparison></fixed-income-comparison></details>
      <aside class="rf-assumptions" aria-label="Premissas da simulação"><h2>O que considerar</h2><p>${this.draft.product==='ipca'?'Tesouro IPCA+ sem juros semestrais: projeção de carregamento até o vencimento. A venda antecipada depende do preço de mercado e não é calculada nesta V1.':this.draft.product==='selic'?'Tesouro Selic: projeção simplificada pela composição dos fatores Selic e adicional, não pelo preço de negociação da LFT. Venda antecipada pode divergir da curva.':'CDI: taxa diária equivalente em base 252, com dias úteis aproximados por dias corridos × 252/365. Sem calendário de feriados. LCI e LCA: apenas CDI ou prefixadas, sem indexação a preços.'}</p>
        <p>${['selic','ipca'].includes(this.draft.product)?'Tesouro Direto não tem cobertura do FGC. Custódia e taxa da instituição são estimadas dia a dia em base 365 sobre o saldo bruto projetado; não reduzem a base do IR. Sem preços de mercado ou calendário de liquidação. No Selic, a isenção de R$ 10 mil considera o estoque informado do CPF.':'CDB, LCI e LCA podem ter cobertura do FGC: até R$ 250 mil por CPF e instituição ou conglomerado, com teto global de R$ 1 milhão em quatro anos, conforme as regras aplicáveis ao emissor. Não é cobertura ilimitada.'}</p>
        <p>Projeções, sem garantia de retorno ou recomendação. Regras verificadas em 31/10/2026, mantidas constantes; mudanças legais futuras não são antecipadas.</p>
        <details class="rf-sources"><summary>Fontes das regras</summary><ul><li><a href="https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=67494" target="_blank" rel="noopener noreferrer">Receita Federal · IR e isenções</a></li><li><a href="https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm" target="_blank" rel="noopener noreferrer">Decreto 6.306 · IOF</a></li><li><a href="https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=5215&tipo=Resolu%C3%A7%C3%A3o+CMN" target="_blank" rel="noopener noreferrer">CMN 5.215 · Prazos de LCI/LCA</a></li><li><a href="https://www.tesourodireto.com.br/sobre-o-tesouro/regras-e-regulamento" target="_blank" rel="noopener noreferrer">Tesouro Direto · Custos e tributação</a></li><li><a href="https://www.fgc.org.br/" target="_blank" rel="noopener noreferrer">FGC · Coberturas e limites</a></li></ul></details></aside>
    </article>`;
  }
}
