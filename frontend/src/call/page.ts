import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {CallSignaling} from './signaling';
import {parseInvite} from './protocol';
import {VoiceMesh} from './voice';
import {CallCapture} from './capture';
import {repeat} from 'lit/directives/repeat.js';

/** Private WebRTC room. Capture and transport have independent lifecycles. */
@customElement('call-page')
export class CallPage extends LightElement {
 @state() private microphone?:MediaStream;
 @state() private micBusy=false;
 @state() private error='';
 private micRequest=0;
 @state() private roomError='';
 @state() private copied=false;
 @state() private diagnosticCopied=false;
 private voice=new VoiceMesh(message=>this.call.send(message),()=>this.requestUpdate(),()=>this.querySelector('.call-remote-audio'),()=>{this.call.send({type:'rtc_config'})},
  (role,id)=>role==='screenVideo'?this.querySelector('.call-remote-screen'):this.querySelector(`[data-camera="${id}"]`));
 private lastMedia='';
 private call=new CallSignaling(()=>this.callChanged(),message=>this.voice.receive(message),message=>this.capture.event(message));
 private capture=new CallCapture(()=>({self:this.call.session?.participant??'',remote:this.call.state==='connected'&&this.voice.active,screen:this.call.screen}),message=>this.call.send(message),()=>this.captureChanged());
 private captureChanged(){this.voice.setScreen(this.capture.transmitting?this.capture.screen:undefined);this.voice.setCamera(this.capture.camera);this.publishMedia();this.requestUpdate()}
 protected updated(){this.voice.mountMedia()}
 connectedCallback(){super.connectedCallback();this.classList.add('call-page');window.addEventListener('pagehide',this.teardown);window.addEventListener('hashchange',this.routeChanged)}
 disconnectedCallback(){window.removeEventListener('pagehide',this.teardown);window.removeEventListener('hashchange',this.routeChanged);this.teardown();super.disconnectedCallback()}
 private teardown=()=>{this.voice.stop();this.release();this.call.leave();this.lastMedia=''};
 private routeChanged=()=>{this.teardown();this.requestUpdate()};
 private callChanged(){
  this.capture.sync();this.captureChanged();
  if(this.call.state==='closed'||this.call.state==='idle'){
   if(this.voice.active)this.voice.stop();if(this.call.state==='closed')this.release();this.lastMedia='';
  }else{
   if(this.call.state==='reconnecting')this.lastMedia='';
   if(this.call.session)this.voice.sync(this.call.session.participant,this.call.people,this.call.rtc,this.call.state==='connected',this.call.screen);
   this.publishMedia();
  }
  this.requestUpdate();
 }
 private publishMedia(){
  if(this.call.state!=='connected')return;
  const active=this.voice.active,microphone=active&&!!this.microphone?.getAudioTracks().some(t=>t.readyState==='live');
  const camera=active&&!!this.capture.camera;
  const signature=`${active}:${microphone}:${camera}`;
  if(signature!==this.lastMedia&&this.call.send({type:'media',active,microphone,camera}))this.lastMedia=signature;
 }
 private enterVoice(){
  if(this.call.state!=='connected'||!this.call.rtc)return;
  this.capture.release();
  this.voice.setMicrophone(this.microphone);this.voice.start();
  this.voice.sync(this.call.session!.participant,this.call.people,this.call.rtc,true);this.publishMedia();
 }
 private leaveVoice(){this.voice.stop();this.release();this.publishMedia()}
 private voiceStatus(id:string){
  const person=this.call.people.find(p=>p.id===id);
  if(!person?.voice)return 'Fora da chamada';
  if(!this.voice.active||id===this.call.session?.participant)return person.microphone?'Microfone ligado':'Microfone desligado';
  const peer=this.voice.peers.get(id);
  return !peer?'Conectando áudio':peer.failed?'Falha no áudio':peer.pc.connectionState==='connected'?`Áudio conectado · ${person.microphone?'microfone ligado':'microfone desligado'}`:peer.attempts?'Reconectando áudio':'Conectando áudio';
 }
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
 private async copyDiagnostic(){
  await this.voice.measure();
  try{await navigator.clipboard.writeText(JSON.stringify(this.voice.diagnostics(),null,2));this.diagnosticCopied=true}
  catch{this.roomError='Não foi possível copiar o diagnóstico. Confira a permissão da área de transferência.'}
 }
 private stop(stream?:MediaStream){stream?.getTracks().forEach(track=>{track.onended=null;track.stop()})}
 private stopMicrophone(){this.micRequest++;this.stop(this.microphone);this.microphone=undefined;this.micBusy=false;this.voice.setMicrophone();this.publishMedia()}
 private release=()=>{this.stopMicrophone();this.capture.release();this.error=''};
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
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(!this.isConnected||request!==this.micRequest){this.stop(stream);return}
   if(!stream.getAudioTracks().some(t=>t.readyState==='live')){this.stop(stream);throw new DOMException('No audio','NotFoundError')}
   this.microphone=stream;
   this.voice.setMicrophone(stream);this.publishMedia();
   stream.getAudioTracks().forEach(track=>track.onended=()=>{if(this.microphone===stream){this.stopMicrophone();this.error='O microfone foi desconectado ou teve o acesso encerrado.'}});
  }catch(error){if(this.isConnected&&request===this.micRequest)this.error=this.message(error,false)}
  finally{if(request===this.micRequest)this.micBusy=false}
 }
 render(){const self=this.call.session?.participant,screen=this.capture.screen,shared=this.call.screen;
  const remote=!!shared?.active&&shared.owner!==self&&this.voice.active;
  const sharer=this.call.people.find(p=>p.id===shared?.owner);
  const screenCaption=remote?`${sharer?.name??'Participante'} está compartilhando · ${shared?.audio?'com áudio':'sem áudio compartilhado'}`:screen?`${this.capture.transmitting?'Você está compartilhando':'Prévia local'} · ${screen.getAudioTracks().some(t=>t.readyState==='live')?'com áudio · prévia silenciada':'sem áudio compartilhado'}`:shared?'Selecionando tela…':'Nenhuma tela compartilhada';
  return html`
  <header><div><h1>2T Call</h1><p>Salas privadas · voz entre até cinco pessoas.</p></div><span class="call-badge">Em homologação</span></header>
  ${!this.call.session?html`<form class="call-entry" @submit=${this.openRoom}>
   <label>Seu nome<input name="name" autocomplete="nickname" maxlength="40" required></label>
   <label class="call-invite">Link de convite<input name="invite" type="text" .value=${parseInvite(location.href)?location.href:''} autocomplete="off" spellcheck="false" placeholder="Cole o link recebido"></label>
   <button type="submit" value="join" ?disabled=${this.call.state==='connecting'}>Entrar por convite</button>
   <details><summary>Sou o proprietário</summary><label>Credencial do proprietário<input name="admin" type="password" autocomplete="off" maxlength="256"></label><button type="submit" value="create" ?disabled=${this.call.state==='connecting'}>Criar sala privada</button></details>
  </form>`:html`<div class="call-room-actions"><span>Sala temporária · até 5 pessoas</span>
   ${this.call.session.host?html`<button type="button" @click=${this.copyInvite}>${this.copied?'Link copiado':'Copiar convite'}</button><button type="button" ?disabled=${this.call.state!=='connected'} @click=${()=>this.call.send({type:'close'})}>Encerrar sala</button>`:nothing}
   <button type="button" @click=${this.teardown}>Sair da sala</button></div>`}
  <p class="call-connection" role="status">${this.call.notice||({idle:'Sem sala conectada',connecting:'Conectando…',waiting:'Aguardando aprovação do anfitrião',connected:'Conectado',reconnecting:'Reconectando…',closed:'Conexão encerrada'})[this.call.state]}</p>
  ${this.call.session?.approved?html`<div class="call-voice-controls" role="group" aria-label="Chamada de voz">
   ${this.voice.active?html`<span>Na chamada${this.microphone?'':' · apenas ouvindo'}</span><button type="button" @click=${this.leaveVoice}>Sair da chamada</button>`:html`<button type="button" ?disabled=${this.call.state!=='connected'||!this.call.rtc} @click=${this.enterVoice}>Entrar na chamada</button><span>Entre para ouvir. Ative o microfone quando quiser falar.</span>`}
   ${this.voice.blocked?html`<button type="button" @click=${()=>this.voice.unlockAudio()}>Liberar áudio</button>`:nothing}
   ${this.voice.error?html`<button type="button" ?disabled=${this.call.state!=='connected'} @click=${()=>this.voice.retry()}>Reconectar áudio</button>`:nothing}
  </div>`:nothing}
  ${this.voice.error?html`<p class="call-error" role="alert">${this.voice.error}</p>`:nothing}
  ${this.call.rtc?html`<p class="call-note">${this.call.rtc.relayAvailable?'TURN configurado; a conectividade ainda depende da rede.':'Sem TURN: algumas redes podem impedir o áudio, mesmo com STUN.'}</p>`:nothing}
  ${this.voice.active?html`<details class="call-diagnostics"><summary @click=${()=>void this.voice.measure()}>Verificar conexão</summary>
   ${this.voice.diagnostics().peers.map((p,n)=>html`<p>Conexão ${n+1} · ${p.path==='relay'?'Via relay':p.path==='direct'?'Direta':'Aguardando conexão'} · ${p.received} pacotes recebidos</p>`)}
   <button type="button" @click=${this.copyDiagnostic}>${this.diagnosticCopied?'Diagnóstico copiado':'Copiar diagnóstico'}</button>
   <p>O relatório não inclui nomes, endereços IP ou convites.</p>
  </details>`:nothing}
  <div class="call-remote-audio" aria-hidden="true"></div>
  ${this.roomError||this.call.error?html`<p class="call-error" role="alert">${this.roomError||this.call.error}</p>`:nothing}
  ${this.call.requests.length?html`<section class="call-requests" aria-label="Solicitações de entrada"><h2>Aguardando aprovação</h2>${this.call.requests.map(p=>html`<div><span>${p.name}</span><button type="button" @click=${()=>this.call.send({type:'admit',target:p.id})} ?disabled=${this.call.state!=='connected'}>Aceitar ${p.name}</button><button type="button" @click=${()=>this.call.send({type:'reject',target:p.id})} ?disabled=${this.call.state!=='connected'}>Recusar ${p.name}</button></div>`)}</section>`:nothing}
  <div class="call-layout">
   <section class="call-stage" aria-label="Tela compartilhada">
    <div class="call-preview"><video autoplay playsinline muted .muted=${true} .srcObject=${screen??null} ?hidden=${!screen} aria-label="Prévia local da tela"></video>
     <div class="call-remote-screen" ?hidden=${!remote} aria-label="Tela recebida"></div>
     ${!screen&&!remote?html`<div class="call-empty"><h2>${shared?'Selecionando tela':'Nenhuma tela compartilhada'}</h2><p>${this.voice.active?'Compartilhe uma tela, janela ou aba.':'Entre na chamada para compartilhar com a sala.'}</p></div>`:nothing}
    </div><p class="call-caption" role="status">${screenCaption}</p>
   </section>
   <aside class="call-people"><h2>Participantes · ${this.call.people.filter(p=>p.connected).length}/5</h2><ol aria-label="Participantes da sala">
    ${repeat(this.call.people,p=>p.id,p=>html`<li data-participant=${p.id} class=${shared?.owner===p.id?'call-sharing':''}>
     <div class="call-person"><span class="call-avatar" aria-hidden="true">${p.name.slice(0,2).toLocaleUpperCase()}</span><div><strong>${p.name}${p.id===self?' · você':''}</strong><small>${p.host?'Anfitrião · ':''}${p.connected?'Conectado':'Reconectando'}</small><small class="call-voice-state">${this.voiceStatus(p.id)}</small><small>${p.camera?'Câmera ligada':'Câmera desligada'}${shared?.owner===p.id?' · compartilhando':''}</small></div></div>
     <div class="call-camera-frame" data-camera=${p.id} ?hidden=${!p.camera||!this.voice.active} aria-label=${`Câmera de ${p.name}`}>
      ${p.id===self?html`<video autoplay playsinline muted .muted=${true} .srcObject=${this.capture.camera??null} aria-label="Prévia da câmera"></video>`:nothing}
     </div></li>`)}
    ${Array.from({length:5-this.call.people.length},(_,n)=>html`<li class="call-vacant"><span class="call-avatar" aria-hidden="true">${this.call.people.length+n+1}</span><div><strong>Vaga disponível</strong><small>Sem participante</small></div></li>`)}
   </ol></aside>
  </div>
  <div class="call-controls" role="group" aria-label="Controles locais">
   <button type="button" aria-pressed=${!!this.microphone} ?disabled=${this.micBusy} @click=${this.toggleMicrophone}>${this.micBusy?'Aguardando microfone…':this.microphone?'Desativar microfone':'Ativar microfone'}</button>
   <button type="button" aria-pressed=${!!this.capture.camera} ?disabled=${!this.voice.active||this.call.state!=='connected'} @click=${()=>void this.capture.toggleCamera()}>${this.capture.cameraBusy?'Cancelar câmera':this.capture.camera?'Desativar câmera':'Ativar câmera'}</button>
   <button type="button" aria-pressed=${!!screen} ?disabled=${this.voice.active&&(this.call.state!=='connected'||!!shared&&shared.owner!==self)} @click=${()=>this.capture.toggleScreen()}>${this.capture.screenBusy?'Cancelar seleção de tela':screen?'Parar compartilhamento':'Compartilhar tela'}</button>
   <button type="button" ?disabled=${!this.microphone&&!screen&&!this.micBusy&&!this.capture.screenBusy&&!this.capture.camera&&!this.capture.cameraBusy} @click=${this.release}>Desligar toda mídia</button>
  </div>
  ${this.error?html`<p class="call-error" role="alert">${this.error}</p>`:nothing}
  ${this.capture.error?html`<p class="call-error" role="alert">${this.capture.error}</p>`:nothing}
  <p class="call-note">${this.voice.active?'Microfone, câmera e tela ligados são enviados aos participantes aprovados.':'Fora da chamada, as prévias ficam apenas neste navegador.'} Não há gravação. O áudio da tela depende do navegador e da superfície escolhida.</p>`}
}
