export type MicrophoneMode='clean'|'natural'|'custom';
export type MicrophoneFlag='echoCancellation'|'noiseSuppression'|'autoGainControl';
type Flags=Record<MicrophoneFlag,boolean>;

// Noise suppression and echo cancellation are the primary voice filters.
// Automatic gain often amplifies keyboard/fan noise in quiet moments; leave it
// optional rather than silently forcing it on for every participant.
const clean:Flags={echoCancellation:true,noiseSuppression:true,autoGainControl:false};
const natural:Flags={echoCancellation:false,noiseSuppression:false,autoGainControl:false};
const keys:MicrophoneFlag[]=['noiseSuppression','echoCancellation','autoGainControl'];

/** Browser-native microphone filtering plus a deliberately optional, gentle voice gate. */
export class CallMicrophoneProcessing {
 mode:MicrophoneMode='clean';
 flags:Flags={...clean};
 sensitivity=0; // 0 disables the optional voice gate; 100 detects quieter speech.
 enhanced=false; // Optional local spectral denoising; native filtering remains available.
 activeEnhanced=false;
 error='';
 private source?:MediaStream;
 private outgoing?:MediaStream;
 private context?:AudioContext;
 private gate?:GainNode;
 private analyser?:AnalyserNode;
 private worklet?:AudioWorkletNode;
 private samples?:Float32Array<ArrayBuffer>;
 private timer?:number;
 private openUntil=0;
 private generation=0;
 private starting?:Promise<boolean>;

 constructor(private changed:()=>void,private streamChanged:(stream:MediaStream)=>void){}

 get stream(){return this.outgoing??this.source}
 get input(){return this.source}
 get supported(){return navigator.mediaDevices?.getSupportedConstraints?.()??{}}
 get hasGate(){return !!(window.AudioContext||('webkitAudioContext' in window))}
 get hasAdvanced(){return this.hasGate&&typeof AudioWorkletNode!=='undefined'}

 /** Actual values reported by the original input track, not checkbox requests. */
 get effective():Partial<Flags>{
  const result:Partial<Flags>={};
  try{
   const settings=this.source?.getAudioTracks()[0]?.getSettings();
   if(settings)for(const key of keys){
    const value=settings[key];
    if(typeof value==='boolean')result[key]=value;
   }
  }catch{/* Some browsers cannot inspect audio settings. */}
  return result;
 }

 constraints():MediaTrackConstraints{
  const supported=this.supported;
  return Object.fromEntries(keys.filter(key=>supported[key]===true)
   .map(key=>[key,this.flags[key]])) as MediaTrackConstraints;
 }

 async attach(stream:MediaStream){
  this.stop();
  this.source=stream;
  try{stream.getAudioTracks()[0].contentHint='speech'}catch{/* Optional hint for voice encoding. */}
  this.checkApplied();
  if(this.sensitivity>0||this.enhanced)await this.startGate();
  return this.stream??stream;
 }

 async selectMode(mode:MicrophoneMode){
  const oldMode=this.mode,oldFlags=this.flags;
  this.mode=mode;
  if(mode==='clean')this.flags={...clean};
  if(mode==='natural')this.flags={...natural};
  if(!await this.apply()){this.mode=oldMode;this.flags=oldFlags}
  this.changed();
 }

 async setFlag(key:MicrophoneFlag,enabled:boolean){
  const oldMode=this.mode,oldFlags=this.flags;
  this.mode='custom';this.flags={...this.flags,[key]:enabled};
  if(!await this.apply()){this.mode=oldMode;this.flags=oldFlags}
  this.changed();
 }

 private checkApplied(){
  const effective=this.effective;
  const notApplied=keys.filter(key=>this.supported[key]===true
   &&effective[key]!==undefined&&effective[key]!==this.flags[key]);
  this.error=notApplied.length?'O navegador não conseguiu aplicar todos os filtros. Confira o estado real abaixo.':'';
 }

 private async apply(){
  this.error='';
  const track=this.source?.getAudioTracks()[0];
  if(!track||track.readyState!=='live')return true;
  try{
   await track.applyConstraints(this.constraints());
   this.checkApplied();
   return true;
  }catch{
   this.error='Este microfone não aceitou a alteração de processamento.';
   return false;
  }
 }

 async setEnhanced(enabled:boolean){
  if(enabled===this.enhanced)return;
  this.enhanced=enabled;this.error='';
  await this.rebuild();
  this.changed();
 }

 async setSensitivity(value:number){
  const next=Math.max(0,Math.min(100,Math.round(value)));
  if(next===this.sensitivity)return;
  this.sensitivity=next;this.error='';
  if(this.source){
   if(next===0&&!this.enhanced)await this.rebuild();
   else if(!this.context)await this.rebuild();
  }
  this.changed();
 }

