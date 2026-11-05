export interface ListeningLevel {volume:number;muted:boolean}
const defaultLevel:Readonly<ListeningLevel>={volume:100,muted:false};

interface AudioInput {
 stream:MediaStream;
 source?:MediaStreamAudioSourceNode;
}
interface AudioBus {
 gain:GainNode;
 compressor:DynamicsCompressorNode;
 ceiling:WaveShaperNode;
}

// Leave quieter samples alone and round the peaks before the hardware output.
const peakCurve=Float32Array.from({length:513},(_,index)=>{
 const sample=index/256-1,magnitude=Math.abs(sample);
 return magnitude<=.7?sample:Math.sign(sample)*(.7+.25*Math.tanh((magnitude-.7)/.25));
});

/** Local output only. A participant's microphone and shared audio use one bus. */
export class CallAudioMix {
 private levels=new Map<string,ListeningLevel>();
 private inputs=new Map<string,Map<HTMLAudioElement,AudioInput>>();
 private buses=new Map<string,AudioBus>();
 private context?:AudioContext;
 private failed=new Set<string>();
 private unavailable=false;

 constructor(private changed:()=>void){}

 level(id:string):Readonly<ListeningLevel>{return this.levels.get(id)??defaultLevel}
 canAmplify(id:string){return !this.unavailable&&!this.failed.has(id)}
 get blocked(){
  return !!this.context&&this.context.state!=='running'&&[...this.inputs.keys()].some(id=>{
   const {volume,muted}=this.level(id);
   return !muted&&volume>0&&(volume!==100||this.buses.has(id));
  });
 }

 volume(id:string,value:number){
  if(Number.isFinite(value))this.set(id,{...this.level(id),volume:Math.round(Math.max(0,Math.min(200,value)))});
 }
 mute(id:string){const current=this.level(id);this.set(id,{...current,muted:!current.muted})}
 retain(people:ReadonlySet<string>){for(const id of this.levels.keys())if(!people.has(id))this.levels.delete(id)}
 resumePreferences(){this.unlock([...this.levels.values()].some(level=>!level.muted&&level.volume>0&&level.volume!==100))}
 private set(id:string,level:ListeningLevel){
  this.levels.set(id,level);
  if(!level.muted&&level.volume>0&&level.volume!==100)this.unlock(true);
  this.apply(id);
  this.changed();
 }

 unlock(create=false){
  if(!this.context&&create&&!this.unavailable){
   try{
    const Audio=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Audio)throw new Error('Web Audio unavailable');
    const context=this.context=new Audio();
    context.onstatechange=()=>{
     if(this.context!==context)return;
     for(const id of this.inputs.keys())this.apply(id);
     this.changed();
    };
   }catch{this.unavailable=true;return}
  }
  const context=this.context;
  if(context&&context.state!=='running')void context.resume().catch(()=>{if(this.context===context)this.changed()});
 }

 mount(id:string,element:HTMLAudioElement,stream?:MediaStream){
  const inputs=this.inputs.get(id),input=inputs?.get(element);
  if(input?.stream===stream)return;
  if(input){input.source?.disconnect();inputs!.delete(element)}
  if(stream){
   const current=inputs??new Map<HTMLAudioElement,AudioInput>();
   current.set(element,{stream});this.inputs.set(id,current);
  }else if(!inputs?.size){this.detach(id);return}
  this.apply(id);
 }

 private createBus(context:AudioContext){
  const gain=context.createGain(),compressor=context.createDynamicsCompressor(),ceiling=context.createWaveShaper();
  compressor.threshold.value=-6;compressor.knee.value=6;compressor.ratio.value=20;
  compressor.attack.value=.003;compressor.release.value=.12;
  ceiling.curve=peakCurve;
  gain.connect(compressor);compressor.connect(ceiling);ceiling.connect(context.destination);
  return {gain,compressor,ceiling};
 }

 private apply(id:string){
  const inputs=this.inputs.get(id),context=this.context;
  if(!inputs?.size)return;
  const {volume,muted}=this.level(id),level=muted?0:volume/100;
  let bus=this.buses.get(id);
  if(level===1&&bus){this.disconnectBus(id);bus=undefined}
  if(context?.state==='running'&&!this.failed.has(id)&&(bus||level>0&&level!==1)){
   try{
    if(!bus){bus=this.createBus(context);this.buses.set(id,bus)}
    const now=context.currentTime;
    bus.gain.gain.cancelScheduledValues(now);
    if(level===0)bus.gain.gain.setValueAtTime(0,now);
    else bus.gain.gain.setTargetAtTime(level,now,.008);
    for(const [element,input] of inputs){
     // Mute the HTML route before wiring the same stream to Web Audio.
     element.muted=true;
     if(!input.source){input.source=context.createMediaStreamSource(input.stream);input.source.connect(bus.gain)}
    }
    return;
   }catch{this.failed.add(id);this.disconnectBus(id)}
  }
  for(const [element,input] of inputs){
   // A suspended graph is silent. Keep its HTML copy muted until it resumes.
   element.muted=!!input.source||level===0;
   try{element.volume=Math.min(1,level)}catch{/* Native volume is optional on mobile. */}
  }
 }

 private disconnectBus(id:string){
  for(const input of this.inputs.get(id)?.values()??[]){input.source?.disconnect();input.source=undefined}
  const bus=this.buses.get(id);
  if(bus){bus.gain.disconnect();bus.compressor.disconnect();bus.ceiling.disconnect();this.buses.delete(id)}
 }
 detach(id:string){this.disconnectBus(id);this.inputs.delete(id);this.failed.delete(id)}
 stop(forget:boolean){
  for(const id of this.inputs.keys())this.detach(id);
  const context=this.context;this.context=undefined;this.unavailable=false;
  if(context){context.onstatechange=null;void context.close().catch(()=>{})}
  if(forget)this.levels.clear();
 }
}
