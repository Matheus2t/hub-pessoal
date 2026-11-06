export type MicrophoneMode='clean'|'natural'|'custom';
export type MicrophoneFlag='echoCancellation'|'noiseSuppression'|'autoGainControl';
type Flags=Record<MicrophoneFlag,boolean>;
const clean:Flags={echoCancellation:true,noiseSuppression:true,autoGainControl:true};
const natural:Flags={echoCancellation:false,noiseSuppression:false,autoGainControl:false};

/** Browser-native processing plus an optional local Web Audio voice-activity gate. */
export class CallMicrophoneProcessing {
 mode:MicrophoneMode='clean';
 flags:Flags={...clean};
 sensitivity=0; // 0 disables the gate, 100 detects quieter speech.
 error='';
 private source?:MediaStream;
 private outgoing?:MediaStream;
 private context?:AudioContext;
 private gate?:GainNode;
 private analyser?:AnalyserNode;
 private samples?:Float32Array<ArrayBuffer>;
 private timer?:number;
 private openUntil=0;
 private generation=0;

 constructor(private changed:()=>void,private streamChanged:(stream:MediaStream)=>void){}

 get stream(){return this.outgoing??this.source}
 get supported(){
  const capabilities=navigator.mediaDevices?.getSupportedConstraints?.();
  return capabilities??{};
 }
 get hasGate(){return !!(window.AudioContext||('webkitAudioContext' in window))}

 constraints():MediaTrackConstraints{
  const supported=this.supported;
  return Object.fromEntries((Object.keys(this.flags) as MicrophoneFlag[])
   .filter(key=>supported[key]!==false).map(key=>[key,this.flags[key]])) as MediaTrackConstraints;
 }

 async attach(stream:MediaStream){
  this.stop();
  this.source=stream;
  if(this.sensitivity>0)await this.startGate();
  return this.stream??stream;
 }

 async selectMode(mode:MicrophoneMode){
  const oldMode=this.mode,oldFlags=this.flags;
  this.mode=mode;
  if(mode==='clean')this.flags={...clean};
  if(mode==='natural')this.flags={...natural};
  if(!await this.apply()){
   this.mode=oldMode;this.flags=oldFlags;
  }
  this.changed();
 }

 async setFlag(key:MicrophoneFlag,enabled:boolean){
  const oldMode=this.mode,oldFlags=this.flags;
  this.mode='custom';this.flags={...this.flags,[key]:enabled};
  if(!await this.apply()){this.mode=oldMode;this.flags=oldFlags}
  this.changed();
 }

 private async apply(){
  this.error='';
  const track=this.source?.getAudioTracks()[0];
  if(!track||track.readyState!=='live')return true;
  try{await track.applyConstraints(this.constraints());return true}
  catch{this.error='Este microfone não aceitou a alteração de processamento.';return false}
 }

 async setSensitivity(value:number){
  this.sensitivity=Math.max(0,Math.min(100,Math.round(value)));
  this.error='';
  if(this.sensitivity>0&&this.source&&!this.context){
   if(await this.startGate()&&this.stream)this.streamChanged(this.stream);
  }
  if(this.sensitivity===0&&this.gate&&this.context)this.gate.gain.setTargetAtTime(1,this.context.currentTime,.015);
  this.changed();
 }

 private async startGate(){
  const source=this.source;
  if(!source||this.context||!this.hasGate)return false;
  const Audio=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Audio)return false;
  const version=this.generation;
  let context:AudioContext;
  try{
   context=new Audio();
   await context.resume();
   if(this.generation!==version||this.source!==source){void context.close();return false}
   if(context.state!=='running')throw new Error('Suspended');
   const input=context.createMediaStreamSource(source);
   const analyser=context.createAnalyser(),gain=context.createGain(),destination=context.createMediaStreamDestination();
   analyser.fftSize=1024;analyser.smoothingTimeConstant=.2;
   gain.gain.value=1;
   input.connect(analyser);analyser.connect(gain);gain.connect(destination);
   this.context=context;this.analyser=analyser;this.gate=gain;this.outgoing=destination.stream;
   this.samples=new Float32Array(analyser.fftSize);
   this.openUntil=0;
   this.timer=window.setInterval(()=>this.sample(),40);
   return true;
  }catch{
   this.error='Controle de sensibilidade indisponível neste navegador.';
   if(context!)void context.close().catch(()=>{});
   this.changed();
   return false;
  }
 }

 private sample(){
  const analyser=this.analyser,gate=this.gate,context=this.context,samples=this.samples;
  if(!analyser||!gate||!context||!samples)return;
  if(this.sensitivity===0){
   if(gate.gain.value<.99)gate.gain.setTargetAtTime(1,context.currentTime,.01);
   return;
  }
  analyser.getFloatTimeDomainData(samples);
  let squared=0;
  for(let i=0;i<samples.length;i++)squared+=samples[i]*samples[i];
  const rms=Math.sqrt(squared/samples.length);
  const threshold=Math.pow(10,(-70+(100-this.sensitivity)*.45)/20);
  const now=performance.now();
  if(rms>=threshold)this.openUntil=now+260;
  const open=now<this.openUntil;
  const target=open?1:0;
  if(Math.abs(gate.gain.value-target)>.015)gate.gain.setTargetAtTime(target,context.currentTime,open?.012:.06);
 }

 stop(){
  this.generation++;
  if(this.timer!==undefined)window.clearInterval(this.timer);
  this.timer=undefined;
  this.outgoing?.getTracks().forEach(track=>{track.onended=null;track.stop()});
  this.source?.getTracks().forEach(track=>{track.onended=null;track.stop()});
  this.source=undefined;this.outgoing=undefined;this.gate=undefined;this.analyser=undefined;this.samples=undefined;
  const context=this.context;this.context=undefined;
  if(context)void context.close().catch(()=>{});
 }
}
