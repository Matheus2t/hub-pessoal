import { html, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement, money } from '../ui';
export interface PricePoint { date: string; close: number }
export const stockDate = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
@customElement('stock-chart')
export class StockChart extends LightElement {
  @property({ attribute: false }) points: PricePoint[] = [];
  @state() private index = -1;
  @state() private width = 800;
  @state() private inspecting = false;
  private observer?: ResizeObserver;
  protected firstUpdated() { this.observer = new ResizeObserver(entries => this.width = Math.max(240, entries[0].contentRect.width)); this.observer.observe(this); }
  disconnectedCallback() { super.disconnectedCallback(); this.observer?.disconnect(); }
  private inspect(event: PointerEvent) {
    this.inspecting = true;
    const box = (event.currentTarget as SVGElement).getBoundingClientRect();
    this.index = Math.round(Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width * this.width - 65) / (this.width - 85))) * (this.points.length - 1));
  }
  protected willUpdate(changed: Map<PropertyKey, unknown>) { if (changed.has('points')) { this.index = -1; this.inspecting = false; } }
  render() {
    if (!this.points.length) return html`<p class="market-note">Sem preços históricos disponíveis neste período.</p>`;
    const values = this.points.map(point => point.close);
    const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, max * .01, 1);
    const low = Math.max(0, min - span * .1), high = max + span * .1;
    const x = (i: number) => 65 + i / Math.max(this.points.length - 1, 1) * (this.width - 85);
    const y = (value: number) => 230 - (value - low) / (high - low) * 200;
    const active = Math.min(this.index < 0 ? this.points.length - 1 : this.index, this.points.length - 1);
    const point = this.points[active];
    return html`<div class="stock-readout" role="status">${stockDate(point.date)} <strong>${money(point.close)}</strong></div>
      <svg class="stock-svg" viewBox=${`0 0 ${this.width} 280`} role="img" aria-label="Histórico de preços em reais" @pointermove=${this.inspect} @pointerdown=${this.inspect} @pointerleave=${(event: PointerEvent) => { if (event.pointerType !== "touch") this.inspecting = false; }}>
        ${[0, 1, 2, 3].map(i => { const value = low + (high - low) * i / 3; return svg`<line x1="65" x2=${this.width - 20} y1=${y(value)} y2=${y(value)} class="stock-grid"/><text x="56" y=${y(value)+4} text-anchor="end">${money(value)}</text>`; })}
        <path class="stock-line" d=${this.points.map((point, i) => `${i ? 'L' : 'M'}${x(i)},${y(point.close)}`).join(' ')} />
        <line class="stock-guide" x1=${x(active)} x2=${x(active)} y1="30" y2="230"/><circle cx=${x(active)} cy=${y(point.close)} r="4" class="stock-dot"/>
        ${(this.width < 480 ? [0, this.points.length-1] : [0, Math.floor((this.points.length-1)/2), this.points.length-1]).filter((v,i,a)=>a.indexOf(v)===i).map(i=>svg`<text x=${x(i)} y="260" text-anchor=${i===0?'start':i===this.points.length-1?'end':'middle'}>${stockDate(this.points[i].date)}</text>`)}
      </svg>${this.inspecting ? html`<div class="stock-tooltip" role="tooltip"><span>${stockDate(point.date)}</span><strong>${money(point.close)}</strong></div>` : ""}
      <label class="stock-slider">Data do histórico<input type="range" min="0" max=${this.points.length-1} .value=${String(active)} aria-valuetext=${`${stockDate(point.date)}: ${money(point.close)}`} @input=${(event: Event)=>{ this.index=Number((event.target as HTMLInputElement).value); this.inspecting = true; }}></label>`;
  }
}
