import {html} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
let pending:Promise<unknown>|undefined;
let retry=0;
@customElement('learn-host')
export class LearnHost extends LightElement {
  @property() language='';
  @property({type:Boolean}) invalid=false;
  @state() private ready=false;
  @state() private failed=false;
  connectedCallback(){super.connectedCallback();void this.load()}
  private async load(){
    this.failed=false;
    try{const url=`/learn.js${retry?`?retry=${retry}`:''}`;await(pending??=import(url));if(this.isConnected)this.ready=true}
    catch{pending=undefined;retry++;if(this.isConnected)this.failed=true}
  }
  render(){return this.ready?html`<learn-page .language=${this.language} .invalid=${this.invalid}></learn-page>`:this.failed?html`<section class="learn-message" role="status"><h1>2T Learn</h1><p>Não foi possível carregar esta área.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></section>`:html`<p role="status">Carregando 2T Learn…</p>`}
}
