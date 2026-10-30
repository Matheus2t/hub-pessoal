import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { findStock, stocks } from '../market-catalog';

const TICKERS_SCRIPT = 'https://widgets.tradingview-widget.com/w/br/tv-tickers.js';
const OVERVIEW_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
let tickersLoading: Promise<void> | undefined;
function loadTickers(): Promise<void> {
  if (customElements.get('tv-tickers')) return Promise.resolve();
  if (tickersLoading) return tickersLoading;
  tickersLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module'; script.src = TICKERS_SCRIPT;
    script.dataset.provider = 'tradingview-tickers';
    const timer = window.setTimeout(() => fail(), 20000);
    const fail = () => { clearTimeout(timer); script.remove(); tickersLoading = undefined; reject(new Error('Widget indisponível')); };
    script.onerror = fail;
    script.onload = () => {
      if (!customElements.get('tv-tickers')) { fail(); return; }
      clearTimeout(timer); script.onerror = null; script.onload = null; resolve();
    };
    document.head.appendChild(script);
  });
  return tickersLoading;
}

@customElement('tradingview-widget')
export class TradingViewWidget extends LightElement {
  @property() kind: 'tickers' | 'overview' = 'overview';
  @property() symbol = 'ITUB4';
  @state() private phase: 'loading' | 'embedded' | 'error' = 'loading';
  private themeObserver?: MutationObserver;
  private mountObserver?: MutationObserver;
  private sizeObserver?: ResizeObserver;
  private timer?: number;
  private generation = 0;
  private cleanups: (() => void)[] = [];
  connectedCallback() {
    super.connectedCallback();
    this.themeObserver = new MutationObserver(() => void this.mount());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  disconnectedCallback() {
    this.generation++;
    this.themeObserver?.disconnect();
    this.dispose();
    super.disconnectedCallback();
  }
  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('kind') || changed.has('symbol')) void this.mount();
  }
  private dispose() {
    clearTimeout(this.timer);
    this.mountObserver?.disconnect(); this.sizeObserver?.disconnect();
    this.cleanups.forEach(cleanup => cleanup()); this.cleanups = [];
    this.querySelector('.tv-mount')?.replaceChildren();
  }
  private async mount() {
    const generation = ++this.generation;
    this.dispose(); this.phase = 'loading';
    await this.updateComplete;
    if (!this.isConnected || generation !== this.generation) return;
    const target = this.querySelector<HTMLElement>('.tv-mount')!;
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const fail = () => { if (this.isConnected && generation === this.generation) { this.phase = 'error'; clearTimeout(this.timer); } };
    const embedded = () => { if (this.isConnected && generation === this.generation) { this.phase = 'embedded'; clearTimeout(this.timer); } };
    this.timer = window.setTimeout(fail, 25000);
    if (this.kind === 'tickers') {
      try {
        await loadTickers();
        if (!this.isConnected || generation !== this.generation) return;
        const widget = document.createElement('tv-tickers');
        widget.setAttribute('symbols', stocks.map(stock => stock.tradingView).join(','));
        widget.setAttribute('theme', theme); widget.setAttribute('hide-chart', '');
        widget.setAttribute('item-size', 'normal');
        widget.setAttribute('symbol-url', `${location.origin}/#/acoes/{tvsymbol}`);
        const navigate = (event: Event) => {
          const detail = (event as CustomEvent<{ context?: { symbol?: string } }>).detail;
          const symbol = detail?.context?.symbol?.replace(/^BMFBOVESPA:/, '');
          const stock = symbol ? findStock(symbol) : undefined;
          if (stock) { event.preventDefault(); location.hash = `#/acoes/${stock.symbol}`; }
        };
        widget.addEventListener('tv-link-open', navigate);
        this.cleanups.push(() => widget.removeEventListener('tv-link-open', navigate));
        this.sizeObserver = new ResizeObserver(entries => widget.setAttribute('direction', entries[0].contentRect.width < 700 ? 'vertical' : 'horizontal'));
        widget.setAttribute('direction', target.clientWidth < 700 ? 'vertical' : 'horizontal');
        target.appendChild(widget); this.sizeObserver.observe(target);
        // Registration/embedding is structural readiness, not a claim of data availability.
        embedded();
      } catch { fail(); }
      return;
    }
    const stock = findStock(this.symbol);
    if (!stock) { fail(); return; }
    const wrapper = document.createElement('div'); wrapper.className = 'tradingview-widget-container';
    const frameMount = document.createElement('div'); frameMount.className = 'tradingview-widget-container__widget';
    const copyright = document.createElement('div'); copyright.className = 'tradingview-widget-copyright';
    const link = document.createElement('a');
    link.href = `https://www.tradingview.com/symbols/BMFBOVESPA-${stock.symbol}/?utm_source=${encodeURIComponent(location.hostname)}&utm_medium=widget_new&utm_campaign=symbol-overview`;
    link.target = '_blank'; link.rel = 'noopener nofollow';
    link.textContent = `${stock.name} — gráfico por TradingView`;
    copyright.appendChild(link); wrapper.append(frameMount, copyright); target.appendChild(wrapper);
    const script = document.createElement('script'); script.src = OVERVIEW_SCRIPT; script.async = true;
    script.textContent = JSON.stringify({
      symbols: [[stock.name, `${stock.tradingView}|1D`]], width: '100%', height: '100%', autosize: true,
      locale: 'br', colorTheme: theme, isTransparent: false, chartOnly: false, showVolume: false, showMA: false,
      hideDateRanges: false, hideMarketStatus: false, hideSymbolLogo: false,
      scalePosition: 'right', scaleMode: 'Normal', fontFamily: 'IBM Plex Sans, Arial, sans-serif', fontSize: '12',
      noTimeScale: false, valuesTracking: '1', changeMode: 'price-and-percent', chartType: 'line',
      lineWidth: 2, lineType: 0, upColor: theme === 'dark' ? '#dedede' : '#303030', downColor: theme === 'dark' ? '#dedede' : '#303030',
      backgroundColor: theme === 'dark' ? '#0c0c0c' : '#f7f7f7', fontColor: theme === 'dark' ? '#b6b6b6' : '#535353',
      dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
    });
    script.onerror = fail;
    this.cleanups.push(() => { script.onerror = null; });
    this.mountObserver = new MutationObserver(() => {
      const frame = wrapper.querySelector('iframe');
      if (!frame || frame.dataset.observed) return;
      frame.dataset.observed = 'true'; frame.title = `TradingView — ${stock.symbol}`;
      frame.addEventListener('load', embedded, { once: true });
      this.cleanups.push(() => frame.removeEventListener('load', embedded));
    });
    this.mountObserver.observe(wrapper, { childList: true, subtree: true });
    wrapper.appendChild(script);
  }
  render() {
    return html`<section class="tv-panel tv-${this.kind}" aria-label=${this.kind === 'tickers' ? 'Cotações TradingView' : `Gráfico TradingView de ${this.symbol}`}>
      ${this.phase === 'loading' ? html`<p class="tv-loading" role="status">Carregando TradingView…</p>` : nothing}
      <div class="tv-mount" ?hidden=${this.phase === 'error'}></div>
      ${this.phase === 'error' ? html`<div class="market-notice" role="alert"><p>Não foi possível carregar o TradingView. Verifique sua conexão ou o bloqueio de conteúdo externo.</p><button class="button secondary" @click=${this.mount}>Tentar novamente</button></div>` : nothing}
    </section>`;
  }
}
