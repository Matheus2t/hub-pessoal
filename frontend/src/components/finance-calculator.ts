import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement, money, parseBrazilian } from '../ui';
import { apiUrl } from '../config';
import type { CalculationResult } from '../types';
import './unit-select';
import './form-field';
import './metric-card';
import './evolution-chart';
import './results-table';

type LoanRow = { month: number; payment: string; amortization: string; interest: string; balance: string };
type LoanResult = { total_paid: string; total_interest: string; first_payment: string; last_payment: string; schedule: LoanRow[] };
@customElement('finance-calculator')
export class FinanceCalculator extends LightElement {
  @property() kind: 'simple' | 'price' | 'sac' = 'simple';
  @state() private values = { capital: '1.000,00', rate: '1', periods: '12' };
  @state() private periodUnit = 'months';
  @state() private rateUnit = 'monthly';
  @state() private error = '';
  @state() private loading = false;
  @state() private stale = false;
  @state() private result?: CalculationResult | LoanResult;
  @state() private tablePage = 0;
  private controller?: AbortController;
  disconnectedCallback() { super.disconnectedCallback(); this.controller?.abort(); }
  protected willUpdate(changes: Map<PropertyKey, unknown>) {
    if (changes.has('kind')) { this.controller?.abort(); this.result = undefined; this.error = ''; this.stale = false; this.tablePage = 0; }
  }
  private changed() { this.stale = !!this.result; this.error = ''; }
  private async calculate(event: Event) {
    event.preventDefault();
    if (this.loading) return;
    const capital = parseBrazilian(this.values.capital), rate = parseBrazilian(this.values.rate), periods = parseBrazilian(this.values.periods);
    if (!Number.isFinite(capital) || capital <= 0 || capital > 1e9 || Math.abs(capital * 100 - Math.round(capital * 100)) > 0.0001) this.error = 'Informe um capital entre R$ 0,01 e R$ 1 bilhão, com até duas casas decimais.';
    else if (!Number.isFinite(rate) || rate < 0 || rate > 100) this.error = 'Informe uma taxa entre 0% e 100%.';
    else if (!Number.isInteger(periods) || periods < 1 || periods > (this.periodUnit === 'years' ? 50 : 600)) this.error = 'Informe de 1 a 600 meses ou de 1 a 50 anos inteiros.';
    else this.error = '';
    if (this.error) return;
    this.loading = true;
    this.controller = new AbortController();
    const timer = setTimeout(() => this.controller?.abort(), 30000);
    try {
      const response = await fetch(apiUrl(`/api/finance/${this.kind}`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: this.controller.signal,
        body: JSON.stringify({ capital, rate, periods, period_unit: this.periodUnit, rate_unit: this.rateUnit }) });
      if (!response.ok) throw new Error(response.status === 422 ? 'Revise os valores informados.' : 'Não foi possível calcular. Tente novamente.');
      this.result = await response.json(); this.stale = false; this.tablePage = 0;
    } catch (error) { this.error = error instanceof Error && error.name !== 'AbortError' ? error.message : 'O serviço demorou a responder. Tente novamente.'; }
    finally { clearTimeout(timer); this.loading = false; }
  }
  render() {
    const simple = this.kind === 'simple';
    const title = simple ? 'Juros simples' : `Financiamento ${this.kind.toUpperCase()}`;
    const result = this.result;
    const loan = result && 'schedule' in result ? result : undefined;
    const investment = result && 'evolution' in result ? result : undefined;
    return html`<div class="page-heading"><div><h1>${title}</h1><p class="calculator-lead">${simple ? 'Simule o crescimento do capital sem juros sobre juros.' : this.kind === 'price' ? 'Calcule parcelas constantes e o custo total do financiamento.' : 'Projete parcelas decrescentes e a amortização do saldo.'}</p></div></div>
      <section class="panel simulation-panel" aria-label="Simulação">
        <div class="panel-heading"><h2>Simulação</h2></div>
        <form novalidate @submit=${this.calculate} @field-input=${(event: CustomEvent) => { this.values = { ...this.values, [event.detail.name]: event.detail.value }; this.changed(); }}>
          <div class="unit-controls" @unit-change=${(event: CustomEvent) => { if (event.detail.name === 'period') this.periodUnit = event.detail.value; else this.rateUnit = event.detail.value; this.changed(); }}>
            <unit-select label="Taxa informada" name="rate" .value=${this.rateUnit} .disabled=${this.loading} .options=${[['monthly', 'Mensal'], ['annual', 'Anual']]}></unit-select>
            <unit-select label="Período em" name="period" .value=${this.periodUnit} .disabled=${this.loading} .options=${[['months', 'Meses'], ['years', 'Anos']]}></unit-select>
          </div>
          <div class="form-grid finance-fields">
            <form-field name="capital" .label=${simple ? 'Capital inicial' : 'Valor financiado'} unit="R$" .value=${this.values.capital} .disabled=${this.loading}></form-field>
            <form-field name="rate" .label=${this.rateUnit === 'monthly' ? 'Taxa mensal' : 'Taxa anual'} unit="%" .value=${this.values.rate} .disabled=${this.loading}></form-field>
            <form-field name="periods" label="Prazo" .unit=${this.periodUnit === 'years' ? 'anos' : 'meses'} .integer=${true} .value=${this.values.periods} .disabled=${this.loading}></form-field>
          </div>
          <div class="form-bottom"><p class="form-note">${simple ? 'Juros sobre o capital inicial, sem aportes.' : 'Primeira parcela após um mês. Sem tarifas, seguros ou IOF.'}</p><button class="button primary" ?disabled=${this.loading}>${this.loading ? 'Calculando…' : 'Calcular'}</button></div>
          ${this.error ? html`<p class="message error" role="alert">${this.error}</p>` : nothing}
        </form>
      </section>
      <div aria-live="polite" aria-busy=${this.loading}>
        ${result ? html`<div class="section-heading result-heading"><h2>Resultados</h2><span class="result-status">${this.stale ? 'Valores alterados. Calcule novamente.' : 'Simulação concluída'}</span></div>
          <div class="metrics-grid">
            <metric-card tone="accent" .label=${simple ? 'Valor final' : 'Total a pagar'} .value=${investment?.final_amount ?? loan?.total_paid}></metric-card>
            <metric-card .label=${simple ? 'Capital inicial' : 'Primeira parcela'} .value=${investment?.total_invested ?? loan?.first_payment}></metric-card>
            <metric-card label="Juros totais" .value=${result.total_interest}></metric-card>
          </div>
          ${investment ? html`<evolution-chart .rows=${investment.evolution}></evolution-chart><results-table .rows=${investment.evolution}></results-table>` : nothing}
          ${loan ? html`<p class="disclaimer">Última parcela: ${money(loan.last_payment)}. ${this.kind === 'price' ? 'Parcelas fixas, com ajuste de centavos na última.' : 'Amortização constante, com ajuste de centavos na última parcela.'}</p>
            <section class="panel table-panel"><details class="results-details"><summary>Parcelas e saldo devedor</summary><div class="table-scroll" tabindex="0" role="region" aria-label="Tabela de amortização"><table><thead><tr><th scope="col">Mês</th><th scope="col">Parcela</th><th scope="col">Amortização</th><th scope="col">Juros</th><th scope="col">Saldo devedor</th></tr></thead><tbody>${loan.schedule.slice(this.tablePage * 12, this.tablePage * 12 + 12).map(row => html`<tr><td>${row.month}</td><td>${money(row.payment)}</td><td>${money(row.amortization)}</td><td>${money(row.interest)}</td><td>${money(row.balance)}</td></tr>`)}</tbody></table></div><div class="table-pagination"><button type="button" class="button secondary" ?disabled=${this.tablePage === 0} @click=${() => this.tablePage--}>Anterior</button><span>Página ${this.tablePage + 1} de ${Math.ceil(loan.schedule.length / 12)}</span><button type="button" class="button secondary" ?disabled=${(this.tablePage + 1) * 12 >= loan.schedule.length} @click=${() => this.tablePage++}>Próxima</button></div></details></section>` : nothing}
          <p class="disclaimer">Estimativa matemática com a taxa informada. Não inclui impostos ou inflação e não garante rendimentos.</p>` : html`<section class="panel calculator-empty"><div><h2>Resultados</h2><p>Preencha os campos e calcule.</p></div></section>`}
      </div><p class="privacy-note">Valores enviados à API apenas para cálculo. Histórico público desativado.</p>`;
  }
}
