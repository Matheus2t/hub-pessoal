import {html,nothing} from 'lit';
import {customElement,property,query,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Language,LessonAssistance,LessonDraft,LessonEvidenceEvent,LessonProgress} from './model';
import {lessonData,recordLessonEvent,saveLessonProgress} from './storage';
import {buildDiagnosticResults,loadDiagnostic,makeDiagnosticEvent,type DiagnosticBundle,type DiagnosticQuestion} from './diagnostic-content';
import './phonetic-editor';

type Phase='intro'|'task'|'feedback'|'result';
const labels:Record<Language,string>={en:'Inglês',ru:'Russo'};
const safeError=(error:unknown)=>error instanceof Error?error.message:'Não foi possível salvar o progresso local.';

@customElement('learn-diagnostic-player')
export class LearnDiagnosticPlayer extends LightElement {
 @property() language:Language='en';
 @state() private bundle?:DiagnosticBundle;
 @state() private progress?:LessonProgress;
 @state() private events:LessonEvidenceEvent[]=[];
 @state() private phase:Phase='intro';
 @state() private loading=true;
 @state() private saving='';
 @state() private busy=false;
 @state() private error='';
 @state() private examplesShown=false;
 @query('[data-diagnostic-focus]') private focusTarget?:HTMLElement;
 private generation=0;
 private writes:Promise<void>=Promise.resolve();

 connectedCallback(){super.connectedCallback();void this.load();}
 disconnectedCallback(){this.generation++;super.disconnectedCallback();}
 protected updated(changes:Map<string,unknown>){if(changes.has('language'))void this.load();if(changes.has('phase'))queueMicrotask(()=>this.focusTarget?.focus());}

 private async load(){
  const generation=++this.generation,language=this.language;
  this.loading=true;this.error='';this.bundle=undefined;this.progress=undefined;this.events=[];this.phase='intro';
  try{
   const bundle=await loadDiagnostic(language);
   const stored=await lessonData(language,bundle.id);
   if(generation!==this.generation||!this.isConnected)return;
   this.bundle=bundle;this.progress=stored.progress;
   const session=stored.progress?.diagnosticSessionId;
   this.events=stored.events.filter(event=>event.diagnosticSessionId===session);
   const last=this.events.find(event=>event.eventId===stored.progress?.diagnosticLastEventId);
   this.examplesShown=!!last&&!!stored.progress?.shownAssistance.some(item=>item.kind==='modelAnswer'&&item.taskId===last.taskId&&item.shownAt>last.submittedAt);
   if(stored.progress?.diagnosticStatus==='completed'||stored.progress?.diagnosticStatus==='skipped')this.phase='result';
   else if(stored.progress?.diagnosticStatus==='inProgress'&&stored.progress.diagnosticLastEventId&&this.events.some(event=>event.eventId===stored.progress?.diagnosticLastEventId))this.phase='feedback';
   else this.phase='intro';
  }catch(error){if(generation===this.generation&&this.isConnected)this.error=safeError(error)}finally{if(generation===this.generation&&this.isConnected)this.loading=false;}
 }

