import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { LightElement, icon } from "../ui";
import { filterTools, getCategories, type Tool } from "../catalog";

@customElement("tool-card")
export class ToolCard extends LightElement {
  @property({ attribute: false }) tool!: Tool;
  render() {
    const tool = this.tool;
    return html`<a class="tool-card" href=${tool.href} aria-label=${tool.id === 'compound' ? 'Abrir calculadora' : `Abrir ${tool.name}`}>
      <div class="tool-card-content">
        <h2>${tool.name}</h2>
        <p>${tool.description}</p>
      </div>
      <span class="tool-arrow" aria-hidden="true">${icon("arrow")}</span>
    </a>`;
  }
}
@customElement("calculator-catalog")
export class CalculatorCatalog extends LightElement {
  @state() private search = '';
  @state() private category = 'Calculadoras';
  render() {
    const found = filterTools(this.category, this.search);
    return html`<section class="home-intro"><h1>Ferramentas</h1><label class="catalog-search">Buscar calculadora<input type="search" placeholder="Nome ou categoria" .value=${this.search} @input=${(event: Event) => this.search = (event.target as HTMLInputElement).value}></label></section>
      <div class="category-filters" role="group" aria-label="Filtrar por categoria">${getCategories().map(category => html`<button type="button" class="button secondary" aria-pressed=${this.category === category} @click=${() => this.category = category}>${category}</button>`)}</div>
      <section class="tool-collection" aria-label="Ferramentas disponíveis">
        ${found.map(
          (tool) =>
            html`<tool-card .tool=${tool}></tool-card>`,
        )}
        ${found.length ? '' : html`<p role="status">Nenhuma calculadora encontrada.</p>`}
      </section> `;
  }
}
