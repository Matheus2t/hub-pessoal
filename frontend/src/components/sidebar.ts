import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement } from "../ui";
import { teams, type Team } from "../sports";
import "./team-shortcuts";
import type { Page } from "../catalog";

const toolPages: Page[] = ["call", "catalog", "calculator", "simple", "price", "sac", "retirement", "housing", "amortization", "clt", "market", "fixedIncome", "learn", "learnEn", "learnRu", "learnInvalid"];

@customElement("app-sidebar")
export class AppSidebar extends LightElement {
  @property() page: Page = "overview";

  private closeOnEscape(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    const menu = event.currentTarget as HTMLDetailsElement;
    menu.open = false;
    menu.querySelector<HTMLElement>("summary")?.focus();
  }

  private keepOneMenuOpen(event: Event) {
    const current = event.currentTarget as HTMLDetailsElement;
    if (!current.open) return;
    this.querySelectorAll<HTMLDetailsElement>(".areas-menu,.teams-menu")
      .forEach(menu => { if (menu !== current) menu.open = false; });
  }

  render() {
    return html`<nav aria-label="Navegação principal">
      <a class="nav-item" href="#/" aria-current=${this.page === "overview" ? "page" : "false"}>Início</a>
      <details class="areas-menu" @keydown=${this.closeOnEscape} @toggle=${this.keepOneMenuOpen}>
        <summary class="nav-item" aria-current=${toolPages.includes(this.page) ? "page" : "false"}>Áreas</summary>
        <div class="areas-list" aria-label="Áreas da plataforma">
          <a href="#/call" aria-current=${this.page === "call" ? "page" : "false"}>Call</a>
          <a href="#/calculadoras" aria-current=${this.page === "catalog" || ["calculator", "simple", "price", "sac", "retirement", "housing", "amortization", "clt"].includes(this.page) ? "page" : "false"}>Calculadoras</a>
          <a href="#/acoes" aria-current=${this.page === "market" ? "page" : "false"}>Mercado de Ações</a>
          <a href="#/renda-fixa" aria-current=${this.page === "fixedIncome" ? "page" : "false"}>Renda Fixa</a>
          <a href="#/learn" aria-current=${["learn", "learnEn", "learnRu", "learnInvalid"].includes(this.page) ? "page" : "false"}>Learn / Изучать</a>
        </div>
      </details>
      <a class="nav-item" href="#/games" aria-current=${this.page === "games" ? "page" : "false"}>Games</a>
      <details class="teams-menu" @keydown=${this.closeOnEscape} @toggle=${this.keepOneMenuOpen}>
        <summary class="nav-item" aria-current=${["76ers", "spfc", "barcelona", "sports"].includes(this.page) ? "page" : "false"}>Times</summary>
        <team-shortcuts .page=${this.page}></team-shortcuts>
      </details>
      <div class="nav-team-icons" role="group" aria-label="Acesso direto aos times">
        ${(Object.keys(teams) as Team[]).map(team => html`<a class="nav-team-icon" href=${`#/${team}`} title=${teams[team].name} aria-label=${teams[team].name} aria-current=${this.page === team ? "page" : "false"}><span class="team-crest-frame" data-team=${team}><img src=${teams[team].crest} alt="" width="28" height="28" decoding="async" /></span></a>`)}
      </div>
    </nav>`;
  }
}
