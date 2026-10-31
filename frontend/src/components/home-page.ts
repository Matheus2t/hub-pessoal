import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement } from "../ui";

@customElement("home-page")
export class HomePage extends LightElement {
  render() {
    return html`
      <section class="platform-intro">
        <h1>Um lugar pra reunir<br><span>o que eu crio e uso.</span></h1>
        <div class="platform-lead"><p>Comecei com calculadoras e ações. O resto vou adicionando conforme precisar.</p></div>
      </section>
      <section class="platform-areas" aria-label="Áreas disponíveis">
        <a class="tool-card area-card area-calculators" href="#/calculadoras">
          <div class="area-content"><div class="area-copy"><h2>Calculadoras</h2><p>Simule juros, aportes e parcelas de financiamentos.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true" focusable="false"><path class="preview-grid" d="M10 90H190M10 60H190M10 30H190"/><path class="preview-bars" d="M24 90V78M52 90V68M80 90V55M108 90V42M136 90V24M164 90V10"/><path class="preview-line" d="M10 85C65 85 116 66 190 9"/></svg>
          </div>
          <div class="area-access"><span>Ver calculadoras</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
        <a class="tool-card area-card area-market" href="#/acoes">
          <div class="area-content"><div class="area-copy"><h2>Mercado de Ações</h2><p>Consulte empresas da B3, indicadores e gráficos.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true" focusable="false"><path class="preview-grid" d="M10 90H190M10 60H190M10 30H190"/><path class="preview-wicks" d="M25 40V90M58 15V65M91 34V91M124 20V78M157 8V60M184 24V76"/><path class="preview-candles" d="M25 55V75M58 26V48M91 49V72M124 36V60M157 20V42M184 35V58"/></svg>
          </div>
          <div class="area-access"><span>Ver ações</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
      </section>`;
  }
}
