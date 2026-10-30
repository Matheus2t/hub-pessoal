import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { findStock, normalizeSearch, searchStocks, stocks } from '../market-catalog';
import './tradingview-widget';

@customElement('market-page')
export class MarketPage extends LightElement {
  @property() symbol = '';
  @state() private query = '';
  @state() private error = '';
  private search(event: Event) {
    event.preventDefault();
    const text = normalizeSearch(this.query);
    const results = searchStocks(text);
    const exact = stocks.find(stock => stock.symbol === text || normalizeSearch(stock.name) === text);
    const selected = exact || (text && results.length === 1 ? results[0] : undefined);
    if (!selected) { this.error = text ? 'Ação não encontrada no catálogo. Escolha uma das empresas disponíveis.' : 'Informe o código ou o nome de uma empresa.'; return; }
    location.hash = `#/acoes/${selected.symbol}`;
  }
  render() {
    const stock = findStock(this.symbol);
    if (this.symbol && !stock) return html`<div class="page-heading"><h1>Ação não encontrada</h1></div><p class="market-note" role="alert">Este código não está disponível no catálogo da 2T.</p><a class="market-back" href="#/acoes">← Voltar à lista de ações</a>`;
    const matches = searchStocks(this.query);
    return html`<div class="page-heading"><h1>${stock ? stock.symbol : 'Mercado de Ações'}</h1></div>
      ${stock ? html`<div class="market-identity"><h2>${stock.name}</h2><a class="market-back" href="#/acoes">← Voltar à lista de ações</a></div>` : html`
        <p class="market-intro">Consulte ações da B3, acompanhe cotações e analise a evolução dos preços.</p>
        <form class="market-search" @submit=${this.search}>
          <label for="stock-search">Buscar ação</label>
          <div><input id="stock-search" type="search" placeholder="Buscar por código ou empresa — ITUB4, PETR4, VALE3..." .value=${this.query} @input=${(event: Event) => { this.query = (event.target as HTMLInputElement).value.toLocaleUpperCase('pt-BR'); this.error = ''; }} autocomplete="off" aria-describedby=${this.error ? 'market-search-error' : nothing}>
          <button class="button primary">Buscar</button></div>
        </form>
        ${this.error ? html`<p id="market-search-error" class="market-note" role="alert">${this.error}</p>` : nothing}
        ${this.query ? html`<ul class="stock-suggestions" aria-label="Sugestões de ações">${matches.map(item => html`<li><a href=${`#/acoes/${item.symbol}`}>${item.symbol} · ${item.name}</a></li>`)}</ul>` : nothing}
        <h2 class="market-section-title">Cotações</h2>`}
      <tradingview-widget .kind=${stock ? 'overview' : 'tickers'} .symbol=${stock?.symbol || 'ITUB4'}></tradingview-widget>
      <p class="market-note">Dados fornecidos pelo TradingView. Cotações da B3 com atraso de 15 minutos.</p>
      <p class="market-note tv-availability">Se o widget informar que o ativo não está disponível, consulte a <a href=${stock ? `https://www.tradingview.com/symbols/BMFBOVESPA-${stock.symbol}/` : 'https://www.tradingview.com/markets/stocks-brazil/market-movers-all-stocks/'} target="_blank" rel="noopener noreferrer">página do TradingView</a>. A cobertura é definida pelo provedor.</p>
      ${!stock ? html`<h2 class="market-section-title">Empresas</h2><div class="stock-list">${stocks.map(item => html`<a class="stock-item" href=${`#/acoes/${item.symbol}`}><strong>${item.symbol}</strong><span>${item.name}</span><span aria-hidden="true">→</span></a>`)}</div>` : nothing}
    `;
  }
}
