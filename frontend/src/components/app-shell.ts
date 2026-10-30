import { html } from "lit";
import { keyed } from 'lit/directives/keyed.js';
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { currentPage, pages } from "../catalog";
import "./sidebar";
import "./topbar";
import "./home-page";
import "./calculator-catalog";
import "./compound-calculator";
import "./finance-calculator";
@customElement("app-shell")
export class AppShell extends LightElement {
  @state() private page = currentPage();
  @state() private menuOpen = false;
  private navigate = () => {
    this.normalizeRoute();
    this.page = currentPage();
    this.menuOpen = false;
    document.title = `${pages[this.page].title} · 2T — Ferramentas`;
    window.scrollTo({ top: 0 });
    void this.updateComplete.then(() =>
      this.querySelector<HTMLElement>("#content")?.focus(),
    );
  };
  private keyboard = (event: KeyboardEvent) => {
    if (!this.menuOpen) return;
    if (event.key === "Escape") {
      this.menuOpen = false;
      this.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
    }
    if (event.key === "Tab") {
      const items = Array.from(
        this.querySelectorAll<HTMLElement>("#sidebar a, .mobile-menu"),
      );
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index === 0) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault();
        items[0]?.focus();
      }
    }
  };
  connectedCallback() {
    super.connectedCallback();
    this.normalizeRoute();
    this.page = currentPage();
    document.title = `${pages[this.page].title} · 2T — Ferramentas`;
    window.addEventListener("hashchange", this.navigate);
    window.addEventListener("keydown", this.keyboard);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("hashchange", this.navigate);
    window.removeEventListener("keydown", this.keyboard);
    document.body.style.overflow = "";
  }
  protected updated() {
    document.body.style.overflow = this.menuOpen ? "hidden" : "";
  }
  private normalizeRoute() {
    if (location.hash === '#/ferramentas') history.replaceState(null, '', '#/calculadoras');
  }
  render() {
    return html`<a
        class="skip-link"
        href="#content"
        @click=${(e: Event) => {
          e.preventDefault();
          this.querySelector<HTMLElement>("#content")?.focus();
        }}
        >Pular para o conteúdo</a
      >
      <div class="app-layout ${this.menuOpen ? "menu-open" : ""}">
        <header class="masthead">
          <a class="brand" href="#/" aria-label="2T — início"
            ><img src="/2t-mark.svg" width="44" height="44" alt="" /><span
              ><strong>Ferramentas</strong><small>POR MATHEUS / 2T</small></span
            ></a
          >
          <aside id="sidebar" class="sidebar" aria-label="Menu da plataforma">
            <app-sidebar .page=${this.page === 'overview' ? 'overview' : 'tools'}></app-sidebar>
          </aside>
          <app-topbar
            .page=${this.page}
            .menuOpen=${this.menuOpen}
            @menu-toggle=${() => (this.menuOpen = !this.menuOpen)}
          ></app-topbar>
        </header>
        ${this.menuOpen
          ? html`<button
              class="menu-scrim"
              tabindex="-1"
              aria-label="Fechar menu"
              @click=${() => (this.menuOpen = false)}
            ></button>`
          : ""}
        <div class="app-body">
          <main
            id="content"
            tabindex="-1"
            class="main-content"
            ?inert=${this.menuOpen}
          >
            ${this.page !== 'overview' ? html`<nav class="breadcrumbs" aria-label="Caminho da página"><a href="#/">Início</a><span aria-hidden="true">/</span>${this.page === 'tools' ? html`<span aria-current="page">Calculadoras</span>` : html`<a href="#/calculadoras">Calculadoras</a><span aria-hidden="true">/</span><span aria-current="page">${pages[this.page].title}</span>`}</nav>` : ''}
            <home-page ?hidden=${this.page !== 'overview'}></home-page>
            ${this.page === 'tools' ? html`<calculator-catalog></calculator-catalog>` : ''}
            <compound-calculator
              ?hidden=${this.page !== "calculator"}
            ></compound-calculator>
            ${['simple', 'price', 'sac'].includes(this.page) ? keyed(this.page, html`<finance-calculator .kind=${this.page}></finance-calculator>`) : ''}
            <footer class="page-footer">
              <span class="footer-signature"
                ><strong>2T</strong
                ><span>Ferramentas</span></span
              ><span>MATHEUS2T.COM.BR</span>
            </footer>
          </main>
        </div>
      </div>`;
  }
}
