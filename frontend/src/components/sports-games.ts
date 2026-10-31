import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { sportsDate, sportsTime, type Game } from '../sports';

@customElement('sports-games')
export class SportsGames extends LightElement {
  @property({ attribute: false }) games: Game[] = [];
  @property({ type: Boolean }) results = false;
  render() {
    return html`<ol class="sports-games">${this.games.map(game => html`<li>
      <div class="sports-date"><time datetime=${game.starts_at}>${sportsDate(game.starts_at)}</time><span>${sportsTime(game.starts_at)} · Brasília</span></div>
      <div class="sports-match"><strong>${game.home} <span class="sports-versus">${this.results ? `${game.home_score} × ${game.away_score}` : '×'}</span> ${game.away}</strong><span>${game.competition} · ${game.season}</span></div>
      <div class="sports-match-meta"><span>${game.is_home ? 'Casa' : 'Fora'}</span><span>${this.results ? ({ V: 'Vitória', E: 'Empate', D: 'Derrota' }[game.outcome || ''] || 'Encerrado') : game.status}</span></div>
    </li>`)}</ol>`;
  }
}
