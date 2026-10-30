import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { findStock, normalizeSearch, searchStocks, sectors } from '../market-catalog';
import './tradingview-widget';

@customElement('market-page')
export class MarketPage extends LightElement {
  @property() symbol = '';
  @state() private query = '';
  @state() private error = '';
  @state() private sector = '';
  @state() private order: 'symbol' | 'name' = 'symbol';
  @state() private active = -1;
  @state() private expanded = false;
  private get filteredStocks() { return searchStocks(this.query, this.sector, this.order); }
  private keydown(event: KeyboardEvent) {
    const suggestions = this.filteredStocks.slice(0, 8);
    if (event.key === 'Escape') { event.preventDefault(); this.expanded = false; this.active = -1; }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && this.query && suggestions.length) {
      event.preventDefault(); this.expanded = true;
      this.active = this.active < 0 ? (event.key === 'ArrowDown' ? 0 : suggestions.length - 1)
        : (this.active + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
    }
    if (event.key === 'Enter' && this.expanded && this.active >= 0 && suggestions[this.active]) {
      event.preventDefault(); location.hash = `#/acoes/${suggestions[this.active].symbol}`;
    }
  }
  private search(event: Event) {
    event.preventDefault();
    const text = normalizeSearch(this.query);
    const results = this.filteredStocks;
    const exact = results.find(stock => stock.symbol === text || normalizeSearch(stock.name) === text);
    const selected = exact || (text && results.length === 1 ? results[0] : undefined);
    if (!selected) { this.error = !results.length ? 'Ação não encontrada no catálogo com estes filtros.' : 'Selecione uma empresa nos resultados.'; return; }
    location.hash = `#/acoes/${selected.symbol}`;
  }
  render() {
    const stock = findStock(this.symbol);
    if (this.symbol && !stock) return html`<div class="page-heading"><h1>Ação não encontrada</h1></div><p class="market-note" role="alert">Este código não está disponível no catálogo da 2T.</p><a class="market-back" href="#/acoes">← Voltar à lista de ações</a>`;
    const matches = this.filteredStocks;
    const suggestions = matches.slice(0, 8);
    return html`<div class="page-heading"><h1>${stock ? stock.symbol : 'Mercado de Ações'}</h1></div>
      ${stock ? html`<div class="market-identity"><h2>${stock.name}</h2><a class="market-back" href="#/acoes">← Voltar à lista de ações</a></div>` : html`
        <p class="market-intro">Consulte ações da B3, acompanhe cotações e analise a evolução dos preços.</p>
        <form class="market-search" @submit=${this.search}>
          <label for="stock-search">Buscar ação</label>
          <div><input id="stock-search" type="search" role="combobox" aria-autocomplete="list" aria-controls="stock-suggestions" aria-expanded=${Boolean(this.query && this.expanded && suggestions.length)} aria-activedescendant=${this.expanded && this.active >= 0 ? `stock-option-${this.active}` : nothing} @keydown=${this.keydown} @focus=${() => { this.expanded = true; }} placeholder="Buscar por código ou empresa" .value=${this.query} @input=${(event: Event) => { this.query = (event.target as HTMLInputElement).value.toLocaleUpperCase('pt-BR'); this.error = ''; this.active = -1; this.expanded = true; }} autocomplete="off" aria-describedby=${this.error ? 'market-search-error' : nothing}>
          <button class="button secondary" type="button" @click=${() => { this.query = ''; this.error = ''; this.active = -1; this.expanded = false; this.querySelector<HTMLInputElement>('#stock-search')?.focus(); }}>Limpar</button>
          <button class="button primary">Buscar</button></div>
        </form>
        <div class="market-filters">
          <div><label for="stock-sector">Setor</label><select id="stock-sector" .value=${this.sector} @change=${(event: Event) => { this.sector = (event.target as HTMLSelectElement).value; this.active = -1; this.error = ''; }}><option value="">Todos os setores</option>${sectors.map(sector => html`<option value=${sector}>${sector}</option>`)}</select></div>
          <div><label for="stock-order">Ordenar por</label><select id="stock-order" .value=${this.order} @change=${(event: Event) => { this.order = (event.target as HTMLSelectElement).value as 'symbol' | 'name'; this.active = -1; }}><option value="symbol">Ticker</option><option value="name">Empresa (A–Z)</option></select></div>
        </div>
        ${this.error ? html`<p id="market-search-error" class="market-note" role="alert">${this.error}</p>` : nothing}
        <ul id="stock-suggestions" class="stock-suggestions" role="listbox" aria-label="Sugestões de ações" ?hidden=${!this.query || !this.expanded || !suggestions.length}>${suggestions.map((item, index) => html`<li role="presentation"><a id=${`stock-option-${index}`} role="option" aria-selected=${this.active === index} href=${`#/acoes/${item.symbol}`}>${item.symbol} · ${item.name}</a></li>`)}</ul>
        <h2 class="market-section-title">Cotações</h2>`}
      <tradingview-widget .kind=${stock ? 'overview' : 'tickers'} .symbol=${stock?.symbol || 'ITUB4'}></tradingview-widget>
      <p class="market-note">Dados fornecidos pelo TradingView. Cotações da B3 com atraso de 15 minutos.</p>
      <p class="market-note tv-availability">Se o widget informar que o ativo não está disponível, consulte a <a href=${stock ? `https://www.tradingview.com/symbols/BMFBOVESPA-${stock.symbol}/` : 'https://www.tradingview.com/markets/stocks-brazil/market-movers-all-stocks/'} target="_blank" rel="noopener noreferrer">página do TradingView</a>. A cobertura é definida pelo provedor.</p>
      ${!stock ? html`<h2 class="market-section-title">Empresas</h2><p class="market-result-count" role="status">${matches.length} ${matches.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}</p>
        ${!matches.length ? html`<p class="market-note">Nenhuma ação encontrada. Ajuste a busca ou o setor.</p>` : nothing}
        <div class="stock-directory"><div class="stock-directory-heading" aria-hidden="true"><span>Ticker</span><span>Empresa</span><span>Setor</span></div>${matches.map(item => html`<a class="stock-item" href=${`#/acoes/${item.symbol}`}><strong>${item.symbol}</strong><span>${item.name}</span><span class="stock-sector">${item.sector}</span></a>`)}</div>` : nothing}
    `;
  }
}
