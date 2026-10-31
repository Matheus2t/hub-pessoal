import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { sportsDate, sportsDay, sportsTime, type Game } from '../sports';

@customElement('sports-games')
export class SportsGames extends LightElement {
  @property({ attribute: false }) games: Game[] = [];
  @property({ type: Boolean }) results = false;
  render() {
    return html`<ol class="sports-games">${this.games.map(game => {
      const opponent = game.is_home ? game.away : game.home;
      const own = game.is_home ? game.home : game.away;
      const score = game.is_home ? [game.home_score, game.away_score] : [game.away_score, game.home_score];
      const outcome = { V: 'Vitória', E: 'Empate', D: 'Derrota' }[game.outcome || ''] || 'Encerrado';
      return html`<li>
        <div class="sports-date"><time datetime=${game.starts_at} aria-label=${sportsDate(game.starts_at)}>${sportsDay(game.starts_at)}</time><span>${sportsTime(game.starts_at)}</span></div>
        <div class="sports-match"><strong>${opponent}</strong><div class="sports-match-meta"><span>${game.competition}</span><span class="sports-venue-tag">${game.is_home ? 'Casa' : 'Fora'}</span></div><span class="sr-only">${game.season} · Horário de Brasília${this.results ? '' : ` · ${game.status}`}</span></div>
        ${this.results ? html`<div class="sports-result"><strong class="sports-score" aria-label=${`${own}: ${score[0]}. ${opponent}: ${score[1]}.`}><span>${score[0] ?? '—'}</span><span class="sports-score-divider" aria-hidden="true">–</span><span>${score[1] ?? '—'}</span></strong><span class="sports-outcome" data-outcome=${game.outcome || ''}>${outcome}</span></div>` : html`<span class="sports-game-status">${game.status}</span>`}
      </li>`;
    })}</ol>`;
  }
}
