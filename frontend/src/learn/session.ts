import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Attempt,Card,Grade,Language,Word} from './model';
import type {Exercise} from './content';
import {evaluateAnswer,newCard,schedule} from './engine';
import {recordAttempt} from './storage';
import './audio';
@customElement('learn-session')
export class LearnSession extends LightElement {
 @property() language:Language='en';@property() mode='writing';
 @property({attribute:false}) words:Word[]=[];@property({attribute:false}) exercises:Exercise[]=[];
 @state() private index=0;@state() private answer='';@state() private revealed=false;@state() private saved=false;@state() private busy=false;@state() private error='';@state() private heard=false;
 @state() private results:boolean[]=[];
 private attemptId='';private started=0;private generation=0;private elapsed=0;private lastTick=0;
 private tick=()=>{const now=performance.now();if(this.lastTick&&!document.hidden)this.elapsed+=Math.min(2,(now-this.lastTick)/1000);this.lastTick=now};
 private timer?:ReturnType<typeof setInterval>;
 connectedCallback(){super.connectedCallback();this.timer=setInterval(this.tick,1000)}
 disconnectedCallback(){this.generation++;clearInterval(this.timer);super.disconnectedCallback()}
 protected updated(c:PropertyValues){if(c.has('words')||c.has('exercises')||c.has('mode')||c.has('language')){this.generation++;this.index=0;this.results=[];this.reset()}}
 private reset(){this.attemptId=crypto.randomUUID();this.answer='';this.revealed=false;this.saved=false;this.busy=false;this.heard=false;this.error='';this.started=Date.now();this.elapsed=0;this.lastTick=performance.now()}
 private async submit(grade?:Grade){
  if(this.busy||this.saved)return;
  const flash=this.mode==='flashcards',word=this.words[this.index],exercise=this.exercises[this.index];
  if(flash&&!this.revealed)return;
  if(!flash&&!this.answer.trim()){this.error='Digite uma resposta.';return}
  if(['listening','dictation'].includes(this.mode)&&!this.heard){this.error='Ouça o áudio até o fim antes de responder.';return}
  const expected=flash?word.translation:exercise.answers[0];
  const correct=flash?grade!==0:evaluateAnswer(this.answer,exercise.answers,exercise.acceptYoAsE);
  const event:Attempt={id:this.attemptId,language:this.language,itemId:flash?word.id:exercise.id,skill:flash||this.mode==='vocabulary'?'vocabulary':exercise.skill,topic:flash?word.topic:exercise.topic,answer:flash?['Esqueci','Difícil','Bom','Fácil'][grade!]:this.answer.trim(),expected,correct,at:Date.now(),seconds:Math.min(600,Math.round(this.elapsed)),...(flash?{grade}: {})};
  const token=this.generation;this.busy=true;this.error='';
  try{await recordAttempt(event,flash?(previous:Card|undefined)=>schedule(previous||newCard(event.language,word.id),grade!):undefined);if(token!==this.generation||!this.isConnected)return;this.saved=true;this.results=[...this.results,correct];this.dispatchEvent(new CustomEvent('progress-saved',{bubbles:true}));}
  catch{if(token===this.generation&&this.isConnected)this.error='Não foi possível salvar. Sua resposta não foi concluída. Tente novamente.'}
  finally{if(token===this.generation&&this.isConnected)this.busy=false}
 }
 render(){const flash=this.mode==='flashcards',total=flash?this.words.length:this.exercises.length,word=this.words[this.index],exercise=this.exercises[this.index];
  if(!total)return html`<p class="learn-empty">Nenhum item disponível nesta sessão.</p>`;
  if(this.index>=total)return html`<section class="learn-message"><h2>Sessão concluída</h2><p>${this.results.length} respostas salvas · ${this.results.filter(Boolean).length} ${flash?'cartões lembrados':'acertos'}.</p><a class="button" href=${`#/learn/${this.language}`}>Voltar ao idioma</a></section>`;
  return html`<section class="learn-session"><header><h2>${flash?'Flashcards':this.mode==='vocabulary'?'Prática de vocabulário':this.mode==='listening'?'Listening':this.mode==='dictation'?'Ditado':'Escrita'}</h2><span>${this.index+1} de ${total}</span><a href=${`#/learn/${this.language}`}>Encerrar sessão</a></header>
   ${flash?html`<h3 lang=${this.language} class="learn-question">${word.word}</h3>${this.revealed?html`<p>${word.translation}</p><p lang=${this.language}>${word.example}</p><p>${word.exampleTranslation}</p><learn-audio .text=${word.word} .language=${this.language}></learn-audio>`:html`<button class="button" @click=${()=>this.revealed=true}>Revelar resposta</button>`}`:html`<h3 class="learn-question">${exercise.prompt}</h3>${['listening','dictation'].includes(this.mode)?html`<learn-audio .text=${exercise.audio||''} .language=${this.language} @heard=${()=>this.heard=true}></learn-audio>`:nothing}<form @submit=${(e:Event)=>{e.preventDefault();void this.submit()}}><label>Sua resposta<textarea .value=${this.answer} maxlength="2000" ?disabled=${this.saved||this.busy} @input=${(e:Event)=>this.answer=(e.target as HTMLTextAreaElement).value}></textarea></label><button class="button primary" ?disabled=${this.saved||this.busy||(['listening','dictation'].includes(this.mode)&&!this.heard)}>Verificar resposta</button></form>`}
   ${flash&&this.revealed?html`<div class="learn-grade">${(['Esqueci','Difícil','Bom','Fácil'] as const).map((label,grade)=>html`<button class="button" ?disabled=${this.saved||this.busy} @click=${()=>this.submit(grade as Grade)}>${label}</button>`)}</div>`:nothing}
   ${this.error?html`<p role="alert">${this.error}</p>`:nothing}
   ${this.saved?html`<div role="status" class="learn-feedback"><strong>${this.results.at(-1)?'Resposta registrada · correto':'Resposta registrada · revisar'}</strong>${!flash?html`<p lang=${this.language}>${exercise.answers[0]}</p>${exercise.audio?html`<p lang=${this.language}>Texto do áudio: ${exercise.audio}</p>`:nothing}<p>${exercise.explanation}</p>`:html`<p>Próxima revisão calculada conforme sua avaliação.</p>`}<button class="button" @click=${()=>{this.generation++;this.index++;this.reset()}}>Continuar</button></div>`:nothing}
  </section>`;
 }
}
