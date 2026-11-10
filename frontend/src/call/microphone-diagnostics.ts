/** Microphone-only diagnostics. Audio stays on-device; previews use short-lived blob URLs. */
export class CallMicrophoneDiagnostics {
 level=0;
 recording=false;
 previewUrl='';
 error='';
 private stream?:MediaStream;
 private context?:AudioContext;
 private analyser?:AnalyserNode;
 private samples?:Float32Array<ArrayBuffer>;
 private ticker?:number;
 private recorder?:MediaRecorder;
 private timeout?:number;
 private generation=0;
 private chunks:Blob[]=[];
 constructor(private changed:()=>void,private measured:(level:number)=>void=()=>{}){}

 attach(stream?:MediaStream){
  if(stream===this.stream)return;
  this.detach();
  this.stream=stream;
  const Audio=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!stream?.getAudioTracks().length||!Audio)return;
  const version=this.generation;
  try{
   const context=this.context=new Audio({latencyHint:'interactive'});
   const source=context.createMediaStreamSource(stream);
   const analyser=this.analyser=context.createAnalyser();
   analyser.fftSize=1024;analyser.smoothingTimeConstant=.55;
   source.connect(analyser); // Deliberately not connected to speakers.
   this.samples=new Float32Array(analyser.fftSize);
   void context.resume().catch(()=>{});
   this.ticker=window.setInterval(()=>{
    if(this.generation!==version||!this.analyser||!this.samples)return;
    if(context.state!=='running'){this.level=0;this.measured(0);return}
    analyser.getFloatTimeDomainData(this.samples);
    let sum=0;for(const sample of this.samples)sum+=sample*sample;
    const rms=Math.sqrt(sum/this.samples.length);
    const next=Math.max(0,Math.min(100,Math.round((20*Math.log10(rms+1e-7)+63)*2)));
    if(Math.abs(this.level-next)>=2){this.level=next;this.changed()}
    this.measured(next);
   },100);
  }catch{
   this.error='Indicador de volume indisponível neste navegador.';
   this.changed();
  }
 }

 startRecording(stream?:MediaStream){
  if(this.recording||!stream?.getAudioTracks().length)return;
  this.clearPreview();
  if(typeof MediaRecorder==='undefined'){this.error='Gravação de microfone não suportada neste navegador.';this.changed();return}
  this.error='';this.chunks=[];
  const version=this.generation;
  try{
   const supported=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
   const recorder=this.recorder=new MediaRecorder(stream,supported?{mimeType:supported}:undefined);
   recorder.ondataavailable=event=>{
    if(version===this.generation&&event.data.size&&this.chunks.reduce((total,b)=>total+b.size,0)<5_000_000)
     this.chunks.push(event.data);
   };
   recorder.onstop=()=>{
    if(version!==this.generation)return;
    this.recording=false;window.clearTimeout(this.timeout);this.timeout=undefined;
    if(this.chunks.length){
     this.previewUrl=URL.createObjectURL(new Blob(this.chunks,{type:recorder.mimeType||'audio/webm'}));
    }else this.error='Nenhum áudio foi gravado. Confira o microfone.';
    this.chunks=[];this.recorder=undefined;this.changed();
   };
   recorder.onerror=()=>{if(version===this.generation){this.error='Falha ao gravar o microfone.';this.stopRecording()}};
   recorder.start(200);
   this.recording=true;
   this.timeout=window.setTimeout(()=>this.stopRecording(),6000);
   this.changed();
  }catch{
   this.error='Não foi possível iniciar o teste do microfone.';this.recorder=undefined;
   this.changed();
  }
 }
 stopRecording(){
  if(this.recorder?.state==='recording')try{this.recorder.stop()}catch{}
 }
 clearPreview(){
  if(this.previewUrl)URL.revokeObjectURL(this.previewUrl);
  this.previewUrl='';this.chunks=[];
 }
 detach(){
  this.generation++;
  if(this.ticker!==undefined)window.clearInterval(this.ticker);
  this.ticker=undefined;
  if(this.timeout!==undefined)window.clearTimeout(this.timeout);
  this.timeout=undefined;
  if(this.recorder?.state==='recording')try{this.recorder.stop()}catch{}
  this.recorder=undefined;this.recording=false;
  const context=this.context;this.context=undefined;this.analyser=undefined;this.samples=undefined;
  if(context)void context.close().catch(()=>{});
  this.stream=undefined;this.level=0;this.measured(0);
  this.clearPreview();this.changed();
 }
}
