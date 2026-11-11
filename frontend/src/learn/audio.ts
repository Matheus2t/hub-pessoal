import {html,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {LearnSpeech} from './speech';
import type {Language} from './model';

@customElement('learn-audio')
export class LearnAudio extends LightElement {
  @property() text='';
  @property() language:Language='en';
  @state() private paused=false;
  @state() private rate=1;
  @state() private volume=1;
  @state() private available=false;
  @state() private loadingVoices=true;
  @state() private error='';
  @state() private playing=false;

  private speech=new LearnSpeech();
  private generation=0;
  private voiceTimer?:ReturnType<typeof setTimeout>;
  private refresh=()=>{
    const voices=this.speech.allVoices();
    this.available=this.speech.voices(this.language).length>0;
    this.loadingVoices=this.speech.supported()&&voices.length===0;
    clearTimeout(this.voiceTimer);
    if(this.loadingVoices)this.voiceTimer=setTimeout(()=>{this.loadingVoices=false;},1800);
  };

  connectedCallback(){
    super.connectedCallback();
    globalThis.speechSynthesis?.addEventListener('voiceschanged',this.refresh);
    this.refresh();
  }

  disconnectedCallback(){
    this.generation++;
    clearTimeout(this.voiceTimer);
    this.speech.stop();
    globalThis.speechSynthesis?.removeEventListener('voiceschanged',this.refresh);
    super.disconnectedCallback();
  }

  protected updated(changes:PropertyValues){
    if(changes.has('language')||changes.has('text')){
      this.stop();
      this.error='';
      this.refresh();
    }
  }

  private stop(){
    this.generation++;
    this.speech.stop();
    this.playing=false;
    this.paused=false;
  }

  private async play(){
    const token=++this.generation;
    this.error='';
    this.playing=true;
    try{
      await this.speech.play(this.text,this.language,this.rate,this.volume);
      if(token===this.generation&&this.isConnected)this.dispatchEvent(new CustomEvent('heard',{bubbles:true,composed:true,detail:{source:'browser-speech-synthesis',validated:false}}));
    }catch{
      if(token===this.generation&&this.isConnected)this.error='Não foi possível reproduzir. Verifique a voz instalada e tente novamente.';
    }finally{
      if(token===this.generation&&this.isConnected){this.playing=false;this.paused=false;}
    }
  }

  private changeVolume(event:Event){
    this.volume=Number((event.target as HTMLInputElement).value)/100;
    this.speech.setVolume(this.volume);
  }

  render(){
    const status=this.loadingVoices?'Carregando vozes disponíveis…':!this.speech.supported()?'Síntese de voz indisponível neste navegador.':!this.available?`Nenhuma voz compatível com ${this.language==='ru'?'russo':'inglês'} está instalada.`:this.playing?'Síntese local em reprodução; áudio não validado como material de avaliação.':'Síntese de voz do navegador · material de prática, não uma gravação validada.';
    return html`<div class="learn-audio" aria-label="Reprodução de áudio para prática">
      <div class="learn-audio__controls">
        <button class="button" aria-label="Ouvir / repetir" ?disabled=${!this.available||this.loadingVoices||this.playing} @click=${()=>void this.play()}>${this.playing?'Reproduzindo…':'Ouvir / repetir'}</button>
        <button class="button" aria-label=${this.paused?'Continuar áudio':'Pausar áudio'} aria-pressed=${this.paused} ?disabled=${!this.playing} @click=${()=>{this.paused=!this.paused;if(this.paused)this.speech.pause();else this.speech.resume()}}>${this.paused?'Continuar':'Pausar'}</button>
        <button class="button" aria-label="Parar áudio" ?disabled=${!this.playing} @click=${()=>this.stop()}>Parar</button>
      </div>
      <label class="learn-audio__setting">Velocidade
        <select aria-label="Velocidade" .value=${String(this.rate)} @change=${(e:Event)=>this.rate=Number((e.target as HTMLSelectElement).value)}>
          <option value="1">1x</option><option value="0.75">0,75x</option><option value="0.5">0,5x</option>
        </select>
      </label>
      <label class="learn-audio__volume">Volume
        <input type="range" min="0" max="100" step="5" aria-label="Volume da voz sintetizada" .value=${String(Math.round(this.volume*100))} @input=${(event:Event)=>this.changeVolume(event)} />
        <output aria-live="off">${Math.round(this.volume*100)}%</output>
      </label>
      ${this.error?html`<p class="learn-audio__status" role="alert">${this.error}</p>`:html`<p class="learn-audio__status" role="status" aria-live="polite">${status}</p>`}
    </div>`;
  }
}
