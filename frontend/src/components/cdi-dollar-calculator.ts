import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { LightElement, money, parseBrazilian } from '../ui';
import { simulateCdiDollar, type CdiDollarInput, type CdiDollarOutput, type CdiDollarTaxMode } from '../cdi-dollar';
import './form-field';
import './panel-workspace';
import './year-navigation';

const fields = [
  { name: 'principal', label: 'Valor do investimento', unit: 'R$', value: '10.000,00', min: 0.01, max: 1e12 },
  { name: 'cdiAnnualPercent', label: 'CDI estimado por ano', unit: '% a.a.', value: '12', min: 0, max: 100 },
  { name: 'cdiParticipation', label: 'Quanto rende em relação ao CDI?', unit: '% do CDI', value: '100', min: 0, max: 300 },
  { name: 'days', label: 'Prazo personalizado', unit: 'dias', value: '365', min: 30, max: 3650, integer: true },
  { name: 'initialFx', label: 'Dólar inicial', unit: 'R$/US$', value: '5,00', min: 0.01, max: 1000 },
  { name: 'finalFx', label: 'Dólar ao final', unit: 'R$/US$', value: '5,60', min: 0.01, max: 1000 },
] as const;

const durations = [
  { value: '180', label: '6 meses' },
  { value: '365', label: '1 ano' },
  { value: '730', label: '2 anos' },
  { value: '1095', label: '3 anos' },
  { value: '1825', label: '5 anos' },
  { value: '3650', label: '10 anos' },
] as const;

type FieldKey = typeof fields[number]['name'];
const moneyUsd = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(n);
const percent = (n: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + '%';
const parseField = (value: string, key: FieldKey) => {
  const raw = value.trim().replace(/R\$|\s/g, '');
  if (key === 'principal' && /^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, ''));
  return parseBrazilian(value);
};

/** Interface simples; a matemática permanece em cdi-dollar.ts. */
@customElement('cdi-dollar-calculator')
export class CdiDollarCalculator extends LightElement {
  @state() private values: Record<FieldKey, string> =
    Object.fromEntries(fields.map(f => [f.name, f.value])) as Record<FieldKey, string>;
  @state() private duration = '365';
  @state() private taxMode: CdiDollarTaxMode = 'taxable';
  @state() private errors: Partial<Record<FieldKey, string>> = {};
  @state() private output: CdiDollarOutput | null = null;
  @state() private error = '';
  @state() private stale = false;
  @state() private yearPage = 0;
  @state() private chosenMonth = -1;

  connectedCallback() {
    super.connectedCallback();
    this.classList.add('workspace-v2', 'calculator-workspace', 'extended-calculator', 'cdi-dollar-calculator');
  }

  private change(event: CustomEvent<{ name: FieldKey; value: string }>) {
    if (!fields.some(f => f.name === event.detail.name)) return;
    this.values = { ...this.values, [event.detail.name]: event.detail.value };
    this.errors = { ...this.errors, [event.detail.name]: '' };
    this.stale = !!this.output;
    this.error = '';
  }

  private changeDuration(event: Event) {
    const next = (event.target as HTMLSelectElement).value;
    this.duration = next;
    if (next !== 'custom') {
      this.values = { ...this.values, days: next };
      this.errors = { ...this.errors, days: '' };
    }
    this.stale = !!this.output;
    this.error = '';
  }

