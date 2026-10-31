import { html } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { customElement, state } from "lit/decorators.js";
import { LightElement, icon } from "../ui";
import { currentPage, pages } from "../catalog";
import "./sidebar";
import "./topbar";
import "./home-page";
import "./holiday-calendar";
import "./calculator-catalog";
import "./compound-calculator";
import "./finance-calculator";
import "./market-page";
import "./team-shortcuts";
import "./team-page";
import "./fixed-income-page";
import "../learn/host";

@customElement("app-shell")
export class AppShell extends LightElement {
  @state() private page = currentPage();
  @state() private route = location.hash;
  private openCalendar = () => {
    const dialog = this.querySelector<HTMLDialogElement>(".calendar-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  };
  private closeCalendar = () => {
    const dialog = this.querySelector<HTMLDialogElement>(".calendar-dialog");
    if (dialog?.open) dialog.close();
  };
  private normalizeRoute() {
    if (["#/ferramentas"].includes(location.hash))
      history.replaceState(null, "", "#/calculadoras");
  }
  private navigate = () => {
    this.closeCalendar();
    this.normalizeRoute();
    this.page = currentPage();
    this.route = location.hash;
    document.title = `${pages[this.page].title} · 2T`;
    window.scrollTo({ top: 0 });
    void this.updateComplete.then(() => this.querySelector<HTMLElement>("#content")?.focus());
  };
  connectedCallback() {
    super.connectedCallback();
    this.normalizeRoute();
    this.page = currentPage();
    document.title = `${pages[this.page].title} · 2T`;
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
          <a class="brand" href="#/" aria-label="2T — início"><span class="brand-logo"><img src="/2t-logo.webp" width="80" height="32" alt="" /></span></a>
          <app-sidebar .page=${this.page}></app-sidebar>
          <team-shortcuts .page=${this.page}></team-shortcuts>
          <app-topbar></app-topbar>
        </header>
        <main id="content" tabindex="-1" class="main-content">
          ${this.page !== "overview" ? html`<nav class="breadcrumbs" aria-label="Caminho da página"><a href="#/">Início</a><span aria-hidden="true">/</span>${['calculator','simple','price','sac'].includes(this.page) ? html`<a href="#/calculadoras">Calculadoras</a><span aria-hidden="true">/</span>` : ''}${this.page.startsWith('learn')&&this.page!=='learn'?html`<a href="#/learn">2T Learn</a><span aria-hidden="true">/</span>`:''}<span aria-current="page">${pages[this.page].title}</span></nav>` : ""}
          ${this.page.startsWith('learn') ? html`<learn-host .language=${this.page==='learnEn'?'en':this.page==='learnRu'?'ru':''} .invalid=${this.page==='learnInvalid'}></learn-host>` : ''}
          ${this.page === 'overview' ? html`<home-page></home-page>` : ''}
          ${this.page === 'fixedIncome' ? html`<fixed-income-page></fixed-income-page>` : ''}
          ${['76ers', 'spfc', 'barcelona'].includes(this.page) ? keyed(this.page, html`<team-page .team=${this.page}></team-page>`) : ''}
          ${this.page === 'catalog' ? html`<calculator-catalog title="Calculadoras"></calculator-catalog>` : ''}
          ${this.page === 'market' ? keyed(this.route, html`<market-page .symbol=${this.route.startsWith('#/acoes/') ? this.route.slice(8).toUpperCase() : ''}></market-page>`) : ''}
          <compound-calculator ?hidden=${this.page !== "calculator"}></compound-calculator>
          ${["simple", "price", "sac"].includes(this.page) ? keyed(this.page, html`<finance-calculator .kind=${this.page}></finance-calculator>`) : ""}
          <footer class="page-footer">
            <span class="footer-logo"><img src="/2t-logo.webp" width="64" height="26" alt="2T" /></span>
            <div class="footer-meta">
              <button type="button" class="footer-calendar-trigger" aria-label="Abrir calendário de feriados" title="Calendário de feriados" aria-haspopup="dialog" @click=${this.openCalendar}>${icon("calendar")}</button>
              <span>matheus2t.com.br</span>
            </div>
          </footer>
        </main>
        <dialog class="calendar-dialog" aria-label="Calendário de feriados"
          @click=${(event: MouseEvent) => { if (event.target === event.currentTarget) this.closeCalendar(); }}>
          <div class="calendar-dialog-toolbar">
            <span>Calendário</span>
            <button type="button" class="calendar-dialog-close" aria-label="Fechar calendário" @click=${this.closeCalendar}>${icon("close")}</button>
          </div>
          <holiday-calendar></holiday-calendar>
        </dialog>
      </div>`;
  }
}
