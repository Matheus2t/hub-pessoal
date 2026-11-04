import type {RoomScreen,ScreenControl,ScreenEvent} from './protocol';

interface State {self:string;remote:boolean;screen:RoomScreen|null}
interface Attempt {request:string;generation?:number;seen:boolean;started:boolean;timer:number}
const stop=(stream?:MediaStream)=>stream?.getTracks().forEach(t=>{t.onended=null;t.stop()});
const liveAudio=(stream?:MediaStream)=>!!stream?.getAudioTracks().some(t=>t.readyState==='live');

/** Captures belong to this page only. No media is sent until the room grants it. */
export class CallCapture {
 screen?:MediaStream;camera?:MediaStream;screenBusy=false;cameraBusy=false;error='';
 private screenRequest=0;private cameraRequest=0;private attempt?:Attempt;
 private cancelled=new Set<string>();
 constructor(private state:()=>State,private send:(message:ScreenControl)=>boolean,private changed:()=>void){}
 get transmitting(){const s=this.state();return !!this.screen&&!!this.attempt&&s.screen?.owner===s.self&&s.screen.active&&s.screen.generation===this.attempt.generation}
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
  if(state.remote&&state.screen){this.error='Já existe uma tela compartilhada nesta sala.';this.changed();return}
  const request=++this.screenRequest;this.screenBusy=true;
  // Invoke the native picker in the click's activation, before any network await.
  let capture:Promise<MediaStream>;
  try{capture=navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30}},audio:true})}
  catch(error){this.screenBusy=false;this.error=this.failure(error);this.changed();return}
  if(state.remote){
   const nonce=crypto.randomUUID().replaceAll('-','');
   this.attempt={request:nonce,seen:false,started:false,timer:window.setTimeout(()=>{if(this.attempt?.request===nonce){this.stopScreen();this.error='A seleção de tela expirou. Tente novamente.';this.changed()}},50000)};
   if(!this.send({type:'screen',action:'claim',request:nonce})){this.stopScreen();this.error='Reconecte à sala antes de compartilhar.'}
  }
  this.changed();void capture.then(async stream=>{
   if(request!==this.screenRequest){stop(stream);return}
   const video=stream.getVideoTracks().find(t=>t.readyState==='live');
   if(!video){stop(stream);throw new DOMException('No video','NotFoundError')}
   this.screen=stream;video.contentHint='detail';video.onended=()=>{if(this.screen===stream)this.stopScreen()};
   stream.getAudioTracks().forEach(t=>t.onended=()=>{if(this.screen===stream){this.startGranted(true);this.changed()}});
   // Best effort: display pickers do not accept max/exact constraints in their request.
   void video.applyConstraints({width:{max:1920},height:{max:1080},frameRate:{max:30}}).catch(()=>{});
   this.screenBusy=false;this.startGranted();this.changed();
  }).catch(error=>{if(request===this.screenRequest){this.stopScreen();this.error=this.failure(error);this.changed()}});
 }
 event(message:ScreenEvent){
  const attempt=this.attempt;
  if(!attempt||message.request!==attempt.request){
   if(message.type==='screen_granted'&&this.cancelled.has(message.request))this.send({type:'screen',action:'release',request:message.request,generation:message.generation});
   return;
  }
  if(message.type==='screen_denied'){this.stopScreen();this.error=message.code==='screen_busy'?'Outra pessoa começou a compartilhar.':'Não foi possível reservar a tela. Tente novamente.';this.changed();return}
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
  if(state.screen?.owner===state.self&&state.screen.generation===attempt.generation)attempt.seen=true;
  else if(attempt.seen){this.stopScreen();return}
 }
 stopScreen(){
  this.screenRequest++;const attempt=this.attempt;this.attempt=undefined;
  if(attempt){window.clearTimeout(attempt.timer);this.remember(attempt.request);this.send({type:'screen',action:'release',request:attempt.request,generation:attempt.generation})}
  stop(this.screen);this.screen=undefined;this.screenBusy=false;this.changed();
 }
 async toggleCamera(){
  if(this.camera||this.cameraBusy){this.stopCamera();return}
  if(!this.state().remote)return;
  this.error='';if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){this.error='Câmera indisponível. Use HTTPS e um navegador compatível.';this.changed();return}
  const request=++this.cameraRequest;this.cameraBusy=true;this.changed();
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640,max:1280},height:{ideal:360,max:720},frameRate:{ideal:24,max:30}},audio:false});
   if(request!==this.cameraRequest||!this.state().remote){stop(stream);return}
   const video=stream.getVideoTracks().find(t=>t.readyState==='live');if(!video){stop(stream);throw new DOMException('No camera','NotFoundError')}
   video.contentHint='motion';this.camera=stream;video.onended=()=>{if(this.camera===stream){this.stopCamera();this.error='A câmera foi desconectada.';this.changed()}};
  }catch(error){if(request===this.cameraRequest)this.error=this.failure(error,true)}
  finally{if(request===this.cameraRequest){this.cameraBusy=false;this.changed()}}
 }
 stopCamera(){this.cameraRequest++;stop(this.camera);this.camera=undefined;this.cameraBusy=false;this.changed()}
 release(){this.stopScreen();this.stopCamera();this.error=''}
}
