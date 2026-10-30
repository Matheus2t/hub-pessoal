import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement } from "../ui";
import "./calculator-catalog";

@customElement("home-page")
export class HomePage extends LightElement {
  render() { return html`<calculator-catalog></calculator-catalog><a class="market-entry" href="#/acoes"><strong>Mercado de Ações</strong><span>Consultar ações da B3 →</span></a>`; }
}
