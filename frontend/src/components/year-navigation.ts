import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LightElement } from '../ui';

type PageItem = number | { target: number; direction: 'back' | 'forward' };

/** Paginação compacta e compartilhada para demonstrativos financeiros anuais. */
@customElement('year-navigation')
export class YearNavigation extends LightElement {
  @property({ type: Number }) year = 1;
  @property({ type: Number }) years = 1;

  private jump(value: number) {
    const next = Math.max(1, Math.min(this.years || 1, value));
    if (next !== this.year) this.dispatchEvent(new CustomEvent<number>('year-change', { detail: next, bubbles: true }));
  }

  private pageItems(years: number, selected: number): PageItem[] {
    if (years <= 7) return Array.from({ length: years }, (_, index) => index + 1);
    if (selected <= 4) return [1, 2, 3, 4, { target: Math.min(years - 3, selected + 5), direction: 'forward' }, years];
    if (selected >= years - 3) return [1, { target: Math.max(4, selected - 5), direction: 'back' }, years - 3, years - 2, years - 1, years];
    return [1, { target: Math.max(2, selected - 5), direction: 'back' }, selected - 1, selected, selected + 1,
      { target: Math.min(years - 1, selected + 5), direction: 'forward' }, years];
  }

  render() {
    const years = Math.max(1, Math.ceil(this.years));
    const selected = Math.max(1, Math.min(years, this.year));
    return html`<nav class="year-navigation" aria-label="Navegação por ano da simulação">
      <div class="year-navigation-pages">
        <button type="button" class="year-page-button year-page-arrow" aria-label="Ano anterior"
          ?disabled=${selected === 1} @click=${() => this.jump(selected - 1)}>←</button>
        ${this.pageItems(years, selected).map(item => typeof item === 'number'
          ? html`<button type="button" class="year-page-button" aria-label=${`Ano ${item}`}
              aria-current=${selected === item ? 'page' : nothing}
              @click=${() => this.jump(item)}>${item}</button>`
          : html`<button type="button" class="year-page-button year-page-jump"
              aria-label=${item.direction === 'back' ? `Voltar para o ano ${item.target}` : `Avançar para o ano ${item.target}`}
              @click=${() => this.jump(item.target)}>…</button>`)}
        <button type="button" class="year-page-button year-page-arrow" aria-label="Próximo ano"
          ?disabled=${selected === years} @click=${() => this.jump(selected + 1)}>→</button>
      </div>
    </nav>`;
  }
}
