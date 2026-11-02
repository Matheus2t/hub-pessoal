import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { teams, type Team } from '../sports';

@customElement('team-shortcuts')
export class TeamShortcuts extends LightElement {
  @property() page = '';
  render() {
    return html`<nav aria-label="Times" class="team-shortcuts">${(Object.keys(teams) as Team[]).map(team => html`<a href=${`#/${team}`} title=${teams[team].name} aria-label=${teams[team].name} aria-current=${this.page === team ? 'page' : 'false'}><span class="team-crest-frame" data-team=${team}><img src=${teams[team].crest} width="28" height="28" alt="" /></span><span>${teams[team].name}</span></a>`)}</nav>`;
  }
}
