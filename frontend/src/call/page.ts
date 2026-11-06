import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {CallSignaling,callErrors} from './signaling';
import {channelLink,parseChannel,parseInvite,type ChannelStatus} from './protocol';
import {channelDevice,requestChannel,requestChannelLobby} from './channel';
import './channel-owner';
import {VoiceMesh} from './voice';
import {CallPreferences} from './preferences';
import {CallAudioOutput} from './output';
import type {ListeningSource} from './audio-mix';
import {CallCapture} from './capture';
import {screenPresets,screenQualityOptions,type ScreenQuality,type ScreenContent} from './screen-quality';
import {CallMicrophoneProcessing,type MicrophoneMode,type MicrophoneFlag} from './microphone-processing';
import {ScreenFullscreen} from './fullscreen';
import {ScreenPictureInPicture} from './picture-in-picture';
import {repeat} from 'lit/directives/repeat.js';
import {live} from 'lit/directives/live.js';

/** Private WebRTC room. Capture and transport have independent lifecycles. */
@customElement('call-page')
export class CallPage extends LightElement {
 @state() private microphone?:MediaStream;
 @state() private micBusy=false;
 @state() private error='';
 private micRequest=0;
 private micProcessing=new CallMicrophoneProcessing(()=>this.requestUpdate(),stream=>{if(this.microphone){this.microphone=stream;this.voice.setMicrophone(stream)}});
 @state() private roomError='';
 @state() private copied=false;
 @state() private channel?:Extract<ChannelStatus,{room:string}>;
 @state() private lobby?:ChannelStatus;
 @state() private lobbyError='';
 @state() private channelLoading=false;
 @state() private channelError='';
 @state() private speakers=new Set<string>();
 @state() private privateMode:'create'|'join'='create';
 private channelQuery?:AbortController;
 private speakerTimer?:number;
 private channelParticipant?:string;
 private screenOwner?:string;
 private watchOwner?:string;
 private watchGeneration?:number;
 private fullscreen=new ScreenFullscreen(()=>this.requestUpdate());
 private pictureInPicture=new ScreenPictureInPicture(()=>this.requestUpdate());
 private voice=new VoiceMesh(message=>this.call.send(message),()=>this.requestUpdate(),()=>this.querySelector('.call-remote-audio'),()=>{this.call.send({type:'rtc_config'})},
  (role,id)=>role==='screenVideo'?this.querySelector('.call-remote-screen'):this.querySelector(`[data-camera="${id}"]`));
 private preferences=new CallPreferences();
 private restoredPeople=new Set<string>();
 private output=new CallAudioOutput(this.voice,()=>this.requestUpdate(),id=>this.preferences.selectOutput(id));
 private onDevicesChanged=()=>{void this.output.refresh()};
 private lastMedia='';
 private call=new CallSignaling(()=>this.callChanged(),message=>this.voice.receive(message),message=>this.capture.event(message));
 private capture=new CallCapture(()=>({self:this.call.session?.participant??'',remote:this.call.state==='connected'&&this.voice.active,
  screens:this.call.screens,screenLimit:this.call.screenLimit}),message=>this.call.send(message),()=>this.captureChanged(),()=>this.voice.refreshScreenEncoding());
 private setScreenQuality(quality:ScreenQuality){
  if(this.capture.quality===quality)return;
  this.capture.setQuality(quality);
  this.voice.configureScreen(quality,this.capture.content);
  this.requestUpdate();
 }
 private setScreenContent(content:ScreenContent){
  if(this.capture.content===content)return;
  this.capture.setContent(content);
  this.voice.configureScreen(this.capture.quality,content);
  this.requestUpdate();
 }
 private captureChanged(){this.voice.setScreen(this.capture.transmitting?this.capture.screen:undefined);this.voice.setCamera(this.capture.camera);this.publishMedia();this.requestUpdate()}
 protected updated(){
  this.voice.mountMedia();
  this.fullscreen.sync(this.viewerSource);
  this.pictureInPicture.sync(this.querySelector('.call-remote-screen:not([hidden])'));
 }
 private viewerSource=(viewer:string):MediaStream|string|undefined=>{
  if(viewer==='screen')return this.screenSource();
  if(!this.voice.active)return;
  if(viewer===this.call.session?.participant)return this.capture.camera?viewer:undefined;
  if(this.call.people.some(person=>person.id===viewer&&person.camera))return viewer;
 };
 private screenSource():MediaStream|string|undefined{
  const screen=this.watchedScreen,preview=this.localPreview;
  if(preview?.getVideoTracks().some(t=>t.readyState==='live'))return preview;
  if(screen&&screen.owner!==this.call.session?.participant)return `${screen.owner}:${screen.generation}`;
 }
 private get activeScreens(){return this.voice.active?this.call.screens.filter(screen=>screen.active):[]}
 private get viewedScreen(){
  const screens=this.activeScreens;
  return screens.find(screen=>screen.owner===this.screenOwner)??screens[0];
 }
 private get watchedScreen(){
  const screen=this.viewedScreen;
  return screen?.owner===this.watchOwner&&screen?.generation===this.watchGeneration?screen:undefined;
 }
 private toggleWatch(){
  const screen=this.viewedScreen;
  if(!screen||screen.owner===this.call.session?.participant)return;
  if(this.watchedScreen){this.watchOwner=undefined;this.watchGeneration=undefined}
  else{this.watchOwner=screen.owner;this.watchGeneration=screen.generation}
  this.voice.selectScreen(this.watchedScreen);
  this.requestUpdate();
 }
 private get localPreview(){
  const viewed=this.viewedScreen;
  return !viewed||viewed.owner===this.call.session?.participant?this.capture.screen:undefined;
 }
 private selectScreen(owner:string){
  if(this.screenOwner!==owner){this.watchOwner=undefined;this.watchGeneration=undefined}
  this.screenOwner=owner;
  this.voice.selectScreen(this.watchedScreen);
  this.requestUpdate();
 }
 connectedCallback(){super.connectedCallback();this.classList.add('call-page');window.addEventListener('pagehide',this.teardown);window.addEventListener('hashchange',this.routeChanged);navigator.mediaDevices?.addEventListener?.('devicechange',this.onDevicesChanged);void this.output.refresh();this.loadChannel()}
 disconnectedCallback(){window.removeEventListener('pagehide',this.teardown);window.removeEventListener('hashchange',this.routeChanged);navigator.mediaDevices?.removeEventListener?.('devicechange',this.onDevicesChanged);this.teardown();super.disconnectedCallback()}
 private teardown=()=>{
  this.channelQuery?.abort();this.channelQuery=undefined;this.channelLoading=false;
  this.stopSpeakers();this.restoredPeople.clear();this.channelParticipant=undefined;this.screenOwner=undefined;this.watchOwner=undefined;this.watchGeneration=undefined;
  this.fullscreen.close();this.pictureInPicture.sync(null);this.voice.stop(true);this.output.reset();this.release();this.call.leave();this.lastMedia='';
 };
 private routeChanged=()=>{
  // A mounted Call page is owned by the application shell, not its current route.
  // Navigating to Ações, Learn or Calculadoras must not stop an ongoing call.
  if(this.call.session){this.fullscreen.close();this.requestUpdate();return}
  this.teardown();this.channel=undefined;this.lobby=undefined;
  this.channelError='';this.lobbyError='';this.roomError='';this.copied=false;
  this.loadChannel();this.requestUpdate();
 };
 toggleDockMicrophone(){if(this.call.session)void this.toggleMicrophone()}
 toggleDockDeafen(){this.toggleDeafen()}
 leaveFromDock(){this.teardown();this.requestUpdate()}
 private announceCall(){
  const session=this.call.session;
  this.dispatchEvent(new CustomEvent('call-session-change',{
   bubbles:true,composed:true,
   detail:session?{active:true,mode:session.mode==='channel'?'channel':'private',
    name:session.name??'Chamada privada',room:session.room,microphone:!!this.microphone,voiceActive:this.voice.active,deafened:this.deafened,
    participants:this.call.people.filter(p=>p.connected).length,state:this.call.state}
    :{active:false}
  }));
 }

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
  this.channelError='';this.preferences.rememberName(name);this.call.start({type:'channel_join',room,name,device:channelDevice(),password:secret||undefined});
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
   this.voice.stop(true);this.restoredPeople.clear();this.screenOwner=undefined;this.watchOwner=undefined;this.watchGeneration=undefined;if(this.call.state==='closed')this.release();this.lastMedia='';
  }else{
   if(this.call.state==='reconnecting')this.lastMedia='';
   const viewed=this.viewedScreen;
   if(viewed)this.screenOwner=viewed.owner;
   if(this.call.session)this.voice.sync(this.call.session.participant,this.call.people,this.call.rtc,this.call.state==='connected',this.watchedScreen);
   if(session?.mode==='channel'&&this.call.state==='connected'&&this.call.rtc&&!this.voice.active)this.enterVoice();
   if(this.voice.active)this.restoreListening();
   this.publishMedia();
  }
  this.updateSpeakers();
  this.announceCall();
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
  this.voice.sync(this.call.session!.participant,this.call.people,this.call.rtc,true,this.watchedScreen);
  this.restoreListening();
  if(this.preferences.output&&this.output.supported)void this.output.choose(this.preferences.output);
  this.publishMedia();
 }
 private leaveVoice(){this.restoredPeople.clear();this.pictureInPicture.sync(null);this.screenOwner=undefined;this.watchOwner=undefined;this.watchGeneration=undefined;this.voice.stop();this.voice.audioMix.setDeafened(false);this.release();this.publishMedia()}
 private voiceStatus(id:string){
  const person=this.call.people.find(p=>p.id===id);
  if(!person?.voice)return 'Fora da chamada';
  if(!this.voice.active||id===this.call.session?.participant)return person.microphone?'Microfone ligado':'Microfone desligado';
  const peer=this.voice.peers.get(id);
  return !peer?'Conectando áudio':peer.failed?'Falha no áudio':peer.pc.connectionState==='connected'?`Áudio conectado · ${person.microphone?'microfone ligado':'microfone desligado'}`:peer.attempts?'Reconectando áudio':'Conectando áudio';
 }
 private rememberListening(id:string){
  const person=this.call.people.find(person=>person.id===id);
  if(!person)return;
  const normalized=person.name.trim().toLocaleLowerCase('pt-BR');
  if(this.call.people.filter(other=>other.name.trim().toLocaleLowerCase('pt-BR')===normalized).length!==1)return;
  const {microphone,screenAudio,muted}=this.voice.audioMix.level(id);
  this.preferences.rememberListening(person.name,{microphone,screenAudio,muted});
 }
 private restoreListening(){
  const others=this.call.people.filter(person=>person.id!==this.call.session?.participant);
  for(const id of this.restoredPeople)if(!others.some(person=>person.id===id))this.restoredPeople.delete(id);
  for(const person of others){
   if(this.restoredPeople.has(person.id))continue;
   this.restoredPeople.add(person.id);
   const normalized=person.name.trim().toLocaleLowerCase('pt-BR');
   if(others.filter(other=>other.name.trim().toLocaleLowerCase('pt-BR')===normalized).length!==1)continue;
   const saved=this.preferences.listening(person.name);
   if(!saved)continue;
   const mixer=this.voice.audioMix;
   mixer.volume(person.id,'microphone',saved.microphone);
   mixer.volume(person.id,'screenAudio',saved.screenAudio);
   if(saved.muted)mixer.mute(person.id);
  }
 }
 private listeningSlider(id:string,source:ListeningSource,label:string){
  const mixer=this.voice.audioMix,volume=mixer.level(id)[source];
  return html`<label><span>${label} <output>${volume}%</output></span>
    <input type="range" min="0" max="200" step="1" .value=${String(volume)} aria-label=${label} aria-valuetext=${`${volume}%`}
     @input=${(event:Event)=>{mixer.volume(id,source,(event.currentTarget as HTMLInputElement).valueAsNumber);this.rememberListening(id)}}>
   </label>
   ${volume>100&&!mixer.canAmplify(id,source)?html`<small>Ganho acima de 100% indisponível.</small>`:nothing}`;
 }
 private listeningControls(id:string,name:string,sharingAudio:boolean){
  const mixer=this.voice.audioMix,{microphone,screenAudio,muted}=mixer.level(id);
  const atDefault=microphone===100&&(!sharingAudio||screenAudio===100);
  return html`<div class="call-listening" role="group" aria-label=${`Áudio recebido de ${name}`}>
   ${this.listeningSlider(id,'microphone','Volume da voz')}
   ${sharingAudio?this.listeningSlider(id,'screenAudio','Volume da transmissão'):nothing}
   <div class="call-listening-actions">
    <button type="button" @click=${()=>{mixer.mute(id);this.rememberListening(id)}}>${muted?'Ouvir novamente':'Silenciar'}</button>
    <button type="button" aria-label=${`Restaurar volumes de ${name} a 100%`} ?disabled=${atDefault}
     @click=${()=>{mixer.volume(id,'microphone',100);if(sharingAudio)mixer.volume(id,'screenAudio',100);this.rememberListening(id)}}>100%</button>
   </div>
   ${muted?html`<small class="call-listening-state">Silenciado para você</small>`:nothing}
  </div>`;
 }
 private openRoom(event:SubmitEvent){
  event.preventDefault();const form=event.currentTarget as HTMLFormElement,data=new FormData(form);
  const name=String(data.get('name')??'').trim();this.roomError='';this.copied=false;
  if(!name){this.roomError='Informe seu nome.';return}
  this.preferences.rememberName(name);
  if((event.submitter as HTMLButtonElement)?.value==='create'){
   this.call.start({type:'create',name});
  }else{
   const invite=parseInvite(String(data.get('invite')??''));if(!invite){this.roomError='Cole um convite válido deste site.';return}
   this.call.start({type:'join',name,...invite});
  }
 }
 private async copyInvite(){
  const session=this.call.session;if(!session?.invite)return;
  const url=new URL(location.href);url.hash=`/call/${session.room}?invite=${session.invite}`;
  try{await navigator.clipboard.writeText(url.href);this.copied=true;this.roomError=''}catch{this.roomError='Não foi possível copiar. Permita o acesso à área de transferência.'}
 }
 private stop(stream?:MediaStream){stream?.getTracks().forEach(track=>{track.onended=null;track.stop()})}
 private stopMicrophone(){this.micRequest++;this.micProcessing.stop();this.stop(this.microphone);this.microphone=undefined;this.micBusy=false;this.voice.setMicrophone();this.publishMedia();this.announceCall()}
 private get deafened(){return this.voice.audioMix.deafened}
 private toggleDeafen(){
  if(!this.voice.active)return;
  const deafened=!this.deafened;
  this.voice.audioMix.setDeafened(deafened);
  if(deafened){this.error='';this.stopMicrophone()}
  else this.announceCall();
 }
 private deafenControl(){
  return html`<button type="button" aria-pressed=${this.deafened} @click=${this.toggleDeafen}>Ensurdecer</button>`;
 }
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
  if(this.micBusy||this.deafened)return;
  if(this.microphone){this.stopMicrophone();return}
  this.error='';
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){this.error='O microfone exige um navegador compatível e HTTPS ou localhost.';return}
  const request=++this.micRequest;this.micBusy=true;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:this.micProcessing.constraints(),video:false});
   if(!this.isConnected||request!==this.micRequest){this.stop(stream);return}
   if(!stream.getAudioTracks().some(t=>t.readyState==='live')){this.stop(stream);throw new DOMException('No audio','NotFoundError')}
   const outgoing=await this.micProcessing.attach(stream);
   if(!this.isConnected||request!==this.micRequest){this.micProcessing.stop();return}
   this.microphone=outgoing;
   this.voice.setMicrophone(outgoing);this.publishMedia();this.announceCall();
   stream.getAudioTracks().forEach(track=>track.onended=()=>{if(this.microphone===outgoing){this.stopMicrophone();this.error='O microfone foi desconectado ou teve o acesso encerrado.'}});
  }catch(error){if(this.isConnected&&request===this.micRequest)this.error=this.message(error,false)}
  finally{if(request===this.micRequest)this.micBusy=false}
 }
 private microphoneSettings(){
  const processor=this.micProcessing,supported=processor.supported;
  const flag=(key:MicrophoneFlag,label:string)=>supported[key]===false?nothing:html`<label class="call-mic-check">
   <input type="checkbox" .checked=${processor.flags[key]} @change=${(event:Event)=>void processor.setFlag(key,(event.currentTarget as HTMLInputElement).checked)}/>${label}
  </label>`;
  return html`<details class="call-microphone-settings">
   <summary>Configurações do microfone</summary>
   <div class="call-microphone-settings-content">
    <label>Processamento
     <select aria-label="Processamento do microfone" .value=${processor.mode}
      @change=${(event:Event)=>void processor.selectMode((event.currentTarget as HTMLSelectElement).value as MicrophoneMode)}>
      <option value="clean">Voz limpa</option>
      <option value="natural">Som natural</option>
      <option value="custom">Personalizado</option>
     </select>
    </label>
    <div class="call-microphone-flags" role="group" aria-label="Filtros do microfone">
     ${flag('noiseSuppression','Redução de ruídos')}
     ${flag('echoCancellation','Cancelamento de eco')}
     ${flag('autoGainControl','Ganho automático')}
    </div>
    ${processor.hasGate?html`<label>Sensibilidade de voz <output>${processor.sensitivity===0?'Desativada':`${processor.sensitivity}%`}</output>
     <input type="range" min="0" max="100" step="5" aria-label="Sensibilidade de voz"
      .value=${String(processor.sensitivity)}
      @input=${(event:Event)=>void processor.setSensitivity((event.currentTarget as HTMLInputElement).valueAsNumber)}/>
    </label>`:nothing}
    ${processor.error?html`<small role="status">${processor.error}</small>`:nothing}
   </div>
  </details>`;
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
   <button type="button" aria-pressed=${!!this.microphone} ?disabled=${this.deafened||this.micBusy||this.call.state==='reconnecting'} @click=${this.toggleMicrophone}>${this.micBusy?'Aguardando microfone…':this.microphone?'Mutar microfone':'Desmutar microfone'}</button>
   <button type="button" aria-pressed=${!!this.capture.camera} ?disabled=${this.cameraDisabled} @click=${()=>this.capture.toggleCamera()}>${this.cameraLabel}</button>
   ${this.voice.active?this.deafenControl():nothing}
   ${this.error||this.capture.error?html`<span class="call-viewer-error" role="status">${this.error||this.capture.error}</span>`:nothing}
  </div>`:nothing}`;
 }
 render(){const self=this.call.session?.participant,screen=this.localPreview,shared=this.viewedScreen,screens=this.activeScreens;
  const channelSession=this.call.session?.mode==='channel'?this.call.session:undefined;
  const channelRoute=location.hash.startsWith('#/call/sala/')||!!channelSession,channelId=parseChannel(location.href)??channelSession?.room;
  const channelBusy=this.call.state==='connecting'||this.call.state==='reconnecting';
  const isLanding=!channelRoute&&!this.call.session&&!parseInvite(location.href);
  if(location.hash==='#/call/gerenciar'&&!this.call.session)return html`<call-channel-owner></call-channel-owner>`;
  const remote=!!this.watchedScreen?.active&&shared?.owner!==self&&this.voice.active,screenMode=this.fullscreen.modeFor('screen');
  const listeningStatus=this.deafened?' · Ensurdecido':this.microphone?'':' · apenas ouvindo';
  const sharer=this.call.people.find(p=>p.id===shared?.owner);
  const selecting=this.call.screens.some(screen=>!screen.active);
  const sending=screen&&this.capture.transmitting?this.voice.sentScreenQuality():undefined;
  const measured=remote&&shared?this.voice.receivedScreenQuality(shared.owner):sending?.quality;
  const mediaStats=remote||sending?
   measured?
    `${remote?'Recebendo':'Enviando'} · ${measured.width}×${measured.height} · ${Math.round(measured.fps)} FPS${measured.kbps!==undefined?` · ${(measured.kbps/1000).toFixed(1).replace('.',',')} Mbps`:''}`:
    sending?.viewers===0?'Sem espectadores · qualidade será medida ao assistir':
    'Medindo resolução e FPS reais…':
   '';
  const screenCaption=remote?`${sharer?.name??'Participante'} está compartilhando · ${shared?.audio?'com áudio':'sem áudio compartilhado'}`:shared?.active&&shared.owner!==self&&this.voice.active?`${sharer?.name??'Participante'} está transmitindo · selecione Assistir`:screen?`${this.capture.transmitting?'Você está compartilhando':'Prévia local'} · ${screen.getAudioTracks().some(t=>t.readyState==='live')?'com áudio · prévia silenciada':'sem áudio compartilhado'}`:selecting?'Selecionando tela…':'Nenhuma tela compartilhada';
  const entryMode=parseInvite(location.href)?'join':this.privateMode;
  const privateEntry = !this.call.session?html`<div class="call-private-entry">
   <div class="call-entry-switch" role="group" aria-label="Tipo de chamada privada">
    <button type="button" aria-pressed=${entryMode==='create'} @click=${()=>this.privateMode='create'}>Criar uma sala</button>
    <button type="button" aria-pressed=${entryMode==='join'} @click=${()=>this.privateMode='join'}>Usar convite</button>
   </div>
   <form class="call-entry" @submit=${this.openRoom}>
    <label>Seu nome<input name="name" autocomplete="nickname" maxlength="40" value=${this.preferences.nickname} placeholder="Seu nome ou apelido" required></label>
    ${entryMode==='join'?html`<label class="call-invite">Link recebido<input name="invite" type="text" .value=${parseInvite(location.href)?location.href:''} autocomplete="off" spellcheck="false" placeholder="Cole o convite aqui" required></label>`:nothing}
    <button class="call-primary-action" type="submit" value=${entryMode} ?disabled=${this.call.state==='connecting'}>${entryMode==='create'?'Criar sala privada':'Entrar por convite'}</button>
   </form>
   ${entryMode==='join'?html`<p class="call-entry-hint">O anfitrião aprova a entrada dos convidados.</p>`:nothing}
  </div>`:html`<div class="call-room-actions"><span>Sala temporária · até 5 pessoas</span>
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
    <form @submit=${this.joinChannel}><label>Seu nome ou apelido<input name="name" autocomplete="nickname" maxlength="40" value=${this.preferences.nickname} required></label>
     ${this.channel.requiresPassword?html`<label>Senha da sala<input name="password" type="password" autocomplete="current-password" maxlength="128" required></label>`:nothing}
     <button type="submit" ?disabled=${channelBusy}>Entrar no canal</button></form>
    ${channelBusy?html`<button type="button" @click=${this.leaveChannel}>Cancelar entrada</button>`:nothing}
    <button type="button" @click=${this.copyChannel}>${this.copied?'Link copiado':'Copiar link'}</button>
   </section>`:nothing}
   ${channelSession?html`<div class="call-room-actions"><button type="button" @click=${this.copyChannel}>${this.copied?'Link copiado':'Copiar link'}</button><button type="button" @click=${this.leaveChannel}>Sair do canal</button></div>`:nothing}
  `:html`<header><div><span class="call-kicker">2T / COMUNICAÇÃO</span><h1>2T Call</h1></div><span class="call-badge">CONVERSAS PRIVADAS · 5 PESSOAS</span></header>

  ${isLanding?html`<div class="call-join-grid" aria-label="Escolha como entrar">
   <section class="call-channel-panel" aria-label="Sala Permanente">
    
    <div class="call-panel-copy"><h2>Sala Permanente</h2><p class="call-note">Acesso pelo link do canal.</p></div>
    ${this.lobby?.name?html`<div class="call-lobby-status"><strong>${this.lobby.name}</strong><span>${this.lobby.online}/5 participantes</span></div>`:nothing}
    ${this.lobby?.room?html`<a class="button call-lobby-enter call-primary-action" href=${channelLink(this.lobby.room)}>Entrar na sala <span aria-hidden="true">→</span></a>`:
     html`<p class="call-note" role="status">${this.channelLoading?'Consultando a sala…':this.lobbyError||
      (this.lobby?.room===null&&this.lobby.setupRequired?'A entrada por aqui fica disponível depois que o proprietário definir a senha.':'Nenhuma sala permanente configurada.')}</p>`}
    ${this.lobbyError?html`<button type="button" @click=${this.loadChannel}>Atualizar sala permanente</button>`:nothing}
    <a class="call-manage-link" href="#/call/gerenciar">Gerenciar sala permanente <span aria-hidden="true">↗</span></a>
   </section>
   <section class="call-private-panel" aria-label="Chamada Privada">
    
    <div class="call-panel-copy"><h2>Chamada Privada</h2><p class="call-note">Entrada por convite.</p></div>
    ${privateEntry}
   </section>
  </div>`:privateEntry}`}
  ${this.call.session?html`<div class="call-session-heading" aria-label="Canal de voz">
   <div class="call-session-title"><span class="call-session-eyebrow">CANAL DE VOZ</span><h2>${channelSession?'Sala permanente':'Sala privada'}</h2></div>
   <div class="call-session-count"><span class="call-presence-dot" aria-hidden="true"></span>${this.call.people.filter(p=>p.connected).length} de 5 participantes</div>
  </div>`:nothing}
  ${this.call.session||this.call.state!=='idle'?html`<p class="call-connection" role="status">${this.call.notice||({idle:'Sem sala conectada',connecting:'Conectando…',waiting:'Aguardando aprovação do anfitrião',connected:'Conectado',reconnecting:'Reconectando…',closed:'Conexão encerrada'})[this.call.state]}</p>`:nothing}
  ${this.call.session?.approved?html`<div class="call-voice-controls" role="group" aria-label="Chamada de voz">
   ${channelSession?html`<span>No canal${listeningStatus}</span>`:this.voice.active?html`<span>Na chamada${listeningStatus}</span><button type="button" @click=${this.leaveVoice}>Sair da chamada</button>`:html`<button type="button" ?disabled=${this.call.state!=='connected'||!this.call.rtc} @click=${this.enterVoice}>Entrar na chamada</button><span>Entre para ouvir. Ative o microfone quando quiser falar.</span>`}
   ${!this.deafened&&this.voice.blocked?html`<button type="button" @click=${()=>this.voice.unlockAudio()}>Liberar áudio</button>`:nothing}
   ${this.voice.error?html`<button type="button" ?disabled=${this.call.state!=='connected'} @click=${()=>this.voice.retry()}>Reconectar áudio</button>`:nothing}
  </div>`:nothing}
  ${this.voice.error?html`<p class="call-error" role="alert">${this.voice.error}</p>`:nothing}
  <div class="call-remote-audio" aria-hidden="true"></div>
  ${this.roomError||this.call.error?html`<p class="call-error" role="alert">${this.roomError||this.call.error}</p>`:nothing}
  ${this.call.requests.length?html`<section class="call-requests" aria-label="Solicitações de entrada"><h2>Aguardando aprovação</h2>${this.call.requests.map(p=>html`<div><span>${p.name}</span><button type="button" @click=${()=>this.call.send({type:'admit',target:p.id})} ?disabled=${this.call.state!=='connected'}>Aceitar ${p.name}</button><button type="button" @click=${()=>this.call.send({type:'reject',target:p.id})} ?disabled=${this.call.state!=='connected'}>Recusar ${p.name}</button></div>`)}</section>`:nothing}
  <div class="call-controls" role="group" aria-label="Controles locais" ?hidden=${!this.call.session}>
   <span class="call-controls-label">CONTROLES</span>
   <button class="call-control-secondary" type="button" aria-pressed=${this.preferences.layout==='compact'} @click=${()=>{
    this.preferences.setLayout(this.preferences.layout==='compact'?'regular':'compact');this.requestUpdate();
   }}>Visão compacta</button>
   <button class="call-control-microphone" type="button" aria-pressed=${!!this.microphone} ?disabled=${this.deafened||this.micBusy||channelRoute&&this.call.state!=='connected'} @click=${this.toggleMicrophone}>${this.micBusy?'Aguardando microfone…':this.microphone?'Desativar microfone':'Ativar microfone'}</button>
   ${this.voice.active?this.deafenControl():nothing}
   <button class="call-control-camera" type="button" aria-pressed=${!!this.capture.camera} ?disabled=${this.cameraDisabled} @click=${()=>this.capture.toggleCamera()}>${this.cameraLabel}</button>
   <button class="call-control-screen" type="button" aria-pressed=${!!this.capture.screen} ?disabled=${this.voice.active&&this.call.state!=='connected'} @click=${()=>this.capture.toggleScreen()}>${this.capture.screenBusy?'Cancelar seleção de tela':this.capture.screen?'Parar compartilhamento':'Compartilhar tela'}</button>
   ${this.voice.active?html`<div class="call-share-quality" role="group" aria-label="Qualidade de compartilhamento">
    <label>Qualidade do vídeo
     <select aria-label="Qualidade da transmissão" .value=${this.capture.quality}
      @change=${(event:Event)=>this.setScreenQuality((event.currentTarget as HTMLSelectElement).value as ScreenQuality)}>
      ${screenQualityOptions.map(key=>html`<option value=${key}>${screenPresets[key].label}</option>`)}
     </select>
    </label>
    <label>Conteúdo
     <select aria-label="Tipo de transmissão" .value=${this.capture.content}
      @change=${(event:Event)=>this.setScreenContent((event.currentTarget as HTMLSelectElement).value as ScreenContent)}>
      <option value="screen">Tela e textos</option>
      <option value="game">Jogos e movimento</option>
     </select>
    </label>
   </div>`:nothing}
   <button class="call-control-secondary" type="button" ?disabled=${!this.microphone&&!this.capture.screen&&!this.micBusy&&!this.capture.screenBusy&&!this.capture.camera&&!this.capture.cameraBusy} @click=${this.release}>Desligar toda mídia</button>
   ${this.capture.canFlip?html`<button class="call-control-secondary" type="button" ?disabled=${this.cameraDisabled||this.capture.cameraBusy} @click=${()=>this.capture.flipCamera()}>Alternar câmera</button>`:nothing}
   ${this.capture.camera&&this.capture.cameras.length>1?html`<label class="call-camera-select">Câmera ativa
    <select aria-label="Câmera ativa" .value=${this.capture.cameraDevice} ?disabled=${this.cameraDisabled||this.capture.cameraBusy} @change=${(event:Event)=>this.capture.selectCamera((event.currentTarget as HTMLSelectElement).value)}>
     ${!this.capture.cameraDevice?html`<option value="" disabled>Câmera atual</option>`:nothing}
     ${this.capture.cameras.map((camera,index)=>html`<option value=${camera.deviceId} ?selected=${camera.deviceId===this.capture.cameraDevice}>${camera.label||`Câmera ${index+1}`}</option>`)}
    </select></label>`:nothing}
  </div>
  <div class=${`call-layout${this.preferences.layout==='compact'?' is-compact':''}`} ?data-channel=${!!channelSession} ?data-sharing=${!!screen||!!shared?.active} ?hidden=${!this.call.session}>
   <section class="call-stage" aria-label="Tela compartilhada"><div class="call-stage-heading"><h2>Compartilhamento de tela</h2><span>${!!screen||!!shared?.active?'Transmissão disponível':'Nenhuma transmissão'}</span></div>
    ${screens.length>1?html`<div class="call-screen-options" role="group" aria-label="Transmissões disponíveis">
     ${repeat(screens,source=>source.owner,source=>html`<button type="button" aria-pressed=${source.owner===shared?.owner}
      @click=${()=>this.selectScreen(source.owner)}>${this.call.people.find(p=>p.id===source.owner)?.name??'Participante'}${source.owner===self?' · você':''}</button>`)}
    </div>`:nothing}
    ${this.voice.active&&shared?.active&&shared.owner!==self?html`<div class="call-watch-actions" role="group" aria-label="Assistir transmissão">
     <button type="button" aria-pressed=${remote} @click=${this.toggleWatch}>${remote?'Parar de assistir':'Assistir'}</button>
    </div>`:nothing}
    <div class=${`call-preview call-viewer${screenMode==='expanded'?' is-expanded':''}`} role=${screenMode?'dialog':nothing} aria-modal=${screenMode?'true':nothing} aria-label="Visualizador da tela compartilhada"><video autoplay playsinline muted .muted=${true} .srcObject=${screen??null} ?hidden=${!screen} aria-label="Prévia local da tela"></video>
     <div class="call-remote-screen" ?hidden=${!remote} aria-label="Tela recebida"></div>
     ${remote&&!screenMode&&this.pictureInPicture.available?html`
      <button class="call-viewer-toggle call-pip" type="button" aria-pressed=${this.pictureInPicture.active}
       ?disabled=${this.pictureInPicture.busy} @click=${()=>void this.pictureInPicture.toggle()}>
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 11h6v5h-6z"/></svg>
       <span>Janela flutuante</span>
      </button>
      ${this.pictureInPicture.error?html`<div class="call-viewer-media"><span class="call-viewer-error" role="status">${this.pictureInPicture.error}</span></div>`:nothing}
     `:nothing}
     ${!screen&&!remote?html`<div class="call-empty"><span class="call-empty-icon" aria-hidden="true"><svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="6" y="8" width="36" height="26" rx="3"></rect><path d="M18 41h12M24 34v7M17 21h14"></path></svg></span><h2>${selecting?'Selecionando tela':shared?.active?'Transmissão disponível':'Nenhuma tela compartilhada'}</h2><p>${shared?.active?'Clique em Assistir para acompanhar a transmissão.':this.voice.active?'Compartilhe uma tela, janela ou aba.':'Entre na chamada para compartilhar com a sala.'}</p></div>`:nothing}
     ${this.viewerControls('screen')}
    </div><p class="call-caption" role="status">${screenCaption}</p>
    ${mediaStats?html`<p class="call-video-stats" aria-label="Qualidade real do vídeo">${mediaStats}</p>`:nothing}
   </section>
   <aside class="call-people"><div class="call-people-heading"><span class="call-people-kicker">NA SALA</span><h2>Participantes · ${this.call.people.filter(p=>p.connected).length}/5</h2></div><ol aria-label="Participantes da sala">
    ${repeat(this.call.people,p=>p.id,p=>{const mode=this.fullscreen.modeFor(p.id),share=screens.find(source=>source.owner===p.id);return html`<li data-participant=${p.id} class=${share?'call-sharing':''}>
     <div class="call-person"><span class="call-avatar" aria-hidden="true">${p.name.slice(0,2).toLocaleUpperCase()}</span><div><strong>${p.name}${p.id===self?' · você':''}</strong><small>${p.host?'Anfitrião · ':''}${p.connected?'Conectado':'Reconectando'}</small><small class="call-voice-state">${this.voiceStatus(p.id)}</small>${this.speakers.has(p.id)?html`<small class="call-speaking">Falando</small>`:nothing}<small class=${p.camera||share?'call-camera-status is-active':'call-camera-status'}>${p.camera?'Câmera ligada':'Câmera desligada'}${share?' · compartilhando':''}</small></div></div>
     <div class=${`call-camera-frame call-viewer${mode==='expanded'?' is-expanded':''}`} data-camera=${p.id} ?hidden=${!this.viewerSource(p.id)} role=${mode?'dialog':nothing} aria-modal=${mode?'true':nothing} aria-label=${`Câmera de ${p.name}`}>
      ${p.id===self?html`<video autoplay playsinline muted .muted=${true} .srcObject=${this.capture.camera??null} aria-label="Prévia da câmera"></video>`:nothing}
      ${this.viewerControls(p.id,p.name)}
     </div>
     ${this.voice.active&&p.connected&&p.id!==self?this.listeningControls(p.id,p.name,!!share?.audio):nothing}</li>`})}
    ${nothing}
   </ol></aside>
  </div>
  <div class="call-devices" ?hidden=${!this.voice.active}>
  ${this.voice.active?this.microphoneSettings():nothing}
  ${this.voice.active&&this.output.supported?html`<div class="call-audio-output" role="group" aria-label="Saída de áudio">
   <label>Saída de áudio
    <select aria-label="Dispositivo de saída" .value=${live(this.output.sinkId)} ?disabled=${this.output.busy}
     @change=${(event:Event)=>void this.output.choose((event.currentTarget as HTMLSelectElement).value)}>
     <option value="">Padrão do sistema</option>
     ${this.output.choices.map((device,index)=>html`<option value=${device.deviceId}>${device.label||"Saída "+(index+1)}</option>`)}
     ${this.output.sinkId&&!this.output.choices.some(device=>device.deviceId===this.output.sinkId)?
       html`<option value=${this.output.sinkId}>Dispositivo selecionado</option>`:nothing}
    </select>
   </label>
   ${this.output.canPrompt?html`<button type="button" ?disabled=${this.output.busy} @click=${()=>void this.output.prompt()}>Escolher dispositivo</button>`:nothing}
   ${this.output.error?html`<small role="status">${this.output.error}</small>`:nothing}
  </div>`:nothing}
  </div>
  ${this.error?html`<p class="call-error" role="alert">${this.error}</p>`:nothing}
  ${this.capture.error?html`<p class="call-error" role="alert">${this.capture.error}</p>`:nothing}
  `}
}
