import type {Participant,RemoteSignal,RtcConfig,Signal} from './protocol';

type VoiceSignal = {type:'offer'|'answer';sdp:string}|{type:'ice';candidate:RTCIceCandidateInit|null};
export interface VoiceStats {received:number;lost:number;jitterMs?:number;rttMs?:number;relay:boolean;path:'unknown'|'direct'|'relay'}
interface Peer {
 id:string;epoch:number;pc:RTCPeerConnection;sender?:RTCRtpSender;audio:HTMLAudioElement;
 polite:boolean;makingOffer:boolean;settingAnswer:boolean;ignored:Set<string>;candidates:(RTCIceCandidateInit|null)[];
 queue:Promise<void>;attempts:number;timer?:number;resignal:boolean;blocked:boolean;failed:boolean;stats?:VoiceStats;phase?:string;failure?:string;
}
const ufrags=(sdp:string)=>new Set([...sdp.matchAll(/^a=ice-ufrag:(.+)$/gm)].map(m=>m[1].trim()));

/** Audio-only mesh. One sendrecv transceiver per pair; replacing a mic never renegotiates. */
export class VoiceMesh {
 active=false;error='';
 readonly peers=new Map<string,Peer>();
 private self='';private epoch=0;private people:Participant[]=[];private rtc?:RtcConfig;private ready=false;
 private microphone?:MediaStreamTrack;private refresh?:number;private sampling?:number;private measuring=false;
 constructor(private send:(message:Signal)=>boolean,private changed:()=>void,
  private audioRoot:()=>HTMLElement|null,private refreshConfig:()=>void){}
 get blocked(){return [...this.peers.values()].some(p=>p.blocked)}
 start(){
  if(this.active)return;
  if(!window.RTCPeerConnection){this.error='WebRTC indisponível neste navegador.';this.changed();return}
  this.active=true;this.error='';this.sampling=window.setInterval(()=>void this.measure(),5000);this.scheduleRefresh();this.changed();
 }
 sync(self:string,people:Participant[],rtc:RtcConfig|undefined,ready:boolean){
  const resumed=ready&&!this.ready;this.ready=ready;this.self=self;this.people=people;
  if(rtc&&rtc!==this.rtc){
   const previous=this.rtc;this.rtc=rtc;
   for(const peer of this.peers.values()){
    try{peer.pc.setConfiguration({iceServers:rtc.iceServers});if(previous?.turnExpires&&rtc.turnExpires!==previous.turnExpires)peer.resignal=true}
    catch{this.fail(peer,'Não foi possível atualizar os servidores ICE.')}
   }
   this.scheduleRefresh();
  }
  if(!this.active)return;
  const own=people.find(p=>p.id===self);
  if(!own?.voice)return; // Wait for server-authorized voice membership and epoch.
  if(this.epoch!==own.voiceEpoch){this.clearPeers();this.epoch=own.voiceEpoch}
  const members=new Map(people.filter(p=>p.id!==self&&p.voice).map(p=>[p.id,p]));
  for(const peer of this.peers.values())if(!members.has(peer.id)||members.get(peer.id)!.voiceEpoch!==peer.epoch)this.closePeer(peer);
  for(const member of members.values())if(member.connected&&ready&&!this.peers.has(member.id)&&this.peers.size<4)this.createPeer(member);
  if(ready)for(const peer of this.peers.values())if(peer.resignal||(resumed&&['failed','disconnected'].includes(peer.pc.iceConnectionState)))this.recover(peer);
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
  const pc=new RTCPeerConnection({iceServers:this.rtc?.iceServers??[]});
  const audio=document.createElement('audio');audio.autoplay=true;audio.setAttribute('playsinline','');audio.dataset.participant=person.id;
  this.audioRoot()?.append(audio);
  const peer:Peer={id:person.id,epoch:person.voiceEpoch,pc,audio,polite:this.self>person.id,makingOffer:false,
   settingAnswer:false,ignored:new Set(),candidates:[],queue:Promise.resolve(),attempts:0,resignal:false,blocked:false,failed:false};
  this.peers.set(person.id,peer);
  // Only the initial offerer allocates a transceiver. The answerer reuses the one
  // created by setRemoteDescription; preallocating both can duplicate m-lines.
  if(!peer.polite){peer.sender=pc.addTransceiver('audio',{direction:'sendrecv'}).sender;this.enqueue(peer,async()=>{await peer.sender!.replaceTrack(this.microphone??null)})}
  pc.onnegotiationneeded=()=>this.enqueue(peer,async()=>{
   if(!this.ready){peer.resignal=true;return}
   try{peer.makingOffer=true;peer.phase='local-offer';await pc.setLocalDescription();
    if(pc.localDescription)this.transmit(peer,{type:pc.localDescription.type as 'offer'|'answer',sdp:pc.localDescription.sdp});
   }finally{peer.makingOffer=false}
  });
  pc.onicecandidate=event=>this.transmit(peer,{type:'ice',candidate:event.candidate?.toJSON()??null});
  pc.ontrack=event=>{
   if(!this.current(peer)||event.track.kind!=='audio'){event.track.stop();return}
   const stream=new MediaStream([event.track]);peer.audio.srcObject=stream;
   event.track.onunmute=()=>this.play(peer);this.play(peer);
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
    try{await pc.setRemoteDescription({type:message.type,sdp:message.sdp})}finally{peer.settingAnswer=false}
    for(const frag of ufrags(message.sdp))peer.ignored.delete(frag);
    // Chromium performs the polite peer's implicit rollback for a colliding offer.
    if(message.type==='offer'){
     if(!peer.sender){
      const transceiver=pc.getTransceivers().find(t=>t.receiver.track.kind==='audio'&&t.mid!==null);
      if(!transceiver)throw new Error('Missing audio transceiver');
      transceiver.direction='sendrecv';peer.sender=transceiver.sender;await peer.sender.replaceTrack(this.microphone??null);
     }
     peer.phase='local-answer';await pc.setLocalDescription();
     if(pc.localDescription)this.transmit(peer,{type:'answer',sdp:pc.localDescription.sdp});
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
  for(const peer of this.peers.values())if(peer.sender)this.enqueue(peer,async()=>{await peer.sender!.replaceTrack(this.microphone??null)});
 }
 private play(peer:Peer){
  if(!this.current(peer)||!peer.audio.srcObject)return;
  void peer.audio.play().then(()=>{if(this.current(peer)&&peer.blocked){peer.blocked=false;this.changed()}})
   .catch(()=>{if(this.current(peer)){peer.blocked=true;this.changed()}});
 }
 unlockAudio(){for(const peer of this.peers.values())this.play(peer)}
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
   let selected:any;
   report.forEach(s=>{
    if(s.type==='inbound-rtp'&&s.kind==='audio'){stats.received+=s.packetsReceived??0;stats.lost+=s.packetsLost??0;if(s.jitter!==undefined)stats.jitterMs=s.jitter*1000}
    if(s.type==='transport'&&s.selectedCandidatePairId)selected=report.get(s.selectedCandidatePairId);
   });
   if(!selected)report.forEach(s=>{if(s.type==='candidate-pair'&&s.state==='succeeded'&&s.nominated)selected=s});
   if(selected&&selected.state==='succeeded'&&peer.pc.connectionState==='connected'){
    stats.rttMs=selected.currentRoundTripTime===undefined?undefined:selected.currentRoundTripTime*1000;
    stats.relay=report.get(selected.localCandidateId)?.candidateType==='relay'||report.get(selected.remoteCandidateId)?.candidateType==='relay';
    stats.path=stats.relay?'relay':'direct';
   }
   peer.stats=stats;
  }));this.changed()}catch{/* Stats are diagnostic; a closed peer must not stop other audio. */}
  finally{this.measuring=false}
 }
 diagnostics(){
  // Intentionally omit IDs, names, IPs, URLs, credentials, SDP and raw candidates.
  return {version:1,at:new Date().toISOString(),active:this.active,relayConfigured:this.rtc?.relayAvailable??false,
   peers:[...this.peers.values()].map((p,n)=>({connection:n+1,state:p.pc.connectionState,ice:p.pc.iceConnectionState,
    path:p.stats?.path??'unknown',received:p.stats?.received??0,lost:p.stats?.lost??0,
    jitterMs:p.stats?.jitterMs,rttMs:p.stats?.rttMs,attempts:p.attempts,failed:p.failed}))};
 }
 private closePeer(peer:Peer){
  this.peers.delete(peer.id);window.clearTimeout(peer.timer);
  peer.pc.onnegotiationneeded=peer.pc.onicecandidate=peer.pc.ontrack=peer.pc.onconnectionstatechange=peer.pc.oniceconnectionstatechange=null;
  peer.pc.close();const stream=peer.audio.srcObject as MediaStream|null;
  stream?.getTracks().forEach(t=>{t.onunmute=null;t.stop()});peer.audio.pause();peer.audio.srcObject=null;peer.audio.remove();peer.candidates=[];
 }
 private clearPeers(){for(const peer of [...this.peers.values()])this.closePeer(peer)}
 stop(){this.active=false;this.clearPeers();this.microphone=undefined;this.epoch=0;this.error='';window.clearInterval(this.sampling);window.clearTimeout(this.refresh);this.changed()}
}
