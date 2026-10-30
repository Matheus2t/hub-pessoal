import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement, money } from '../ui';
import { apiUrl } from '../config';
import './stock-chart';
import type { PricePoint } from './stock-chart';
interface Quote { symbol: string; name: string; price: number; change: number | null; change_percent: number | null; quoted_at: string | null; fetched_at: string; open: number | null; high: number | null; low: number | null; volume: number | null; market_cap: number | null; previous_close: number | null }
const searchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('pt-BR');
interface Stock { symbol: string; name: string }
const percent = (value: number | null) => value === null ? 'Não disponível' : `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const direction = (value: number | null) => value === null || value === 0 ? '' : value > 0 ? 'market-up' : 'market-down';
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' (Brasília)' : 'Horário não disponível';
@customElement('market-page')
export class MarketPage extends LightElement {
  @property() symbol = '';
  @state() private query = '';
  @state() private stocks: Stock[] = [];
  @state() private quotes: Record<string, Quote> = {};
  @state() private failures: Record<string, string> = {};
  @state() private quote?: Quote;
  @state() private points: PricePoint[] = [];
  @state() private range = '1mo';
  @state() private loading = true;
  @state() private error = '';
  @state() private historyError = '';
  @state() private historyLoading = false;
  @state() private restricted = false;
  @state() private extended = false;
  private controller = new AbortController();
  private historyController?: AbortController;
  private historyVersion = 0;
  connectedCallback() { super.connectedCallback(); void this.load(); }
  disconnectedCallback() { super.disconnectedCallback(); this.controller.abort(); this.historyController?.abort(); }
  private async request<T>(path: string, signal = this.controller.signal): Promise<T> {
    const timer = AbortSignal.timeout(20000);
    const response = await fetch(apiUrl(path), { signal: AbortSignal.any([signal, timer]) });
    if (!response.ok) { let message = 'Serviço indisponível. Tente novamente.'; try { const body = await response.json(); if (typeof body.detail === 'string') message = body.detail; } catch { /* Generic error for non-JSON responses. */ } throw new Error(message); }
    return response.json();
  }
  private async load() {
    this.loading = true; this.error = ''; this.restricted = false; this.failures = {};
    try {
      const status = await this.request<{ available: boolean; extended_symbols: boolean }>('/api/market/status');
      this.extended = status.extended_symbols;
      if (!status.available) { this.restricted = true; return; }
      if (this.symbol) {
        this.quote = await this.request<Quote>(`/api/market/quote/${encodeURIComponent(this.symbol)}`);
        await this.loadHistory();
      } else {
        this.stocks = await this.request<Stock[]>('/api/market/search');
        await Promise.all(this.stocks.map(async stock => { try { const quote = await this.request<Quote>(`/api/market/quote/${stock.symbol}`); this.quotes = { ...this.quotes, [stock.symbol]: quote }; } catch (error) { this.failures = { ...this.failures, [stock.symbol]: error instanceof Error ? error.message : 'Cotação indisponível.' }; } }));
      }
    } catch (error) { if (!this.controller.signal.aborted) this.error = error instanceof Error ? error.message : 'Erro de conexão. Tente novamente.'; }
    finally { this.loading = false; }
  }
  private async loadHistory() {
    this.historyController?.abort(); this.historyController = new AbortController();
    const version = ++this.historyVersion;
    this.historyLoading = true; this.historyError = ''; this.points = [];
    try { const result = await this.request<{ points: PricePoint[] }>(`/api/market/history/${encodeURIComponent(this.symbol)}?range=${this.range}`, this.historyController.signal); if (version === this.historyVersion) this.points = result.points; }
    catch (error) { if (version === this.historyVersion && !this.historyController.signal.aborted) this.historyError = error instanceof Error ? error.message : 'Histórico indisponível.'; }
    finally { if (version === this.historyVersion) this.historyLoading = false; }
  }
  private search(event: Event) {
    event.preventDefault(); const symbol = this.query.trim().toUpperCase();
    const match = this.stocks.find(stock => searchText(stock.name) === searchText(symbol));
    if (match) { location.hash = `#/acoes/${match.symbol}`; return; }
    if (!/^[A-Z]{4}[0-9]{1,2}$/.test(symbol)) { this.error = 'Informe um ticker válido ou selecione uma empresa nas sugestões.'; return; }
    location.hash = `#/acoes/${symbol}`;
  }
  render() {
    const quote = this.quote;
    const suggestions = this.stocks.filter(stock => searchText(`${stock.symbol} ${stock.name}`).includes(searchText(this.query.trim())));
    return html`<div class="page-heading"><h1>${this.symbol || 'Mercado de Ações'}</h1></div>
      ${this.symbol ? html`<a class="market-back" href="#/acoes">← Voltar à lista de ações</a>` : html`<p class="market-intro">Consulte ações da B3, acompanhe cotações e explore o histórico de preços das empresas.</p>`}
      ${this.restricted ? html`<section class="market-notice" role="status"><h2>Cotações públicas ainda não disponíveis</h2><p>A exibição dos dados aguarda autorização da fonte. Nenhuma cotação está sendo distribuída nesta versão pública.</p></section>` : html`
        ${!this.symbol ? html`<form class="market-search" @submit=${this.search}><label for="stock-search">Buscar ação</label><div><input id="stock-search" type="search" placeholder="Buscar por código ou empresa — ITUB4, PETR4, VALE3..." .value=${this.query} @input=${(event: Event) => { this.query = (event.target as HTMLInputElement).value.toLocaleUpperCase('pt-BR'); this.error = ''; }} autocomplete="off"><button class="button primary" ?disabled=${this.loading}>Buscar</button></div></form>
          ${this.query ? html`<ul class="stock-suggestions" aria-label="Sugestões de ações">${suggestions.map(stock => html`<li><a href=${`#/acoes/${stock.symbol}`}>${stock.symbol} · ${stock.name}</a></li>`)}</ul>${!suggestions.length ? html`<p class="market-note">Sem sugestões na lista de teste.${this.extended ? ' Consulte pelo ticker.' : ' Sem token, apenas quatro ativos estão disponíveis.'}</p>` : nothing}` : nothing}` : nothing}
        ${this.error ? html`<div class="market-notice" role="alert"><p>${this.error}</p><button class="button secondary" @click=${this.load}>Tentar novamente</button></div>` : nothing}
        ${this.loading ? html`<div class="market-skeleton" role="status" aria-label="Carregando dados"><span></span><span></span><span></span></div>` : nothing}
        ${quote && !this.loading ? html`<section class="stock-quote"><h2>${quote.name}</h2><strong class="stock-price">${money(quote.price)}</strong><p class=${direction(quote.change_percent)}>${quote.change === null ? 'Não disponível' : `${quote.change > 0 ? '+' : ''}${money(quote.change)}`} · ${percent(quote.change_percent)}</p><p class="market-note">Cotação: ${dateTime(quote.quoted_at)}. Dados com atraso; não são cotações em tempo real.</p></section>
          <dl class="stock-facts">${([['Abertura', quote.open], ['Máxima do dia', quote.high], ['Mínima do dia', quote.low], ['Volume (ações)', quote.volume], ['Valor de mercado', quote.market_cap], ['Fechamento anterior', quote.previous_close]] as [string, number | null][]).map(([label, value]) => html`<div class=${label === "Valor de mercado" ? "market-cap" : ""}><dt>${label}</dt><dd>${value === null ? 'Não disponível' : label === 'Volume (ações)' ? value.toLocaleString('pt-BR') : money(value)}</dd></div>`)}</dl>
          <section class="stock-history"><div class="stock-history-heading"><h2>Histórico de preços</h2><div role="group" aria-label="Período do histórico">${[['7d', '7 dias'], ['1mo', '1 mês'], ['3mo', '3 meses']].map(([range, label]) => html`<button class="button secondary" aria-pressed=${range === this.range} @click=${() => { this.range = range; void this.loadHistory(); }}>${label}</button>`)}</div></div>
          ${this.historyLoading ? html`<p role="status">Carregando histórico…</p>` : this.historyError ? html`<div role="alert"><p>${this.historyError}</p><button class="button secondary" @click=${this.loadHistory}>Tentar histórico novamente</button></div>` : html`<stock-chart .points=${this.points}></stock-chart>`}</section>` : nothing}
        ${!this.symbol && !this.loading ? html`<h2 class="market-section-title">Consulta rápida</h2><div class="stock-list">${this.stocks.map(stock => { const quote = this.quotes[stock.symbol]; return html`<a class="stock-item" href=${`#/acoes/${stock.symbol}`}><div><strong>${stock.symbol}</strong><span>${quote?.name || stock.name}</span></div><div><strong>${quote ? money(quote.price) : 'Não disponível'}</strong><span class=${direction(quote?.change_percent ?? null)}>${quote ? percent(quote.change_percent) : this.failures[stock.symbol] || 'Cotação indisponível'}</span></div>${quote ? html`<small>${dateTime(quote.quoted_at)}</small>` : nothing}</a>`; })}</div>${Object.keys(this.failures).length ? html`<button class="button secondary" @click=${this.load}>Tentar cotações novamente</button>` : nothing}<p class="market-note">Lista de teste disponível sem token. Cotações com atraso. Não é um ranking.</p>` : nothing}
        <p class="market-note">Fonte: brapi.dev. Consulta informativa; não constitui recomendação de investimento.</p>`}`;
  }
}
