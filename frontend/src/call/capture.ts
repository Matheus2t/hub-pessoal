import type {RoomScreen,ScreenControl,ScreenEvent} from './protocol';
import {defaultScreenQuality,screenCaptureConstraints,screenTrackConstraints,type ScreenQuality,type ScreenContent} from './screen-quality';

interface State {self:string;remote:boolean;screens:RoomScreen[];screenLimit:number}
interface Attempt {request:string;generation?:number;seen:boolean;started:boolean;timer:number}
type Facing='user'|'environment';
type CameraChoice={deviceId:string}|{facingMode:Facing};
const stop=(stream?:MediaStream)=>stream?.getTracks().forEach(t=>{t.onended=null;t.stop()});
const liveAudio=(stream?:MediaStream)=>!!stream?.getAudioTracks().some(t=>t.readyState==='live');
const screenLimitMessage='Já existem duas transmissões ativas ou em preparação.';

/** Captures belong to this page only. No media is sent until the room grants it. */
export class CallCapture {
 screen?:MediaStream;camera?:MediaStream;screenBusy=false;cameraBusy=false;error='';
 quality:ScreenQuality=defaultScreenQuality;
 content:ScreenContent='screen';
 cameras:MediaDeviceInfo[]=[];
 private screenRequest=0;private cameraRequest=0;private attempt?:Attempt;
 private cancelled=new Set<string>();
 constructor(private state:()=>State,private send:(message:ScreenControl)=>boolean,private changed:()=>void,
  private qualitySettled:()=>void=()=>{}){}
 get transmitting(){
  const {self,screens}=this.state(),generation=this.attempt?.generation;
  return !!this.screen&&screens.some(screen=>screen.owner===self&&screen.active&&screen.generation===generation);
 }
 setQuality(quality:ScreenQuality){
  if(this.quality===quality)return;
  this.quality=quality;
  const track=this.screen?.getVideoTracks().find(t=>t.readyState==='live');
  if(track)void this.constrainScreen(track);
  this.changed();
 }
 setContent(content:ScreenContent){
  if(this.content===content)return;
  this.content=content;
  const track=this.screen?.getVideoTracks()[0];
  if(track)try{track.contentHint=content==='game'?'motion':'detail'}catch{/* Optional hint. */}
  this.changed();
 }
 private async constrainScreen(track:MediaStreamTrack){
  const quality=this.quality;
  try{await track.applyConstraints(screenTrackConstraints(quality))}
  catch{
   if(this.screen?.getVideoTracks()[0]===track&&this.quality===quality){
    this.error='O navegador não aplicou todos os limites de resolução/FPS. Confira a qualidade real recebida.';
   }
  }finally{
   if(this.screen?.getVideoTracks()[0]===track){this.qualitySettled();this.changed()}
  }
 }
 private remember(request:string){this.cancelled.add(request);while(this.cancelled.size>16)this.cancelled.delete(this.cancelled.values().next().value!)}
 private failure(error:unknown,camera=false){
  const name=error instanceof DOMException?error.name:'';
  if(name==='NotAllowedError'||name==='SecurityError')return camera?'Permita o acesso à câmera nas configurações do navegador.':'Compartilhamento não autorizado ou cancelado.';
  if(name==='NotFoundError')return camera?'Nenhuma câmera disponível.':'Nenhuma tela disponível para compartilhar.';
  if(name==='NotReadableError')return 'Dispositivo indisponível. Confira se outro aplicativo está usando a captura.';
  return 'Não foi possível iniciar a captura. Confira as permissões e tente novamente.';
 }
 toggleScreen(){
  if(this.screen||this.screenBusy){this.stopScreen();return}
  this.error='';const state=this.state();
  if(!isSecureContext||!navigator.mediaDevices?.getDisplayMedia){this.error='Compartilhamento de tela indisponível neste navegador. Use HTTPS ou localhost em um navegador compatível.';this.changed();return}
  if(state.remote&&state.screens.length>=state.screenLimit){
   this.error=state.screenLimit===2?screenLimitMessage:'Já existe uma tela compartilhada nesta sala.';
   this.changed();return;
  }
  const request=++this.screenRequest;this.screenBusy=true;
  // Invoke the native picker in the click's activation, before any network await.
  let capture:Promise<MediaStream>;
  try{capture=navigator.mediaDevices.getDisplayMedia(screenCaptureConstraints(this.quality))}
  catch(error){this.screenBusy=false;this.error=this.failure(error);this.changed();return}
  if(state.remote){
   const nonce=crypto.randomUUID().replaceAll('-','');
   this.attempt={request:nonce,seen:false,started:false,timer:window.setTimeout(()=>{if(this.attempt?.request===nonce){this.stopScreen();this.error='A seleção de tela expirou. Tente novamente.';this.changed()}},50000)};
   if(!this.send({type:'screen',action:'claim',request:nonce,...(state.screenLimit===2?{parallel:true}:{})})){
    this.stopScreen();this.error='Reconecte à sala antes de compartilhar.';
   }
  }
  this.changed();void capture.then(async stream=>{
   if(request!==this.screenRequest){stop(stream);return}
   const video=stream.getVideoTracks().find(t=>t.readyState==='live');
   if(!video){stop(stream);throw new DOMException('No video','NotFoundError')}
   this.screen=stream;
   try{video.contentHint=this.content==='game'?'motion':'detail'}catch{/* Optional hint. */}
   video.onended=()=>{if(this.screen===stream)this.stopScreen()};
   stream.getAudioTracks().forEach(t=>t.onended=()=>{if(this.screen===stream){this.startGranted(true);this.changed()}});
   // Best effort: cap 1440p/60 after selection; never request a higher mode.
   void this.constrainScreen(video);
   this.screenBusy=false;this.startGranted();this.changed();
  }).catch(error=>{if(request===this.screenRequest){this.stopScreen();this.error=this.failure(error);this.changed()}});
 }
 event(message:ScreenEvent){
  const attempt=this.attempt;
  if(!attempt||message.request!==attempt.request){
   if(message.type==='screen_granted'&&this.cancelled.has(message.request))this.send({type:'screen',action:'release',request:message.request,generation:message.generation});
   return;
  }
  if(message.type==='screen_denied'){
   this.stopScreen();
   this.error=message.code==='screen_limit'?screenLimitMessage:message.code==='screen_busy'?'Já existe uma tela compartilhada.':'Não foi possível reservar a tela. Tente novamente.';
   this.changed();return;
  }
  attempt.generation=message.generation;this.startGranted();this.changed();
 }
 private startGranted(update=false){
  const attempt=this.attempt;if(!attempt?.generation||!this.screen||attempt.started&&!update)return;
  if(this.send({type:'screen',action:'start',request:attempt.request,generation:attempt.generation,audio:liveAudio(this.screen)})){attempt.started=true;window.clearTimeout(attempt.timer)}
  else this.stopScreen();
 }
 sync(){
  const state=this.state(),attempt=this.attempt;
  if(!state.remote){if(attempt)this.stopScreen();if(this.camera||this.cameraBusy)this.stopCamera();return}
  if(!attempt)return;
  if(state.screens.some(screen=>screen.owner===state.self&&screen.generation===attempt.generation))attempt.seen=true;
  else if(attempt.seen){this.stopScreen();return}
 }
 stopScreen(){
  this.screenRequest++;const attempt=this.attempt;this.attempt=undefined;
  if(attempt){window.clearTimeout(attempt.timer);this.remember(attempt.request);this.send({type:'screen',action:'release',request:attempt.request,generation:attempt.generation})}
  stop(this.screen);this.screen=undefined;this.screenBusy=false;this.changed();
 }
 get cameraDevice(){return this.camera?.getVideoTracks()[0]?.getSettings().deviceId??''}
 get canFlip(){return !!this.camera&&window.matchMedia('(pointer: coarse)').matches&&!!navigator.mediaDevices?.getSupportedConstraints?.().facingMode}
 toggleCamera(){
  if(this.camera||this.cameraBusy){this.stopCamera();return}
  void this.openCamera();
 }
 selectCamera(deviceId:string){
  if(this.camera&&!this.cameraBusy&&deviceId!==this.cameraDevice&&this.cameras.some(camera=>camera.deviceId===deviceId))void this.openCamera({deviceId});
 }
 flipCamera(){
  if(!this.canFlip||this.cameraBusy)return;
  const facing=this.camera?.getVideoTracks()[0]?.getSettings().facingMode??this.facing;
  void this.openCamera({facingMode:facing==='environment'?'user':'environment'});
 }
 private facing:Facing='user';
 private async openCamera(choice?:CameraChoice){
  if(!this.state().remote)return;
  this.error='';if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){this.error='Câmera indisponível. Use HTTPS e um navegador compatível.';this.changed();return}
  const request=++this.cameraRequest,previous=this.camera,settings=previous?.getVideoTracks()[0]?.getSettings();
  const flip=choice&&'facingMode' in choice;
  const capture=(selection?:CameraChoice)=>navigator.mediaDevices.getUserMedia({video:{
   width:{ideal:640,max:1280},height:{ideal:360,max:720},frameRate:{ideal:24,max:30},
   ...(!selection?{facingMode:{ideal:'user'}}:'deviceId' in selection?{deviceId:{exact:selection.deviceId}}:{facingMode:{exact:selection.facingMode}}),
  },audio:false});
  this.cameraBusy=true;this.changed();
  // Phones may expose only one physical camera at a time.
  if(flip)stop(previous);
  try{
   if(this.attachCamera(await capture(choice),request))this.facing=flip?choice.facingMode:'user';
  }catch(error){
   if(request!==this.cameraRequest)return;
   this.error=choice?'Não foi possível trocar de câmera.':this.failure(error,true);
   if(flip&&previous){
    const restore:CameraChoice=settings?.deviceId?{deviceId:settings.deviceId}:{facingMode:this.facing};
    try{this.attachCamera(await capture(restore),request)}
    catch{if(request===this.cameraRequest){this.camera=undefined;this.cameras=[]}}
   }
  }finally{if(request===this.cameraRequest){this.cameraBusy=false;this.changed();if(this.camera)void this.refreshCameras(request)}}
 }
 private attachCamera(stream:MediaStream,request:number){
  if(request!==this.cameraRequest||!this.state().remote){stop(stream);return false}
  const video=stream.getVideoTracks().find(t=>t.readyState==='live');
  if(!video){stop(stream);throw new DOMException('No camera','NotFoundError')}
  stop(this.camera);this.camera=stream;video.contentHint='motion';
  video.onended=()=>{if(this.camera===stream){this.stopCamera();this.error='A câmera foi desconectada.';this.changed()}};
  return true;
 }
 private async refreshCameras(request:number){
  try{
   const devices=await navigator.mediaDevices.enumerateDevices();
   if(request===this.cameraRequest){this.cameras=devices.filter(d=>d.kind==='videoinput'&&d.deviceId);this.changed()}
  }catch{/* A device list is optional after permission. */}
 }
 stopCamera(){this.cameraRequest++;stop(this.camera);this.camera=undefined;this.cameraBusy=false;this.cameras=[];this.changed()}
 release(){this.stopScreen();this.stopCamera();this.error=''}
}
