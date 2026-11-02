import {html} from 'lit';import {customElement,property,state} from 'lit/decorators.js';import {LightElement} from '../ui';
let pending:Promise<unknown>|undefined;
@customElement('distributions-host')
export class DistributionsHost extends LightElement {
 @property() symbol='';@property() mode='history';@state() ready=false;@state() failed=false;
 connectedCallback(){super.connectedCallback();void this.load()}
 private async load(){this.failed=false;try{const url='/distributions.js';await(pending??=import(url));if(this.isConnected)this.ready=true}catch{pending=undefined;this.failed=true}}
 render(){return this.ready?html`<distributions-page .symbol=${this.symbol} .mode=${this.mode}></distributions-page>`:this.failed?html`<p role="alert">Não foi possível carregar Proventos.</p><button class="button secondary" @click=${()=>this.load()}>Tentar novamente</button>`:html`<p role="status">Carregando proventos…</p>`}
}
