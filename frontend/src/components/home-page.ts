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
      
      <div class="tool-card-content">
        
        <h2>${tool.name}</h2>
        <p>${tool.description}</p>
        
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
    return html`<section class="home-intro"><h1>Ferramentas</h1></section><section class="tool-collection" aria-labelledby="collection-title">
        
        ${tools.map(
          (tool, index) =>
            html`<tool-card .tool=${tool} .index=${index + 1}></tool-card>`,
        )}
      </section>
      `;
  }
}
