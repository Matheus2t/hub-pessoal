import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Attempt,AttemptOutcome,Card,Grade,Language,Word} from './model';
import {answerLanguage,type Exercise} from './content';
import {attemptOutcome,evaluateExerciseAnswer,newCard,schedule} from './engine';
import {recordAttempt,snapshot} from './storage';
import './audio';
import './phonetic-editor';
import type {Curriculum} from './content';
@customElement('learn-session')
export class LearnSession extends LightElement {
 @property() language:Language='en';@property() mode='writing';
 @property({attribute:false}) words:Word[]=[];@property({attribute:false}) exercises:Exercise[]=[];
 @property({attribute:false}) catalog?:Curriculum;
 @property() attemptKey='';
 @state() private index=0;@state() private answer='';@state() private revealed=false;@state() private saved=false;@state() private busy=false;@state() private error='';@state() private heard=false;
 @state() private results:AttemptOutcome[]=[];
 @state() private duplicate=false;
 @state() private savedGrade?:Grade;
 private attemptId='';private started=0;private generation=0;private elapsed=0;private lastTick=0;
 private tick=()=>{const now=performance.now();if(this.lastTick&&!document.hidden)this.elapsed+=Math.min(2,(now-this.lastTick)/1000);this.lastTick=now};
 private timer?:ReturnType<typeof setInterval>;
 connectedCallback(){super.connectedCallback();this.timer=setInterval(this.tick,1000)}
 disconnectedCallback(){this.generation++;clearInterval(this.timer);super.disconnectedCallback()}
 protected updated(c:PropertyValues){if(c.has('words')||c.has('exercises')||c.has('mode')||c.has('language')){this.generation++;this.index=0;this.results=[];this.reset()}}
 private reset(){this.attemptId=this.attemptKey||crypto.randomUUID();this.answer='';this.revealed=false;this.saved=false;this.busy=false;this.heard=false;this.error='';this.duplicate=false;this.savedGrade=undefined;this.started=Date.now();this.elapsed=0;this.lastTick=performance.now()}
 private async submit(grade?:Grade){
  if(this.busy||this.saved)return;
  const flash=this.mode==='flashcards',word=this.words[this.index],exercise=this.exercises[this.index];
  if(flash&&!this.revealed)return;
  if(!flash&&!this.answer.trim()){this.error='Digite uma resposta.';return}
  if(['listening','dictation'].includes(this.mode)&&!this.heard){this.error='Ouça o áudio até o fim antes de responder.';return}
  const expected=flash?word.translation:exercise.answers[0];
  const outcome:AttemptOutcome=flash?(grade===0?'incorrect':'correct'):evaluateExerciseAnswer(this.answer,exercise);
  const correct=outcome==='correct';
  const event:Attempt={id:this.attemptId,language:this.language,itemId:flash?word.id:exercise.id,skill:flash||this.mode==='vocabulary'?'vocabulary':exercise.skill,topic:flash?word.topic:exercise.topic,answer:flash?['Esqueci','Difícil','Bom','Fácil'][grade!]:this.answer.trim(),expected,correct,at:Date.now(),seconds:Math.min(600,Math.round(this.elapsed)),...(outcome==='uncertain'?{assessmentOutcome:'uncertain' as const}:{}),...(flash?{grade}: {})};
  const token=this.generation;this.busy=true;this.error='';
  try{const inserted=await recordAttempt(event,flash?(previous:Card|undefined)=>schedule(previous||newCard(event.language,word.id),grade!):undefined);const stored=inserted?event:(await snapshot()).attempts.find(a=>a.id===event.id);if(!stored)throw Error('Tentativa indisponível.');if(token!==this.generation||!this.isConnected)return;this.saved=true;this.duplicate=!inserted;this.savedGrade=flash?stored.grade:undefined;this.results=[...this.results,attemptOutcome(stored)];this.dispatchEvent(new CustomEvent('progress-saved',{bubbles:true}));}
  catch{if(token===this.generation&&this.isConnected)this.error='Não foi possível salvar. Sua resposta não foi concluída. Tente novamente.'}
  finally{if(token===this.generation&&this.isConnected)this.busy=false}
 }
 render(){const flash=this.mode==='flashcards',total=flash?this.words.length:this.exercises.length,word=this.words[this.index],exercise=this.exercises[this.index],isWriting=exercise?.skill==='writing',lastOutcome=this.results.at(-1);
  if(!total)return html`<p class="learn-empty">Nenhum item disponível nesta sessão.</p>`;
  if(this.index>=total){const correct=this.results.filter(result=>result==='correct').length,incorrect=this.results.filter(result=>result==='incorrect').length,uncertain=this.results.filter(result=>result==='uncertain').length;return html`<section class="learn-message"><h2>Sessão concluída</h2><p>${this.results.length} respostas salvas · ${correct} ${flash?'lembradas':this.mode==='writing'?'reconhecidas':'corretas'}${incorrect?html` · ${incorrect} para revisar`:nothing}${uncertain?html` · ${uncertain} incertas (não contadas como erro)`:nothing}.</p><a class="button" href=${`#/learn/${this.language}`}>Voltar ao idioma</a></section>`;}
  const unit=exercise?.unitId?[...(this.catalog?.readings||[]),...(this.catalog?.lessons||[])].find(u=>u.id===exercise.unitId):undefined;
  return html`<section class=${`learn-session ${flash?'learn-session--flashcard':'learn-session--exercise'}`}><header><h2>${flash?'Flashcards':this.mode==='vocabulary'?'Prática de vocabulário':this.mode==='listening'?'Listening':this.mode==='dictation'?'Ditado':this.mode==='reading'?'Compreensão':this.mode==='grammar'?'Prática de gramática':this.mode==='recovery'?'Revisão de erros':'Escrita'}</h2><span class="learn-session-count">${this.index+1} de ${total}</span><a class="learn-session-exit" href=${`#/learn/${this.language}`}>Encerrar sessão</a></header>
   <div class="learn-session__track" role="progressbar" aria-label="Questões concluídas nesta sessão" aria-valuemin="0" aria-valuemax=${total} aria-valuenow=${this.index}><span style=${`width:${total?this.index/total*100:0}%`}></span></div>
   ${unit&&'text'in unit?html`<details class="learn-prose"><summary>Consultar texto: ${unit.title}</summary><p lang=${this.language}>${unit.text}</p></details>`:nothing}
   ${flash?html`<h3 lang=${this.language} class="learn-question">${word.word}</h3>${this.revealed?html`<p>${word.translation}</p><p lang=${this.language}>${word.example}</p><p>${word.exampleTranslation}</p><learn-audio .text=${word.word} .language=${this.language}></learn-audio>`:html`<button class="button" @click=${()=>this.revealed=true}>Revelar resposta</button>`}`:html`<h3 class="learn-question">${exercise.prompt}</h3>${['listening','dictation'].includes(this.mode)?html`<learn-audio .text=${exercise.audio||''} .language=${this.language} @heard=${()=>this.heard=true}></learn-audio>`:nothing}<form @submit=${(e:Event)=>{e.preventDefault();void this.submit()}}>${this.language==='ru'&&answerLanguage(exercise)==='ru'?html`<learn-phonetic-editor .value=${this.answer} .disabled=${this.saved||this.busy} @answer-changed=${(e:CustomEvent<string>)=>this.answer=e.detail}></learn-phonetic-editor>`:html`<label>Sua resposta<textarea .value=${this.answer} maxlength="2000" ?disabled=${this.saved||this.busy} @input=${(e:Event)=>this.answer=(e.target as HTMLTextAreaElement).value}></textarea></label>`}<button class="button primary" ?disabled=${this.saved||this.busy||(['listening','dictation'].includes(this.mode)&&!this.heard)}>Verificar resposta</button></form>`}
   ${flash&&this.revealed?html`<div class="learn-grade">${(['Esqueci','Difícil','Bom','Fácil'] as const).map((label,grade)=>html`<button class="button" ?disabled=${this.saved||this.busy} @click=${()=>this.submit(grade as Grade)}>${label}</button>`)}</div>`:nothing}
   ${this.error?html`<p role="alert">${this.error}</p>`:nothing}
   ${this.saved?html`<div role="status" class="learn-feedback"><strong>${this.duplicate?'Tentativa já registrada · resultado preservado':lastOutcome==='uncertain'?'Resposta registrada · resultado incerto':flash&&this.savedGrade===0?'Resposta registrada · vamos revisar novamente':isWriting?'Resposta registrada · encontrada nas opções cadastradas':lastOutcome==='correct'?'Resposta registrada · correto':'Resposta registrada · incorreta'}</strong>${!flash?html`<p lang=${answerLanguage(exercise)}>Forma esperada: ${exercise.answers[0]}</p>${exercise.answers.length>1?html`<p>Variantes aceitas: ${exercise.answers.slice(1).join(' · ')}</p>`:nothing}${exercise.audio?html`<p lang=${this.language}>Texto de referência: ${exercise.audio}</p>`:nothing}<p>${exercise.explanation}</p>${lastOutcome==='uncertain'?html`<p>Não encontramos essa formulação entre as variantes revisadas. Ela pode ser válida; não foi marcada como erro.</p>`:nothing}${['listening','dictation'].includes(this.mode)?html`<p>Prática com síntese local; este resultado não é evidência auditiva validada.</p>`:nothing}`:this.savedGrade===0?html`<p>Este item voltará para revisão em breve.</p>`:html`<p>Próxima revisão calculada conforme sua avaliação.</p>`}<button class="button" @click=${()=>{this.generation++;this.index++;this.reset()}}>Continuar</button></div>`:nothing}
  </section>`;
 }
}