  private async calculate(event: Event) {
    event.preventDefault();
    const values: Record<string, number> = {};
    const errors: Partial<Record<FieldKey, string>> = {};
    for (const field of fields) {
      const n = parseField(this.values[field.name] ?? '', field.name);
      values[field.name] = n;
      if (!Number.isFinite(n) || n < field.min || n > field.max ||
          ('integer' in field && field.integer && !Number.isInteger(n)))
        errors[field.name] = 'Confira o valor informado.';
    }
    this.errors = errors;
    if (Object.keys(errors).length) {
      this.error = 'Revise os campos destacados.';
      if (errors.cdiParticipation) {
        await this.updateComplete;
        const details = this.querySelector<HTMLDetailsElement>('.cdi-dollar-advanced');
        if (details) details.open = true;
      }
      return;
    }
    try {
      this.output = simulateCdiDollar({ ...values, taxMode: this.taxMode } as CdiDollarInput);
      this.error = '';
      this.stale = false;
      this.yearPage = 0;
      this.chosenMonth = -1;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Não foi possível simular.';
    }
  }

  private formField(field: typeof fields[number]) {
    return html`<form-field .name=${field.name} idPrefix="cdi-dollar" .label=${field.label} .unit=${field.unit}
      .value=${this.values[field.name]} .integer=${'integer' in field && !!field.integer}
      .error=${this.errors[field.name] || ''}></form-field>`;
  }

  private chart(out: CdiDollarOutput) {
    const points = out.rows;
    const left = 20, top = 20, width = 654, height = 165;
    const max = Math.max(1, ...points.flatMap(p => [p.cdiNetBRL, p.dollarHoldBRL])) * 1.06;
    const px = (i: number) => left + (i / Math.max(1, points.length - 1)) * width;
    const py = (n: number) => top + height - n / max * height;
    const line = (key: 'cdiNetBRL' | 'dollarHoldBRL') =>
      points.map((p, i) => `${px(i).toFixed(2)},${py(p[key]).toFixed(2)}`).join(' ');
    const index = this.chosenMonth < 0 ? points.length - 1 :
      Math.max(0, Math.min(points.length - 1, this.chosenMonth));
    const selected = points[index];
    return html`<div class="cdi-dollar-chart">
      <div class="cdi-dollar-chart-top">
        <strong>Evolução do valor em reais</strong>
        <span>${index === 0 ? 'Início' : `Mês ${index}`}</span>
      </div>
      <div class="cdi-dollar-chart-values">
        <div><span>CDI líquido</span><strong>${money(selected.cdiNetBRL)}</strong></div>
        <div><span>Dólares mantidos</span><strong>${money(selected.dollarHoldBRL)}</strong></div>
      </div>
      <svg viewBox="0 0 760 218" role="img" aria-label="Evolução do CDI líquido e do valor em reais dos dólares mantidos">
        <title>CDI líquido comparado ao valor em reais dos dólares</title>
        ${[0.25, 0.5, 0.75, 1].map(n => html`<line x1=${left} x2=${left + width} y1=${py(max * n)} y2=${py(max * n)}
          class="cdi-dollar-gridline"></line>`)}
        <polyline class="cdi-dollar-line-dollar" points=${line('dollarHoldBRL')}></polyline>
        <polyline class="cdi-dollar-line-cdi" points=${line('cdiNetBRL')}></polyline>
        <line class="cdi-dollar-chart-cursor" x1=${px(index)} x2=${px(index)} y1=${top} y2=${top + height}></line>
        <circle class="cdi-dollar-chart-dot" cx=${px(index)} cy=${py(selected.cdiNetBRL)} r="4"></circle>
        <circle class="cdi-dollar-chart-dot secondary" cx=${px(index)} cy=${py(selected.dollarHoldBRL)} r="4"></circle>
        <text class="cdi-dollar-axis" x=${left} y="205">Início</text>
        <text class="cdi-dollar-axis" x=${left + width} y="205" text-anchor="end">${points.length - 1} meses</text>
      </svg>
      <div class="cdi-dollar-chart-legend"><span>CDI líquido</span><span>Dólares mantidos</span></div>
      <label class="cdi-dollar-chart-range">Consultar outro mês
        <input type="range" min="0" max=${points.length - 1} step="1" .value=${String(index)}
          aria-label="Mês exibido no gráfico"
          @input=${(e: Event) => this.chosenMonth = Number((e.target as HTMLInputElement).value)}/>
      </label>
    </div>`;
  }

