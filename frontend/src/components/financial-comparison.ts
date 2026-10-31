import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {stocks} from '../market-catalog';
import {manifest,loadFinancial,fields,formatFinancial,type FinancialData} from '../financial-data';

@customElement('financial-comparison')
export class FinancialComparison extends LightElement {
 @state() private selected=['PETR4','VALE3',''];
 @state() private data:FinancialData[]=[];
 @state() private error='';
 @state() private loading=false;
 @state() private period='';
 private controller?:AbortController;
 connectedCallback(){super.connectedCallback();void this.load();}
 disconnectedCallback(){this.controller?.abort();super.disconnectedCallback();}
 private async load(){this.controller?.abort();const controller=this.controller=new AbortController();this.loading=true;this.error='';try{const m=await manifest(controller.signal);const result=await Promise.all(this.selected.filter(Boolean).map(s=>loadFinancial(m,s,controller.signal)));if(controller.signal.aborted)return;const unique=new Map<string,FinancialData>();for(const d of result)if(d)unique.set(d.issuer.cnpj,d);this.data=[...unique.values()];if(result.some(d=>!d))this.error='Uma das empresas não possui cobertura CVM nesta versão.';this.period='';}catch(e){if((e as Error).name!=='AbortError')this.error=(e as Error).message;}finally{if(!controller.signal.aborted)this.loading=false;}}
 render(){
 const common=this.data[0]?.periods.filter(p=>p.kind==='annual'&&this.data.every(d=>d.periods.some(other=>other.kind==='annual'&&other.end===p.end))).map(p=>p.end)||[];
 const date=this.period||common.at(-1);const periods=this.data.map(d=>d.periods.find(p=>p.kind==='annual'&&p.end===date));
 return html`<h1>Comparação financeira</h1><a class="market-back" href="#/acoes">← Voltar à lista de ações</a><p class="market-note">Dados contábeis anuais da CVM. Cada emissor aparece uma vez, independentemente da classe da ação.</p><div class="financial-controls">${this.selected.map((s,i)=>html`<label for=${`cvm-company-${i}`}>Empresa ${i+1}</label><select id=${`cvm-company-${i}`} .value=${s} @change=${(e:Event)=>{this.selected=this.selected.map((v,j)=>i===j?(e.target as HTMLSelectElement).value:v);void this.load();}}><option value="" .selected=${!s}>${i===2?'Opcional':'Selecione'}</option>${stocks.map(stock=>html`<option value=${stock.symbol} .selected=${s===stock.symbol}>${stock.symbol} · ${stock.name}</option>`)}</select>`)}</div>
 ${this.loading?html`<p role="status">Carregando comparação…</p>`:nothing}${this.error?html`<p role="alert">${this.error}</p>`:nothing}
 ${!this.loading&&this.data.length>=2&&common.length?html`<label for="cvm-common-period">Exercício comum</label><select id="cvm-common-period" .value=${date||''} @change=${(e:Event)=>{this.period=(e.target as HTMLSelectElement).value;}}>${common.map(d=>html`<option value=${d} .selected=${d===date}>${d}</option>`)}</select><p class="market-note">Setores e estruturas contábeis podem ser diferentes. Receita e margens industriais ficam indisponíveis para bancos. ROE usa PL médio e inclui não controladores.</p><div class="financial-table-scroll" tabindex="0"><table><thead><tr><th scope="col">Indicador</th>${this.data.map((d,i)=>html`<th scope="col">${d.issuer.symbol}<br>${periods[i]?.start} a ${periods[i]?.end}<br>${periods[i]?.document.scope==='con'?'Consolidado':'Individual'} · v${periods[i]?.document.version}</th>`)}</tr></thead><tbody>${['revenue','profit','equity','roe','net_margin','revenue_growth','profit_growth','loans_equity'].map(k=>html`<tr><th scope="row"><span title=${fields[k][2]}>${fields[k][0]}</span></th>${periods.map(p=>html`<td>${formatFinancial(p?.values[k],fields[k][1])}</td>`)}</tr>`)}</tbody></table></div><p class="market-note">Comparação de valores consolidados e individuais não deve ser tratada como equivalente. Consulte a metodologia de cada emissor em sua análise.</p>${this.data.map((d,i)=>html`<p class="market-note">${d.issuer.symbol}: recebido em ${periods[i]?.document.received} · <a href=${periods[i]?.document.url||'#'} target="_blank" rel="noopener noreferrer">CVM, documento oficial</a></p>`)}`:!this.loading?html`<p>Selecione dois ou três emissores com dados no mesmo exercício. Ausência não representa zero.</p>`:nothing}`;
 }
}
