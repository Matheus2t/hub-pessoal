import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';

/** Stage 1 captures only local media. No peers, signaling, storage or transmission. */
@customElement('call-page')
export class CallPage extends LightElement {
 @state() private microphone?:MediaStream;
 @state() private screen?:MediaStream;
 @state() private micBusy=false;
 @state() private screenBusy=false;
 @state() private error='';
 private micRequest=0;
 private screenRequest=0;
 connectedCallback(){super.connectedCallback();this.classList.add('call-page');window.addEventListener('pagehide',this.release)}
 disconnectedCallback(){window.removeEventListener('pagehide',this.release);this.release();super.disconnectedCallback()}
 private stop(stream?:MediaStream){stream?.getTracks().forEach(track=>{track.onended=null;track.stop()})}
 private stopMicrophone(){this.micRequest++;this.stop(this.microphone);this.microphone=undefined;this.micBusy=false}
 private stopScreen(){this.screenRequest++;this.stop(this.screen);this.screen=undefined;this.screenBusy=false;const video=this.querySelector('video');if(video)video.srcObject=null}
 private release=()=>{this.stopMicrophone();this.stopScreen();this.error=''};
 private message(error:unknown,screen:boolean){
  const name=error instanceof DOMException?error.name:'';
  if(name==='NotAllowedError'||name==='SecurityError')return screen?'Compartilhamento não autorizado ou cancelado.':'Permita o acesso ao microfone nas configurações do navegador.';
  if(name==='NotFoundError')return screen?'Nenhuma tela disponível para compartilhar.':'Nenhum microfone disponível.';
  if(name==='NotReadableError')return 'Não foi possível acessar o dispositivo. Confira se ele está disponível e tente novamente.';
  if(name==='AbortError')return 'A captura foi cancelada. Você pode tentar novamente.';
  return 'Não foi possível iniciar a captura. Confira as permissões e tente novamente.';
 }
 private async toggleMicrophone(){
  if(this.micBusy)return;
  if(this.microphone){this.stopMicrophone();return}
  this.error='';
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){this.error='O microfone exige um navegador compatível e HTTPS ou localhost.';return}
  const request=++this.micRequest;this.micBusy=true;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
   if(!this.isConnected||request!==this.micRequest){this.stop(stream);return}
   if(!stream.getAudioTracks().some(t=>t.readyState==='live')){this.stop(stream);throw new DOMException('No audio','NotFoundError')}
   this.microphone=stream;
   stream.getAudioTracks().forEach(track=>track.onended=()=>{if(this.microphone===stream){this.stopMicrophone();this.error='O microfone foi desconectado ou teve o acesso encerrado.'}});
  }catch(error){if(this.isConnected&&request===this.micRequest)this.error=this.message(error,false)}
  finally{if(request===this.micRequest)this.micBusy=false}
 }
 private async toggleScreen(){
  if(this.screenBusy)return;
  if(this.screen){this.stopScreen();return}
  this.error='';
  if(!window.isSecureContext||!navigator.mediaDevices?.getDisplayMedia){this.error='Compartilhamento de tela indisponível neste navegador. Use HTTPS ou localhost em um navegador compatível.';return}
  const request=++this.screenRequest;this.screenBusy=true;
  try{
   const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
   if(!this.isConnected||request!==this.screenRequest){this.stop(stream);return}
   if(!stream.getVideoTracks().some(t=>t.readyState==='live')){this.stop(stream);throw new DOMException('No video','NotFoundError')}
   this.screen=stream;
   stream.getVideoTracks().forEach(track=>track.onended=()=>{if(this.screen===stream)this.stopScreen()});
  }catch(error){if(this.isConnected&&request===this.screenRequest)this.error=this.message(error,true)}
  finally{if(request===this.screenRequest)this.screenBusy=false}
 }
 render(){return html`
  <header><div><h1>2T Call</h1><p>Prévia local. Nenhuma chamada ou envio de mídia para outras pessoas.</p></div><span class="call-badge">Versão local</span></header>
  <div class="call-layout">
   <section class="call-stage" aria-label="Prévia de tela">
    <div class="call-preview"><video autoplay playsinline muted .muted=${true} .srcObject=${this.screen??null} ?hidden=${!this.screen} aria-label="Tela compartilhada localmente"></video>
     ${!this.screen?html`<div class="call-empty"><h2>Sua tela</h2><p>Selecione uma tela, janela ou aba para visualizar aqui.</p></div>`:nothing}
    </div><p class="call-caption" role="status">${this.screen?`Compartilhamento local ativo · ${this.screen.getAudioTracks().some(t=>t.readyState==='live')?'áudio capturado, prévia silenciada':'sem áudio compartilhado'}`:'Nenhuma tela selecionada'}</p>
   </section>
   <aside class="call-people"><h2>Participantes · estrutura</h2><ol aria-label="Cinco posições previstas">
    <li><span class="call-avatar" aria-hidden="true">EU</span><div><strong>Você · local</strong><small role="status">${this.microphone?'Microfone ativo':'Microfone desligado'}</small></div></li>
    ${[2,3,4,5].map(n=>html`<li><span class="call-avatar" aria-hidden="true">${n}</span><div><strong>Espaço reservado</strong><small>Sem conexão</small></div></li>`)}
   </ol></aside>
  </div>
  <div class="call-controls" role="group" aria-label="Controles locais">
   <button type="button" aria-pressed=${!!this.microphone} ?disabled=${this.micBusy} @click=${this.toggleMicrophone}>${this.micBusy?'Aguardando microfone…':this.microphone?'Desativar microfone':'Ativar microfone'}</button>
   <button type="button" aria-pressed=${!!this.screen} ?disabled=${this.screenBusy} @click=${this.toggleScreen}>${this.screenBusy?'Aguardando seleção…':this.screen?'Parar compartilhamento':'Compartilhar tela'}</button>
   <button type="button" ?disabled=${!this.microphone&&!this.screen&&!this.micBusy&&!this.screenBusy} @click=${this.release}>Encerrar prévia</button>
  </div>
  ${this.error?html`<p class="call-error" role="alert">${this.error}</p>`:nothing}
  <p class="call-note">O microfone não é reproduzido nesta página. O áudio da tela depende do navegador e da opção selecionada. Os espaços reservados não representam pessoas conectadas.</p>`}
}
