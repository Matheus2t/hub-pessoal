import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { findStock, stocks } from '../market-catalog';

@customElement('company-sections')
export class CompanySections extends LightElement {
  @property() symbol = '';
  @state() private section = '';
  render() {
    const stock = findStock(this.symbol); if (!stock) return nothing;
    const related = stocks.filter(item => item.sector === stock.sector && item.symbol !== stock.symbol).slice(0, 4);
    return html`<div class="company-sections">
      <div class="market-chart-modes" role="group" aria-label="Informações da empresa">${[['profile', 'Sobre a empresa'], ['financials', 'Fundamentos']].map(([key, label]) => html`<button class="button secondary" aria-pressed=${this.section === key} @click=${() => { this.section = this.section === key ? '' : key; }}>${label}</button>`)}</div>
      ${this.section ? html`<h2 class="market-section-title">${this.section === 'profile' ? 'Sobre a empresa' : 'Fundamentos'}</h2>
        ${this.section === 'financials' ? html`<p class="market-note">Deslize o painel para consultar os dados. Métricas e períodos são informados pelo TradingView.</p>` : nothing}
        ${this.section === 'profile' ? html`<market-embed kind="company-profile" .symbol=${stock.symbol}></market-embed>` : html`<tradingview-widget kind="financials" .symbol=${stock.symbol}></tradingview-widget>`}
        <p class="market-note">A cobertura varia por empresa e indicador. Se os dados não estiverem disponíveis, consulte o <a href=${`https://www.tradingview.com/symbols/BMFBOVESPA-${stock.symbol}/${this.section === 'financials' ? 'financials-overview/' : ''}`} target="_blank" rel="noopener noreferrer">TradingView</a>.</p>` : nothing}
      ${related.length ? html`<h2 class="market-section-title">Empresas do mesmo setor</h2><div class="related-companies">${related.map(item => html`<a href=${`#/acoes/${item.symbol}`}><strong>${item.symbol}</strong> · ${item.name}</a>`)}</div>` : nothing}
    </div>`;
  }
}
