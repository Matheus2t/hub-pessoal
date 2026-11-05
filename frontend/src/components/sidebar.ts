import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement } from "../ui";
import { teams, type Team } from "../sports";
import "./team-shortcuts";
import type { Page } from "../catalog";

@customElement("app-sidebar")
export class AppSidebar extends LightElement {
  @property() page: Page = "overview";
  render() {
    return html`<nav aria-label="Navegação principal">
      <a class="nav-item" href="#/" aria-current=${this.page==='overview'?'page':'false'}>Início</a>
      <details class="teams-menu" @keydown=${(e:KeyboardEvent)=>{if(e.key==='Escape'){(e.currentTarget as HTMLDetailsElement).open=false;(e.currentTarget as HTMLElement).querySelector('summary')?.focus()}}}>
        <summary class="nav-item" aria-current=${['76ers','spfc','barcelona','sports'].includes(this.page)?'page':'false'}>Times</summary>
        <team-shortcuts .page=${this.page}></team-shortcuts>
      </details>
      <div class="nav-team-icons" role="group" aria-label="Acesso direto aos times">
        ${(Object.keys(teams) as Team[]).map(team=>html`<a class="nav-team-icon" href=${`#/${team}`} title=${teams[team].name} aria-label=${teams[team].name} aria-current=${this.page===team?'page':'false'}><span class="team-crest-frame" data-team=${team}><img src=${teams[team].crest} alt="" width="28" height="28" decoding="async" /></span></a>`)}
      </div>
    </nav>`;
  }
}