 private createProgress(sessionId:string):LessonProgress {
  const bundle=this.bundle!,now=Date.now();
  return {key:`${bundle.language}:${bundle.id}`,language:bundle.language,unitId:bundle.id,contentVersion:bundle.schemaVersion,currentStage:0,shownAssistance:[],drafts:[],updatedAt:now,diagnosticSessionId:sessionId,diagnosticStatus:'inProgress'};
 }
 private async begin(newSession=true){
  if(!this.bundle||this.busy)return;
  this.busy=true;
  try{
   this.error='';
   if(newSession||!this.progress){const progress=this.createProgress(crypto.randomUUID());await saveLessonProgress(progress);this.progress=progress;this.events=[];}
   this.phase='task';await this.prepareCurrentTask();
  }catch(error){this.error=safeError(error);this.saving='error';}finally{this.busy=false;}
 }
 private currentQuestion():DiagnosticQuestion|undefined{return this.bundle?.questions[this.progress?.currentStage||0];}
 private currentDraft(question=this.currentQuestion()):LessonDraft|undefined{return question?this.progress?.drafts.find(draft=>draft.taskId===question.id):undefined;}
 private assistanceFor(question:DiagnosticQuestion):LessonAssistance[]{return (this.progress?.shownAssistance||[]).filter(item=>item.taskId===question.id);}
 private async persist(progress:LessonProgress){
  this.progress=progress;this.saving='saving';const copy=structuredClone(progress);
  const save=this.writes.catch(()=>{}).then(()=>saveLessonProgress(copy));this.writes=save;
  try{await save;if(this.isConnected)this.saving='saved';}catch(error){if(this.isConnected){this.saving='error';this.error=safeError(error)}throw error;}
 }
 private async prepareCurrentTask(){
  const question=this.currentQuestion(),progress=this.progress;if(!question||!progress||progress.diagnosticStatus!=='inProgress')return;
  let changed=false;const drafts=[...progress.drafts];
  if(!drafts.some(draft=>draft.taskId===question.id)){drafts.push({taskId:question.id,eventId:`${progress.diagnosticSessionId}:${question.id}`,response:'',startedAt:Date.now(),updatedAt:Date.now()});changed=true;}
  const shown=[...progress.shownAssistance];
  const add=(kind:LessonAssistance['kind'],value:string)=>{if(!shown.some(item=>item.taskId===question.id&&item.kind===kind)){shown.push({kind,value:value.slice(0,1000),taskId:question.id,shownAt:Date.now()});changed=true;}};
  if(question.providedSupport?.shownInPrompt&&question.providedSupport.countsAsAssistance)add('lexical-cue',question.providedSupport.targetWord);
  if(this.language==='ru'&&question.mode==='open')add('phoneticKeyboard','Teclado fonético russo visível durante a tentativa.');
  if(changed)await this.persist({...progress,drafts,shownAssistance:shown,updatedAt:Date.now()});
 }
 private updateDraft(change:Partial<LessonDraft>){
  const question=this.currentQuestion(),progress=this.progress,draft=this.currentDraft(question);
  if(!question||!progress||!draft)return;
  const nextDraft={...draft,...change,updatedAt:Date.now()};
  const next={...progress,drafts:progress.drafts.map(item=>item.taskId===question.id?nextDraft:item),updatedAt:Date.now()};
  void this.persist(next).catch(()=>{});
 }
 private activeEvent(eventId=this.progress?.diagnosticLastEventId){return this.events.find(event=>event.eventId===eventId);}

