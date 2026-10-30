import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement, decimal, icon, money, parseBrazilian } from "../ui";
import { apiUrl } from "../config";
import type {
  CalculationInput,
  CalculationResult,
  HistoryItem,
} from "../types";
import "./form-field";
import "./metric-card";
import "./evolution-chart";
import "./results-table";
import "./unit-select";

type Field = keyof CalculationInput;
const fieldDefinitions: {
  name: Field;
  label: string;
  unit: string;
  hint: string;
}[] = [
  {
    name: "initial_capital",
    label: "Capital inicial",
    unit: "R$",
    hint: "Valor inicial do investimento",
  },
  {
    name: "monthly_contribution",
    label: "Aporte mensal",
    unit: "R$",
    hint: "Valor investido todos os meses",
  },
  {
    name: "monthly_rate",
    label: "Taxa de juros mensal",
    unit: "% a.m.",
    hint: "Rendimento mensal esperado",
  },
  {
    name: "months",
    label: "Prazo da simulação",
    unit: "meses",
    hint: "Informe um período entre 1 e 600 meses",
  },
];
@customElement("compound-calculator")
export class CompoundCalculator extends LightElement {
  @state() private rateUnit = 'monthly';
  @state() private periodUnit = 'months';
  @state() private values: Record<Field, string> = {
    initial_capital: "1.000,00",
    monthly_contribution: "300,00",
    monthly_rate: "0,80",
    months: "24",
  };
  @state() private errors: Partial<Record<Field, string>> = {};
  @state() private result?: CalculationResult;
  @state() private history: HistoryItem[] = [];
  @state() private loading = false;
  @state() private error = "";
  @state() private stale = false;
  private controller?: AbortController;
  disconnectedCallback() {
    super.disconnectedCallback();
    this.controller?.abort();
  }
  private change(event: CustomEvent<{ name: Field; value: string }>) {
    this.values = { ...this.values, [event.detail.name]: event.detail.value };
    this.errors = { ...this.errors, [event.detail.name]: "" };
    if (this.result) this.stale = true;
  }
  private format(event: CustomEvent<Field>) {
    const name = event.detail;
    const value = parseBrazilian(this.values[name]);
    if (name !== "months" && Number.isFinite(value) && value >= 0)
      this.values = {
        ...this.values,
        [name]:
          name === "monthly_rate"
            ? this.values[name].replace(".", ",")
            : decimal(value),
      };
  }
  private async loadHistory() {
    try {
      const r = await fetch(apiUrl("/api/calculations/history"));
      if (r.ok) this.history = await r.json();
    } catch {
      /* History is optional and disabled publicly. */
    }
  }
  private async calculate(event: SubmitEvent) {
    event.preventDefault();
    if (this.loading) return;
    this.errors = {};
    this.error = "";
    const body = Object.fromEntries(
      Object.entries(this.values).map(([key, value]) => [
        key,
        parseBrazilian(value),
      ]),
    ) as unknown as CalculationInput;
    for (const { name } of fieldDefinitions) {
      const value = body[name];
      if (!Number.isFinite(value) || value < 0)
        this.errors[name] = "Informe um número válido, maior ou igual a zero.";
    }
    if (!Number.isInteger(body.months) || body.months < 1 || body.months > (this.periodUnit === 'years' ? 50 : 600))
      this.errors.months = this.periodUnit === 'years' ? 'Informe um prazo inteiro entre 1 e 50 anos.' : "Informe um prazo inteiro entre 1 e 600 meses.";
    if (Object.keys(this.errors).length) {
      this.errors = { ...this.errors };
      await this.updateComplete;
      await Promise.all(
        Array.from(this.querySelectorAll("form-field")).map(
          (el) => (el as unknown as LightElement).updateComplete,
        ),
      );
      this.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    this.loading = true;
    this.controller = new AbortController();
    const timer = window.setTimeout(() => this.controller?.abort(), 30000);
    try {
      const response = await fetch(apiUrl("/api/calculations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, rate_unit: this.rateUnit, period_unit: this.periodUnit }),
        signal: this.controller.signal,
      });
      if (!response.ok) {
        this.error =
          response.status === 422
            ? "Revise os valores informados e tente novamente."
            : "Não foi possível concluir a simulação. Tente novamente em instantes.";
        return;
      }
      this.result = await response.json();
      this.stale = false;
      void this.loadHistory();
    } catch {
      this.error =
        "Não foi possível acessar o serviço de cálculo. Confira sua conexão e tente novamente.";
    } finally {
      clearTimeout(timer);
      this.loading = false;
    }
  }
  private clear() {
    this.values = {
      initial_capital: "",
      monthly_contribution: "",
      monthly_rate: "",
      months: "",
    };
    this.result = undefined;
    this.errors = {};
    this.error = "";
    this.stale = false;
  }
  render() {
    return html`<div class="page-heading">
        <div>
          <h1>Calculadora de <em>juros compostos</em></h1>
        </div>
      </div>
      <section
        class="panel simulation-panel"
        aria-labelledby="simulation-title"
      >
        <div class="panel-heading">
          <div>
            <span class="section-index">01</span>
            <h2 id="simulation-title">Simulação</h2>
          </div>
        </div>
        <form
          novalidate
          @submit=${this.calculate}
          @field-input=${this.change}
          @field-blur=${this.format}
        >
          <div class="unit-controls" @unit-change=${(event: CustomEvent) => { if (event.detail.name === 'rate') this.rateUnit = event.detail.value; else this.periodUnit = event.detail.value; if (this.result) this.stale = true; }}>
            <unit-select label="Taxa informada" name="rate" .value=${this.rateUnit} .disabled=${this.loading} .options=${[['monthly', 'Mensal'], ['annual', 'Anual efetiva']]}></unit-select>
            <unit-select label="Período em" name="period" .value=${this.periodUnit} .disabled=${this.loading} .options=${[['months', 'Meses'], ['years', 'Anos']]}></unit-select>
          </div>
          <div class="form-grid">
            ${fieldDefinitions.map(
              (f) =>
                html`<form-field
                  .name=${f.name}
                  .label=${f.name === 'monthly_rate' && this.rateUnit === 'annual' ? 'Taxa de juros anual' : f.label}
                  .unit=${f.name === 'monthly_rate' && this.rateUnit === 'annual' ? '% a.a.' : f.name === 'months' && this.periodUnit === 'years' ? 'anos' : f.unit}
                  .hint=${f.name === 'monthly_rate' && this.rateUnit === 'annual' ? 'Rendimento anual esperado' : f.name === 'months' && this.periodUnit === 'years' ? 'Informe de 1 a 50 anos inteiros' : f.hint}
                  .value=${this.values[f.name]}
                  .error=${this.errors[f.name] || ""}
                  .integer=${f.name === "months"}
                  .disabled=${this.loading}
                ></form-field>`,
            )}
          </div>
          <div class="form-bottom">
            <div class="form-actions">
              <button
                type="button"
                class="button secondary"
                @click=${this.clear}
                ?disabled=${this.loading}
              >
                Limpar</button
              ><button
                type="submit"
                class="button primary"
                ?disabled=${this.loading}
              >
                ${this.loading
                  ? html`<span class="spinner"></span>Calculando…`
                  : html`Simular investimento ${icon("arrow")}`}
              </button>
            </div>
          </div>
          ${this.error
            ? html`<div class="message error" role="alert">
                ${icon("info")}<span>${this.error}</span>
              </div>`
            : nothing}
        </form>
      </section>
      <div class="result-region" aria-busy=${this.loading} aria-live="polite">
        ${this.loading
          ? html`<div class="loading-state" role="status">
              <span class="spinner"></span> Preparando sua simulação…
            </div>`
          : nothing}
        ${this.result
          ? html`<div class="section-heading result-heading">
                <div>
                  <p class="eyebrow">SEU CENÁRIO</p>
                  <h2>Resultados</h2>
                </div>
                <span class="result-status ${this.stale ? "stale" : ""}"
                  >${icon(this.stale ? "info" : "check")}${this.stale
                    ? "Parâmetros alterados. Simule novamente."
                    : "Simulação concluída"}</span
                >
              </div>
              <div class="metrics-grid">
                <metric-card
                  label="Patrimônio final"
                  .value=${this.result.final_amount}
                  detail=""
                  tone="accent"
                  glyph="chart"
                ></metric-card
                ><metric-card
                  label="Total investido"
                  .value=${this.result.total_invested}
                  detail=""
                  glyph="wallet"
                ></metric-card
                ><metric-card
                  label="Juros acumulados"
                  .value=${this.result.total_interest}
                  detail=""
                  tone="positive"
                  glyph="layers"
                ></metric-card>
              </div>
              <evolution-chart .rows=${this.result.evolution}></evolution-chart
              ><results-table .rows=${this.result.evolution}></results-table>
              <p class="disclaimer">
                Esta simulação é uma estimativa matemática e não considera
                impostos, taxas ou inflação. Os resultados não representam
                garantia de rentabilidade.
              </p>`
          : html`<section class="panel calculator-empty">
              <span class="empty-symbol">${icon("chart")}</span>
              <div>
                <h2>Resultados</h2>
                <p>Preencha os campos e simule.</p>
              </div>
              <div class="empty-legend">
                <span
                  ><i class="legend-dot balance"></i>Patrimônio acumulado</span
                ><span><i class="legend-dot invested"></i>Total investido</span>
              </div>
            </section>`}
      </div>
      <p class="privacy-note">
        ${icon("info")} Os valores são enviados ao serviço de cálculo. O
        histórico público de simulações está desativado.
      </p>
      ${this.history.length
        ? html`<section class="panel history-panel">
            <div class="panel-heading"><h2>Histórico de simulações</h2></div>
            <div class="history-list">
              ${this.history.map(
                (item) =>
                  html`<div>
                    <time
                      >${new Date(item.created_at).toLocaleDateString(
                        "pt-BR",
                      )}</time
                    ><span>${item.months} meses</span
                    ><strong>${money(item.final_amount)}</strong>
                  </div>`,
              )}
            </div>
          </section>`
        : nothing}`;
  }
}
