import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement, icon } from "../ui";

@customElement("home-page")
export class HomePage extends LightElement {
  render() {
    return html`<section class="home-intro platform-intro"><div><p class="platform-name">2T</p><h1>Sua plataforma de ferramentas</h1></div></section>
      <section aria-labelledby="areas-title">
        <h2 id="areas-title" class="areas-title">Áreas disponíveis</h2>
        <div class="tool-collection platform-areas">
          <article class="tool-card">
            <div class="tool-card-content"><span class="tool-category">${icon("calculator")}</span><h2>Calculadoras</h2><p>Ferramentas para simular e calcular.</p></div>
            <a class="tool-access" href="#/calculadoras" aria-label="Explorar calculadoras"><span>Acessar</span><span class="tool-arrow">${icon("arrow")}</span></a>
          </article>
        </div>
      </section>`;
  }
}
