import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement } from "../ui";
import "./team-shortcuts";
import type { Page } from "../catalog";

@customElement("app-sidebar")
export class AppSidebar extends LightElement {
  @property() page: Page = "overview";
  render() {
    return html`<nav aria-label="Navegação principal">
      <a class="nav-item" href="#/" aria-current=${this.page==='overview'?'page':'false'}>Início</a>
      <a class="nav-item" href="#/calculadoras" aria-current=${['catalog','calculator','simple','price','sac'].includes(this.page)?'page':'false'}>Calculadoras</a>
      <a class="nav-item" href="#/acoes" aria-current=${this.page==='market'?'page':'false'}>Ações</a>
      <a class="nav-item" href="#/renda-fixa" aria-current=${this.page==='fixedIncome'?'page':'false'}>Renda Fixa</a>
      <details class="teams-menu" @keydown=${(e:KeyboardEvent)=>{if(e.key==='Escape'){(e.currentTarget as HTMLDetailsElement).open=false;(e.currentTarget as HTMLElement).querySelector('summary')?.focus()}}}>
        <summary class="nav-item" aria-current=${['76ers','spfc','barcelona','sports'].includes(this.page)?'page':'false'}>Times</summary>
        <team-shortcuts .page=${this.page}></team-shortcuts>
      </details>
      <a class="nav-item" href="#/learn" aria-current=${this.page.startsWith('learn')?'page':'false'}>Learn</a>
    </nav>`;
  }
}
