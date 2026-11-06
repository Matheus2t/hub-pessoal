import type {Participant,RemoteSignal,RtcConfig,Signal,MediaRole,MediaRoles,RoomScreen} from './protocol';
import {CallAudioMix} from './audio-mix';

type VoiceSignal = {type:'offer'|'answer';sdp:string;roles:MediaRoles}|{type:'ice';candidate:RTCIceCandidateInit|null};
const roles:MediaRole[]=['microphone','screenAudio','screenVideo','camera'];
const kind=(role:MediaRole)=>role==='microphone'||role==='screenAudio'?'audio':'video';
export interface VoiceStats {received:number;lost:number;jitterMs?:number;rttMs?:number;relay:boolean;path:'unknown'|'direct'|'relay'}
interface Peer {
 id:string;epoch:number;pc:RTCPeerConnection;sender?:RTCRtpSender;audio:HTMLAudioElement;
 transceivers:Partial<Record<MediaRole,RTCRtpTransceiver>>;remoteRoles?:MediaRoles;
 streams:Partial<Record<MediaRole,MediaStream>>;elements:Record<MediaRole,HTMLMediaElement>;
 outbound:Partial<Record<MediaRole,{bytes:number;time:number}>>;uploadKbps:number;limited:boolean;clearSamples:number;
 blockedElements:Set<HTMLMediaElement>;videoStats:Partial<Record<MediaRole,{fps?:number;width?:number;height?:number;frames:number;encoderMsPerFrame?:number;limitation:string}>>;
 polite:boolean;makingOffer:boolean;settingAnswer:boolean;ignored:Set<string>;candidates:(RTCIceCandidateInit|null)[];
 queue:Promise<void>;attempts:number;timer?:number;resignal:boolean;blocked:boolean;failed:boolean;stats?:VoiceStats;phase?:string;failure?:string;
}
const ufrags=(sdp:string)=>new Set([...sdp.matchAll(/^a=ice-ufrag:(.+)$/gm)].map(m=>m[1].trim()));