 private async rebuild(){
  if(!this.source)return;
  const raw=this.source,processed=this.outgoing;
  if(processed)this.streamChanged(raw);
  this.stopGate();
  if((this.enhanced||this.sensitivity>0)&&this.source===raw){
   if(await this.startGate()&&this.source===raw&&this.stream!==raw)this.streamChanged(this.stream!);
  }
 }

 private async startGate(){
  if(this.starting)return this.starting;
  const promise=this.createGate();this.starting=promise;
  try{return await promise}finally{if(this.starting===promise)this.starting=undefined}
 }
 private async createGate(){
  const source=this.source;
  if(!source||this.context||!this.hasGate)return false;
  const Audio=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Audio)return false;
  const version=this.generation;
  let context:AudioContext|undefined;
  try{
   context=new Audio({latencyHint:'interactive'});
   await context.resume();
   if(this.generation!==version||this.source!==source||(!this.enhanced&&this.sensitivity===0)){
    void context.close().catch(()=>{});return false;
   }
   if(context.state!=='running')throw new Error('Suspended');
   const input=context.createMediaStreamSource(source);
   const analyser=context.createAnalyser(),gain=context.createGain(),destination=context.createMediaStreamDestination();
   let last:AudioNode=input;
   let worklet:AudioWorkletNode|undefined;
   if(this.enhanced){
    try{
     if(!context.audioWorklet||typeof AudioWorkletNode==='undefined')throw new Error('unsupported');
     await context.audioWorklet.addModule('/call-denoise-worklet.js');
     if(this.generation!==version||this.source!==source){
      void context.close().catch(()=>{});return false;
     }
     worklet=new AudioWorkletNode(context,'call-spectral-denoise',{
      numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]
     });
     last.connect(worklet);last=worklet;
    }catch{
     this.error='Filtro avançado indisponível neste navegador. Mantido o áudio nativo.';
    }
   }
   analyser.fftSize=1024;analyser.smoothingTimeConstant=.25;
   gain.gain.value=1;
   last.connect(analyser);analyser.connect(gain);gain.connect(destination);
   if(this.generation!==version||this.source!==source){
    void context.close().catch(()=>{});return false;
   }
   this.context=context;this.analyser=analyser;this.gate=gain;this.worklet=worklet;
   this.activeEnhanced=!!worklet;
   this.outgoing=destination.stream;
   this.samples=new Float32Array(analyser.fftSize);
   this.openUntil=0;
   this.timer=window.setInterval(()=>this.sample(),40);
   return true;
  }catch{
   this.error='Processamento adicional indisponível. O microfone original continua ativo.';
   if(context)void context.close().catch(()=>{});
   this.changed();return false;
  }
 }

 private sample(){
  const analyser=this.analyser,gate=this.gate,context=this.context,samples=this.samples;
  if(!analyser||!gate||!context||!samples||context.state!=='running')return;
  if(this.sensitivity===0){if(gate.gain.value<.99)gate.gain.setTargetAtTime(1,context.currentTime,.02);return}
  analyser.getFloatTimeDomainData(samples);
  let squared=0;
  for(let i=0;i<samples.length;i++)squared+=samples[i]*samples[i];
  const rms=Math.sqrt(squared/samples.length);
  // Higher sensitivity means quieter speech opens the gate. The gate is NOT
  // a full noise suppressor: reduce, don't hard-mute, between spoken words.
  const threshold=Math.pow(10,(-66+(100-this.sensitivity)*.34)/20);
  const now=performance.now();
  if(rms>=threshold)this.openUntil=now+420;
  const open=now<this.openUntil;
  const target=open?1:.12;
  if(Math.abs(gate.gain.value-target)>.03)gate.gain.setTargetAtTime(target,context.currentTime,open ? .015 : .16);
 }

 private stopGate(){
  this.generation++;
  this.starting=undefined;
  if(this.timer!==undefined)window.clearInterval(this.timer);
  this.timer=undefined;
  this.outgoing?.getTracks().forEach(track=>{track.onended=null;track.stop()});
  this.outgoing=undefined;this.gate=undefined;this.analyser=undefined;this.samples=undefined;
  this.worklet?.disconnect();this.worklet=undefined;this.activeEnhanced=false;
  const context=this.context;this.context=undefined;
  if(context)void context.close().catch(()=>{});
 }

 stop(){
  this.stopGate();
  this.source?.getTracks().forEach(track=>{track.onended=null;track.stop()});
  this.source=undefined;
 }
}
