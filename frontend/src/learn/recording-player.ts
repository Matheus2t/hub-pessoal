import {html,type PropertyValues} from 'lit';
import {customElement,property,query,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {canAssessLearnAudio,canPlayLearnAudio,type LearnAudioAsset,type LearnAudioPolicy} from './audio-assets';

interface AudioHeardDetail {source:'recording';assetId:string;validated:boolean;assessmentEligible:boolean}
const secondsLabel=(seconds:number)=>{
  if(!Number.isFinite(seconds)||seconds<0)return '0:00';
  const whole=Math.floor(seconds);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;
};
const connectedPlayers=new Set<LearnRecordingPlayer>();

@customElement('learn-recording-player')
export class LearnRecordingPlayer extends LightElement {
  @property({attribute:false}) asset?:LearnAudioAsset;
  @property({attribute:false}) policy:LearnAudioPolicy={audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true};
  @query('audio') private media?:HTMLAudioElement;
  @state() private loading=false;
  @state() private playing=false;
  @state() private currentTime=0;
  @state() private duration=0;
  @state() private speed=1;
  @state() private volume=1;
  @state() private repeating=false;
  @state() private error='';
  @state() private completed=false;
  private completionSent=false;
  private assetIdentity='';

  connectedCallback(){super.connectedCallback();connectedPlayers.add(this);}

  protected willUpdate(changes:PropertyValues){
    if(changes.has('asset')||changes.has('policy')){
      const identity=`${this.asset?.id||''}:${this.asset?.assetUrl||''}`;
      if(identity!==this.assetIdentity){this.stopAndRelease();this.assetIdentity=identity;this.completed=false;this.completionSent=false;this.error='';}
      else if(changes.has('policy')){this.media?.pause();if(this.media)this.media.currentTime=0;this.currentTime=0;this.playing=false;this.completed=false;this.completionSent=false;}
    }
  }

  disconnectedCallback(){connectedPlayers.delete(this);this.stopAndRelease();super.disconnectedCallback();}

  private stopAndRelease(){
    const media=this.media;
    if(!media)return;
    media.pause();
    media.removeAttribute('src');
    media.load();
    this.playing=false;this.loading=false;this.currentTime=0;this.duration=0;
  }

  private async play(){
    if(!this.media||!this.asset||!canPlayLearnAudio(this.asset,this.policy))return;
    for(const player of connectedPlayers)if(player!==this)player.pause();
    this.error='';this.loading=true;
    try{await this.media.play();this.loading=false;}
    catch{this.loading=false;this.playing=false;this.error='O navegador bloqueou a reprodução. Use o botão para tentar novamente.';}
  }
  private pause(){this.media?.pause();this.loading=false;}
  private async restart(){
    if(!this.media)return;
    this.media.currentTime=0;this.currentTime=0;this.completed=false;this.completionSent=false;await this.play();
  }
  private seek(event:Event){
    const media=this.media,value=Number((event.target as HTMLInputElement).value);
    if(!media||!Number.isFinite(value))return;
    media.currentTime=Math.max(0,Math.min(this.duration,value));this.currentTime=media.currentTime;
  }
  private setVolume(event:Event){this.volume=Number((event.target as HTMLInputElement).value)/100;if(this.media)this.media.volume=this.volume;}
  private setSpeed(event:Event){this.speed=Number((event.target as HTMLSelectElement).value);if(this.media)this.media.playbackRate=this.speed;}
  private onMetadata(){if(!this.media)return;this.duration=Number.isFinite(this.media.duration)?this.media.duration:0;this.currentTime=this.media.currentTime;this.loading=false;}
  private onTime(){if(!this.media)return;this.currentTime=this.media.currentTime;this.duration=Number.isFinite(this.media.duration)?this.media.duration:0;}
  private onEnded(){
    const media=this.media;if(!media)return;
    this.completed=true;this.currentTime=this.duration;this.playing=false;
    if(!this.completionSent&&this.asset){
      this.completionSent=true;
      const assessmentEligible=canAssessLearnAudio(this.asset,this.policy);
      const detail:AudioHeardDetail={source:'recording',assetId:this.asset.id,validated:assessmentEligible,assessmentEligible};
      this.dispatchEvent(new CustomEvent<AudioHeardDetail>('heard',{bubbles:true,composed:true,detail}));
    }
    if(this.repeating){media.currentTime=0;this.completed=false;void this.play();}
  }
  private onMediaError(){this.loading=false;this.playing=false;this.error='A gravação não pôde ser carregada. Tente novamente mais tarde.';}

  render(){
    const playable=canPlayLearnAudio(this.asset,this.policy),fixture=this.asset?.source==='test-fixture';
    if(!this.asset)return html`<p class="learn-audio-player__status" role="status">Nenhuma gravação associada.</p>`;
    if(!playable)return html`<section class="learn-audio-player" aria-label="Player de gravação"><p class="learn-audio-player__status" role="status">${this.asset.assetUrl?'Gravação ainda sem validação ou autorização para reprodução.':'Gravação aprovada indisponível para esta atividade.'} A síntese do navegador, quando oferecida, é apenas prática e não conta como evidência auditiva.</p></section>`;
    const max=this.duration||0,value=Math.min(this.currentTime,max),eligible=canAssessLearnAudio(this.asset,this.policy);
    return html`<section class="learn-audio-player" aria-label="Player de gravação">
      ${fixture?html`<p class="learn-audio-player__fixture" role="note">Fixture técnico: tom de teste, sem fala. Não é material de estudo.</p>`:html`<p class="learn-audio-player__label">Gravação ${eligible?'validada':'disponível para estudo'}</p>`}
      <audio .src=${this.asset.assetUrl!} preload="none" playsinline @loadedmetadata=${()=>this.onMetadata()} @canplay=${()=>{this.loading=false}} @play=${()=>{this.playing=true;this.error=''}} @pause=${()=>this.playing=false} @timeupdate=${()=>this.onTime()} @ended=${()=>this.onEnded()} @error=${()=>this.onMediaError()}></audio>
      <div class="learn-audio-player__controls">
        <button class="button" type="button" aria-label="Reproduzir gravação" ?disabled=${this.playing||this.loading} @click=${()=>void this.play()}>${this.loading?'Carregando…':'Reproduzir'}</button>
        <button class="button" type="button" aria-label="Pausar gravação" ?disabled=${!this.playing} @click=${()=>this.pause()}>Pausar</button>
        <button class="button" type="button" aria-label="Reiniciar gravação" ?disabled=${!this.asset.assetUrl||this.loading} @click=${()=>void this.restart()}>Reiniciar</button>
        <button class="button" type="button" aria-label="Repetir gravação" aria-pressed=${this.repeating} @click=${()=>this.repeating=!this.repeating}>${this.repeating?'Repetição ligada':'Repetir'}</button>
      </div>
      <label class="learn-audio-player__progress">Progresso
        <input type="range" min="0" max=${max} step="0.1" .value=${String(value)} aria-label="Posição da gravação" aria-valuetext=${`${secondsLabel(value)} de ${secondsLabel(max)}`} ?disabled=${!max} @input=${(event:Event)=>this.seek(event)} />
        <output aria-live="off">${secondsLabel(value)} / ${secondsLabel(max)}</output>
      </label>
      <label class="learn-audio-player__setting">Velocidade
        <select aria-label="Velocidade da gravação" .value=${String(this.speed)} @change=${(event:Event)=>this.setSpeed(event)}><option value="1">1×</option><option value="0.9">0,9×</option><option value="0.75">0,75×</option><option value="0.5">0,5×</option></select>
      </label>
      <label class="learn-audio-player__volume">Volume
        <input type="range" min="0" max="100" step="5" .value=${String(Math.round(this.volume*100))} aria-label="Volume da gravação" @input=${(event:Event)=>this.setVolume(event)} /><output aria-live="off">${Math.round(this.volume*100)}%</output>
      </label>
      ${this.error?html`<p class="learn-audio-player__status" role="alert">${this.error}</p>`:html`<p class="learn-audio-player__status" role="status" aria-live="polite">${this.playing?'Reprodução em andamento.':this.completed?'Reprodução concluída.':eligible?'Áudio aprovado. A avaliação só é registrada após a reprodução completa.':'Áudio de estudo; não habilita avaliação.'}</p>`}
    </section>`;
  }
}
