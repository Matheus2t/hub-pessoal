import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { findStock } from '../market-catalog';

const modules = new Map<string, Promise<void>>();
@customElement('market-embed')
export class MarketEmbed extends LightElement {
  @property() kind: 'market-overview' | 'advanced-chart' | 'company-profile' = 'market-overview';
  @property() symbol = 'IBOV';
  @state() private failed = false;
  private generation = 0;
  private observer?: MutationObserver;
  connectedCallback() { super.connectedCallback(); this.observer = new MutationObserver(() => void this.mount()); this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); }
  disconnectedCallback() { this.generation++; this.observer?.disconnect(); this.querySelector('.market-embed-mount')?.replaceChildren(); super.disconnectedCallback(); }
  protected updated(changed: Map<PropertyKey, unknown>) { if (changed.has('kind') || changed.has('symbol')) void this.mount(); }
  private async mount() {
    const generation = ++this.generation; this.failed = false; await this.updateComplete;
    const target = this.querySelector('.market-embed-mount'); if (!target || !this.isConnected) return;
    target.replaceChildren(); const tag = `tv-${this.kind}`;
    try {
      if (!customElements.get(tag) && !modules.has(tag)) modules.set(tag, new Promise<void>((resolve, reject) => {
        const script = document.createElement('script'); script.type = 'module'; script.src = `https://widgets.tradingview-widget.com/w/br/${tag}.js`;
        const timer = window.setTimeout(() => { script.remove(); modules.delete(tag); reject(new Error('timeout')); }, 20000);
        script.onload = () => { clearTimeout(timer); if (customElements.get(tag)) resolve(); else { modules.delete(tag); reject(new Error('registration')); } };
        script.onerror = () => { clearTimeout(timer); script.remove(); modules.delete(tag); reject(new Error('script')); }; document.head.appendChild(script);
      }));
      await modules.get(tag);
      if (!this.isConnected || generation !== this.generation) return;
      const widget = document.createElement(tag); widget.setAttribute('theme', document.documentElement.dataset.theme || 'dark');
      widget.setAttribute('symbol', findStock(this.symbol)?.tradingView || 'BMFBOVESPA:IBOV');
      if (this.kind === 'market-overview') {
        widget.setAttribute('mode', 'custom'); widget.setAttribute('symbol-sectors', JSON.stringify([
          { sectionName: 'Índices', symbols: ['BMFBOVESPA:IBOV'] },
          { sectionName: 'Bancos', symbols: ['BMFBOVESPA:ITUB4','BMFBOVESPA:BBAS3','BMFBOVESPA:BBDC3'] },
          { sectionName: 'Energia e commodities', symbols: ['BMFBOVESPA:PETR4','BMFBOVESPA:VALE3','BMFBOVESPA:PRIO3'] },
          { sectionName: 'Indústria e consumo', symbols: ['BMFBOVESPA:WEGE3','BMFBOVESPA:ABEV3'] },
        ]));
      }
      if (this.kind === 'advanced-chart') { widget.setAttribute('show-drawing-toolbar', ''); widget.setAttribute('show-date-ranges', ''); widget.setAttribute('interval', '1D'); }
      target.appendChild(widget);
    } catch { if (generation === this.generation && this.isConnected) this.failed = true; }
  }
  render() { return html`<section class="market-embed ${this.kind}" aria-label=${this.kind}><div class="market-embed-mount"></div>${this.failed ? html`<p role="alert">Não foi possível carregar o TradingView.</p><button class="button secondary" @click=${this.mount}>Tentar novamente</button>` : ''}</section>`; }
}
