import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LightElement } from '../ui';

/** Navegação consistente por ano para tabelas de até 600 meses. */
@customElement('year-navigation')
export class YearNavigation extends LightElement {
  @property({type:Number}) year = 1;
  @property({type:Number}) years = 1;
  @property() range = '';
  private jump(value: number) {
    const next = Math.max(1, Math.min(this.years || 1, value));
    if (next !== this.year) this.dispatchEvent(new CustomEvent<number>('year-change', { detail: next, bubbles: true }));
  }
  render() {
    const years = Math.max(1, Math.ceil(this.years));
    const selected = Math.max(1, Math.min(years, this.year));
    return html`<nav class="year-navigation" aria-label="Navegação do detalhamento por ano">
      <div class="year-navigation-info"><span class="year-navigation-kicker">PERÍODO CONSULTADO</span>
        <strong>Ano ${selected} <span>de ${years}</span></strong>
        ${this.range ? html`<small>${this.range}</small>` : ''}
      </div>
      <div class="year-navigation-controls">
        <label class="year-navigation-label">Ir para o ano
          <select aria-label="Ir para o ano" .value=${String(selected)}
            @change=${(event: Event) => this.jump(Number((event.target as HTMLSelectElement).value))}>
            ${Array.from({length:years}, (_,i) => html`<option value=${String(i+1)}>Ano ${i+1}</option>`)}
          </select>
        </label>
        <div class="year-navigation-buttons">
          <button type="button" class="button secondary" ?disabled=${selected===1} @click=${()=>this.jump(1)}>Primeiro</button>
          <button type="button" class="button secondary" ?disabled=${selected===1} @click=${()=>this.jump(selected-1)} aria-label="Ano anterior">Anterior</button>
          <button type="button" class="button secondary" ?disabled=${selected===years} @click=${()=>this.jump(selected+1)} aria-label="Próximo ano">Próximo</button>
          <button type="button" class="button secondary" ?disabled=${selected===years} @click=${()=>this.jump(years)}>Último ano</button>
        </div>
      </div>
    </nav>`;
  }
}
