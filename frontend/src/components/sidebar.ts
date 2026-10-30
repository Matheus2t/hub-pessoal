import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement, icon } from "../ui";
import type { Page } from "../catalog";
@customElement("app-sidebar")
export class AppSidebar extends LightElement {
  @property() page: Page = "overview";
  render() {
    const link = (
      page: Page,
      href: string,
      name: string,
      glyph: "home" | "grid" | "calculator",
    ) =>
      html`<a
        class="nav-item ${this.page === page ? "is-active" : ""}"
        href=${href}
        aria-current=${this.page === page ? "page" : "false"}
        >${icon(glyph)}<span>${name}</span>${this.page === page
          ? html`<span class="nav-indicator"></span>`
          : ""}</a
      >`;
    return html`<div class="sidebar-inner">
      <a class="brand" href="#/" aria-label="2T — início"
        ><img src="/2t-mark.svg" width="40" height="40" alt="" /><span
          ><strong>2T<span class="brand-divider">/</span>Ferramentas</strong
          ><small>Clareza para o seu dia a dia</small></span
        ></a
      >
      <div class="nav-label">PLATAFORMA</div>
      <nav aria-label="Navegação principal">
        ${link("overview", "#/", "Visão geral", "home")}${link(
          "tools",
          "#/ferramentas",
          "Ferramentas",
          "grid",
        )}
        <div class="nav-label nav-section">FINANÇAS</div>
        ${link("calculator", "#/calculadora", "Juros compostos", "calculator")}
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note">
          ${icon("layers")}<strong>O essencial, bem resolvido.</strong>
          <p>Ferramentas práticas para transformar números em decisões.</p>
        </div>
        <div class="sidebar-footer">
          <span class="mini-mark">2T</span
          ><span>matheus2t.com.br<small>Ferramentas digitais</small></span>
        </div>
      </div>
    </div>`;
  }
}