 private async record(question:DiagnosticQuestion,outcome:LessonEvidenceEvent['outcome'],response:string,progress:LessonProgress):Promise<void>{
  if(this.busy)return;this.busy=true;this.saving='saving';
  try{
  const draft=progress.drafts.find(item=>item.taskId===question.id)||{taskId:question.id,eventId:`${progress.diagnosticSessionId}:${question.id}`,response:'',startedAt:Date.now(),updatedAt:Date.now()};
  const shown=progress.shownAssistance.filter(item=>item.taskId===question.id);
  const event=makeDiagnosticEvent({bundle:this.bundle!,question,sessionId:progress.diagnosticSessionId!,eventId:draft.eventId,response,shownAssistance:shown,startedAt:draft.startedAt,submittedAt:Date.now(),outcome});
  const stage=this.bundle!.questions.findIndex(item=>item.id===question.id)+1;
  const next:LessonProgress={...progress,currentStage:stage,drafts:progress.drafts.filter(item=>item.taskId!==question.id),updatedAt:Date.now(),diagnosticStatus:stage>=this.bundle!.questions.length?'completed':'inProgress',diagnosticLastEventId:event.eventId};
  await this.writes;
  await recordLessonEvent(event,next);
  this.progress=next;this.events=[...this.events.filter(item=>item.eventId!==event.eventId),event];this.error='';this.examplesShown=false;
  this.phase=stage>=this.bundle!.questions.length?'result':'feedback';this.saving='saved';
  }finally{this.busy=false;}
 }
 private async submit(){
  const question=this.currentQuestion(),draft=this.currentDraft(question),progress=this.progress;
  if(!question||!draft||!progress||question.mode!=='closed'||question.type==='listening'||draft.choiceIndex===undefined)return;
  try{const outcome=draft.choiceIndex===question.correctIndex?'supported':'notSupported';await this.record(question,outcome,question.choices?.[draft.choiceIndex]||'',progress);}catch(error){this.error=safeError(error)}
 }
 private async submitOpen(){
  const question=this.currentQuestion(),draft=this.currentDraft(question),progress=this.progress;
  if(!question||!draft||!progress||question.mode!=='open'||!draft.response.trim())return;
  try{await this.record(question,'uncertain',draft.response,progress);}catch(error){this.error=safeError(error)}
 }
 private async markCurrentNotAssessed(){
  const question=this.currentQuestion(),progress=this.progress;if(!question||!progress)return;
  try{await this.record(question,'notAssessed','',progress);}catch(error){this.error=safeError(error)}
 }
 private async continueAfterFeedback(){
  const progress=this.progress;if(!progress||this.busy)return;this.busy=true;
  try{
   const {diagnosticLastEventId:_,...rest}=progress;
   const next={...rest,updatedAt:Date.now()};await this.persist(next);
   await this.prepareCurrentTask();this.phase='task';
  }catch(error){this.error=safeError(error)}finally{this.busy=false;}
 }
 private async skipDiagnostic(){
  if(!this.bundle||this.busy)return;this.busy=true;
  try{
  if(!this.progress||this.progress.diagnosticStatus!=='inProgress'){
   const progress=this.createProgress(crypto.randomUUID());await saveLessonProgress(progress);this.progress=progress;this.events=[];
  }
   for(let index=this.progress!.currentStage;index<this.bundle.questions.length;index++){
    const question=this.bundle.questions[index],progress=this.progress!;
    const draft=progress.drafts.find(item=>item.taskId===question.id)||{taskId:question.id,eventId:`${progress.diagnosticSessionId}:skip:${question.id}`,response:'',startedAt:Date.now(),updatedAt:Date.now()};
    const already=this.events.find(event=>event.diagnosticSessionId===progress.diagnosticSessionId&&event.taskId===question.id);
    if(already)continue;
    const shown=progress.shownAssistance.filter(item=>item.taskId===question.id);
    const event=makeDiagnosticEvent({bundle:this.bundle,question,sessionId:progress.diagnosticSessionId!,eventId:`${progress.diagnosticSessionId}:skip:${question.id}`,response:'',shownAssistance:shown,startedAt:draft.startedAt,submittedAt:Date.now(),outcome:'notAssessed'});
    const stage=index+1,next:LessonProgress={...progress,currentStage:stage,drafts:progress.drafts.filter(item=>item.taskId!==question.id),updatedAt:Date.now(),diagnosticStatus:stage===this.bundle.questions.length?'skipped':'inProgress',diagnosticLastEventId:event.eventId};
    await recordLessonEvent(event,next);this.progress=next;this.events=[...this.events,event];
   }
   this.phase='result';this.saving='saved';this.error='';
  }catch(error){this.error=safeError(error)}finally{this.busy=false;}
 }
 private async revealExamples(question:DiagnosticQuestion){
  if(!this.progress||!question.exampleAnswers?.length||this.busy)return;this.busy=true;
  try{
  const value=question.exampleAnswers.join(' | '),already=this.progress.shownAssistance.some(item=>item.kind==='modelAnswer'&&item.taskId===question.id);
  if(!already){const assistance=[...this.progress.shownAssistance,{kind:'modelAnswer' as const,value:value.slice(0,1000),taskId:question.id,shownAt:Date.now()}];try{await this.persist({...this.progress,shownAssistance:assistance,updatedAt:Date.now()});}catch{return;}}
  this.examplesShown=true;
  }finally{this.busy=false;}
 }

