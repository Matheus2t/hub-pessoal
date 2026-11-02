import type {Language} from './model';
/** Only matching voices; the caller must show an unavailable state instead of substituting languages. */
export class LearnSpeech {
  private synth=typeof speechSynthesis==='undefined'?undefined:speechSynthesis;
  voices(language:Language):SpeechSynthesisVoice[]{return this.synth?.getVoices().filter(v=>v.lang.toLowerCase().split('-')[0]===language)??[]}
  play(text:string,language:Language,rate=1):Promise<void>{
    if(!this.synth)return Promise.reject(Error('Síntese de voz não disponível neste navegador.'));
    const voice=this.voices(language).find(v=>v.localService)??this.voices(language)[0];
    if(!voice)return Promise.reject(Error(`Nenhuma voz compatível com ${language==='ru'?'russo':'inglês'} está instalada.`));
    if(!text.trim()||text.length>3000||rate<.5||rate>1.5||!Number.isFinite(rate))return Promise.reject(Error('Áudio ou velocidade inválidos.'));
    this.stop();return new Promise((resolve,reject)=>{const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=rate;utterance.onend=()=>resolve();utterance.onerror=()=>reject(Error('Reprodução interrompida ou não disponível.'));this.synth!.speak(utterance)});
  }
  pause(){this.synth?.pause()}
  resume(){this.synth?.resume()}
  stop(){this.synth?.cancel()}
}
