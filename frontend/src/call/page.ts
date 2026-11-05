import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {CallSignaling,callErrors} from './signaling';
import {channelLink,parseChannel,parseInvite,type ChannelStatus} from './protocol';
import {channelDevice,requestChannel,requestChannelLobby} from './channel';
import './channel-owner';
import {VoiceMesh} from './voice';
import {CallCapture} from './capture';
import {ScreenFullscreen} from './fullscreen';
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
 @state() private channel?:Extract<ChannelStatus,{room:string}>;
 @state() private lobby?:ChannelStatus;
 @state() private lobbyError='';
 @state() private channelLoading=false;
 @state() private channelError='';
 @state() private speakers=new Set<string>();
 private channelQuery?:AbortController;
 private speakerTimer?:number;
 private channelParticipant?:string;
 private fullscreen=new ScreenFullscreen(()=>this.requestUpdate());
 private voice=new VoiceMesh(message=>this.call.send(message),()=>this.requestUpdate(),()=>this.querySelector('.call-remote-audio'),()=>{this.call.send({type:'rtc_config'})},
  (role,id)=>role==='screenVideo'?this.querySelector('.call-remote-screen'):this.querySelector(`[data-camera="${id}"]`));
 private lastMedia='';
 private call=new CallSignaling(()=>this.callChanged(),message=>this.voice.receive(message),message=>this.capture.event(message));
 private capture=new CallCapture(()=>({self:this.call.session?.participant??'',remote:this.call.state==='connected'&&this.voice.active,screen:this.call.screen}),message=>this.call.send(message),()=>this.captureChanged());
 private captureChanged(){this.voice.setScreen(this.capture.transmitting?this.capture.screen:undefined);this.voice.setCamera(this.capture.camera);this.publishMedia();this.requestUpdate()}
 protected updated(){this.voice.mountMedia();this.fullscreen.sync(this.viewerSource)}
 private viewerSource=(viewer:string):MediaStream|string|undefined=>{
  if(viewer==='screen')return this.screenSource();
  if(!this.voice.active)return;
  if(viewer===this.call.session?.participant)return this.capture.camera?viewer:undefined;
  if(this.call.people.some(person=>person.id===viewer&&person.camera))return viewer;
 };
 private screenSource():MediaStream|string|undefined{
  if(this.capture.screen?.getVideoTracks().some(t=>t.readyState==='live'))return this.capture.screen;
  const screen=this.call.screen;
  if(screen?.active&&screen.owner!==this.call.session?.participant&&this.voice.active)return `${screen.owner}:${screen.generation}`;
 }
 connectedCallback(){super.connectedCallback();this.classList.add('call-page');window.addEventListener('pagehide',this.teardown);window.addEventListener('hashchange',this.routeChanged);this.loadChannel()}
 disconnectedCallback(){window.removeEventListener('pagehide',this.teardown);window.removeEventListener('hashchange',this.routeChanged);this.teardown();super.disconnectedCallback()}
 private teardown=()=>{
  this.channelQuery?.abort();this.channelQuery=undefined;this.channelLoading=false;
  this.stopSpeakers();this.channelParticipant=undefined;
  this.fullscreen.close();this.voice.stop(true);this.release();this.call.leave();this.lastMedia='';
 };
 private routeChanged=()=>{this.teardown();this.channel=undefined;this.lobby=undefined;this.channelError='';this.lobbyError='';this.roomError='';this.copied=false;this.loadChannel();this.requestUpdate()};
 private async loadChannel(){
  const room=parseChannel(location.href);
  if(this.channelQuery||!room&&location.hash!=='#/call')return;
  const controller=this.channelQuery=new AbortController();
  this.channelLoading=true;if(room)this.channelError='';else this.lobbyError='';
  try{
   const status=room?await requestChannel({type:'channel_info',room},controller.signal):await requestChannelLobby(controller.signal);
   if(!controller.signal.aborted){if(room&&status.room)this.channel=status;else if(!room)this.lobby=status}
  }catch(error){if(!controller.signal.aborted){if(room)this.channelError=(error as Error).message;else this.lobbyError=(error as Error).message}}
  finally{if(this.channelQuery===controller){this.channelQuery=undefined;this.channelLoading=false}}
 }
 private joinChannel(event:SubmitEvent){
  event.preventDefault();
  const form=event.currentTarget as HTMLFormElement,data=new FormData(form);
  const room=parseChannel(location.href),name=String(data.get('name')??'').trim();
  if(!room||!name){this.channelError='Informe seu nome.';return}
  const password=form.elements.namedItem('password') as HTMLInputElement|null;
  const secret=password?.value;if(password)password.value='';
  this.channelError='';this.call.start({type:'channel_join',room,name,device:channelDevice(),password:secret||undefined});
 }
 private leaveChannel(){
  const session=this.call.session;
  if(session?.mode==='channel'&&session.name)this.channel={type:'channel',room:session.room,name:session.name,online:this.call.people.filter(p=>p.connected&&p.id!==session.participant).length,requiresPassword:this.channel?.requiresPassword};
  this.teardown();this.copied=false;
 }
 private async copyChannel(){
  const room=parseChannel(location.href);if(!room)return;
  try{await navigator.clipboard.writeText(channelLink(room));this.copied=true;this.roomError=''}
  catch{this.roomError='Não foi possível copiar. Copie o endereço do navegador.'}
 }
 private stopSpeakers(){window.clearInterval(this.speakerTimer);this.speakerTimer=undefined;if(this.speakers.size)this.speakers=new Set()}
 private updateSpeakers(){
  if(this.call.session?.mode!=='channel'||!this.voice.active||this.call.state!=='connected'||this.call.people.length<2){this.stopSpeakers();return}
  if(this.speakerTimer!==undefined)return;
  this.speakerTimer=window.setInterval(()=>{
   const now=performance.now(),next=new Set<string>();
   for(const [id,peer] of this.voice.peers){
    const receiver=peer.transceivers.microphone?.receiver;
    if(this.call.people.some(p=>p.id===id&&p.connected&&p.microphone)&&receiver?.getSynchronizationSources?.().some(s=>now-s.timestamp<500&&(s.audioLevel??0)>.08))next.add(id);
   }
   if(next.size!==this.speakers.size||[...next].some(id=>!this.speakers.has(id)))this.speakers=next;
  },250);
 }
 private callChanged(){
  this.capture.sync();this.captureChanged();
  if(this.channel&&!this.channel.requiresPassword&&[callErrors.channel_password_required,callErrors.channel_password_changed].includes(this.call.error)){
   this.channel={...this.channel,requiresPassword:true};
  }
  const session=this.call.session;
  if(session?.mode==='channel'&&this.channelParticipant!==session.participant){
   if(this.channelParticipant)this.voice.stop();
   this.channelParticipant=session.participant;
  }
  if(this.call.state==='closed'||this.call.state==='idle'){
   this.voice.stop(true);if(this.call.state==='closed')this.release();this.lastMedia='';
  }else{
   if(this.call.state==='reconnecting')this.lastMedia='';
   if(this.call.session)this.voice.sync(this.call.session.participant,this.call.people,this.call.rtc,this.call.state==='connected',this.call.screen);
   if(session?.mode==='channel'&&this.call.state==='connected'&&this.call.rtc&&!this.voice.active)this.enterVoice();
   this.publishMedia();
  }
  this.updateSpeakers();
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
 private listeningControls(id:string,name:string){
  const mixer=this.voice.audioMix,{volume,muted}=mixer.level(id);
  return html`<div class="call-listening" role="group" aria-label=${`Áudio recebido de ${name}`}>
   <label><span>Volume <output>${volume}%</output></span>
    <input type="range" min="0" max="200" step="1" .value=${String(volume)} aria-label=${`Volume de ${name}`} aria-valuetext=${`${volume}%`}
     @input=${(event:Event)=>mixer.volume(id,(event.currentTarget as HTMLInputElement).valueAsNumber)}>
   </label>
   <div class="call-listening-actions">
    <button type="button" @click=${()=>mixer.mute(id)}>${muted?'Ouvir novamente':'Silenciar'}</button>
    <button type="button" aria-label=${`Restaurar volume de ${name} a 100%`} ?disabled=${volume===100} @click=${()=>mixer.volume(id,100)}>100%</button>
   </div>
   ${muted?html`<small class="call-listening-state">Silenciado para você</small>`:nothing}
   ${volume>100&&!mixer.canAmplify(id)?html`<small>Ganho acima de 100% indisponível.</small>`:nothing}
  </div>`;
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
 private get cameraDisabled(){return !this.voice.active||this.call.state!=='connected'}
 private get cameraLabel(){return this.capture.cameraBusy?'Cancelar câmera':this.capture.camera?'Desativar câmera':'Ativar câmera'}
 private viewerControls(viewer:string,name?:string){
  const source=this.viewerSource(viewer);
  if(!source)return nothing;
  const mode=this.fullscreen.modeFor(viewer),expanded=!!mode;
  const label=mode==='expanded'?'Sair do modo expandido':mode?'Sair da tela cheia':
   name?(this.fullscreen.supported?`Tela cheia da câmera de ${name}`:`Ampliar câmera de ${name}`):this.fullscreen.supported?'Tela cheia':'Ampliar tela';
  return html`<button class=${`call-viewer-toggle ${name?'call-camera-fullscreen':'call-fullscreen'}`} type="button" aria-label=${label} title=${label}
   @click=${(event:Event)=>void this.fullscreen.toggle(event.currentTarget as HTMLButtonElement,viewer,this.viewerSource(viewer))}>
   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d=${expanded?'M4 9h5V4m6 0v5h5M4 15h5v5m6 0v-5h5':'M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5'} /></svg>
   ${!name||expanded?html`<span>${label}</span>`:nothing}
  </button>
  ${expanded?html`<div class="call-viewer-media" role="group" aria-label="Controles de mídia em tela cheia">
   <button type="button" aria-pressed=${!!this.microphone} ?disabled=${this.micBusy||this.call.state==='reconnecting'} @click=${this.toggleMicrophone}>${this.micBusy?'Aguardando microfone…':this.microphone?'Mutar microfone':'Desmutar microfone'}</button>
   <button type="button" aria-pressed=${!!this.capture.camera} ?disabled=${this.cameraDisabled} @click=${()=>this.capture.toggleCamera()}>${this.cameraLabel}</button>
   ${this.error||this.capture.error?html`<span class="call-viewer-error" role="status">${this.error||this.capture.error}</span>`:nothing}
  </div>`:nothing}`;
 }
 render(){const self=this.call.session?.participant,screen=this.capture.screen,shared=this.call.screen;
  const channelRoute=location.hash.startsWith('#/call/sala/'),channelId=parseChannel(location.href);
  const channelSession=this.call.session?.mode==='channel'?this.call.session:undefined;
  const channelBusy=this.call.state==='connecting'||this.call.state==='reconnecting';
  const isLanding=!channelRoute&&!this.call.session&&!parseInvite(location.href);
  if(location.hash==='#/call/gerenciar')return html`<call-channel-owner></call-channel-owner>`;
  const remote=!!shared?.active&&shared.owner!==self&&this.voice.active,screenMode=this.fullscreen.modeFor('screen');
  const sharer=this.call.people.find(p=>p.id===shared?.owner);
  const screenCaption=remote?`${sharer?.name??'Participante'} está compartilhando · ${shared?.audio?'com áudio':'sem áudio compartilhado'}`:screen?`${this.capture.transmitting?'Você está compartilhando':'Prévia local'} · ${screen.getAudioTracks().some(t=>t.readyState==='live')?'com áudio · prévia silenciada':'sem áudio compartilhado'}`:shared?'Selecionando tela…':'Nenhuma tela compartilhada';
  const privateEntry = !this.call.session?html`<form class="call-entry" @submit=${this.openRoom}>
   <label>Seu nome<input name="name" autocomplete="nickname" maxlength="40" required></label>
   <label class="call-invite">Link de convite<input name="invite" type="text" .value=${parseInvite(location.href)?location.href:''} autocomplete="off" spellcheck="false" placeholder="Cole o link recebido"></label>
   <button type="submit" value="join" ?disabled=${this.call.state==='connecting'}>Entrar por convite</button>
   <details><summary>Sou o proprietário</summary><label>Credencial do proprietário<input name="admin" type="password" autocomplete="off" maxlength="256"></label><button type="submit" value="create" ?disabled=${this.call.state==='connecting'}>Criar sala privada</button></details>
  </form>`:html`<div class="call-room-actions"><span>Sala temporária · até 5 pessoas</span>
   ${this.call.session.host?html`<button type="button" @click=${this.copyInvite}>${this.copied?'Link copiado':'Copiar convite'}</button><button type="button" ?disabled=${this.call.state!=='connected'} @click=${()=>this.call.send({type:'close'})}>Encerrar sala</button>`:nothing}
   <button type="button" @click=${this.teardown}>Sair da sala</button></div>`;
  return html`
  ${channelRoute?html`<header><div><a href="#/call">Voltar ao 2T Call</a><h1>${channelSession?.name??this.channel?.name??'Sala Permanente'}</h1><p>Canal de voz · até cinco pessoas.</p></div></header>
   ${this.channelLoading?html`<p role="status">Carregando sala. O sinalizador pode levar até 90 segundos para iniciar.</p>`:nothing}
   ${!channelId||this.channelError?html`<p class="call-error" role="alert">${this.channelError||'Link inválido da sala permanente.'}</p>
    ${channelId&&!this.channelLoading?html`<button type="button" @click=${this.loadChannel}>Tentar novamente</button>`:nothing}`:nothing}
   ${this.channel&&!channelSession?html`<section class="call-channel-panel" aria-label="Entrada no canal">
    <h2>${this.channel.online}/5 participantes</h2>
    ${!this.channel.online?html`<p>Ninguém conectado. Entre quando quiser.</p>`:nothing}
    <form @submit=${this.joinChannel}><label>Seu nome ou apelido<input name="name" autocomplete="nickname" maxlength="40" required></label>
     ${this.channel.requiresPassword?html`<label>Senha da sala<input name="password" type="password" autocomplete="current-password" maxlength="128" required></label>`:nothing}
     <button type="submit" ?disabled=${channelBusy}>Entrar no canal</button></form>
    ${channelBusy?html`<button type="button" @click=${this.leaveChannel}>Cancelar entrada</button>`:nothing}
    <button type="button" @click=${this.copyChannel}>${this.copied?'Link copiado':'Copiar link'}</button>
   </section>`:nothing}
   ${channelSession?html`<div class="call-room-actions"><button type="button" @click=${this.copyChannel}>${this.copied?'Link copiado':'Copiar link'}</button><button type="button" @click=${this.leaveChannel}>Sair do canal</button></div>`:nothing}
  `:html`<header><div><span class="call-kicker">2T / COMUNICAÇÃO</span><h1>2T Call</h1><p>Voz, vídeo e compartilhamento de tela em um só lugar.</p></div><span class="call-badge">ATÉ 5 PESSOAS</span></header>

  ${isLanding?html`<div class="call-join-grid" aria-label="Escolha como entrar">
   <section class="call-channel-panel" aria-label="Sala Permanente">
    <span class="call-panel-label">01 / ACESSO POR SENHA</span>
    <div class="call-panel-copy"><h2>Sala Permanente</h2><p class="call-note">Entre com a senha da sala, mesmo sem o proprietário conectado.</p></div>
    ${this.lobby?.name?html`<div class="call-lobby-status"><strong>${this.lobby.name}</strong><span>${this.lobby.online}/5 participantes</span></div>`:nothing}
    ${this.lobby?.room?html`<a class="button call-lobby-enter" href=${channelLink(this.lobby.room)}>Entrar na sala</a>`:
     html`<p class="call-note" role="status">${this.channelLoading?'Consultando a sala…':this.lobbyError||
      (this.lobby?.room===null&&this.lobby.setupRequired?'A entrada por aqui fica disponível depois que o proprietário definir a senha.':'Nenhuma sala permanente configurada.')}</p>`}
    ${this.lobbyError?html`<button type="button" @click=${this.loadChannel}>Atualizar sala permanente</button>`:nothing}
    <a class="call-manage-link" href="#/call/gerenciar">Gerenciar sala permanente <span aria-hidden="true">↗</span></a>
   </section>
   <section class="call-private-panel" aria-label="Chamada Privada">
    <span class="call-panel-label">02 / ACESSO POR CONVITE</span>
    <div class="call-panel-copy"><h2>Chamada Privada</h2><p class="call-note">Uma sala temporária para conversar apenas com quem você convidar.</p></div>
    ${privateEntry}
   </section>
  </div>`:privateEntry}`}
  ${!channelRoute||this.call.state!=='idle'?html`<p class="call-connection" role="status">${this.call.notice||({idle:'Sem sala conectada',connecting:'Conectando…',waiting:'Aguardando aprovação do anfitrião',connected:'Conectado',reconnecting:'Reconectando…',closed:'Conexão encerrada'})[this.call.state]}</p>`:nothing}
  ${this.call.session?.approved?html`<div class="call-voice-controls" role="group" aria-label="Chamada de voz">
   ${channelSession?html`<span>No canal${this.microphone?'':' · apenas ouvindo'}</span>`:this.voice.active?html`<span>Na chamada${this.microphone?'':' · apenas ouvindo'}</span><button type="button" @click=${this.leaveVoice}>Sair da chamada</button>`:html`<button type="button" ?disabled=${this.call.state!=='connected'||!this.call.rtc} @click=${this.enterVoice}>Entrar na chamada</button><span>Entre para ouvir. Ative o microfone quando quiser falar.</span>`}
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
  <div class="call-layout" ?data-channel=${!!channelSession} ?hidden=${channelRoute&&!channelSession}>
   <section class="call-stage" aria-label="Tela compartilhada">
    <div class=${`call-preview call-viewer${screenMode==='expanded'?' is-expanded':''}`} role=${screenMode?'dialog':nothing} aria-modal=${screenMode?'true':nothing} aria-label="Visualizador da tela compartilhada"><video autoplay playsinline muted .muted=${true} .srcObject=${screen??null} ?hidden=${!screen} aria-label="Prévia local da tela"></video>
     <div class="call-remote-screen" ?hidden=${!remote} aria-label="Tela recebida"></div>
     ${!screen&&!remote?html`<div class="call-empty"><span class="call-empty-icon" aria-hidden="true"><svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="6" y="8" width="36" height="26" rx="3"></rect><path d="M18 41h12M24 34v7M17 21h14"></path></svg></span><h2>${shared?'Selecionando tela':'Nenhuma tela compartilhada'}</h2><p>${this.voice.active?'Compartilhe uma tela, janela ou aba.':'Entre na chamada para compartilhar com a sala.'}</p></div>`:nothing}
     ${this.viewerControls('screen')}
    </div><p class="call-caption" role="status">${screenCaption}</p>
   </section>
   <aside class="call-people"><h2>Participantes · ${this.call.people.filter(p=>p.connected).length}/5</h2><ol aria-label="Participantes da sala">
    ${repeat(this.call.people,p=>p.id,p=>{const mode=this.fullscreen.modeFor(p.id);return html`<li data-participant=${p.id} class=${shared?.owner===p.id?'call-sharing':''}>
     <div class="call-person"><span class="call-avatar" aria-hidden="true">${p.name.slice(0,2).toLocaleUpperCase()}</span><div><strong>${p.name}${p.id===self?' · você':''}</strong><small>${p.host?'Anfitrião · ':''}${p.connected?'Conectado':'Reconectando'}</small><small class="call-voice-state">${this.voiceStatus(p.id)}</small>${this.speakers.has(p.id)?html`<small class="call-speaking">Falando</small>`:nothing}<small>${p.camera?'Câmera ligada':'Câmera desligada'}${shared?.owner===p.id?' · compartilhando':''}</small></div></div>
     <div class=${`call-camera-frame call-viewer${mode==='expanded'?' is-expanded':''}`} data-camera=${p.id} ?hidden=${!this.viewerSource(p.id)} role=${mode?'dialog':nothing} aria-modal=${mode?'true':nothing} aria-label=${`Câmera de ${p.name}`}>
      ${p.id===self?html`<video autoplay playsinline muted .muted=${true} .srcObject=${this.capture.camera??null} aria-label="Prévia da câmera"></video>`:nothing}
      ${this.viewerControls(p.id,p.name)}
     </div>
     ${this.voice.active&&p.connected&&p.id!==self?this.listeningControls(p.id,p.name):nothing}</li>`})}
    ${channelSession?nothing:Array.from({length:5-this.call.people.length},(_,n)=>html`<li class="call-vacant"><span class="call-avatar" aria-hidden="true">${this.call.people.length+n+1}</span><div><strong>Vaga disponível</strong><small>Sem participante</small></div></li>`)}
   </ol></aside>
  </div>
  <div class="call-controls" role="group" aria-label="Controles locais" ?hidden=${channelRoute&&!channelSession}>
   <button type="button" aria-pressed=${!!this.microphone} ?disabled=${this.micBusy||channelRoute&&this.call.state!=='connected'} @click=${this.toggleMicrophone}>${this.micBusy?'Aguardando microfone…':this.microphone?'Desativar microfone':'Ativar microfone'}</button>
   <button type="button" aria-pressed=${!!this.capture.camera} ?disabled=${this.cameraDisabled} @click=${()=>this.capture.toggleCamera()}>${this.cameraLabel}</button>
   <button type="button" aria-pressed=${!!screen} ?disabled=${this.voice.active&&(this.call.state!=='connected'||!!shared&&shared.owner!==self)} @click=${()=>this.capture.toggleScreen()}>${this.capture.screenBusy?'Cancelar seleção de tela':screen?'Parar compartilhamento':'Compartilhar tela'}</button>
   <button type="button" ?disabled=${!this.microphone&&!screen&&!this.micBusy&&!this.capture.screenBusy&&!this.capture.camera&&!this.capture.cameraBusy} @click=${this.release}>Desligar toda mídia</button>
   ${this.capture.canFlip?html`<button type="button" ?disabled=${this.cameraDisabled||this.capture.cameraBusy} @click=${()=>this.capture.flipCamera()}>Alternar câmera</button>`:nothing}
   ${this.capture.camera&&this.capture.cameras.length>1?html`<label class="call-camera-select">Câmera ativa
    <select aria-label="Câmera ativa" .value=${this.capture.cameraDevice} ?disabled=${this.cameraDisabled||this.capture.cameraBusy} @change=${(event:Event)=>this.capture.selectCamera((event.currentTarget as HTMLSelectElement).value)}>
     ${!this.capture.cameraDevice?html`<option value="" disabled>Câmera atual</option>`:nothing}
     ${this.capture.cameras.map((camera,index)=>html`<option value=${camera.deviceId} ?selected=${camera.deviceId===this.capture.cameraDevice}>${camera.label||`Câmera ${index+1}`}</option>`)}
    </select></label>`:nothing}
  </div>
  ${this.error?html`<p class="call-error" role="alert">${this.error}</p>`:nothing}
  ${this.capture.error?html`<p class="call-error" role="alert">${this.capture.error}</p>`:nothing}
  ${!channelRoute||channelSession?html`<p class="call-note">${channelSession?'Microfone e câmera começam desligados.':this.voice.active?'Microfone, câmera e tela ligados são enviados aos participantes aprovados.':'Fora da chamada, as prévias ficam apenas neste navegador.'} Não há gravação. O áudio da tela depende do navegador e da superfície escolhida.</p>`:nothing}`}
}
