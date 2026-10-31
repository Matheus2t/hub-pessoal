import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement } from "../ui";

@customElement("home-page")
export class HomePage extends LightElement {
  render() { return html`<section class="platform-intro"><p class="platform-name">2T</p><h1>Ferramentas e mercado.</h1><p>Cálculos financeiros e consulta ao mercado brasileiro.</p></section><section class="platform-areas" aria-label="Áreas disponíveis"><a class="tool-card" href="#/calculadoras"><div><h2>Calculadoras</h2><p>Investimentos e financiamentos.</p></div><span aria-hidden="true">→</span></a><a class="tool-card" href="#/acoes"><div><h2>Mercado de Ações</h2><p>Empresas da B3, gráficos e análise financeira.</p></div><span aria-hidden="true">→</span></a></section>`; }
}
