import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement, icon } from "../ui";
import { tools, type Tool } from "../catalog";
@customElement("tool-card")
export class ToolCard extends LightElement {
  @property({ attribute: false }) tool!: Tool;
  render() {
    const t = this.tool;
    return html`<article class="tool-card panel">
      <div class="tool-card-top">
        <span class="tool-symbol">${icon(t.icon)}</span
        ><span class="badge">${t.category}</span>
      </div>
      <div class="tool-card-content">
        <span class="eyebrow">PLANEJAMENTO FINANCEIRO</span>
        <h2>${t.name}</h2>
        <p>${t.description}</p>
      </div>
      <div class="tool-features">
        <span>${icon("chart")} Evolução em gráfico</span
        ><span>${icon("layers")} Detalhamento mensal</span>
      </div>
      <a class="button primary" href=${t.href}
        >Abrir calculadora ${icon("arrow")}</a
      >
    </article>`;
  }
}
@customElement("home-page")
export class HomePage extends LightElement {
  @property({ type: Boolean }) catalogOnly = false;
  render() {
    return html`<section class="home-intro">
        <div>
          <p class="eyebrow">
            ${this.catalogOnly ? "BIBLIOTECA 2T" : "SEU PONTO DE PARTIDA"}
          </p>
          <h1>
            ${this.catalogOnly
              ? html`Ferramentas para<br />ir direto ao ponto.`
              : html`Suas ferramentas.<br /><span>Um só lugar.</span>`}
          </h1>
          <p class="page-description">
            Utilidades digitais para organizar ideias, explorar
            possibilidades<br class="desktop-break" />
            e tomar decisões com mais clareza.
          </p>
          <a class="text-link" href="#/calculadora"
            >Começar uma simulação ${icon("arrow")}</a
          >
        </div>
        <div class="home-graphic" aria-hidden="true">
          <div class="graphic-grid"></div>
          <span class="graphic-label">MENOS COMPLICAÇÃO. MAIS CLAREZA.</span>
          <div class="graphic-mark">2T<span>FERRAMENTAS</span></div>
          <span class="graphic-coordinate">IDEIA → ANÁLISE → DECISÃO</span>
        </div>
      </section>
      <div class="section-heading">
        <div>
          <p class="eyebrow">EXPLORE A PLATAFORMA</p>
          <h2>Suas ferramentas disponíveis</h2>
        </div>
        <span class="count-label">${tools.length} ferramenta</span>
      </div>
      <div class="home-grid">
        <div class="tool-grid">
          ${tools.map((tool) => html`<tool-card .tool=${tool}></tool-card>`)}
        </div>
        <aside class="guide-panel">
          <span class="eyebrow">UM JEITO MAIS SIMPLES</span>
          <h2>Da pergunta<br />à próxima decisão.</h2>
          <ol class="guide-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Escolha sua ferramenta</h3>
                <p>Encontre uma utilidade para o que você precisa resolver.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Explore seus cenários</h3>
                <p>Ajuste os parâmetros e compare possibilidades reais.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Enxergue os detalhes</h3>
                <p>Veja resultados organizados, do resumo à evolução mensal.</p>
              </div>
            </li>
          </ol>
        </aside>
      </div>
      <section class="platform-note">
        ${icon("grid")}
        <div>
          <h2>Um espaço para o que vem a seguir.</h2>
          <p>
            A biblioteca começa com finanças e está organizada para receber
            novas ferramentas de dados, produtividade e utilidades.
          </p>
        </div>
        <span class="note-tag">EM EVOLUÇÃO</span>
      </section>`;
  }
}