 private statusText(outcome:LessonEvidenceEvent['outcome']):string{return ({supported:'Compatível com o gabarito desta tarefa',notSupported:'Não corresponde ao gabarito desta tarefa',uncertain:'Revisão necessária',notAssessed:'Não avaliado',partiallySupported:'Observado parcialmente'} as const)[outcome];}
 private renderTask(question:DiagnosticQuestion){
  const draft=this.currentDraft(question),index=this.progress?.currentStage||0;
  return html`<section class="learn-diagnostic__panel" aria-labelledby="diagnostic-task-title">
   <div class="learn-diagnostic__progress"><span>Tarefa ${index+1} de ${this.bundle?.questions.length}</span><progress max=${this.bundle?.questions.length||10} value=${index} aria-label="Progresso do diagnóstico"></progress><span>${Math.round(index/(this.bundle?.questions.length||10)*100)}%</span></div>
   <h2 id="diagnostic-task-title" tabindex="-1" data-diagnostic-focus>${question.type==='listening'?'Compreensão auditiva':question.type==='reading'?'Compreensão escrita':question.type==='recognition'?'Reconhecimento':question.type==='transfer'?'Transferência escrita':'Produção escrita'}</h2>
   ${question.stimulus?html`<div class="learn-diagnostic__stimulus" lang=${this.language}><p>${question.stimulus}</p></div>`:nothing}
   <p class="learn-diagnostic__prompt">${question.promptPt}</p>
   ${question.type==='listening'?html`<div class="learn-message" role="status"><strong>Não avaliado</strong><p>Não há gravação validada para esta tarefa. Ela não afeta sua recomendação.</p></div><button class="button primary" ?disabled=${this.busy} @click=${()=>this.markCurrentNotAssessed()}>Continuar</button>`:
    question.mode==='closed'?html`<fieldset class="learn-diagnostic__choices"><legend>Escolha uma resposta</legend>${question.choices?.map((choice,choiceIndex)=>html`<label><input type="radio" name=${question.id} .checked=${draft?.choiceIndex===choiceIndex} ?disabled=${this.busy} @change=${()=>this.updateDraft({choiceIndex,response:choice})}><span>${choice}</span></label>`)}</fieldset><div class="learn-diagnostic__actions"><button class="button" ?disabled=${this.busy} @click=${()=>this.markCurrentNotAssessed()}>Não sei</button><button class="button primary" ?disabled=${this.busy||draft?.choiceIndex===undefined||this.saving==='saving'} @click=${()=>this.submit()}>Registrar resposta</button></div>`:
    html`${this.language==='ru'?html`<learn-phonetic-editor .value=${draft?.response||''} .disabled=${this.busy} maxlength="2000" @answer-changed=${(event:CustomEvent<string>)=>this.updateDraft({response:event.detail})}></learn-phonetic-editor>`:html`<label class="learn-diagnostic__answer">Sua resposta<textarea maxlength="2000" ?disabled=${this.busy} .value=${draft?.response||''} @input=${(event:Event)=>this.updateDraft({response:(event.target as HTMLTextAreaElement).value})}></textarea></label>`}<div class="learn-diagnostic__actions"><button class="button" ?disabled=${this.busy} @click=${()=>this.markCurrentNotAssessed()}>Não sei</button><button class="button primary" ?disabled=${this.busy||!draft?.response.trim()||this.saving==='saving'} @click=${()=>this.submitOpen()}>Registrar resposta para revisão</button></div>`}
   <p class="learn-diagnostic__save" role="status">${this.saving==='saving'?'Salvando rascunho…':this.saving==='saved'?'Rascunho salvo neste navegador.':this.saving==='error'?'Rascunho não salvo.':''}</p>
   <button class="learn-diagnostic__skip" ?disabled=${this.busy} @click=${()=>this.skipDiagnostic()}>Pular diagnóstico</button>
  </section>`;
 }
 private renderFeedback(){
  const event=this.activeEvent(),question=this.bundle?.questions.find(item=>item.id===event?.taskId);if(!event||!question)return nothing;
  const open=question.mode==='open';
  return html`<section class="learn-diagnostic__panel" aria-labelledby="diagnostic-feedback-title">
   <p class="learn-diagnostic__eyebrow">Tarefa ${this.progress?.currentStage} de ${this.bundle?.questions.length}</p>
   <h2 id="diagnostic-feedback-title" tabindex="-1" data-diagnostic-focus>${event.outcome==='notAssessed'?'Tarefa não avaliada':open?'Resposta registrada para revisão':'Resultado desta tarefa'}</h2>
   ${open?html`<p role="status">Sua resposta ficou como <strong>incerta</strong>. Não há avaliador confiável disponível para marcar o texto como certo ou errado.</p><p>${question.feedbackPt||'Esta resposta requer revisão.'}</p>`:event.outcome==='notAssessed'?html`<p role="status">Esta tarefa ficou como não avaliada e não reduz sua recomendação.</p>`:html`<p role="status"><strong>${this.statusText(event.outcome)}.</strong> ${question.feedbackPt||''}</p>${event.outcome==='notSupported'?html`<p>Gabarito: <strong>${question.correctAnswer}</strong></p>`:nothing}`}
   ${open&&question.exampleAnswers?.length?html`<button class="button" ?disabled=${this.busy||this.saving==='saving'} @click=${()=>this.revealExamples(question)}>${this.examplesShown?'Exemplos exibidos':'Ver exemplos após a tentativa'}</button>${this.examplesShown?html`<ul class="learn-diagnostic__examples" lang=${this.language}>${question.exampleAnswers.map(example=>html`<li>${example}</li>` )}</ul>`:nothing}`:nothing}
   <div class="learn-diagnostic__actions"><button class="button primary" ?disabled=${this.busy} @click=${()=>this.continueAfterFeedback()}>${this.progress?.currentStage===this.bundle?.questions.length?'Ver resultados':'Continuar'}</button></div>
  </section>`;
 }
 private renderResult(){
  const bundle=this.bundle!,events=this.events,results=buildDiagnosticResults(bundle,events),statusText:Record<string,string>={'observed-partially':'Observado parcialmente',mixed:'Evidências mistas','review-required':'Revisão necessária','not-assessed':'Não avaliado','needs-practice':'Prática recomendada'};
  return html`<section class="learn-diagnostic__result" aria-labelledby="diagnostic-result-title">
   <p class="learn-diagnostic__eyebrow">${labels[this.language]} · conteúdo v${bundle.schemaVersion}</p><h1 id="diagnostic-result-title" tabindex="-1" data-diagnostic-focus>Resultado</h1>
   ${this.progress?.diagnosticStatus==='skipped'?html`<p role="status">Diagnóstico pulado. As tarefas permanecem como não avaliadas.</p>`:nothing}
   <aside class="learn-diagnostic__recommendation"><span>Recomendação inicial</span><h2>${results.recommendation.title}</h2><p>${results.recommendation.reason}</p><a class="button" href=${results.recommendation.href}>Ver ponto de partida <span aria-hidden="true">↗</span></a></aside>
   <h2>Competências e evidências</h2><div class="learn-diagnostic__competencies">${results.competencies.map(result=>html`<details class="learn-diagnostic__competency"><summary><span>${result.name}</span><span class="learn-diagnostic__badge" data-status=${result.status}>${statusText[result.status]}</span></summary><p>${result.detail}</p>${result.name==='Produção oral'?nothing:html`<ul>${result.taskIds.map(id=>{const question=bundle.questions.find(item=>item.id===id)!,event=events.filter(row=>row.taskId===id).at(-1);return html`<li><strong>${question.type==='reading'?'Leitura':question.type==='recognition'?'Reconhecimento':question.type==='listening'?'Listening':question.type==='transfer'?'Transferência':'Produção escrita'}:</strong> ${event?this.statusText(event.outcome):'Não avaliado'}<span class="learn-diagnostic__response">Enunciado: ${question.promptPt}</span>${event?.response?html`<span class="learn-diagnostic__response">Resposta: ${event.response}</span>`:nothing}${event?.outcome==='notSupported'&&question.correctAnswer?html`<span class="learn-diagnostic__response">Gabarito: ${question.correctAnswer}</span>`:nothing}</li>`})}</ul>`}</details>`)}</div>
   <p class="learn-diagnostic__limits">Não mede nível CEFR, fala, pronúncia ou fluência. Listening sem áudio validado ficou não avaliado. Escolha qualquer unidade, mesmo que a recomendação sugira outra.</p>
   <div class="learn-diagnostic__actions"><a class="button" href=${`#/learn/${this.language}`}>Voltar ao ${labels[this.language]}</a><button class="button primary" ?disabled=${this.busy} @click=${()=>this.begin(true)}>Fazer novamente</button></div>
  </section>`;
 }
 render(){
  if(this.loading)return html`<section class="learn-diagnostic" role="status">Carregando diagnóstico…</section>`;
  if(this.error&&!this.bundle)return html`<section class="learn-diagnostic"><div class="learn-message" role="alert"><h1>Diagnóstico indisponível</h1><p>${this.error}</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></div></section>`;
  if(!this.bundle)return nothing;
  return html`<main class="learn-diagnostic" lang="pt-BR">
   <header class="learn-diagnostic__header"><a href=${`#/learn/${this.language}`} aria-label=${`Voltar ao Learn ${labels[this.language]}`}>← ${labels[this.language]}</a><span>DIAGNÓSTICO · PRÉVIA LOCAL</span></header>
   ${this.phase==='intro'?html`<section class="learn-diagnostic__panel" aria-labelledby="diagnostic-intro-title"><p class="learn-diagnostic__eyebrow">Opcional · ${this.bundle.questions.length} tarefas</p><h1 id="diagnostic-intro-title" tabindex="-1" data-diagnostic-focus>Diagnóstico inicial de ${labels[this.language]}</h1><p>Observe o que você já consegue fazer e sugira um ponto de partida. Não é uma prova de nível; respostas abertas ficam para revisão.</p>${this.progress?.diagnosticStatus==='inProgress'?html`<p role="status">Há uma tentativa em andamento, na tarefa ${(this.progress.currentStage||0)+1}.</p><div class="learn-diagnostic__actions"><button class="button primary" ?disabled=${this.busy} @click=${()=>this.begin(false)}>Continuar diagnóstico</button><button class="button" ?disabled=${this.busy} @click=${()=>this.skipDiagnostic()}>Pular diagnóstico</button></div>`:html`<div class="learn-diagnostic__actions"><button class="button primary" ?disabled=${this.busy} @click=${()=>this.begin(true)}>Começar</button><button class="button" ?disabled=${this.busy} @click=${()=>this.skipDiagnostic()}>Pular diagnóstico</button></div>`}<p class="learn-diagnostic__limits">Inglês e Russo têm históricos separados. Listening sem gravação validada e produção oral não são avaliados.</p></section>`:
    this.phase==='task'?this.renderTask(this.currentQuestion()!):this.phase==='feedback'?this.renderFeedback():this.renderResult()}
   ${this.error?html`<p class="learn-diagnostic__error" role="alert">${this.error} O texto digitado continua na tela; tente salvar novamente.</p>`:nothing}
  </main>`;
 }
}
