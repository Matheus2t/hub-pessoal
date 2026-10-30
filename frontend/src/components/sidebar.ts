import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement } from "../ui";
import type { Page } from "../catalog";

@customElement("app-sidebar")
export class AppSidebar extends LightElement {
  @property() page: Page = "overview";
  render() {
    const links: { page: Page; href: string; label: string; index: string }[] =
      [
        { page: "overview", href: "#/", label: "Visão geral", index: "01" },
        {
          page: "tools",
          href: "#/ferramentas",
          label: "Ferramentas",
          index: "02",
        },
        {
          page: "calculator",
          href: "#/calculadora",
          label: "Juros compostos",
          index: "03",
        },
      ];
    return html`<nav aria-label="Navegação principal">
      ${links.map(
        (link) =>
          html`<a
            class="nav-item ${this.page === link.page ? "is-active" : ""}"
            href=${link.href}
            aria-current=${this.page === link.page ? "page" : "false"}
            ><span class="nav-number" aria-hidden="true">${link.index}</span
            ><span>${link.label}</span></a
          >`,
      )}<span class="mobile-nav-note"
        >2T — Ferramentas digitais<br />matheus2t.com.br</span
      >
    </nav>`;
  }
}