/** One connection per pair, four explicit MID roles; toggles only replace tracks. */
export class VoiceMesh {
 active=false;error='';
 readonly peers=new Map<string,Peer>();
 readonly audioMix=new CallAudioMix(()=>this.changed());
 private self='';private epoch=0;private people:Participant[]=[];private rtc?:RtcConfig;private ready=false;
 private microphone?:MediaStreamTrack;private refresh?:number;private sampling?:number;private measuring=false;
 private sources:Partial<Record<MediaRole,MediaStreamTrack>>={};private screen:RoomScreen|null=null;
 private outputSink='';
 constructor(private send:(message:Signal)=>boolean,private changed:()=>void,
  private audioRoot:()=>HTMLElement|null,private refreshConfig:()=>void,
  private videoRoot:(role:'screenVideo'|'camera',id:string)=>HTMLElement|null=()=>null){}
 get blocked(){return this.audioMix.blocked||[...this.peers.values()].some(p=>p.blocked)}
 /** Select the destination for microphone audio and shared audio, including Web Audio. */
 async setAudioOutput(sinkId:string){
  if(this.outputSink===sinkId)return;
  const previous=this.outputSink;
  const elements=()=>[...this.peers.values()].flatMap(peer=>
   [peer.elements.microphone,peer.elements.screenAudio] as HTMLAudioElement[]);
  this.outputSink=sinkId;
  try{
   await this.audioMix.setOutputSink(sinkId);
   await Promise.all(elements().map(element=>element.setSinkId(sinkId)));
  }catch(error){
   this.outputSink=previous;
   await Promise.allSettled([...elements().map(element=>element.setSinkId(previous)),this.audioMix.setOutputSink(previous)]);
   throw error;
  }
 }
 start(){
  if(this.active)return;
  if(!window.RTCPeerConnection){this.error='WebRTC indisponível neste navegador.';this.changed();return}
  this.audioMix.resumePreferences();
  this.active=true;this.error='';this.sampling=window.setInterval(()=>void this.measure(),5000);this.scheduleRefresh();this.changed();
 }
 sync(self:string,people:Participant[],rtc:RtcConfig|undefined,ready:boolean,screen?:RoomScreen){
  this.selectScreen(screen);
  const resumed=ready&&!this.ready;this.ready=ready;this.self=self;this.people=people;
  if(rtc&&rtc!==this.rtc){
   const previous=this.rtc;this.rtc=rtc;
   for(const peer of this.peers.values()){
    try{peer.pc.setConfiguration({iceServers:rtc.iceServers,bundlePolicy:'max-bundle'});if(previous?.turnExpires&&rtc.turnExpires!==previous.turnExpires)peer.resignal=true}
    catch{this.fail(peer,'Não foi possível atualizar os servidores ICE.')}
   }
   this.scheduleRefresh();
  }
  if(!this.active)return;
  const own=people.find(p=>p.id===self);
  if(!own?.voice)return; // Wait for server-authorized voice membership and epoch.
  this.audioMix.retain(new Set(people.map(p=>p.id)));
  if(this.epoch!==own.voiceEpoch){this.clearPeers();this.epoch=own.voiceEpoch}
  const members=new Map(people.filter(p=>p.id!==self&&p.voice).map(p=>[p.id,p]));
  for(const peer of this.peers.values())if(!members.has(peer.id)||members.get(peer.id)!.voiceEpoch!==peer.epoch)this.closePeer(peer);
  for(const member of members.values())if(member.connected&&ready&&!this.peers.has(member.id)&&this.peers.size<4)this.createPeer(member);
  if(ready)for(const peer of this.peers.values())if(peer.resignal||(resumed&&['failed','disconnected'].includes(peer.pc.iceConnectionState)))this.recover(peer);
  this.mountMedia();
 }
 private current(peer:Peer){return this.active&&this.peers.get(peer.id)===peer&&peer.pc.signalingState!=='closed'}
 private enqueue(peer:Peer,work:()=>Promise<void>){
  peer.queue=peer.queue.then(async()=>{if(this.current(peer))await work()}).catch(error=>{if(this.current(peer)){peer.failure=`${peer.phase??'operation'}:${error instanceof Error?error.name:'Error'}`;this.fail(peer,'Falha ao negociar áudio. Tente reconectar.')}});
 }
 private transmit(peer:Peer,message:VoiceSignal){
  if(!this.current(peer))return;
  if(!this.ready||!this.send({...message,target:peer.id,epoch:this.epoch,targetEpoch:peer.epoch}))peer.resignal=true;
 }
 private createPeer(person:Participant){
  // All peers run this BUNDLE-aware client. One ICE/DTLS transport avoids a
  // candidate burst per media kind when four connections start at once.
  const pc=new RTCPeerConnection({iceServers:this.rtc?.iceServers??[],bundlePolicy:'max-bundle'});
  const audio=document.createElement('audio');audio.autoplay=true;audio.setAttribute('playsinline','');audio.dataset.participant=person.id;
  this.audioRoot()?.append(audio);
  const elements={} as Record<MediaRole,HTMLMediaElement>;
  for(const role of roles){const element=role==='microphone'?audio:document.createElement(kind(role)==='audio'?'audio':'video');
   element.autoplay=true;element.setAttribute('playsinline','');element.dataset.role=role;element.dataset.participant=person.id;
   element.muted=kind(role)==='video';elements[role]=element;
    if(kind(role)==='audio'){
     if(this.outputSink)void (element as HTMLAudioElement).setSinkId(this.outputSink).catch(()=>this.changed());
     if(role!=='microphone')this.audioRoot()?.append(element);
    }
  }
  const peer:Peer={id:person.id,epoch:person.voiceEpoch,pc,audio,elements,transceivers:{},streams:{},outbound:{},uploadKbps:0,limited:false,clearSamples:0,blockedElements:new Set(),videoStats:{},polite:this.self>person.id,makingOffer:false,
   settingAnswer:false,ignored:new Set(),candidates:[],queue:Promise.resolve(),attempts:0,resignal:false,blocked:false,failed:false};
  this.peers.set(person.id,peer);
  // Only the initial offerer allocates a transceiver. The answerer reuses the one
  // created by setRemoteDescription; preallocating both can duplicate m-lines.
  if(!peer.polite){for(const role of roles)peer.transceivers[role]=pc.addTransceiver(kind(role),{direction:'sendrecv'});peer.sender=peer.transceivers.microphone!.sender;this.enqueue(peer,()=>this.attachSources(peer))}
  pc.onnegotiationneeded=()=>this.enqueue(peer,async()=>{
   if(!this.ready){peer.resignal=true;return}
   try{peer.makingOffer=true;peer.phase='local-offer';await pc.setLocalDescription();
    if(pc.localDescription)this.transmit(peer,{type:pc.localDescription.type as 'offer'|'answer',sdp:pc.localDescription.sdp,roles:this.localRoles(peer)});
   }finally{peer.makingOffer=false}
  });
  pc.onicecandidate=event=>this.transmit(peer,{type:'ice',candidate:event.candidate?.toJSON()??null});
  pc.ontrack=event=>{
   if(!this.current(peer)){event.track.stop();return}
   const role=roles.find(r=>peer.remoteRoles?.[r]===event.transceiver.mid);
   if(!role||kind(role)!==event.track.kind){event.track.stop();this.fail(peer,'Identificação de mídia inválida.');return}
   peer.streams[role]=new MediaStream([event.track]);event.track.onunmute=()=>this.mountMedia();this.mountMedia();
  };
  pc.onconnectionstatechange=pc.oniceconnectionstatechange=()=>{
   if(!this.current(peer))return;
   if(pc.connectionState==='connected'){
    window.clearTimeout(peer.timer);peer.timer=undefined;peer.attempts=0;peer.failed=false;
    if([...this.peers.values()].every(p=>!p.failed&&p.pc.connectionState==='connected'))this.error='';
   }else if(['failed','disconnected'].includes(pc.connectionState)||['failed','disconnected'].includes(pc.iceConnectionState)){
    this.scheduleRecovery(peer,pc.connectionState==='failed'?500:3000);
   }
   this.changed();
  };
  this.scheduleRecovery(peer,12000);this.changed();
 }
 receive(message:RemoteSignal){
  const peer=this.peers.get(message.from);
  if(!peer||!this.current(peer)||message.epoch!==peer.epoch||message.targetEpoch!==this.epoch)return;
  this.enqueue(peer,async()=>{
   const pc=peer.pc;
   if(message.type==='offer'||message.type==='answer'){
    const collision=message.type==='offer'&&(peer.makingOffer||(pc.signalingState!=='stable'&&!peer.settingAnswer));
    if(collision&&!peer.polite){for(const frag of ufrags(message.sdp))peer.ignored.add(frag);while(peer.ignored.size>16)peer.ignored.delete(peer.ignored.values().next().value!);return}
    peer.settingAnswer=message.type==='answer';peer.phase=`remote-${message.type}`;
    this.validateRoles(peer,message.roles,message.sdp);peer.remoteRoles=message.roles;
    try{await pc.setRemoteDescription({type:message.type,sdp:message.sdp})}finally{peer.settingAnswer=false}
    for(const frag of ufrags(message.sdp))peer.ignored.delete(frag);
    // Chromium performs the polite peer's implicit rollback for a colliding offer.
    if(message.type==='offer'){
     for(const role of roles){const transceiver=pc.getTransceivers().find(t=>t.mid===message.roles[role]);
      if(!transceiver||transceiver.receiver.track.kind!==kind(role))throw new Error('Missing media role');
      transceiver.direction='sendrecv';peer.transceivers[role]=transceiver;
     }
     peer.sender=peer.transceivers.microphone!.sender;await this.attachSources(peer);
     peer.phase='local-answer';await pc.setLocalDescription();
     if(pc.localDescription)this.transmit(peer,{type:'answer',sdp:pc.localDescription.sdp,roles:this.localRoles(peer)});
    }
    for(const candidate of peer.candidates.splice(0))await this.addCandidate(peer,candidate);
   }else if(message.type==='ice'){
    if(!pc.remoteDescription){
     if(peer.candidates.length>=64){this.fail(peer,'Excesso de candidatos ICE. Reconecte o áudio.');return}
     peer.candidates.push(message.candidate);
    }else await this.addCandidate(peer,message.candidate);
   }
  });
 }
 private async addCandidate(peer:Peer,candidate:RTCIceCandidateInit|null){
  const frag=candidate?.usernameFragment;
  if(frag&&!ufrags(peer.pc.remoteDescription?.sdp??'').has(frag)){
   // A restart/glare candidate may precede the accepted SDP for its generation.
   if(peer.candidates.length>=64)peer.candidates.shift();peer.candidates.push(candidate);return;
  }
  try{peer.phase='remote-ice';await peer.pc.addIceCandidate(candidate??undefined)}catch{
   if(!frag||!peer.ignored.has(frag))throw new Error('ICE rejected');
  }
 }
 setMicrophone(stream?:MediaStream){
  this.microphone=stream?.getAudioTracks().find(t=>t.readyState==='live');
  this.setSource('microphone',this.microphone);
 }
 setScreen(stream?:MediaStream){this.setSource('screenVideo',stream?.getVideoTracks().find(t=>t.readyState==='live'));this.setSource('screenAudio',stream?.getAudioTracks().find(t=>t.readyState==='live'))}
 setCamera(stream?:MediaStream){this.setSource('camera',stream?.getVideoTracks().find(t=>t.readyState==='live'))}
 private setSource(role:MediaRole,track?:MediaStreamTrack){
  if(this.sources[role]===track)return;
  this.sources[role]=track;
  for(const peer of this.peers.values())if(peer.transceivers[role])this.enqueue(peer,async()=>{await peer.transceivers[role]!.sender.replaceTrack(this.sources[role]??null);await this.limitVideo(peer,role)});
 }
 private async attachSources(peer:Peer){for(const role of roles){const sender=peer.transceivers[role]?.sender;if(sender){await sender.replaceTrack(this.sources[role]??null);await this.limitVideo(peer,role)}}}
 private localRoles(peer:Peer):MediaRoles{
  const result={} as MediaRoles;for(const role of roles){const mid=peer.transceivers[role]?.mid;if(mid===null||mid===undefined)throw new Error('Missing MID');result[role]=mid}return result;
 }
 private validateRoles(peer:Peer,map:MediaRoles,sdp:string){
  if(!map||Object.keys(map).length!==4||new Set(Object.values(map)).size!==4)throw new Error('Invalid media roles');
  const sections=sdp.split(/(?=^m=)/m);
  for(const role of roles){const mid=map[role];
   if(typeof mid!=='string'||!/^[a-zA-Z0-9_-]{1,32}$/.test(mid)||!sections.some(s=>s.startsWith(`m=${kind(role)} `)&&s.split(/\r?\n/).includes(`a=mid:${mid}`)))throw new Error('Invalid media MID');
   const existing=peer.transceivers[role]?.mid;if(existing!=null&&existing!==mid)throw new Error('Changed media role');
  }
 }
 private allowed(peer:Peer,role:MediaRole){
  if(role==='microphone')return true;
  if(role==='camera')return !!this.people.find(p=>p.id===peer.id)?.camera;
  return this.screen?.owner===peer.id&&this.screen.active&&(role==='screenVideo'||this.screen.audio);
 }
 selectScreen(screen?:RoomScreen){
  const previous=this.screen;
  if(previous&&(previous.owner!==screen?.owner||previous.generation!==screen.generation)){
   const peer=this.peers.get(previous.owner);
   if(peer){this.unmountMedia(peer,'screenAudio');this.unmountMedia(peer,'screenVideo')}
  }
  this.screen=screen??null;
 }
 private unmountMedia(peer:Peer,role:MediaRole){
  const element=peer.elements[role];
  if(role==='microphone'||role==='screenAudio')this.audioMix.mount(peer.id,role,element as HTMLAudioElement);
  if(element.srcObject){element.pause();element.srcObject=null}
  peer.blockedElements.delete(element);peer.blocked=peer.blockedElements.size>0;
  if(kind(role)==='video')element.remove();
 }
 mountMedia(){
  for(const peer of this.peers.values())for(const role of roles){const element=peer.elements[role],stream=peer.streams[role];
   if(!stream||!this.allowed(peer,role)){this.unmountMedia(peer,role);continue}
   if(role==='microphone'||role==='screenAudio')this.audioMix.mount(peer.id,role,element as HTMLAudioElement,stream);
   if(element.srcObject!==stream){element.srcObject=stream;this.playElement(peer,element)}
   if(role==='screenVideo'||role==='camera'){const root=this.videoRoot(role,peer.id);if(root&&element.parentElement!==root)root.append(element)}
  }
 }
 private async limitVideo(peer:Peer,role:MediaRole){
  if(kind(role)!=='video')return;
  const sender=peer.transceivers[role]?.sender;if(!sender?.track)return;
  try{const parameters=sender.getParameters();if(!parameters.encodings?.length)return;
   for(const encoding of parameters.encodings){encoding.maxBitrate=(role==='screenVideo'?2000000:600000)*(peer.limited?.5:1);encoding.maxFramerate=peer.limited?15:role==='screenVideo'?30:24;encoding.scaleResolutionDownBy=peer.limited?2:1}
   await sender.setParameters(parameters);
  }catch{/* Native congestion control remains available if encoding limits are unsupported. */}
 }
 private playElement(peer:Peer,element:HTMLMediaElement){
  void element.play().then(()=>{if(this.current(peer)){const before=peer.blocked;peer.blockedElements.delete(element);peer.blocked=peer.blockedElements.size>0;if(before!==peer.blocked)this.changed()}})
   .catch(()=>{if(this.current(peer)&&element.srcObject){peer.blockedElements.add(element);peer.blocked=true;this.changed()}});
 }
 private play(peer:Peer){
  if(!this.current(peer))return;
  for(const element of Object.values(peer.elements))if(element.srcObject)this.playElement(peer,element);
 }
 unlockAudio(){this.audioMix.unlock();for(const peer of this.peers.values())this.play(peer)}
 private scheduleRecovery(peer:Peer,delay:number){
  if(peer.timer!==undefined||peer.failed)return;
  peer.timer=window.setTimeout(()=>{peer.timer=undefined;if(peer.pc.connectionState!=='connected'||peer.resignal)this.recover(peer)},delay);
 }
 private recover(peer:Peer){
  if(!this.current(peer)||!this.ready){peer.resignal=true;return}
  if(peer.attempts>=2){this.fail(peer,'Não foi possível restabelecer o áudio. Confira a rede e tente novamente.');return}
  peer.attempts++;peer.resignal=false;
  this.enqueue(peer,async()=>{
   if(peer.pc.signalingState==='have-local-offer')await peer.pc.setLocalDescription({type:'rollback'});
   else if(peer.pc.signalingState==='have-remote-offer')await peer.pc.setRemoteDescription({type:'rollback'});
   peer.pc.restartIce();this.scheduleRecovery(peer,10000);this.changed();
  });
 }
 retry(){
  this.error='';for(const peer of this.peers.values())if(peer.failed||peer.pc.connectionState!=='connected'){
   peer.failed=false;peer.attempts=0;window.clearTimeout(peer.timer);peer.timer=undefined;this.recover(peer);
  }this.changed();
 }
 private fail(peer:Peer,message:string){
  peer.failed=true;window.clearTimeout(peer.timer);peer.timer=undefined;this.error=message;this.changed();
 }
 private scheduleRefresh(){
  window.clearTimeout(this.refresh);
  if(this.active&&this.rtc?.turnExpires)this.refresh=window.setTimeout(()=>{if(this.active)this.refreshConfig()},Math.max(1000,(this.rtc.turnExpires*1000-Date.now())-45000));
 }
 async measure(){
  if(this.measuring||!this.active)return;
  this.measuring=true;
  try{await Promise.all([...this.peers.values()].map(async peer=>{
   if(!this.current(peer))return;
   const report=await peer.pc.getStats();if(!this.current(peer))return;
   const stats:VoiceStats={received:0,lost:0,relay:false,path:'unknown'};
   let limited=false,upload=0;
   let selected:any;
   report.forEach(s=>{
    if(s.type==='inbound-rtp'&&s.kind==='audio'){stats.received+=s.packetsReceived??0;stats.lost+=s.packetsLost??0;if(s.jitter!==undefined)stats.jitterMs=s.jitter*1000}
    if(s.type==='transport'&&s.selectedCandidatePairId)selected=report.get(s.selectedCandidatePairId);
    if(s.type==='outbound-rtp'&&!s.isRemote){const role=roles.find(r=>peer.transceivers[r]?.mid===s.mid);if(!role)return;
     const previous=peer.outbound[role];if(previous&&s.timestamp>previous.time)upload+=Math.max(0,(s.bytesSent-previous.bytes)*8/(s.timestamp-previous.time));
     peer.outbound[role]={bytes:s.bytesSent,time:s.timestamp};if(['cpu','bandwidth'].includes(s.qualityLimitationReason))limited=true;
     if(kind(role)==='video')peer.videoStats[role]={fps:s.framesPerSecond,width:s.frameWidth,height:s.frameHeight,frames:s.framesEncoded??0,
      encoderMsPerFrame:s.framesEncoded?s.totalEncodeTime*1000/s.framesEncoded:undefined,limitation:s.qualityLimitationReason??'unknown'};
    }
   });
   if(!selected)report.forEach(s=>{if(s.type==='candidate-pair'&&s.state==='succeeded'&&s.nominated)selected=s});
   if(selected&&selected.state==='succeeded'&&peer.pc.connectionState==='connected'){
    stats.rttMs=selected.currentRoundTripTime===undefined?undefined:selected.currentRoundTripTime*1000;
    stats.relay=report.get(selected.localCandidateId)?.candidateType==='relay'||report.get(selected.remoteCandidateId)?.candidateType==='relay';
    stats.path=stats.relay?'relay':'direct';
   }
   peer.stats=stats;
   peer.uploadKbps=Math.round(upload);peer.clearSamples=limited?0:peer.clearSamples+1;
   if(limited&&!peer.limited||!limited&&peer.limited&&peer.clearSamples>=3){peer.limited=limited;this.enqueue(peer,async()=>{await this.limitVideo(peer,'screenVideo');await this.limitVideo(peer,'camera')})}
  }));this.changed()}catch{/* Stats are diagnostic; a closed peer must not stop other audio. */}
  finally{this.measuring=false}
 }
 diagnostics(){
  // Intentionally omit IDs, names, IPs, URLs, credentials, SDP and raw candidates.
  return {version:2,at:new Date().toISOString(),active:this.active,relayConfigured:this.rtc?.relayAvailable??false,uploadKbps:[...this.peers.values()].reduce((sum,p)=>sum+p.uploadKbps,0),
   peers:[...this.peers.values()].map((p,n)=>({connection:n+1,state:p.pc.connectionState,ice:p.pc.iceConnectionState,
    path:p.stats?.path??'unknown',received:p.stats?.received??0,lost:p.stats?.lost??0,
    jitterMs:p.stats?.jitterMs,rttMs:p.stats?.rttMs,uploadKbps:p.uploadKbps,reducedQuality:p.limited,video:p.videoStats,attempts:p.attempts,failed:p.failed}))};
 }
 private closePeer(peer:Peer){
  this.peers.delete(peer.id);window.clearTimeout(peer.timer);
  this.audioMix.detach(peer.id);
  peer.pc.onnegotiationneeded=peer.pc.onicecandidate=peer.pc.ontrack=peer.pc.onconnectionstatechange=peer.pc.oniceconnectionstatechange=null;
  peer.pc.close();for(const stream of Object.values(peer.streams))stream.getTracks().forEach(t=>{t.onunmute=null;t.stop()});
  for(const element of Object.values(peer.elements)){element.pause();element.srcObject=null;element.remove()}peer.streams={};peer.candidates=[];
 }
 private clearPeers(){for(const peer of [...this.peers.values()])this.closePeer(peer)}
 stop(forgetListening=false){if(forgetListening)this.outputSink='';this.active=false;this.clearPeers();this.audioMix.stop(forgetListening);this.microphone=undefined;this.sources={};this.screen=null;this.epoch=0;this.error='';window.clearInterval(this.sampling);window.clearTimeout(this.refresh);this.changed()}
}
