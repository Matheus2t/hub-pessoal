import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement, icon } from "../ui";

@customElement("app-topbar")
export class AppTopbar extends LightElement {
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
      </div>
    </div>`;
  }
}
