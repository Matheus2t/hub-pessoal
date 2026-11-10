/* Lightweight, local spectral noise attenuation for Call.
 * No microphone data is stored or sent outside the active WebRTC call.
 * Designed as an optional enhancement on top of the browser's echo cancellation.
 * 256-point overlap-add with a tracked spectral noise floor; no ML claims. */
class CallSpectralDenoise extends AudioWorkletProcessor {
 constructor(){
  super();
  this.n=256;this.hop=128;this.count=0;
  this.history=new Float32Array(this.hop);
  this.overlap=new Float32Array(this.hop);
  this.real=new Float32Array(this.n);
  this.imag=new Float32Array(this.n);
  this.noise=new Float32Array(this.hop+1);
  this.smoothed=new Float32Array(this.hop+1).fill(1);
  this.window=new Float32Array(this.n);
  this.normalizer=new Float32Array(this.hop);
  for(let i=0;i<this.n;i++)this.window[i]=.5-.5*Math.cos(2*Math.PI*i/this.n);
  for(let i=0;i<this.hop;i++)this.normalizer[i]=
   this.window[i]*this.window[i]+this.window[i+this.hop]*this.window[i+this.hop];
 }
 fft(inverse){
  const n=this.n,re=this.real,im=this.imag;
  for(let i=1,j=0;i<n;i++){
   let bit=n>>1;
   while(j&bit){j^=bit;bit>>=1}
   j^=bit;
   if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}
  }
  for(let len=2;len<=n;len<<=1){
   const theta=(inverse?2:-2)*Math.PI/len;
   const cr=Math.cos(theta),ci=Math.sin(theta);
   for(let i=0;i<n;i+=len){
    let wr=1,wi=0;
    for(let j=0;j<len/2;j++){
     const u=i+j,v=u+len/2;
     const tr=re[v]*wr-im[v]*wi,ti=re[v]*wi+im[v]*wr;
     re[v]=re[u]-tr;im[v]=im[u]-ti;
     re[u]+=tr;im[u]+=ti;
     const nr=wr*cr-wi*ci;wi=wr*ci+wi*cr;wr=nr;
    }
   }
  }
  if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n}
 }
 process(inputs,outputs){
  const output=outputs[0]?.[0];
  if(!output)return true;
  const input=inputs[0]?.[0];
  if(!input){output.fill(0);return true}
  const n=this.n,h=this.hop,re=this.real,im=this.imag;
  if(input.length!==h){output.set(input.subarray(0,Math.min(input.length,output.length)));return true}
  for(let i=0;i<h;i++){
   re[i]=this.history[i]*this.window[i];
   re[i+h]=input[i]*this.window[i+h];
   this.history[i]=input[i];im[i]=0;im[i+h]=0;
  }
  this.fft(false);
  const nyquist=sampleRate/2;
  for(let k=0;k<=h;k++){
   const power=re[k]*re[k]+im[k]*im[k]+1e-13;
   if(this.count===0)this.noise[k]=Math.max(1e-12,power*.2);
   else {
    // Follow steady fans/hum, but do not adapt quickly to speech transients.
    const floor=this.noise[k];
    const alpha=power<floor*2.5?.012:.00012;
    this.noise[k]=Math.max(1e-12,floor*(1-alpha)+power*alpha);
   }
   const snr=power/(this.noise[k]+1e-12);
   const desired=Math.max(.23,Math.min(1,1-1.22/(snr+.2)));
   const gain=this.smoothed[k]=this.smoothed[k]*.7+desired*.3;
   const frequency=nyquist*k/h;
   const band=frequency<75?.12:frequency<130?.6:frequency>11500?.42:1;
   const finalGain=gain*band;
   re[k]*=finalGain;im[k]*=finalGain;
   if(k>0&&k<h){re[n-k]*=finalGain;im[n-k]*=finalGain}
  }
  this.fft(true);
  for(let i=0;i<h;i++){
   const index=i+h;
   const fromPrev=this.overlap[i];
   const fromThis=re[i]*this.window[i];
   output[i]=Math.max(-1,Math.min(1,(fromPrev+fromThis)/Math.max(.001,this.normalizer[i])));
   this.overlap[i]=re[index]*this.window[index];
  }
  this.count++;
  return true;
 }
}
registerProcessor('call-spectral-denoise',CallSpectralDenoise);
