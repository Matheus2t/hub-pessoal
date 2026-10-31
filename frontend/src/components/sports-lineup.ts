import {html, nothing} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {sportsDate,type Game} from '../sports';

@customElement('sports-lineup')
export class SportsLineup extends LightElement {
  @property({attribute:false}) game?: Game;
  render() {
    const lineup=this.game?.lineup;
    if(!lineup?.confirmed || !['football','basketball'].includes(lineup.sport) || !Array.isArray(lineup.rows) || !lineup.rows.length || lineup.rows.some(row=>!Array.isArray(row)||!row.length)) return nothing;
    const players=lineup.rows.flat();
    if(players.length!==(lineup.sport==='football'?11:5) || players.some(p=>!p.name||!p.position))return nothing;
    return html`<section class="sports-lineup" aria-label="Escalação confirmada"><header><h2>Escalação</h2><p>Confirmada · ${sportsDate(this.game!.starts_at)} · ${this.game!.home} × ${this.game!.away} · ${lineup.formation}</p></header><div class="sports-pitch ${lineup.sport}" role="group" aria-label=${lineup.sport==='football'?'Campo de futebol':'Quadra de basquete'}>${[...lineup.rows].reverse().map(row=>html`<div class="sports-lineup-row" style=${`grid-template-columns:repeat(${row.length},minmax(0,1fr))`}>${row.map(p=>html`<div class="sports-lineup-player"><span>${p.number??'—'}</span><strong>${p.name}</strong><small>${p.position}</small></div>`)}</div>`)}</div></section>`;
  }
}
