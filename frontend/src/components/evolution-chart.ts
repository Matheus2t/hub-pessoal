import { html, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { LightElement, money } from "../ui";
import type { EvolutionRow } from "../types";

const SERIES = [
  { key: "balance", label: "Patrimônio acumulado" },
  { key: "invested", label: "Total investido" },
  { key: "interest", label: "Juros acumulados" },
] as const;
type SeriesKey = (typeof SERIES)[number]["key"];

@customElement("evolution-chart")
export class EvolutionChart extends LightElement {
  @property({ attribute: false }) rows: EvolutionRow[] = [];
  @state() private active = -1;
  @state() private width = 800;
  @state() private inspecting = false;
  @state() private hoveredSeries: SeriesKey | null = null;
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
    if (changed.has("rows")) {
      this.active = -1;
      this.inspecting = false;
      this.hoveredSeries = null;
    }
  }
  private get points() {
    if (!this.rows.length) return [];
    const first = this.rows[0];
    const initial = Number(first.invested) - Number(first.deposit);
    return [
      { month: 0, balance: initial, invested: initial, interest: 0 },
      ...this.rows.map((row) => ({
        month: row.month,
        balance: Number(row.balance),
        invested: Number(row.invested),
        interest: Number(row.balance) - Number(row.invested),
      })),
    ];
  }
  private selectSeries(key: SeriesKey) {
    this.hoveredSeries = key;
    this.inspecting = true;
  }
  private stopInspect() {
    this.inspecting = false;
    this.hoveredSeries = null;
  }
  private inspect(event: PointerEvent) {
    // O toque escolhe uma linha; mover o dedo não bloqueia a rolagem.
    if (event.pointerType === "touch" && event.type === "pointermove") return;

    const svgElement = event.currentTarget as SVGSVGElement;
    const matrix = svgElement.getScreenCTM();
    if (!matrix) return;
    const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    const points = this.points;
    if (points.length < 2) return;

    const width = this.width;
    const height = 290;
    const left = 70;
    const right = 18;
    const top = 20;
    const bottom = 38;
    const plotWidth = width - left - right;
    const fractionalMonth =
      Math.max(0, Math.min(1, (cursor.x - left) / plotWidth)) *
      (points.length - 1);
    const firstIndex = Math.floor(fractionalMonth);
    const nextIndex = Math.min(firstIndex + 1, points.length - 1);
    const fraction = fractionalMonth - firstIndex;
    const maximum = Math.max(...points.map((point) => point.balance), 1) * 1.08;
    const y = (value: number) =>
      top + (1 - value / maximum) * (height - top - bottom);

    let nearest: SeriesKey = "balance";
    let distance = Infinity;
    for (const series of SERIES) {
      const value =
        points[firstIndex][series.key] * (1 - fraction) +
        points[nextIndex][series.key] * fraction;
      const difference = Math.abs(cursor.y - y(value));
      if (difference < distance) {
        distance = difference;
        nearest = series.key;
      }
    }

    // No desktop o tooltip só aparece perto de uma linha; no toque,
    // escolhe a linha mais próxima da posição tocada.
    const isTouch = event.pointerType === "touch";
    const inPlot =
      cursor.x >= left &&
      cursor.x <= width - right &&
      cursor.y >= top &&
      cursor.y <= height - bottom;
    if (!inPlot || (!isTouch && distance > 15)) {
      this.stopInspect();
      return;
    }

    this.active = Math.round(fractionalMonth);
    this.selectSeries(nearest);
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
    const line = (key: "balance" | "invested" | "interest") =>
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
        <div class="chart-legend" aria-label="Séries do gráfico">
          ${SERIES.map(
            (series) => html`<button
              type="button"
              class="chart-legend-item ${this.hoveredSeries === series.key && this.inspecting ? "is-active" : ""}"
              @pointerenter=${() => this.selectSeries(series.key)}
              @pointerleave=${() => this.stopInspect()}
              @focus=${() => this.selectSeries(series.key)}
              @blur=${() => this.stopInspect()}
              @click=${() => this.selectSeries(series.key)}
              aria-label=${`Ver ${series.label.toLowerCase()}`}
            ><i class="legend-dot ${series.key}"></i>${series.label}</button>`,
          )}
        </div>
        <div class="chart-readout" aria-live="off">
          <span>Mês ${selected.month}</span
          ><strong>${money(selected.balance)}</strong
          ><small>Investido: ${money(selected.invested)}</small
          ><small>Juros: ${money(selected.interest)}</small>
        </div>
      </div>
      <div class="chart-plot">
        <svg
          class="evolution-svg"
          viewBox=${`0 0 ${width} ${height}`}
          role="img"
          aria-label="Evolução mensal do patrimônio acumulado, total investido e juros acumulados"
          @pointermove=${this.inspect}
          @pointerdown=${this.inspect}
          @pointerleave=${(event: PointerEvent) => {
            if (event.pointerType !== "touch") this.stopInspect();
          }}
        >
          <rect
            class="chart-hit-area"
            x=${left}
            y=${top}
            width=${width - left - right}
            height=${height - top - bottom}
          />
          ${[0, 1, 2, 3, 4].map((i) => {
            const value = (max * i) / 4,
              cy = y(value);
            return svg`<line class="chart-grid" x1=${left} x2=${width - right} y1=${cy} y2=${cy}/><text class="chart-axis" x=${left - 12} y=${cy + 4} text-anchor="end">${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1, style: "currency", currency: "BRL" }).format(value)}</text>`;
          })}
          <path
            class="chart-area"
            d=${`${line("balance")} L${x(points.length - 1)},${height - bottom} L${left},${height - bottom} Z`}
          />
          <path
            class="chart-invested ${this.hoveredSeries === "invested" && this.inspecting ? "is-inspected" : ""}"
            d=${line("invested")}
          />
          <path
            class="chart-balance ${this.hoveredSeries === "balance" && this.inspecting ? "is-inspected" : ""}"
            d=${line("balance")}
          />
          <path
            class="chart-interest ${this.hoveredSeries === "interest" && this.inspecting ? "is-inspected" : ""}"
            d=${line("interest")}
          />
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
            cy=${y(selected[this.inspecting && this.hoveredSeries ? this.hoveredSeries : "balance"])}
            r="4"
          /></svg
        >${this.inspecting && this.hoveredSeries
          ? html`<div
              class="chart-tooltip"
              role="tooltip"
              data-series=${this.hoveredSeries}
              style=${`left:clamp(8px,calc(${(x(active) / width) * 100}% - 110px),calc(100% - 228px));top:${Math.max(8, Math.min(y(selected[this.hoveredSeries]) - 86, height - 100))}px`}
            >
              <span>Mês ${selected.month} · ${SERIES.find((series) => series.key === this.hoveredSeries)?.label}</span>
              <strong>${money(selected[this.hoveredSeries])}</strong>
            </div>`
          : ""}
      </div>
      <label class="chart-slider"
        ><span
          >Explorar mês a mês</span
        ><input
          aria-label="Mês exibido no gráfico"
          style=${`--slider-progress: ${(active / (points.length - 1)) * 100}%`}
          type="range"
          min="0"
          max=${points.length - 1}
          .value=${String(active)}
          aria-valuetext=${`Mês ${selected.month}: patrimônio ${money(selected.balance)}, investido ${money(selected.invested)}, juros acumulados ${money(selected.interest)}`}
          @input=${(event: Event) =>
            (this.active = Number((event.target as HTMLInputElement).value))}
      /></label>
    </section>`;
  }
}
