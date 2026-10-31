import {html,nothing} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement,money} from '../ui';
import type {Projection} from '../fixed-income';
@customElement('fixed-income-evolution')
export class FixedIncomeEvolution extends LightElement {
  @property({attribute:false}) projection?:Projection;
  @state() private page=0;
  protected updated(changed:Map<string,unknown>){if(changed.has('projection'))this.page=0;}
  render() {
    const r=this.projection;if(!r)return nothing;
    const pages=Math.ceil(r.series.length/24),page=Math.min(this.page,pages-1),points=r.series.slice(page*24,(page+1)*24);
    return html`<details class="rf-evolution"><summary>Evolução do investimento</summary><p class="rf-note">Impostos hipotéticos de cada data, recalculados pelas faixas daquele prazo. Saldos durante a carência não estão disponíveis para resgate. IPCA+: valores pela curva, sem preço de venda.</p><div class="rf-table-wrap" role="region" aria-label="Evolução do investimento" tabindex="0"><table class="rf-table"><thead><tr><th>Data</th><th>Saldo bruto</th><th>Rendimento</th><th>IOF</th><th>IR hipotético</th><th>Custos</th><th>Saldo líquido</th><th>Situação de resgate</th></tr></thead><tbody>${points.map(p=>html`<tr><th scope="row">${p.date.split('-').reverse().join('/')}</th><td>${money(p.gross)}</td><td>${money(p.profit)}</td><td>${money(p.iof)}</td><td>${money(p.ir)}</td><td>${money(p.costs)}</td><td>${money(p.net)}</td><td>${p.status}</td></tr>`)}</tbody></table></div>${pages>1?html`<div class="rf-pagination"><button class="button button-ghost" ?disabled=${page===0} @click=${()=>this.page=page-1}>Anterior</button><span>Página ${page+1} de ${pages}</span><button class="button button-ghost" ?disabled=${page===pages-1} @click=${()=>this.page=page+1}>Próxima</button></div>`:nothing}</details>`;
  }
}
