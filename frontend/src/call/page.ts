import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {CallSignaling} from './signaling';
import {parseInvite} from './protocol';

/** Presence/signaling only. Captured media remains local; no RTCPeerConnection. */
@customElement('call-page')
export class CallPage extends LightElement {
 @state() private microphone?:MediaStream;
 @state() private screen?:MediaStream;
 @state() private micBusy=false;
 @state() private screenBusy=false;
 @state() private error='';
 private micRequest=0;
 private screenRequest=0;
 @state() private roomError='';
 @state() private copied=false;
 private call=new CallSignaling(()=>{if(this.call.state==='closed')this.release();this.requestUpdate()});
 connectedCallback(){super.connectedCallback();this.classList.add('call-page');window.addEventListener('pagehide',this.teardown);window.addEventListener('hashchange',this.routeChanged)}
 disconnectedCallback(){window.removeEventListener('pagehide',this.teardown);window.removeEventListener('hashchange',this.routeChanged);this.teardown();super.disconnectedCallback()}
 private teardown=()=>{this.call.leave();this.release()};
 private routeChanged=()=>{this.teardown();this.requestUpdate()};
 private openRoom(event:SubmitEvent){
  event.preventDefault();const form=event.currentTarget as HTMLFormElement,data=new FormData(form);
  const name=String(data.get('name')??'').trim();this.roomError='';this.copied=false;
  if(!name){this.roomError='Informe seu nome.';return}
  if((event.submitter as HTMLButtonElement)?.value==='create'){
   const admin=String(data.get('admin')??'');if(!admin){this.roomError='Informe a credencial do proprietário.';return}
   this.call.start({type:'create',name,admin});
  }else{
   const invite=parseInvite(String(data.get('invite')??''));if(!invite){this.roomError='Cole um convite válido deste site.';return}
   this.call.start({type:'join',name,...invite});
  }
  const password=form.elements.namedItem('admin') as HTMLInputElement|null;if(password)password.value='';
 }
 private async copyInvite(){
  const session=this.call.session;if(!session?.invite)return;
  const url=new URL(location.href);url.hash=`/call/${session.room}?invite=${session.invite}`;
  try{await navigator.clipboard.writeText(url.href);this.copied=true;this.roomError=''}catch{this.roomError='Não foi possível copiar. Permita o acesso à área de transferência.'}
 }
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
  <header><div><h1>2T Call</h1><p>Salas privadas · mídia apenas na prévia local.</p></div><span class="call-badge">Protótipo local</span></header>
  ${!this.call.session?html`<form class="call-entry" @submit=${this.openRoom}>
   <label>Seu nome<input name="name" autocomplete="nickname" maxlength="40" required></label>
   <label class="call-invite">Link de convite<input name="invite" type="text" .value=${parseInvite(location.href)?location.href:''} autocomplete="off" spellcheck="false" placeholder="Cole o link recebido"></label>
   <button type="submit" value="join" ?disabled=${this.call.state==='connecting'}>Entrar por convite</button>
   <details><summary>Sou o proprietário</summary><label>Credencial do proprietário<input name="admin" type="password" autocomplete="off" maxlength="256"></label><button type="submit" value="create" ?disabled=${this.call.state==='connecting'}>Criar sala privada</button></details>
  </form>`:html`<div class="call-room-actions"><span>Sala temporária · até 5 pessoas</span>
   ${this.call.session.host?html`<button type="button" @click=${this.copyInvite}>${this.copied?'Link copiado':'Copiar convite'}</button><button type="button" ?disabled=${this.call.state!=='connected'} @click=${()=>this.call.send({type:'close'})}>Encerrar sala</button>`:nothing}
   <button type="button" @click=${this.teardown}>Sair da sala</button></div>`}
  <p class="call-connection" role="status">${({idle:'Sem sala conectada',connecting:'Conectando…',waiting:'Aguardando aprovação do anfitrião',connected:'Conectado',reconnecting:'Reconectando…',closed:'Conexão encerrada'})[this.call.state]}</p>
  ${this.roomError||this.call.error?html`<p class="call-error" role="alert">${this.roomError||this.call.error}</p>`:nothing}
  ${this.call.requests.length?html`<section class="call-requests" aria-label="Solicitações de entrada"><h2>Aguardando aprovação</h2>${this.call.requests.map(p=>html`<div><span>${p.name}</span><button type="button" @click=${()=>this.call.send({type:'admit',target:p.id})} ?disabled=${this.call.state!=='connected'}>Aceitar ${p.name}</button><button type="button" @click=${()=>this.call.send({type:'reject',target:p.id})} ?disabled=${this.call.state!=='connected'}>Recusar ${p.name}</button></div>`)}</section>`:nothing}
  <div class="call-layout">
   <section class="call-stage" aria-label="Prévia de tela">
    <div class="call-preview"><video autoplay playsinline muted .muted=${true} .srcObject=${this.screen??null} ?hidden=${!this.screen} aria-label="Tela compartilhada localmente"></video>
     ${!this.screen?html`<div class="call-empty"><h2>Sua tela</h2><p>Selecione uma tela, janela ou aba para visualizar aqui.</p></div>`:nothing}
    </div><p class="call-caption" role="status">${this.screen?`Compartilhamento local ativo · ${this.screen.getAudioTracks().some(t=>t.readyState==='live')?'áudio capturado, prévia silenciada':'sem áudio compartilhado'}`:'Nenhuma tela selecionada'}</p>
   </section>
   <aside class="call-people"><h2>Participantes · ${this.call.people.filter(p=>p.connected).length}/5</h2><ol aria-label="Participantes da sala">
    ${this.call.people.map(p=>html`<li><span class="call-avatar" aria-hidden="true">${p.name.slice(0,2).toLocaleUpperCase()}</span><div><strong>${p.name}${p.id===this.call.session?.participant?' · você':''}</strong><small>${p.host?'Anfitrião · ':''}${p.connected?'Conectado':'Reconectando'}</small></div></li>`)}
    ${Array.from({length:5-this.call.people.length},(_,n)=>html`<li class="call-vacant"><span class="call-avatar" aria-hidden="true">${this.call.people.length+n+1}</span><div><strong>Vaga disponível</strong><small>Sem participante</small></div></li>`)}
   </ol></aside>
  </div>
  <div class="call-controls" role="group" aria-label="Controles locais">
   <button type="button" aria-pressed=${!!this.microphone} ?disabled=${this.micBusy} @click=${this.toggleMicrophone}>${this.micBusy?'Aguardando microfone…':this.microphone?'Desativar microfone':'Ativar microfone'}</button>
   <button type="button" aria-pressed=${!!this.screen} ?disabled=${this.screenBusy} @click=${this.toggleScreen}>${this.screenBusy?'Aguardando seleção…':this.screen?'Parar compartilhamento':'Compartilhar tela'}</button>
   <button type="button" ?disabled=${!this.microphone&&!this.screen&&!this.micBusy&&!this.screenBusy} @click=${this.release}>Encerrar prévia</button>
  </div>
  ${this.error?html`<p class="call-error" role="alert">${this.error}</p>`:nothing}
  <p class="call-note">Ainda não há áudio ou vídeo entre participantes. Microfone e tela ficam apenas neste navegador. A sala exige o sinalizador local; o convite expira em 15 minutos por padrão. O áudio da tela depende do navegador.</p>`}
}
