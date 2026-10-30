import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement } from "../ui";
import type { Page } from "../catalog";

@customElement("app-sidebar")
export class AppSidebar extends LightElement {
  @property() page: Page = "overview";
  render() {
    return html`<nav aria-label="Navegação principal"><a class="nav-item" href="#/" aria-current=${this.page === "overview" ? "page" : "false"}>Início</a><a class="nav-item" href="#/calculadoras" aria-current=${['catalog', 'calculator', 'simple', 'price', 'sac'].includes(this.page) ? 'page' : 'false'}>Calculadoras</a><a class="nav-item" href="#/acoes" aria-current=${this.page === 'market' ? 'page' : 'false'}>Ações</a></nav>`;
  }
}
