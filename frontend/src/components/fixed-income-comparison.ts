import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement,money,decimal} from '../ui';
import {compareInvestments,productNames,firstRedemption,type Projection} from '../fixed-income';
import {newInvestment,readInvestment,type InvestmentDraft} from '../fixed-income-form';
import './fixed-income-fields';
import './fixed-income-chart';
import './fixed-income-evolution';
interface Scenario {id:number;draft:InvestmentDraft;follow:boolean}
@customElement('fixed-income-comparison')
export class FixedIncomeComparison extends LightElement {
  @state() private common=newInvestment();
  @state() private scenarios:Scenario[]=[{id:1,draft:newInvestment('cdb'),follow:true},{id:2,draft:newInvestment('lci'),follow:true}];
  @state() private touched=false;
  private nextId=3;
  private commonField(key:'amount'|'start'|'maturity'|'cdi'|'selic'|'inflation',label:string,type='text',unit='') {
    return html`<label class="rf-field"><span>${label} <small>${unit}</small></span><input type=${type} inputmode=${type==='date'?nothing:'decimal'} .value=${this.common[key]} @input=${(e:Event)=>{this.common={...this.common,[key]:(e.target as HTMLInputElement).value};this.touched=true}} /></label>`;
  }
  private inputs(){return this.scenarios.map(s=>readInvestment({...s.draft,amount:this.common.amount,start:this.common.start,maturity:s.follow?this.common.maturity:s.draft.maturity,cdi:this.common.cdi,selic:this.common.selic,inflation:this.common.inflation}));}
  private result():{results?:Projection[];error?:string} {
    if(!this.touched)return {};
    try{return {results:compareInvestments(this.inputs(),this.common.maturity)}}catch(e){return {error:(e as Error).message}}
  }
  render() {
    const {results,error}=this.result();
    return html`<section class="rf-comparison" aria-label="Comparar investimentos"><p class="rf-note">Mesmo valor, início e horizonte. Taxas hipotéticas constantes. De dois a quatro cenários, sem recomendação de investimento.</p>
      <div class="rf-panel rf-common"><h3>Dados comuns</h3><div class="rf-fields">${this.commonField('amount','Valor inicial comum','text','R$')}${this.commonField('start','Data inicial comum','date')}${this.commonField('maturity','Horizonte de comparação','date')}${this.commonField('cdi','CDI anual comum','text','% a.a.')}${this.commonField('selic','Selic anual comum','text','% a.a.')}${this.commonField('inflation','IPCA anual comum','text','% a.a.')}</div><p class="rf-note">Preencha apenas os índices usados pelos cenários.</p></div>
      <div class="rf-scenarios">${this.scenarios.map((s,index)=>html`<section class="rf-panel rf-scenario" aria-label=${`Cenário ${index+1}`}><header class="rf-section-header"><h3>Cenário ${index+1}</h3><button class="button button-ghost" aria-label=${`Remover cenário ${index+1}`} ?disabled=${this.scenarios.length<=2} @click=${()=>{this.scenarios=this.scenarios.filter(item=>item.id!==s.id);this.touched=true}}>Remover</button></header>
        <label class="rf-follow"><input type="checkbox" .checked=${s.follow} @change=${(e:Event)=>{this.scenarios=this.scenarios.map(item=>item.id===s.id?{...item,follow:(e.target as HTMLInputElement).checked}:item);this.touched=true}} /> Vencimento no horizonte comum</label>
        <fixed-income-fields .shared=${true} .draft=${{...s.draft,maturity:s.follow?this.common.maturity:s.draft.maturity}} @draft-change=${(e:CustomEvent<InvestmentDraft>)=>{const maturityChanged=e.detail.maturity!==(s.follow?this.common.maturity:s.draft.maturity);this.scenarios=this.scenarios.map(item=>item.id===s.id?{...item,draft:e.detail,follow:maturityChanged?false:item.follow}:item);this.touched=true}}></fixed-income-fields>
      </section>`)}</div>
      <div class="rf-comparison-actions"><button class="button button-ghost" ?disabled=${this.scenarios.length>=4} @click=${()=>this.scenarios=[...this.scenarios,{id:this.nextId++,draft:newInvestment(),follow:true}]}>Adicionar cenário</button><button class="button button-ghost" @click=${()=>{this.common=newInvestment();this.scenarios=[{id:this.nextId++,draft:newInvestment('cdb'),follow:true},{id:this.nextId++,draft:newInvestment('lci'),follow:true}];this.touched=false}}>Limpar comparação</button></div>
      ${error?html`<p class="rf-alert" role="status">${error}</p>`:nothing}
      ${results?html`<div class="rf-table-wrap" role="region" aria-label="Resultado comparativo" tabindex="0"><table class="rf-table rf-comparison-table"><caption>Projeções até ${this.common.maturity.split('-').reverse().join('/')}</caption><thead><tr><th>Cenário</th><th>Taxa / hipótese</th><th>Prazo</th><th>Bruto</th><th>Impostos</th><th>Custos</th><th>Líquido projetado</th><th>Rentabilidade líquida</th><th>Liquidez / carência</th><th>Proteção</th><th>Comparabilidade</th></tr></thead><tbody>${results.map((r,i)=>html`<tr><th scope="row">${i+1} · ${productNames[r.input.product]}</th><td>${this.rateDescription(r)}</td><td>${r.final.days} dias · ${r.final.date.split('-').reverse().join('/')}</td><td>${money(r.final.gross)}</td><td>${money(r.final.iof+r.final.ir)}</td><td>${money(r.final.costs)}</td><td>${money(r.final.net)}</td><td>${decimal(r.final.netReturn*100)}%</td><td>${r.input.liquidity==='daily'?'Diária após carência':'No vencimento'} · ${r.input.grace} dias${['lci','lca'].includes(r.input.product)?` · mínimo até ${firstRedemption(r.input).split('-').reverse().join('/')}`:''}</td><td>${['selic','ipca'].includes(r.input.product)?'Tesouro; sem FGC':'FGC, conforme emissor e limites'}</td><td>${r.maturedBefore?'Vence antes do horizonte; sem reinvestimento':r.comparable?'Mesma data; resgate contratual permitido':r.final.status}</td></tr>`)}</tbody></table></div>
        <p class="rf-note">Valores indisponíveis para resgate não equivalem a caixa. Títulos vencidos param no vencimento, sem reinvestimento. IPCA+ antes do vencimento: curva, não preço de venda. Tesouro Selic também pode divergir do preço de mercado.</p>
        <fixed-income-chart label="Evolução líquida dos cenários" .series=${results.map((r,i)=>({name:`${i+1} · ${productNames[r.input.product]}`,points:r.series.map(p=>({date:p.date,value:p.net}))}))}></fixed-income-chart>
        ${results.map((r,i)=>html`<div class="rf-scenario-evolution"><h3>${i+1} · ${productNames[r.input.product]}</h3><fixed-income-evolution .projection=${r}></fixed-income-evolution></div>`)}
      `:!error?html`<p class="rf-empty">Defina os dados comuns e as condições de cada cenário.</p>`:nothing}
    </section>`;
  }
  private rateDescription(r:Projection):string {
    const i=r.input;
    if(i.product==='cdb'||(['lci','lca'].includes(i.product)&&i.indexation==='cdi'))return `${decimal(i.percentage)}% do CDI de ${decimal(i.cdi)}% a.a.`;
    if(i.product==='selic')return `Selic ${decimal(i.selic)}% × adicional ${decimal(i.spread)}% a.a. (fatores)`;
    if(i.product==='ipca')return `IPCA ${decimal(i.inflation)}% × real ${decimal(i.real)}% a.a. (fatores)`;
    return `${decimal(i.fixed)}% a.a. prefixada`;
  }
}
