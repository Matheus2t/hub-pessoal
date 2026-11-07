import { html } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { customElement, state } from "lit/decorators.js";
import { LightElement, icon } from "../ui";
import { currentPage, pages, learnActivities } from "../catalog";
import "./sidebar";
import "./topbar";
import "./home-page";
import "./holiday-calendar";
import "./calculator-catalog";
import "./compound-calculator";
import "./finance-calculator";
import "./extended-finance-calculator";
import "./market-page";
import "./team-shortcuts";
import "./team-page";
import "./sports-calendar";
import "./games-page";
import "./fixed-income-page";
import "./panel-workspace";
import "../learn/host";

@customElement("app-shell")
export class AppShell extends LightElement {
  @state() private page = currentPage();
  @state() private route = location.hash;
  @state() private callDock:{active:boolean;mode:string;name:string;room:string;microphone:boolean;voiceActive:boolean;deafened:boolean;participants:number;state:string}|null=null;
  private onCallSession=(event:Event)=>{const detail=(event as CustomEvent).detail;this.callDock=detail?.active?detail:null};
  private dockMic=()=>{const view=this.querySelector("call-page") as HTMLElement&{toggleDockMicrophone?:()=>void}|null;view?.toggleDockMicrophone?.()};
  private dockDeafen=()=>{const view=this.querySelector("call-page") as HTMLElement&{toggleDockDeafen?:()=>void}|null;view?.toggleDockDeafen?.()};
  private dockLeave=()=>{const view=this.querySelector("call-page") as HTMLElement&{leaveFromDock?:()=>void}|null;view?.leaveFromDock?.()};
  protected updated(changes:Map<PropertyKey,unknown>){if(changes.has('page')&&this.page==='call')void import('../call/page');}
  private pageTitle(){const mode=['learnEn','learnRu'].includes(this.page)?learnActivities[this.route.split('/')[3]]:undefined;return mode?`${mode} · ${pages[this.page].title}`:pages[this.page].title}
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
    this.querySelectorAll<HTMLDetailsElement>(".teams-menu").forEach(menu=>menu.open=false);
    this.closeCalendar();
    this.normalizeRoute();
    this.page = currentPage();
    this.route = location.hash;
    document.title = `${this.pageTitle()} · 2T`;
    window.scrollTo({ top: 0 });
    void this.updateComplete.then(() => this.querySelector<HTMLElement>("#content")?.focus());
  };
  connectedCallback() {
    super.connectedCallback();
    this.normalizeRoute();
    this.page = currentPage();
    document.title = `${this.pageTitle()} · 2T`;
    window.addEventListener("hashchange", this.navigate);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("hashchange", this.navigate);
  }
  render() {
    return html`<a class="skip-link" href="#content" @click=${(event: Event) => { event.preventDefault(); this.querySelector<HTMLElement>("#content")?.focus(); }}>Pular para o conteúdo</a>
      <div class=${`app-layout ${['market','calculator','simple','price','sac','retirement','housing','amortization','clt','fixedIncome','catalog'].includes(this.page)?'finance-workspace':''}`}>
        <header class="masthead">
          <a class="brand" href="#/" aria-label="2T — início"><span class="brand-logo"><img src="/2t-logo.webp" width="80" height="32" alt="" /></span></a>
          <app-sidebar .page=${this.page}></app-sidebar>
          <app-topbar></app-topbar>
        </header>
        <main id="content" tabindex="-1" class="main-content">
          ${this.page !== "overview" ? html`<nav class="breadcrumbs" aria-label="Caminho da página"><a href="#/">Início</a><span aria-hidden="true">/</span>${['calculator','simple','price','sac','retirement','housing','amortization','clt'].includes(this.page) ? html`<a href="#/calculadoras">Calculadoras</a><span aria-hidden="true">/</span>` : ''}${['76ers','spfc','barcelona'].includes(this.page)?html`<a href="#/times">Times</a><span aria-hidden="true">/</span>`:''}${this.page.startsWith('learn')&&this.page!=='learn'?html`<a href="#/learn">2T Learn</a><span aria-hidden="true">/</span>`:''}${['learnEn','learnRu'].includes(this.page)&&learnActivities[this.route.split('/')[3]]?html`<a href=${`#/learn/${this.page==='learnEn'?'en':'ru'}`}>${pages[this.page].title}</a><span aria-hidden="true">/</span>`:''}<span aria-current="page">${['learnEn','learnRu'].includes(this.page)?learnActivities[this.route.split('/')[3]]||pages[this.page].title:pages[this.page].title}</span></nav>` : ""}
          ${this.page.startsWith('learn') ? html`<learn-host .activity=${this.route.split('/')[3]||''} .language=${this.page==='learnEn'?'en':this.page==='learnRu'?'ru':''} .invalid=${this.page==='learnInvalid'}></learn-host>` : ''}
          ${this.page === 'overview' ? html`<home-page></home-page>` : ''}
          <call-page ?hidden=${this.page !== "call"} @call-session-change=${this.onCallSession}></call-page>
          ${this.page === 'games' ? html`<games-page></games-page>` : ''}
          ${this.page === 'sports' ? html`<sports-calendar></sports-calendar>` : ''}
          ${this.page === 'fixedIncome' ? html`<fixed-income-page></fixed-income-page>` : ''}
          ${['76ers', 'spfc', 'barcelona'].includes(this.page) ? keyed(this.page, html`<team-page .team=${this.page}></team-page>`) : ''}
          ${this.page === 'catalog' ? html`<calculator-catalog title="Calculadoras"></calculator-catalog>` : ''}
          ${this.page === 'market' ? keyed(this.route, html`<market-page .symbol=${this.route.startsWith('#/acoes/') ? this.route.slice(8).toUpperCase() : ''}></market-page>`) : ''}
          <compound-calculator ?hidden=${this.page !== "calculator"}></compound-calculator>
          ${["simple", "price", "sac"].includes(this.page) ? keyed(this.page, html`<finance-calculator .kind=${this.page}></finance-calculator>`) : ""}
          ${["retirement", "housing", "amortization", "clt"].includes(this.page) ? keyed(this.page, html`<extended-finance-calculator .kind=${this.page}></extended-finance-calculator>`) : ""}
          <footer class="page-footer">
            <span class="footer-logo"><img src="/2t-logo.webp" width="64" height="26" alt="2T" /></span>
            <div class="footer-meta">
              <button type="button" class="footer-calendar-trigger" aria-label="Abrir calendário de feriados" title="Calendário de feriados" aria-haspopup="dialog" @click=${this.openCalendar}>${icon("calendar")}</button>
              <span>matheus2t.com.br</span>
            </div>
          </footer>
        </main>
        ${this.callDock&&this.page!=='call'?html`<aside class="call-dock" aria-label="Chamada em andamento" role="status">
          <span class="call-dock-indicator" aria-hidden="true"></span>
          <div class="call-dock-info"><strong>${this.callDock.name}</strong><small>${this.callDock.state==='reconnecting'?'Reconectando…':`${this.callDock.participants}/5 na sala`}${this.callDock.deafened?' · Ensurdecido':''}</small></div>
          <button type="button" aria-label=${this.callDock.microphone?'Mutar microfone':'Ativar microfone'} ?disabled=${this.callDock.deafened} @click=${this.dockMic}>${this.callDock.microphone?'Mutar':'Falar'}</button>
          ${this.callDock.voiceActive?html`<button type="button" aria-pressed=${this.callDock.deafened} @click=${this.dockDeafen}>Ensurdecer</button>`:''}
          <a href=${this.callDock.mode==='channel'?`#/call/sala/${this.callDock.room}`:'#/call'}>Voltar à chamada</a>
          <button class="call-dock-leave" type="button" @click=${this.dockLeave} aria-label="Sair da chamada">Sair</button>
         </aside>`:''}
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
