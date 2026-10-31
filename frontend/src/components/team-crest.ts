import {html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {LightElement} from '../ui';

@customElement('team-crest')
export class TeamCrest extends LightElement {
  @property() src = '';
  @state() private failed = '';
  render() {
    let allowed=false;
    try { const url=new URL(this.src,location.origin); allowed=url.origin===location.origin || (url.protocol==='https:' && ['crests.football-data.org','cdn.nba.com'].includes(url.hostname)); } catch { /* Omit invalid assets. */ }
    return !this.src || !allowed || this.failed===this.src ? nothing : html`<img src=${this.src} width="24" height="24" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error=${()=>{this.failed=this.src}} />`;
  }
}
