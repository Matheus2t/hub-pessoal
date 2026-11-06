export type ListeningSource='microphone'|'screenAudio';
interface ListeningLevel extends Record<ListeningSource,number> {muted:boolean}
const defaultLevel:Readonly<ListeningLevel>={microphone:100,screenAudio:100,muted:false};

interface AudioInput {
 element:HTMLAudioElement;
 stream:MediaStream;
 source?:MediaStreamAudioSourceNode;
 bus?:AudioBus;
 failed?:boolean;
}
interface AudioBus {
 gain:GainNode;
 compressor:DynamicsCompressorNode;
}

// Leave quieter samples alone and round the peaks before the hardware output.
const peakCurve=Float32Array.from({length:513},(_,index)=>{
 const sample=index/256-1,magnitude=Math.abs(sample);
 return magnitude<=.7?sample:Math.sign(sample)*(.7+.25*Math.tanh((magnitude-.7)/.25));
});

/** Independent local gain for each source, with one mute preference per participant. */
export class CallAudioMix {
 private levels=new Map<string,ListeningLevel>();
 private inputs=new Map<string,Map<ListeningSource,AudioInput>>();
 private context?:AudioContext;
 private output?:WaveShaperNode;
 private master?:GainNode;
 private unavailable=false;
 private silenced=false;

 constructor(private changed:()=>void){}

 level(id:string):Readonly<ListeningLevel>{return this.levels.get(id)??defaultLevel}
 canAmplify(id:string,role:ListeningSource){return !this.unavailable&&!this.inputs.get(id)?.get(role)?.failed}
 get deafened(){return this.silenced}
 get blocked(){
  return !this.silenced&&!!this.context&&this.context.state!=='running'&&[...this.inputs].some(([id,inputs])=>{
   const level=this.level(id);
   return !level.muted&&[...inputs].some(([role,input])=>!input.failed&&level[role]>0&&(level[role]!==100||input.bus));
  });
 }

 volume(id:string,role:ListeningSource,value:number){
  if(!Number.isFinite(value))return;
  const level={...this.level(id),[role]:Math.round(Math.max(0,Math.min(200,value)))};
  this.levels.set(id,level);
  if(!level.muted&&level[role]>0&&level[role]!==100)this.unlock(true);
  const input=this.inputs.get(id)?.get(role);
  if(input)this.apply(input,level.muted?0:level[role]/100);
  this.changed();
 }
 setDeafened(deafened:boolean){
  if(this.silenced===deafened)return;
  this.silenced=deafened;
  if(deafened){
   // Cut the final output, including audio buffered by the compressors.
   if(this.master)this.master.gain.value=0;
   for(const inputs of this.inputs.values())for(const input of inputs.values())input.element.muted=true;
  }else{
   if(this.inputs.size)this.resumePreferences();
   for(const id of this.inputs.keys())this.applyParticipant(id);
   if(this.master)this.master.gain.value=1;
  }
  this.changed();
 }
 mute(id:string){
  const level={...this.level(id),muted:!this.level(id).muted};
  this.levels.set(id,level);
  if(this.needsContext(level))this.unlock(true);
  this.applyParticipant(id);
  this.changed();
 }
 retain(people:ReadonlySet<string>){for(const id of this.levels.keys())if(!people.has(id))this.levels.delete(id)}
 resumePreferences(){this.unlock([...this.levels.values()].some(level=>this.needsContext(level)))}
 private needsContext(level:Readonly<ListeningLevel>){
  return !level.muted&&[level.microphone,level.screenAudio].some(value=>value>0&&value!==100);
 }
 private applyParticipant(id:string){
  const level=this.level(id);
  for(const [role,input] of this.inputs.get(id)??[])this.apply(input,level.muted?0:level[role]/100);
 }

 unlock(create=false){
  if(!this.context&&create&&!this.unavailable){
   try{
    const Audio=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Audio)throw new Error('Web Audio unavailable');
    const context=this.context=new Audio();
    context.onstatechange=()=>{
     if(this.context!==context)return;
     for(const id of this.inputs.keys())this.applyParticipant(id);
     this.changed();
    };
   }catch{this.unavailable=true;return}
  }
  const context=this.context;
  if(context&&context.state!=='running')void context.resume().catch(()=>{if(this.context===context)this.changed()});
 }

 mount(id:string,role:ListeningSource,element:HTMLAudioElement,stream?:MediaStream){
  const inputs=this.inputs.get(id),previous=inputs?.get(role);
  if(previous?.stream===stream&&(!stream||previous?.element===element))return;
  if(previous){
   previous.element.muted=true;
   this.disconnect(previous);
   inputs!.delete(role);
  }
  if(stream){
   const current=inputs??new Map<ListeningSource,AudioInput>(),input={element,stream};
   current.set(role,input);this.inputs.set(id,current);
   const level=this.level(id);
   this.apply(input,level.muted?0:level[role]/100);
  }else if(!inputs?.size)this.inputs.delete(id);
 }

 private createBus(context:AudioContext){
  if(!this.output){
   const output=context.createWaveShaper(),master=context.createGain();
   output.curve=peakCurve;
   master.gain.value=this.silenced?0:1;
   output.connect(master);master.connect(context.destination);
   this.output=output;this.master=master;
  }
  const gain=context.createGain(),compressor=context.createDynamicsCompressor();
  compressor.threshold.value=-6;compressor.knee.value=6;compressor.ratio.value=20;
  compressor.attack.value=.003;compressor.release.value=.12;
  gain.connect(compressor);compressor.connect(this.output);
  return {gain,compressor};
 }

 private apply(input:AudioInput,level:number){
  const {element}=input,context=this.context;
  if(level===1&&input.bus)this.disconnect(input);
  if(context?.state==='running'&&!input.failed&&(input.bus||level>0&&level!==1)){
   try{
    const bus=input.bus??=this.createBus(context);
    const now=context.currentTime,gain=bus.gain.gain;
    gain.cancelScheduledValues(now);
    if(level===0)gain.setValueAtTime(0,now);
    else if(input.source)gain.setTargetAtTime(level,now,.008);
    else gain.setValueAtTime(level,now);
    // Mute the HTML route before wiring the same stream to Web Audio.
    element.muted=true;
    if(!input.source){
     input.source=context.createMediaStreamSource(input.stream);
     input.source.connect(bus.gain);
    }
    return;
   }catch{input.failed=true;this.disconnect(input)}
  }
  // A suspended graph is silent. Keep its HTML copy muted until it resumes.
  try{element.volume=Math.min(1,level)}catch{/* Native volume is optional on mobile. */}
  element.muted=this.silenced||!!input.source||level===0;
 }

 private disconnect(input:AudioInput){
  input.source?.disconnect();input.source=undefined;
  const bus=input.bus;
  if(bus){bus.gain.disconnect();bus.compressor.disconnect();input.bus=undefined}
 }
 detach(id:string){
  for(const input of this.inputs.get(id)?.values()??[]){
   input.element.muted=true;
   this.disconnect(input);
  }
  this.inputs.delete(id);
 }
 stop(forget:boolean){
  for(const id of this.inputs.keys())this.detach(id);
  this.output?.disconnect();this.output=undefined;
  this.master?.disconnect();this.master=undefined;
  const context=this.context;this.context=undefined;this.unavailable=false;
  if(context){context.onstatechange=null;void context.close().catch(()=>{})}
  if(forget){this.levels.clear();this.silenced=false}
 }
}