  private summary(out: CdiDollarOutput) {
    const difference = Math.abs(out.cdiDifferenceBRL);
    const winner = out.cdiDifferenceBRL > 0.005 ? 'O CDI rende mais neste cenário.' :
      out.cdiDifferenceBRL < -0.005 ? 'O dólar rende mais neste cenário.' :
      'As duas opções terminam empatadas.';
    return html`<div class="section-heading result-heading">
        <h2>Resultado da comparação</h2>
        <span class="result-status ${this.stale ? 'stale' : ''}">
          ${this.stale ? 'Simulação desatualizada' : 'Simulação concluída'}</span>
      </div>
      ${this.stale ? html`<p class="cdi-dollar-stale" role="status">
        Os resultados abaixo são anteriores à mudança. Clique em <strong>Comparar</strong> para atualizar.
      </p>` : nothing}
      <div class="cdi-dollar-hero">
        <span>Até qual cotação o CDI compensa a alta do dólar?</span>
        <strong>${money(out.fxBreakeven)}</strong>
        <p>por US$ 1 ao final do investimento · alta máxima estimada: <b>${percent(out.fxBreakevenAppreciation)}</b></p>
      </div>
      <div class="cdi-dollar-verdict">
        <strong>${winner}</strong>
        <span>${out.cdiDifferenceBRL === 0 ? 'Sem diferença de valor.' :
          `Diferença: ${money(difference)}.`}</span>
      </div>
      <div class="cdi-dollar-compare">
        <section><span>Investindo no CDI</span><strong>${money(out.netBRL)}</strong></section>
        <section><span>Comprando dólares</span><strong>${money(out.dollarHoldBRL)}</strong></section>
      </div>
      <details class="cdi-dollar-details">
        <summary>Ver cálculo e impostos</summary>
        <dl>
          <div><dt>Valor inicial</dt><dd>${money(out.principal)}</dd></div>
          <div><dt>Rendimento bruto no CDI</dt><dd>${money(out.gainBRL)}</dd></div>
          <div><dt>IR estimado (${percent(out.irRate * 100)})</dt><dd>${money(out.irAmount)}</dd></div>
          <div><dt>Retorno líquido do CDI</dt><dd>${percent(out.nominalNetReturn)}</dd></div>
          <div><dt>Alta do dólar no período</dt><dd>${percent(out.dollarAppreciation)}</dd></div>
          <div><dt>Retorno do CDI medido em dólares</dt><dd>${percent(out.netDollarReturn)}</dd></div>
          <div><dt>Dólares que poderiam ser comprados no início</dt><dd>${moneyUsd(out.initialDollars)}</dd></div>
        </dl>
        <p>O dólar de equilíbrio é a cotação futura que deixa os dois cenários com o mesmo valor em reais. Não é uma proteção cambial contratada.</p>
      </details>
      <details class="cdi-dollar-evolution"><summary>Explorar evolução no gráfico</summary>
        ${this.chart(out)}
      </details>`;
  }

