import type {Language} from './model';

/** Local browser synthesis is a practice aid, never a validated recording. */
export class LearnSpeech {
  private synth=typeof globalThis.speechSynthesis==='undefined'?undefined:globalThis.speechSynthesis;
  private current?:SpeechSynthesisUtterance;

  supported():boolean{return !!this.synth;}
  allVoices():SpeechSynthesisVoice[]{return this.synth?.getVoices()??[];}
  voices(language:Language):SpeechSynthesisVoice[]{return this.allVoices().filter(v=>v.lang.toLowerCase().split('-')[0]===language);}

  play(text:string,language:Language,rate=1,volume=1):Promise<void>{
    if(!this.synth)return Promise.reject(Error('Síntese de voz não disponível neste navegador.'));
    const voices=this.voices(language);
    const voice=voices.find(v=>v.localService&&v.default)??voices.find(v=>v.localService)??voices.find(v=>v.default)??voices[0];
    if(!voice)return Promise.reject(Error(`Nenhuma voz compatível com ${language==='ru'?'russo':'inglês'} está instalada.`));
    if(!text.trim()||text.length>3000||rate<.5||rate>1.5||!Number.isFinite(rate)||volume<0||volume>1||!Number.isFinite(volume))
      return Promise.reject(Error('Áudio, velocidade ou volume inválidos.'));

    this.stop();
    return new Promise((resolve,reject)=>{
      const utterance=new SpeechSynthesisUtterance(text);
      utterance.voice=voice;
      utterance.lang=voice.lang;
      utterance.rate=rate;
      utterance.volume=volume;
      this.current=utterance;
      utterance.onend=()=>{if(this.current===utterance)this.current=undefined;resolve();};
      utterance.onerror=()=>{if(this.current===utterance)this.current=undefined;reject(Error('Reprodução interrompida ou não disponível.'));};
      this.synth!.speak(utterance);
    });
  }

  setVolume(volume:number):void{
    if(Number.isFinite(volume)&&volume>=0&&volume<=1&&this.current)this.current.volume=volume;
  }
  pause():void{this.synth?.pause();}
  resume():void{this.synth?.resume();}
  stop():void{this.synth?.cancel();this.current=undefined;}
}
