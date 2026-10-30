import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { LightElement, money, icon } from "../ui";
import type { EvolutionRow } from "../types";
@customElement("results-table")
export class ResultsTable extends LightElement {
  @property({ attribute: false }) rows: EvolutionRow[] = [];
  @state() private page = 0;
  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has("rows")) this.page = 0;
  }
  render() {
    const count = 12,
      pages = Math.ceil(this.rows.length / count),
      rows = this.rows.slice(this.page * count, (this.page + 1) * count);
    return html`<details class="panel results-details">
      <summary>
        <span class="summary-title"
          ><span class="section-index">03</span
          ><span
            >Detalhamento mensal<small
              >Consulte os valores de cada mês da simulação</small
            ></span
          ></span
        ><span class="details-chevron">${icon("chevron")}</span>
      </summary>
      <div
        class="table-scroll"
        tabindex="0"
        role="region"
        aria-label="Evolução mensal, role horizontalmente para ver todas as colunas"
      >
        <table>
          <caption class="sr-only">
            Evolução mensal do investimento em reais
          </caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Aporte</th>
              <th scope="col">Juros do período</th>
              <th scope="col">Total investido</th>
              <th scope="col">Saldo acumulado</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (row) =>
                html`<tr>
                  <th scope="row">${String(row.month).padStart(2, "0")}</th>
                  <td>${money(row.deposit)}</td>
                  <td class="positive-text">${money(row.interest)}</td>
                  <td>${money(row.invested)}</td>
                  <td class="balance-cell">${money(row.balance)}</td>
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
      <div class="table-pagination">
        <span
          >Meses
          ${this.page * count + 1}–${Math.min(
            (this.page + 1) * count,
            this.rows.length,
          )}
          de ${this.rows.length}</span
        >
        <div>
          <button
            class="button secondary"
            ?disabled=${this.page === 0}
            @click=${() => this.page--}
          >
            Anterior</button
          ><span>${this.page + 1} / ${pages}</span
          ><button
            class="button secondary"
            ?disabled=${this.page >= pages - 1}
            @click=${() => this.page++}
          >
            Próxima
          </button>
        </div>
      </div>
    </details>`;
  }
}
