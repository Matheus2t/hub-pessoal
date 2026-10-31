import { html } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { currentPage, pages } from "../catalog";
import "./sidebar";
import "./topbar";
import "./home-page";
import "./calculator-catalog";
import "./compound-calculator";
import "./finance-calculator";
import "./market-page";

@customElement("app-shell")
export class AppShell extends LightElement {
  @state() private page = currentPage();
  @state() private route = location.hash;
  private normalizeRoute() {
    if (["#/ferramentas"].includes(location.hash))
      history.replaceState(null, "", "#/calculadoras");
  }
  private navigate = () => {
    this.normalizeRoute();
    this.page = currentPage();
    this.route = location.hash;
    document.title = `${pages[this.page].title} · 2T — Ferramentas`;
    window.scrollTo({ top: 0 });
    void this.updateComplete.then(() => this.querySelector<HTMLElement>("#content")?.focus());
  };
  connectedCallback() {
    super.connectedCallback();
    this.normalizeRoute();
    this.page = currentPage();
    document.title = `${pages[this.page].title} · 2T — Ferramentas`;
    window.addEventListener("hashchange", this.navigate);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("hashchange", this.navigate);
  }
  render() {
    return html`<a class="skip-link" href="#content" @click=${(event: Event) => { event.preventDefault(); this.querySelector<HTMLElement>("#content")?.focus(); }}>Pular para o conteúdo</a>
      <div class="app-layout">
        <header class="masthead">
          <a class="brand" href="#/" aria-label="2T — início"><img src="/2t-mark.svg" width="32" height="32" alt="" /><strong>Ferramentas</strong></a>
          <app-sidebar .page=${this.page}></app-sidebar>
          <app-topbar></app-topbar>
        </header>
        <main id="content" tabindex="-1" class="main-content">
          ${this.page !== "overview" ? html`<nav class="breadcrumbs" aria-label="Caminho da página"><a href="#/">Início</a><span aria-hidden="true">/</span>${['calculator','simple','price','sac'].includes(this.page) ? html`<a href="#/calculadoras">Calculadoras</a><span aria-hidden="true">/</span>` : ''}<span aria-current="page">${pages[this.page].title}</span></nav>` : ""}
          ${this.page === 'overview' ? html`<home-page></home-page>` : ''}
          ${this.page === 'catalog' ? html`<calculator-catalog title="Calculadoras"></calculator-catalog>` : ''}
          ${this.page === 'market' ? keyed(this.route, html`<market-page .symbol=${this.route.startsWith('#/acoes/') ? this.route.slice(8).toUpperCase() : ''}></market-page>`) : ''}
          <compound-calculator ?hidden=${this.page !== "calculator"}></compound-calculator>
          ${["simple", "price", "sac"].includes(this.page) ? keyed(this.page, html`<finance-calculator .kind=${this.page}></finance-calculator>`) : ""}
          <footer class="page-footer"><span>2T</span><span>matheus2t.com.br</span></footer>
        </main>
      </div>`;
  }
}
