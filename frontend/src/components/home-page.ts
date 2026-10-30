import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement, icon } from "../ui";
import { tools, type Tool } from "../catalog";

@customElement("tool-card")
export class ToolCard extends LightElement {
  @property({ attribute: false }) tool!: Tool;
  @property({ type: Number }) index = 1;
  render() {
    const tool = this.tool;
    return html`<article class="tool-card">
      <span class="tool-index">${String(this.index).padStart(2, "0")}</span>
      <div class="tool-card-content">
        <span class="eyebrow">${tool.category} / Simulador</span>
        <h2>${tool.name}</h2>
        <p>${tool.description}</p>
        <div class="tool-features">
          <span>Evolução em gráfico</span><span>Detalhamento mensal</span>
        </div>
      </div>
      <a class="tool-access" href=${tool.href} aria-label="Abrir calculadora"
        ><span>Abrir ferramenta</span
        ><span class="tool-arrow">${icon("arrow")}</span></a
      >
    </article>`;
  }
}
@customElement("home-page")
export class HomePage extends LightElement {
  @property({ type: Boolean }) catalogOnly = false;
  render() {
    return html`<section class="home-intro">
        <div class="intro-caption">
          <span class="eyebrow">2T / FERRAMENTAS DIGITAIS</span
          ><span class="intro-edition">Simples por escolha.</span>
        </div>
        <div class="intro-composition">
          <h1>
            ${this.catalogOnly
              ? html`O que você<br /><em>precisa resolver.</em>`
              : html`Menos ruído.<br /><em>Mais clareza.</em>`}
          </h1>
          <div class="intro-aside">
            <span class="intro-rule"></span>
            <p>Boas ferramentas deixam<br />espaço para o que importa.</p>
            <p class="page-description">
              Um lugar para explorar cenários, entender seus números e decidir
              com mais informação.
            </p>
            <a class="text-link" href="#/calculadora"
              >Começar uma simulação ${icon("arrow")}</a
            >
          </div>
        </div>
      </section>
      <section class="tool-collection" aria-labelledby="collection-title">
        <div class="section-heading">
          <h2 id="collection-title">Ferramentas disponíveis</h2>
          <span class="count-label"
            >${String(tools.length).padStart(2, "0")} / Finanças</span
          >
        </div>
        ${tools.map(
          (tool, index) =>
            html`<tool-card .tool=${tool} .index=${index + 1}></tool-card>`,
        )}
      </section>
      <section class="editorial-note">
        <p class="eyebrow">FEITA PARA SER ÚTIL</p>
        <div>
          <h2>
            Uma pergunta de cada vez.<br /><em>Uma decisão mais clara.</em>
          </h2>
          <p>
            Comece com os juros compostos: defina os valores, acompanhe a
            evolução e confira cada mês. Sem cadastro. No seu ritmo.
          </p>
        </div>
        <div class="editorial-facts">
          <span><b>01</b>Informe seus parâmetros</span
          ><span><b>02</b>Explore o resultado</span
          ><span><b>03</b>Consulte os detalhes</span>
        </div>
      </section>`;
  }
}
