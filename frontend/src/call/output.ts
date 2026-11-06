import {VoiceMesh} from './voice';

type OutputDevices=MediaDevices & {selectAudioOutput?:()=>Promise<MediaDeviceInfo>};

/** Local output selection; no device identifiers enter storage or signaling. */
export class CallAudioOutput {
 devices:MediaDeviceInfo[]=[];
 sinkId='';
 busy=false;
 error='';
 private version=0;
 constructor(private voice:VoiceMesh,private changed:()=>void,private selected:(id:string)=>void=()=>{}){}

 get supported(){
  const Audio=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  return window.isSecureContext&&!!navigator.mediaDevices?.enumerateDevices&&
   typeof HTMLMediaElement.prototype.setSinkId==='function'&&!!Audio&&
   typeof (Audio.prototype as AudioContext & {setSinkId?:(id:string)=>Promise<void>}).setSinkId==='function';
 }
 get canPrompt(){return this.supported&&typeof (navigator.mediaDevices as OutputDevices).selectAudioOutput==='function'}
 get choices(){return this.devices.filter(device=>device.deviceId&&device.deviceId!=='default')}

 async refresh(){
  if(!this.supported)return;
  try{
   const devices=await navigator.mediaDevices.enumerateDevices();
   this.devices=devices.filter(device=>device.kind==='audiooutput');
   if(this.sinkId&&!this.devices.some(device=>device.deviceId===this.sinkId)&&!this.busy){
    await this.choose('');
    this.error='Dispositivo desconectado. Usando a saída padrão.';
   }
  }catch{this.error='Não foi possível consultar os dispositivos de áudio.'}
  this.changed();
 }

 async choose(id:string){
  if(this.busy)return;
  const version=++this.version;this.busy=true;this.error='';this.changed();
  try{
   await this.voice.setAudioOutput(id);
   if(version!==this.version){await this.voice.setAudioOutput('');return}
   this.sinkId=id;this.selected(id);
  }catch(error){if(version===this.version)this.error=this.message(error)}
  finally{if(version===this.version){this.busy=false;this.changed()}}
 }

 /** Start the permission picker directly in the user's click activation. */
 async prompt(){
  if(this.busy||!this.canPrompt)return;
  const picker=(navigator.mediaDevices as OutputDevices).selectAudioOutput!;
  let selection:Promise<MediaDeviceInfo>;
  try{selection=picker.call(navigator.mediaDevices)}catch(error){this.error=this.message(error);this.changed();return}
  const version=++this.version;this.busy=true;this.error='';this.changed();
  try{
   const device=await selection;
   await this.voice.setAudioOutput(device.deviceId);
   if(version!==this.version){await this.voice.setAudioOutput('');return}
   this.sinkId=device.deviceId;this.selected(device.deviceId);
   await this.refresh();
  }catch(error){if(version===this.version)this.error=this.message(error)}
  finally{if(version===this.version){this.busy=false;this.changed()}}
 }

 reset(){this.version++;this.sinkId='';this.busy=false;this.error='';this.changed()}

 private message(error:unknown){
  const name=error instanceof DOMException?error.name:'';
  if(name==='NotAllowedError'||name==='SecurityError')return 'Permissão negada para esta saída de áudio.';
  if(name==='NotFoundError')return 'Dispositivo de áudio não encontrado.';
  if(name==='AbortError')return 'Não foi possível alternar a saída de áudio.';
  return 'Falha ao selecionar a saída de áudio. A saída anterior foi mantida.';
 }
}
