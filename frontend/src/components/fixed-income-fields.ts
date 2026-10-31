import {html,nothing} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {isTreasury,productNames,type Product} from '../fixed-income';
import {newInvestment,type InvestmentDraft,type NumericKey} from '../fixed-income-form';

@customElement('fixed-income-fields')
export class FixedIncomeFields extends LightElement {
  @property({attribute:false}) draft:InvestmentDraft=newInvestment();
  @property({type:Boolean}) shared=false;
  private change(key:keyof InvestmentDraft,value:string) {
    const next={...this.draft,[key]:value};
    if(key==='product'){next.indexation='cdi';next.grace='0';next.liquidity=['lci','lca','ipca'].includes(value)?'maturity':'daily';}
    this.dispatchEvent(new CustomEvent('draft-change',{detail:next,bubbles:true}));
  }
  private number(key:NumericKey,label:string,unit:string,hint='') {
    return html`<label class="rf-field"><span>${label} <small>${unit}</small></span><input inputmode="decimal" autocomplete="off" .value=${this.draft[key]} @input=${(e:Event)=>this.change(key,(e.target as HTMLInputElement).value)} aria-description=${hint||nothing} /><small>${hint||nothing}</small></label>`;
  }
  render() {
    const d=this.draft,treasury=isTreasury(d.product),letter=d.product==='lci'||d.product==='lca',cdi=d.product==='cdb'||letter&&d.indexation==='cdi';
    return html`<div class="rf-fields">
      <label class="rf-field"><span>Investimento</span><select .value=${d.product} @change=${(e:Event)=>this.change('product',(e.target as HTMLSelectElement).value)}>${Object.entries(productNames).map(([key,name])=>html`<option value=${key}>${name}</option>`)}</select></label>
      ${!this.shared?this.number('amount','Valor aplicado','R$'):nothing}
      ${letter?html`<label class="rf-field"><span>Remuneração</span><select .value=${d.indexation} @change=${(e:Event)=>this.change('indexation',(e.target as HTMLSelectElement).value)}><option value="cdi">Percentual do CDI</option><option value="fixed">Prefixada</option></select></label>`:nothing}
      ${cdi?html`${!this.shared?this.number('cdi','CDI anual','% a.a.','Hipótese constante, informada por você.'):nothing}${this.number('percentage','Percentual do CDI','% CDI','Percentual contratado sobre a taxa diária equivalente.')}`:nothing}
      ${letter&&d.indexation==='fixed'?this.number('fixed','Taxa prefixada','% a.a.'):nothing}
      ${d.product==='selic'?html`${!this.shared?this.number('selic','Selic anual','% a.a.','Hipótese constante, informada por você.'):nothing}${this.number('spread','Taxa adicional anual','% a.a.','Zero se não houver adicional. Composição de fatores, como aproximação.')}`:nothing}
      ${d.product==='ipca'?html`${!this.shared?this.number('inflation','IPCA anual','% a.a.','Inflação hipotética constante.'):nothing}${this.number('real','Taxa real acima do IPCA','% a.a.')}`:nothing}
      ${!this.shared?html`<label class="rf-field"><span>Data da aplicação</span><input type="date" .value=${d.start} @input=${(e:Event)=>this.change('start',(e.target as HTMLInputElement).value)} /></label>`:nothing}
      <label class="rf-field"><span>Vencimento</span><input type="date" .value=${d.maturity} @input=${(e:Event)=>this.change('maturity',(e.target as HTMLInputElement).value)} /></label>
      ${!treasury?html`<label class="rf-field"><span>Liquidez contratada</span><select .value=${d.liquidity} @change=${(e:Event)=>this.change('liquidity',(e.target as HTMLSelectElement).value)}><option value="daily">Diária após carência</option><option value="maturity">Somente no vencimento</option></select><small>Resgates dependem dos dias e condições do contrato.</small></label>${this.number('grace','Carência contratual','dias',letter?'Mínimo efetivo de seis meses, mesmo com carência menor.':'Zero se não houver carência.')}`:nothing}
    </div>${treasury?html`<details class="rf-cost-inputs"><summary>Custos e condições</summary><div class="rf-fields">${this.number('custody','Custódia B3','% a.a.','Premissa inicial: 0,20% ao ano, provisionada diariamente.')}${this.number('fee','Taxa da instituição','% a.a.','Premissa inicial: zero. Informe a taxa do seu contrato.')}${d.product==='selic'?this.number('otherSelic','Outros títulos Tesouro Selic','R$','Estoque do CPF mantido constante. Zero: cenário isolado.'):nothing}</div></details>`:nothing}`;
  }
}
