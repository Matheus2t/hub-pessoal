import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LightElement } from '../ui';
import type { Standing } from '../sports';

@customElement('sports-standings')
export class SportsStandings extends LightElement {
  @property({ attribute: false }) rows: Standing[] = [];
  @property() competition = '';
  @property() season = '';
  render() {
    return html`<p class="sports-competition">${this.competition} <span>· ${this.season}</span></p>
      <div class="sports-table-wrap" tabindex="0" role="region" aria-label="Tabela de classificação"><table class="sports-table"><caption class="sr-only">${this.competition} · ${this.season}</caption><thead><tr><th scope="col"><abbr title="Posição">#</abbr></th><th scope="col">Equipe</th><th scope="col"><abbr title="Pontos">Pts</abbr></th><th scope="col"><abbr title="Jogos disputados">J</abbr></th><th scope="col"><abbr title="Vitórias">V</abbr></th><th scope="col"><abbr title="Empates">E</abbr></th><th scope="col"><abbr title="Derrotas">D</abbr></th><th scope="col"><abbr title="Saldo de gols">SG</abbr></th></tr></thead><tbody>${this.rows.map(row => html`<tr class=${row.is_team ? 'is-team' : ''}><td>${row.rank ?? '—'}</td><th scope="row">${row.team}${row.is_team ? html`<span class="sr-only"> — seu time</span>` : ''}</th>${[row.points, row.played, row.wins, row.draws, row.losses, row.goal_difference].map(value => html`<td>${value ?? '—'}</td>`)}</tr>`)}</tbody></table></div>
      <p class="sports-scroll-hint">Deslize para ver a tabela completa.</p>`;
  }
}