  render() {
    const out = this.output;
    const pages = out ? Math.ceil((out.rows.length - 1) / 12) : 0;
    const rows = out?.rows.slice(this.yearPage * 12 + 1, this.yearPage * 12 + 13) ?? [];
    const mainFields = fields.filter(f => f.name !== 'days' && f.name !== 'cdiParticipation');
    return html`<div class="ws-page-heading">
      <h1>CDI x Dólar</h1><p class="cdi-dollar-intro">Compare o rendimento líquido com a valorização da moeda, sem excesso de informações.</p>
    </div>
    <panel-workspace fixed-layout area="calculator-cdi-dollar" .panels=${[
      { id: 'form', title: 'Simulação', required: true, essential: true, size: 'small', resizable: false, role: 'form' },
      { id: 'empty', title: 'Resultados', required: true, available: !out, size: 'medium', resizable: false },
      { id: 'summary', title: 'Resultado', essential: true, available: !!out, size: 'medium' },
      { id: 'table', title: 'Detalhamento', available: !!out, size: 'large' },
    ]}>
      <section slot="form" class="workspace-panel simulation-panel" aria-label="Parâmetros da comparação">
        <div class="panel-heading"><h2>Simulação</h2></div>
        <form novalidate @field-input=${this.change} @submit=${this.calculate}>
          <div class="form-grid cdi-dollar-fields">${mainFields.map(f => this.formField(f))}</div>
          <label class="cdi-dollar-duration-label">Prazo do investimento
            <select aria-label="Prazo do investimento" .value=${this.duration} @change=${this.changeDuration}>
              ${durations.map(d => html`<option value=${d.value} ?selected=${this.duration === d.value}>${d.label}</option>`)}
              <option value="custom" ?selected=${this.duration === "custom"}>Personalizar em dias</option>
            </select>
          </label>
          ${this.duration === 'custom' ? html`<div class="cdi-dollar-custom-days">
            ${this.formField(fields.find(f => f.name === 'days')!)}
          </div>` : nothing}
          <details class="cdi-dollar-advanced">
            <summary>Opções avançadas <span>${this.values.cdiParticipation}% CDI · ${this.taxMode === 'taxable' ? 'com IR' : 'sem IR'}</span></summary>
            <div class="cdi-dollar-extra-fields">
              ${this.formField(fields.find(f => f.name === 'cdiParticipation')!)}
              <label class="cdi-dollar-tax-label">Tributação
                <select aria-label="Tributação do investimento" .value=${this.taxMode}
                  @change=${(e: Event) => { this.taxMode = (e.target as HTMLSelectElement).value as CdiDollarTaxMode; this.stale = !!this.output; }}>
                  <option value="taxable">IR regressivo (CDB)</option>
                  <option value="exempt">Sem IR (LCI/LCA)</option>
                </select>
              </label>
            </div>
          </details>
          <div class="form-bottom"><button type="submit" class="button primary">Comparar</button></div>
          ${this.error ? html`<p class="message error" role="alert">${this.error}</p>` : nothing}
        </form>
      </section>
      <section slot="empty" class="workspace-panel calculator-empty">
        <div><h2>Resultado</h2><p>Escolha os valores e compare.</p></div>
      </section>
      <section slot="summary" class="workspace-panel">${out ? this.summary(out) : nothing}</section>
      <section slot="table" class="workspace-panel">
        ${out ? html`<div class="cdi-dollar-table">
          <details class="cdi-dollar-table-details">
            <summary>Ver evolução mês a mês <span>${out.rows.length - 1} meses</span></summary>
            <div class="table-scroll" role="region" tabindex="0" aria-label="Projeção mensal de CDI e dólar">
              <table><thead><tr><th scope="col">Mês</th><th scope="col">CDI líquido</th>
                <th scope="col">Dólar em reais</th><th scope="col">Cotação</th><th scope="col">Diferença</th>
              </tr></thead><tbody>
                ${rows.map(p => html`<tr><th scope="row">${p.month}</th><td>${money(p.cdiNetBRL)}</td>
                  <td>${money(p.dollarHoldBRL)}</td><td>${money(p.fx)}</td>
                  <td>${money(p.balanceDifferenceBRL)}</td></tr>`)}
              </tbody></table>
            </div>
            <year-navigation .year=${this.yearPage + 1} .years=${pages}
              @year-change=${(e: CustomEvent<number>) => this.yearPage = e.detail - 1}></year-navigation>
          </details>
          <p class="cdi-dollar-disclosure">Taxas e câmbio são hipóteses editáveis, não cotações ao vivo. A simulação não inclui custos de câmbio nem garante proteção contra a alta do dólar.</p>
        </div>` : nothing}
      </section>
    </panel-workspace>`;
  }
}
