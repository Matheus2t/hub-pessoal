import { html, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { LightElement, money } from "../ui";
import type { EvolutionRow } from "../types";

@customElement("evolution-chart")
export class EvolutionChart extends LightElement {
  @property({ attribute: false }) rows: EvolutionRow[] = [];
  @state() private active = -1;
  @state() private width = 800;
  @state() private inspecting = false;
  private observer?: ResizeObserver;
  protected firstUpdated() {
    this.observer = new ResizeObserver((entries) => {
      this.width = Math.max(260, entries[0].contentRect.width);
    });
    this.observer.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }
  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has("rows")) this.active = -1;
  }
  private get points() {
    if (!this.rows.length) return [];
    const first = this.rows[0];
    const initial = Number(first.invested) - Number(first.deposit);
    return [
      { month: 0, balance: initial, invested: initial },
      ...this.rows.map((row) => ({
        month: row.month,
        balance: Number(row.balance),
        invested: Number(row.invested),
      })),
    ];
  }
  private inspect(event: PointerEvent) {
    this.inspecting = true;
    const bounds = (event.currentTarget as SVGElement).getBoundingClientRect();
    const plotWidth = this.width - 88;
    const fraction =
      (((event.clientX - bounds.left) * this.width) / bounds.width - 70) /
      plotWidth;
    this.active = Math.round(
      Math.max(0, Math.min(1, fraction)) * (this.points.length - 1),
    );
  }
  render() {
    const points = this.points;
    if (!points.length)
      return html`<section class="panel chart-panel">
        <p>O gráfico aparecerá após a simulação.</p>
      </section>`;
    const width = this.width,
      height = 290,
      left = 70,
      right = 18,
      top = 20,
      bottom = 38;
    const max = Math.max(...points.map((p) => p.balance), 1) * 1.08;
    const x = (index: number) =>
      left + (index / (points.length - 1)) * (width - left - right);
    const y = (value: number) =>
      top + (1 - value / max) * (height - top - bottom);
    const line = (key: "balance" | "invested") =>
      points
        .map(
          (p, i) =>
            `${i ? "L" : "M"}${x(i).toFixed(2)},${y(p[key]).toFixed(2)}`,
        )
        .join(" ");
    const active =
        this.active < 0
          ? points.length - 1
          : Math.min(this.active, points.length - 1),
      selected = points[active];
    const ticks = Math.min(width < 480 ? 3 : 5, points.length);
    return html`<section
      class="panel chart-panel"
      aria-labelledby="chart-title"
    >
      <div class="panel-heading">
        <div>
          <span class="section-index">02</span>
          <h2 id="chart-title">Evolução do patrimônio</h2>
        </div>
        <span class="subtle">${this.rows.length} meses</span>
      </div>
      <div class="chart-toolbar">
        <div class="chart-legend">
          <span><i class="legend-dot balance"></i>Patrimônio acumulado</span
          ><span><i class="legend-dot invested"></i>Total investido</span>
        </div>
        <div class="chart-readout" aria-live="off">
          <span>Mês ${selected.month}</span
          ><strong>${money(selected.balance)}</strong
          ><small>Investido: ${money(selected.invested)} · Juros: ${money(selected.balance - selected.invested)}</small>
        </div>
      </div>
      <div class="chart-plot">
        <svg
          class="evolution-svg"
          viewBox=${`0 0 ${width} ${height}`}
          role="img"
          aria-label="Evolução mensal do patrimônio acumulado e do total investido"
          @pointermove=${this.inspect}
          @pointerdown=${this.inspect}
          @pointerleave=${(event: PointerEvent) => {
            if (event.pointerType !== "touch") this.inspecting = false;
          }}
        >
          ${[0, 1, 2, 3, 4].map((i) => {
            const value = (max * i) / 4,
              cy = y(value);
            return svg`<line class="chart-grid" x1=${left} x2=${width - right} y1=${cy} y2=${cy}/><text class="chart-axis" x=${left - 12} y=${cy + 4} text-anchor="end">${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1, style: "currency", currency: "BRL" }).format(value)}</text>`;
          })}
          <path
            class="chart-area"
            d=${`${line("balance")} L${x(points.length - 1)},${height - bottom} L${left},${height - bottom} Z`}
          />
          <path class="chart-invested" d=${line("invested")} />
          <path class="chart-balance" d=${line("balance")} />
          ${Array.from({ length: ticks }, (_, i) => {
            const n = Math.round((i / (ticks - 1)) * (points.length - 1));
            return svg`<text class="chart-axis" text-anchor=${i === 0 ? "start" : i === ticks - 1 ? "end" : "middle"} x=${x(n)} y=${height - 10}>Mês ${points[n].month}</text>`;
          })}
          <line
            class="chart-cursor"
            x1=${x(active)}
            x2=${x(active)}
            y1=${top}
            y2=${height - bottom}
          />
          <circle
            class="chart-point"
            cx=${x(active)}
            cy=${y(selected.balance)}
            r="4"
          /></svg
        >${this.inspecting
          ? html`<div
              class="chart-tooltip"
              style=${`left:clamp(0px,${(x(active) / width) * 100}% - 110px,calc(100% - 220px))`}
            >
              <span>Mês ${selected.month}</span
              ><strong>${money(selected.balance)}</strong
              ><small>Total investido: ${money(selected.invested)}</small><small>Juros: ${money(selected.balance - selected.invested)}</small>
            </div>`
          : ""}
      </div>
      <label class="chart-slider"
        ><span
          >Explorar mês a mês
          <small>Deslize ou use as setas do teclado</small></span
        ><input
          aria-label="Mês exibido no gráfico"
          type="range"
          min="0"
          max=${points.length - 1}
          .value=${String(active)}
          aria-valuetext=${`Mês ${selected.month}: patrimônio ${money(selected.balance)}, investido ${money(selected.invested)}`}
          @input=${(event: Event) =>
            (this.active = Number((event.target as HTMLInputElement).value))}
      /></label>
    </section>`;
  }
}
