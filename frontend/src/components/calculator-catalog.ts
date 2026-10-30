import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { LightElement, icon } from "../ui";
import { tools, type Tool } from "../catalog";

@customElement("tool-card")
export class ToolCard extends LightElement {
  @property({ attribute: false }) tool!: Tool;
  @property({ type: Number }) index = 1;
  render() {
    const tool = this.tool;
    return html`<article class="tool-card">
      <div class="tool-card-content">
        <span class="tool-category">${icon(tool.icon)} ${tool.category}</span><h2>${tool.name}</h2>
        <p>${tool.description}</p>
      </div>
      <a class="tool-access" href=${tool.href} aria-label=${tool.id === 'compound' ? 'Abrir calculadora' : `Abrir ${tool.name}`}
        ><span>Abrir ferramenta</span
        ><span class="tool-arrow">${icon("arrow")}</span></a
      >
    </article>`;
  }
}
@customElement("calculator-catalog")
export class CalculatorCatalog extends LightElement {
  @state() private search = '';
  @state() private category = 'Todas';
  render() {
    const found = tools.filter(tool => (this.category === 'Todas' || tool.category === this.category) && `${tool.name} ${tool.category}`.toLocaleLowerCase('pt-BR').includes(this.search.trim().toLocaleLowerCase('pt-BR')));
    return html`<section class="home-intro"><h1>Calculadoras</h1><label class="catalog-search">Buscar calculadora<input type="search" placeholder="Nome ou categoria" .value=${this.search} @input=${(event: Event) => this.search = (event.target as HTMLInputElement).value}></label></section>
      <div class="category-filters" role="group" aria-label="Filtrar por categoria">${['Todas', ...new Set(tools.map(tool => tool.category))].map(category => html`<button type="button" class="button secondary" aria-pressed=${this.category === category} @click=${() => this.category = category}>${category}</button>`)}</div>
      <section class="tool-collection" aria-label="Ferramentas disponíveis">
        ${found.map(
          (tool, index) =>
            html`<tool-card .tool=${tool} .index=${index + 1}></tool-card>`,
        )}
        ${found.length ? '' : html`<p role="status">Nenhuma calculadora encontrada.</p>`}
      </section> `;
  }
}
