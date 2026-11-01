import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement, icon } from "../ui";

@customElement("home-page")
export class HomePage extends LightElement {
  render() {
    return html`
      <section class="platform-intro">
        <h1>Início</h1>
      </section>
      <section class="platform-areas" aria-label="Áreas disponíveis">
        <a class="tool-card area-card area-calculators" href="#/calculadoras"><span class="area-icon">${icon("calculator")}</span>
          <div class="area-content"><div class="area-copy"><h2>Calculadoras</h2><p>Simule juros, aportes e parcelas de financiamentos.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true" focusable="false"><path class="preview-grid" d="M10 90H190M10 60H190M10 30H190"/><path class="preview-bars" d="M24 90V78M52 90V68M80 90V55M108 90V42M136 90V24M164 90V10"/><path class="preview-line" d="M10 85C65 85 116 66 190 9"/></svg>
          </div>
          <div class="area-access"><span>Explorar</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
        <a class="tool-card area-card area-market" href="#/acoes"><span class="area-icon">${icon("chart")}</span>
          <div class="area-content"><div class="area-copy"><h2>Mercado de Ações</h2><p>Consulte empresas da B3, indicadores e gráficos.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true" focusable="false"><path class="preview-grid" d="M10 90H190M10 60H190M10 30H190"/><path class="preview-wicks" d="M25 40V90M58 15V65M91 34V91M124 20V78M157 8V60M184 24V76"/><path class="preview-candles" d="M25 55V75M58 26V48M91 49V72M124 36V60M157 20V42M184 35V58"/></svg>
          </div>
          <div class="area-access"><span>Explorar</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
        <a class="tool-card area-card area-fixed-income" href="#/renda-fixa"><span class="area-icon">${icon("wallet")}</span>
          <div class="area-content"><div class="area-copy"><h2>Renda Fixa</h2><p>Simule e compare CDB, LCI, LCA e Tesouro.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true" focusable="false"><path class="preview-grid" d="M10 90H190M10 60H190M10 30H190"/><path class="preview-line" d="M10 90Q90 78 190 16"/><path class="preview-wicks" stroke-dasharray="4 4" d="M10 90Q90 82 190 38"/></svg>
          </div><div class="area-access"><span>Explorar</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
        <a class="tool-card area-card area-learn" href="#/learn"><span class="area-icon">${icon("layers")}</span>
          <div class="area-content"><div class="area-copy"><h2>2T Learn</h2><p>Inglês e russo. Vocabulário, exercícios e revisões.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true"><path class="preview-line" d="M20 20h65q15 0 15 15v65q-15-12-30-12H20Zm160 0h-65q-15 0-15 15v65q15-12 30-12h50Z"/><path class="preview-grid" d="M34 40h40m-40 15h40m-40 15h30m62-30h40m-40 15h40m-40 15h30"/></svg>
          </div><div class="area-access"><span>Explorar</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
      </section>`;
  }
}
