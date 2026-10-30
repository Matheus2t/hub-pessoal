import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { LightElement, icon } from "../ui";
import { pages, type Page } from "../catalog";
@customElement("app-topbar")
export class AppTopbar extends LightElement {
  @property() page: Page = "overview";
  @property({ type: Boolean }) menuOpen = false;
  @state() private theme = document.documentElement.dataset.theme || "dark";
  private toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = this.theme;
    try {
      localStorage.setItem("2t:theme", this.theme);
    } catch {
      /* Optional browser preference. */
    }
  }
  render() {
    return html`<div class="topbar">
      <span class="topbar-page">${pages[this.page].title}</span>
      <div class="topbar-actions">
        <button
          class="icon-button theme-toggle"
          @click=${this.toggleTheme}
          aria-label=${this.theme === "dark"
            ? "Ativar tema claro"
            : "Ativar tema escuro"}
          title="Alternar tema"
        >
          ${icon(this.theme === "dark" ? "sun" : "moon")}
        </button>
        <button
          class="icon-button mobile-menu"
          aria-label=${this.menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded=${this.menuOpen}
          aria-controls="sidebar"
          @click=${() =>
            this.dispatchEvent(
              new CustomEvent("menu-toggle", { bubbles: true }),
            )}
        >
          ${icon(this.menuOpen ? "close" : "menu")}
        </button>
      </div>
    </div>`;
  }
}
