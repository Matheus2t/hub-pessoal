import {html,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {LearnSpeech} from './speech';
import type {Language} from './model';
@customElement('learn-audio')
export class LearnAudio extends LightElement {
 @property() text='';@property() language:Language='en';
 @state() private rate=1;@state() private available=false;@state() private error='';
 private speech=new LearnSpeech();private generation=0;
 private refresh=()=>{this.available=this.speech.voices(this.language).length>0};
 connectedCallback(){super.connectedCallback();globalThis.speechSynthesis?.addEventListener('voiceschanged',this.refresh);this.refresh()}
 disconnectedCallback(){this.generation++;this.speech.stop();globalThis.speechSynthesis?.removeEventListener('voiceschanged',this.refresh);super.disconnectedCallback()}
 protected updated(changes:PropertyValues){if(changes.has('language')||changes.has('text')){this.generation++;this.speech.stop();this.error='';this.refresh()}}
 private async play(){const token=++this.generation;this.error='';try{await this.speech.play(this.text,this.language,this.rate);if(token===this.generation&&this.isConnected)this.dispatchEvent(new CustomEvent('heard',{bubbles:true}))}catch{if(token===this.generation&&this.isConnected)this.error='Não foi possível reproduzir o áudio. Tente novamente.'}}
 render(){return html`<div class="learn-audio"><button class="button" ?disabled=${!this.available} @click=${()=>this.play()}>Ouvir / repetir</button><label>Velocidade <select .value=${String(this.rate)} @change=${(e:Event)=>this.rate=Number((e.target as HTMLSelectElement).value)}><option value="1">1x</option><option value="0.75">0,75x</option><option value="0.5">0,5x</option></select></label><p role="status">${!this.available?`Nenhuma voz compatível com ${this.language==='ru'?'russo':'inglês'} disponível neste navegador.`:this.error||'Síntese de voz do navegador; não é uma gravação nativa.'}</p></div>`}
}
