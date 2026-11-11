import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Language,LessonAssistance,LessonDraft,LessonEvidenceEvent,LessonFeedback,LessonProgress} from './model';
import {lessonData,recordLessonEvent,saveLessonProgress} from './storage';
import './phonetic-editor';
import {loadPilotBundle,type PilotBundle,type PilotId,type PilotStep} from './pilot-content';

const stageNames=['Objetivo','Diálogo','Compreensão 1','Compreensão 2','Observação','Prática guiada','Transferência','Resumo'];
const feedbackLimits='Esta atividade avalia somente leitura e escrita. Não avalia fala, pronúncia, listening natural nem nível CEFR.';
function makeId():string {
 if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
}
function progressKey(language:Language,id:PilotId):string{return `${language}:${id}`;}
function initialProgress(language:Language,unitId:PilotId):LessonProgress{return {key:progressKey(language,unitId),language,unitId,contentVersion:1,currentStage:0,shownAssistance:[],drafts:[],updatedAt:Date.now()};}
function taskForStage(bundle:PilotBundle,stage:number):PilotStep|undefined{return stage>=2&&stage<=6?bundle.lesson.steps[stage-2]:undefined;}
function promptAssistance(language:Language,task:PilotStep|undefined):Pick<LessonAssistance,'kind'|'value'|'taskId'>[]{
 if(language!=='ru'||!task||(task.kind!=='guidedProduction'&&task.kind!=='transfer'))return [];
 const assistance:Pick<LessonAssistance,'kind'|'value'|'taskId'>[]=[{kind:'phoneticKeyboard',value:'Teclado fonético russo disponível no campo de resposta.',taskId:task.id}];
 if(task.kind==='transfer'&&task.providedSupport?.countsAsAssistance)assistance.push({kind:'lexical-cue',value:task.providedSupport.targetWord,taskId:task.id});
 return assistance;
}
function addAssistance(progress:LessonProgress,items:Pick<LessonAssistance,'kind'|'value'|'taskId'>[]):LessonProgress{
 const shownAt=Date.now();const additions=items.filter(item=>!progress.shownAssistance.some(existing=>existing.kind===item.kind&&existing.taskId===item.taskId&&existing.value===item.value)).map(item=>({...item,shownAt}));
 return additions.length?{...progress,shownAssistance:[...progress.shownAssistance,...additions],updatedAt:shownAt}:progress;
}
function feedbackForClosed(step:Extract<PilotStep,{kind:'comprehension'}>,choice:number):LessonFeedback {
 const correct=choice===step.correctIndex;
 return {
  whatWorked:correct?'Você identificou a informação solicitada no diálogo.':`Você selecionou “${step.choices[choice]}”.`,
  priorityIssue:correct?'none':step.feedbackByWrongChoice[String(choice)],
  whyItMatters:correct?'A resposta corresponde a esta informação escrita.':'A explicação ajuda a distinguir as falas e a intenção no contexto.',
  concreteSuggestion:step.feedback,
  retryPrompt:correct?'Continue para a próxima etapa.':'Se quiser, releia a explicação e tente novamente.',
  assessmentLimits:'Este resultado se limita à compreensão escrita desta pergunta; não mede produção oral ou proficiência geral.',
 };
}

@customElement('learn-pilot-player')
export class LearnPilotPlayer extends LightElement {
 @property() language:Language='en';
 @property() pilotId:PilotId='en-pilot-introductions-01';
 @state() private bundle?:PilotBundle;
 @state() private progress?:LessonProgress;
 @state() private events:LessonEvidenceEvent[]=[];
 @state() private loading=true;
 @state() private busy=false;
 @state() private saving=false;
 @state() private error='';
 @state() private storageError='';
 @state() private formError='';
 @state() private notice='';
 @state() private glossaryOpen=false;
 @state() private translationOpen=false;
 @state() private modelsOpen=false;
 private generation=0;
 private loadedConfig='';
 private draftTimer?:ReturnType<typeof setTimeout>;
 private saveQueue:Promise<void>=Promise.resolve();

 private get unitId():PilotId{return this.pilotId;}
 private get languageName():string{return this.language==='ru'?'Russo':'Inglês';}
 private get returnHref():string{return `#/learn/${this.language}`;}

 protected updated(_changes:PropertyValues){
  const config=`${this.language}:${this.pilotId}`;
  if(config!==this.loadedConfig){this.loadedConfig=config;void this.load();}
 }
 disconnectedCallback(){this.generation++;if(this.draftTimer)clearTimeout(this.draftTimer);super.disconnectedCallback();}

 private async load(){
  const token=++this.generation;this.loading=true;this.error='';
  try{
   const language=this.language,unitId=this.unitId;
   const [bundle,saved]=await Promise.all([loadPilotBundle(language),lessonData(language,unitId)]);
   if(!this.isConnected||token!==this.generation)return;
   const progress=saved.progress||initialProgress(language,unitId);
   const withShownPromptHelp=addAssistance(progress,promptAssistance(language,taskForStage(bundle,progress.currentStage)));
   if(!saved.progress||withShownPromptHelp!==progress)await saveLessonProgress(withShownPromptHelp);
   if(!this.isConnected||token!==this.generation)return;
   this.bundle=bundle;this.events=saved.events;this.progress=withShownPromptHelp;
   this.loading=false;
  }catch(error){if(this.isConnected&&token===this.generation){this.error=error instanceof Error?error.message:'Não foi possível iniciar a aula.';this.loading=false;}}
 }

 private queueSave(progress:LessonProgress):Promise<void>{
  const copy:LessonProgress=JSON.parse(JSON.stringify(progress)) as LessonProgress;
  if(this.isConnected)this.saving=true;
  const operation=this.saveQueue.catch(()=>undefined).then(()=>saveLessonProgress(copy));this.saveQueue=operation;
  return operation.then(()=>{if(this.isConnected){this.saving=false;this.storageError='';this.notice='Rascunho salvo neste navegador.';}},error=>{if(this.isConnected){this.saving=false;this.storageError=error instanceof Error?error.message:'O rascunho não foi salvo.';}throw error;});
 }
 private scheduleSave(){
  if(!this.progress)return;if(this.draftTimer)clearTimeout(this.draftTimer);
  const copy=this.progress;this.draftTimer=setTimeout(()=>{this.draftTimer=undefined;void this.queueSave(copy).catch(()=>{});},180);
 }
 private async flushDraft():Promise<void>{
  if(this.draftTimer){clearTimeout(this.draftTimer);this.draftTimer=undefined;}
  if(this.progress)await this.queueSave(this.progress);
 }
 private task(){return this.bundle&&this.progress?taskForStage(this.bundle,this.progress.currentStage):undefined;}
 private draft(task: PilotStep):LessonDraft|undefined{return this.progress?.drafts.find(item=>item.taskId===task.id);}
 private latest(taskId:string):LessonEvidenceEvent|undefined{return this.events.filter(event=>event.taskId===taskId).at(-1);}
 private assistanceAlreadyShown(kind:LessonAssistance['kind'],taskId:string,value:string):boolean{return !!this.progress?.shownAssistance.some(item=>item.kind===kind&&item.taskId===taskId&&item.value===value);}

 private async recordAssistances(items:{kind:LessonAssistance['kind'];value:string;taskId:string}[]){
  if(!this.progress)return;const shownAt=Date.now();const additions=items.filter(item=>!this.assistanceAlreadyShown(item.kind,item.taskId,item.value)).map(item=>({...item,shownAt}));
  if(!additions.length)return;const progress={...this.progress,shownAssistance:[...this.progress.shownAssistance,...additions],updatedAt:shownAt};this.progress=progress;this.notice='Ajuda registrada para esta prévia.';
  try{await this.queueSave(progress);}catch{}
 }
 private async showGlossary(){
  this.glossaryOpen=!this.glossaryOpen;if(this.glossaryOpen&&this.bundle)await this.recordAssistances(this.bundle.lesson.support.glossary.map(item=>({kind:'wordGloss',value:`${item.source} — ${item.pt}`,taskId:'lesson-dialogue'})));
 }
 private async showTranslation(){
  this.translationOpen=!this.translationOpen;if(this.translationOpen&&this.bundle)await this.recordAssistances([{kind:'translation',value:this.bundle.lesson.support.summaryPt,taskId:'lesson-dialogue'}]);
 }
 private draftFor(task:PilotStep):LessonDraft {
  const existing=this.draft(task);if(existing)return existing;
  const draft:LessonDraft={taskId:task.id,eventId:makeId(),response:'',startedAt:Date.now(),updatedAt:Date.now()};
  if(this.progress)this.progress={...this.progress,drafts:[...this.progress.drafts.filter(item=>item.taskId!==task.id),draft],updatedAt:Date.now()};
  return draft;
 }
 private updateOpenResponse(task:PilotStep,response:string){
  if(!this.progress)return;const draft=this.draftFor(task);
  const next={...draft,response,updatedAt:Date.now()};
  this.progress={...this.progress,drafts:this.progress.drafts.map(item=>item.taskId===task.id?next:item),updatedAt:Date.now()};
  this.formError='';this.notice='';this.scheduleSave();
 }
 private onOpenInput(event:Event,task:PilotStep){this.updateOpenResponse(task,(event.target as HTMLTextAreaElement).value);}
 private onPhoneticInput(event:CustomEvent<string>,task:PilotStep){this.updateOpenResponse(task,event.detail);}
 private onChoice(event:Event,task:Extract<PilotStep,{kind:'comprehension'}>,index:number){
  if(!this.progress)return;const draft=this.draftFor(task);const next={...draft,choiceIndex:index,response:task.choices[index],updatedAt:Date.now()};
  this.progress={...this.progress,drafts:this.progress.drafts.map(item=>item.taskId===task.id?next:item),updatedAt:Date.now()};
  this.formError='';this.notice='';this.scheduleSave();
  const target=event.target as HTMLInputElement;if(target.checked)void this.updateComplete.then(()=>this.querySelector<HTMLButtonElement>('.learn-pilot-submit')?.focus());
 }
 private async showHints(task:Extract<PilotStep,{kind:'guidedProduction'|'transfer'}>){
  if(!this.progress)return;this.modelsOpen=false;const current=this.draft(task);const taskId=task.id;
  await this.recordAssistances(task.hints.map(hint=>({kind:'sentenceStarter',value:hint,taskId})));
  if(current)this.notice='Frases iniciais abertas e registradas como ajuda.';
 }
 private async showModels(task:Extract<PilotStep,{kind:'guidedProduction'|'transfer'}>){
  if(!this.progress||!this.latest(task.id))return;this.modelsOpen=!this.modelsOpen;
  if(this.modelsOpen){await this.recordAssistances(task.exampleAnswers.map(example=>({kind:'modelAnswer',value:example,taskId:task.id})));this.notice='Exemplos exibidos após a tentativa e registrados como ajuda.';}
 }

 private async submitTask(){
  const task=this.task();if(!task||!this.progress||this.busy)return;
  const draft=this.draftFor(task);
  if(task.kind==='comprehension'&&(draft.choiceIndex===undefined||draft.choiceIndex<0||draft.choiceIndex>=task.choices.length)){this.formError='Escolha uma alternativa antes de continuar.';return;}
  if((task.kind==='guidedProduction'||task.kind==='transfer')&&!draft.response.trim()){this.formError='Escreva uma resposta antes de registrar a tentativa.';return;}
  if(task.kind==='notice'&&draft.response.length>4000){this.formError='A resposta precisa ter até 4.000 caracteres.';return;}
  this.busy=true;this.formError='';this.error='';
  const submittedAt=Date.now();const shown=this.progress.shownAssistance.map(item=>({...item,shownBeforeAttempt:item.shownAt<=draft.startedAt}));
  const taskKind=task.kind;const evidenceKind=task.evidence;
  let response=draft.response;let outcome:LessonEvidenceEvent['outcome']='uncertain';let reviewStatus:LessonEvidenceEvent['reviewStatus']='pending';let assessorKind:LessonEvidenceEvent['assessorKind']='rubricWithReview';let feedback:LessonFeedback|null=null;let independent=false;
  if(task.kind==='comprehension'){
   response=task.choices[draft.choiceIndex!];outcome=draft.choiceIndex===task.correctIndex?'supported':'notSupported';reviewStatus='notRequired';assessorKind='deterministic';feedback=feedbackForClosed(task,draft.choiceIndex!);
  }else if(task.kind==='notice'){
   outcome='notAssessed';reviewStatus='notRequired';assessorKind='unavailable';
  }else if(task.kind==='transfer'){
   independent=!shown.some(item=>item.kind==='modelAnswer'||item.kind==='sentenceStarter'||item.kind==='lexical-cue');
  }
  const event:LessonEvidenceEvent={eventId:draft.eventId,language:this.language,unitId:this.unitId,contentVersion:this.bundle?.lesson.contentVersion||1,taskId:task.id,taskKind,evidenceKind,response:task.kind==='comprehension'?response:response.trim(),shownAssistance:shown,startedAt:draft.startedAt,submittedAt,outcome,reviewStatus,assessorKind,feedback,sourceContext:`${this.unitId}@${this.bundle?.lesson.contentVersion||1}/${task.id}`,isIndependentClaimAllowed:independent};
  const nextProgress={...this.progress,drafts:this.progress.drafts.filter(item=>item.taskId!==task.id),updatedAt:submittedAt};
  try{
   if(this.draftTimer){clearTimeout(this.draftTimer);this.draftTimer=undefined;}await this.saveQueue.catch(()=>undefined);
   const inserted=await recordLessonEvent(event,nextProgress);
   if(inserted)this.events=[...this.events,event].sort((a,b)=>a.submittedAt-b.submittedAt);
   else if(!this.events.some(item=>item.eventId===event.eventId))this.events=[...this.events,event].sort((a,b)=>a.submittedAt-b.submittedAt);
   this.progress=nextProgress;this.storageError='';this.notice='Tentativa registrada neste navegador.';this.modelsOpen=false;
  }catch(error){this.storageError=error instanceof Error?error.message:'Não foi possível registrar a tentativa. Ela não foi marcada como salva.';}
  finally{this.busy=false;}
 }

 private async continueStage(){
  if(!this.progress||this.busy)return;const target=Math.min(7,this.progress.currentStage+1);if(target===this.progress.currentStage)return;
  this.busy=true;this.notice='';try{await this.flushDraft();const next={...this.progress,currentStage:target,updatedAt:Date.now()};const withPromptHelp=addAssistance(next,promptAssistance(this.language,this.bundle?taskForStage(this.bundle,target):undefined));await this.queueSave(withPromptHelp);this.progress=withPromptHelp;this.formError='';this.glossaryOpen=false;this.translationOpen=false;this.modelsOpen=false;await this.updateComplete;this.querySelector<HTMLElement>('[data-pilot-heading]')?.focus();}catch{}finally{this.busy=false;}
 }
 private async previousStage(){
  if(!this.progress||this.progress.currentStage===0||this.busy)return;this.busy=true;this.notice='';try{await this.flushDraft();const target=this.progress.currentStage-1;const next={...this.progress,currentStage:target,updatedAt:Date.now()};const withPromptHelp=addAssistance(next,promptAssistance(this.language,this.bundle?taskForStage(this.bundle,target):undefined));await this.queueSave(withPromptHelp);this.progress=withPromptHelp;this.formError='';await this.updateComplete;this.querySelector<HTMLElement>('[data-pilot-heading]')?.focus();}catch{}finally{this.busy=false;}
 }
 private async retryTask(task:PilotStep){
  if(!this.progress||this.busy)return;this.busy=true;this.notice='';this.formError='';this.modelsOpen=false;
  const draft:LessonDraft={taskId:task.id,eventId:makeId(),response:'',startedAt:Date.now(),updatedAt:Date.now()};const next={...this.progress,drafts:[...this.progress.drafts.filter(item=>item.taskId!==task.id),draft],updatedAt:Date.now()};
  try{await this.queueSave(next);this.progress=next;await this.updateComplete;const input=this.querySelector<HTMLElement>('.learn-pilot-answer,input[type="radio"]');input?.focus();}catch{}finally{this.busy=false;}
 }
 private async restartReview(){
  if(!this.progress||this.busy)return;const next={...this.progress,currentStage:2,updatedAt:Date.now()};this.busy=true;try{await this.queueSave(next);this.progress=next;await this.updateComplete;this.querySelector<HTMLElement>('[data-pilot-heading]')?.focus();}catch{}finally{this.busy=false;}
 }
 private async retryStorage(){
  this.error='';this.storageError='';this.loading=true;await this.load();
 }

 private renderFeedback(event:LessonEvidenceEvent,task:PilotStep){
  if(event.taskKind==='comprehension'&&event.feedback)return html`<section class="learn-pilot-feedback" role="status" aria-labelledby="pilot-feedback-title"><h3 id="pilot-feedback-title">${event.outcome==='supported'?'Compreensão correta nesta pergunta':'Revise a explicação'}</h3><p><strong>Resposta:</strong> ${event.feedback.whatWorked}</p>${event.outcome==='notSupported'?html`<p><strong>Sobre esta alternativa:</strong> ${event.feedback.priorityIssue}</p>`:nothing}<p><strong>Explicação do diálogo:</strong> ${event.feedback.concreteSuggestion}</p><p><strong>Por que observar:</strong> ${event.feedback.whyItMatters}</p><p><strong>Limite:</strong> ${event.feedback.assessmentLimits}</p><div class="learn-pilot-actions"><button class="button" ?disabled=${this.busy} @click=${()=>this.retryTask(task)}>Tentar novamente</button><button class="button primary" ?disabled=${this.busy} @click=${()=>this.continueStage()}>Continuar</button></div></section>`;
  if(event.taskKind==='notice')return html`<section class="learn-pilot-feedback" role="status"><h3>Observação registrada como prática</h3><p>Esta etapa não é uma avaliação de competência.</p><p>Ela não atribui resultado de acerto ou erro.</p><button class="button primary" ?disabled=${this.busy} @click=${()=>this.continueStage()}>Continuar</button></section>`;
  if(event.taskKind==='guidedProduction'||event.taskKind==='transfer'){
   const rubric=this.bundle?.rubrics[task.id];const guidance=rubric?.goalPt||'Confira os critérios da atividade. A resposta não recebe correção automática.';
   return html`<section class="learn-pilot-feedback" role="status" aria-labelledby="pilot-feedback-title"><h3 id="pilot-feedback-title">Resposta registrada · avaliação incerta</h3><p><strong>O que foi registrado:</strong> sua resposta e as ajudas abertas nesta tentativa.</p><p><strong>Avaliação:</strong> não há revisor semântico confiável; os exemplos não são gabaritos literais. A resposta permanece <code>uncertain</code>.</p><p><strong>Confira nesta atividade:</strong> ${guidance}</p>${rubric?html`<ul class="learn-pilot-rubric">${rubric.criteria.map(criterion=>html`<li>${criterion.descriptionPt}</li>`)}</ul>`:nothing}<p><strong>Limite:</strong> ${feedbackLimits}</p><div class="learn-pilot-actions"><button class="button" ?disabled=${this.busy} @click=${()=>this.retryTask(task)}>Nova tentativa</button><button class="button primary" ?disabled=${this.busy} @click=${()=>this.continueStage()}>Continuar</button>${task.kind==='guidedProduction'?html`<button class="button" ?disabled=${this.busy} @click=${()=>this.showModels(task)}>${this.modelsOpen?'Ocultar exemplos':'Ver exemplos após a tentativa'}</button>`:nothing}</div>${task.kind==='guidedProduction'&&this.modelsOpen?html`<ul class="learn-pilot-models" lang=${this.language}>${task.exampleAnswers.map(example=>html`<li>${example}</li>`)}</ul>`:nothing}</section>`;
  }
  return nothing;
 }
 private renderStep(task:PilotStep){
  const draft=this.draft(task);const previous=this.latest(task.id);
  if(previous&&!draft)return html`<section class="learn-pilot-stage" aria-labelledby="pilot-step-title"><p class="learn-pilot-kicker">${task.evidence==='comprehension'?'Compreensão':task.kind==='notice'?'Observação':task.kind==='transfer'?'Transferência':'Prática guiada'}</p><h2 id="pilot-step-title" data-pilot-heading tabindex="-1">${task.kind==='comprehension'?'Pergunta sobre o diálogo':task.kind==='notice'?'Observe as expressões':task.kind==='transfer'?'Use em outro contexto':'Pratique sua apresentação'}</h2><p>${task.prompt}</p>${this.renderFeedback(previous,task)}</section>`;
  if(task.kind==='comprehension')return html`<section class="learn-pilot-stage" aria-labelledby="pilot-step-title"><p class="learn-pilot-kicker">Compreensão escrita · etapa ${this.progress!.currentStage-1} de 5</p><h2 id="pilot-step-title" data-pilot-heading tabindex="-1">Leia e escolha</h2><p>${task.prompt}</p>${previous?html`<p class="learn-pilot-assistance" role="note">A tentativa anterior continua no histórico; esta resposta será um novo registro.</p>`:nothing}<form @submit=${(event:Event)=>{event.preventDefault();void this.submitTask()}}><fieldset class="learn-pilot-choices"><legend>Selecione uma resposta</legend>${task.choices.map((choice,index)=>html`<label class="learn-pilot-choice"><input type="radio" name=${task.id} .checked=${draft?.choiceIndex===index} @change=${(event:Event)=>this.onChoice(event,task,index)}><span>${choice}</span></label>`)}</fieldset>${this.formError?html`<p class="learn-pilot-error" role="alert">${this.formError}</p>`:nothing}<button class="button primary learn-pilot-submit" type="submit" ?disabled=${this.busy}>Registrar resposta</button></form></section>`;
  if(task.kind==='notice')return html`<section class="learn-pilot-stage" aria-labelledby="pilot-step-title"><p class="learn-pilot-kicker">Observação · sem nota</p><h2 id="pilot-step-title" data-pilot-heading tabindex="-1">Perceba como a conversa continua</h2><p>${task.prompt}</p><div class="learn-pilot-explanation"><h3>Observe</h3><p lang="pt-BR">${task.explanation}</p></div><label class="learn-pilot-label" for="pilot-notice-response">Sua observação (opcional)</label><textarea id="pilot-notice-response" class="learn-pilot-answer" maxlength="4000" .value=${draft?.response||''} @input=${(event:Event)=>this.onOpenInput(event,task)} placeholder="Escreva uma observação, se quiser."></textarea>${this.formError?html`<p class="learn-pilot-error" role="alert">${this.formError}</p>`:nothing}<button class="button primary" ?disabled=${this.busy} @click=${()=>this.submitTask()}>Concluir observação</button></section>`;
  const rubric=this.bundle?.rubrics[task.id];const modelPreviouslyShown=this.progress!.shownAssistance.some(item=>item.kind==='modelAnswer'||item.kind==='sentenceStarter');const r=this.language==='ru';const fieldLabel=r?'Sua resposta em russo':'Sua resposta em inglês';
  return html`<section class="learn-pilot-stage" aria-labelledby="pilot-step-title"><p class="learn-pilot-kicker">${task.kind==='transfer'?'Transferência escrita':'Produção escrita guiada'}</p><h2 id="pilot-step-title" data-pilot-heading tabindex="-1">${task.kind==='transfer'?(r?'Encontre a biblioteca':'Uma reunião de projeto'):(r?'Pergunte pela estação de metrô':'Sua vez de se apresentar')}</h2><p lang="pt-BR">${task.prompt}</p>${task.kind==='transfer'&&r?html`<p class="learn-pilot-assistance" role="note">A palavra <span lang="ru">${task.providedSupport?.targetWord}</span> foi fornecida no enunciado e será registrada como ajuda lexical.</p>`:nothing}${previous?html`<p class="learn-pilot-assistance" role="note">A tentativa anterior continua no histórico; esta resposta será um novo registro.</p>`:nothing}${modelPreviouslyShown&&task.kind==='transfer'?html`<p class="learn-pilot-assistance" role="note">Você abriu um modelo ou início de frase em outra etapa. Essa ajuda será declarada nesta tentativa; ela não será tratada como produção independente.</p>`:nothing}${r?html`<learn-phonetic-editor id="pilot-open-response" class="learn-pilot-answer" .value=${draft?.response||''} .disabled=${this.busy} .maxlength=${4000} @answer-changed=${(event:CustomEvent<string>)=>this.onPhoneticInput(event,task)}></learn-phonetic-editor>`:html`<label class="learn-pilot-label" for="pilot-open-response">${fieldLabel}</label><textarea id="pilot-open-response" class="learn-pilot-answer" lang="en" maxlength="4000" autocomplete="off" .value=${draft?.response||''} @input=${(event:Event)=>this.onOpenInput(event,task)} placeholder="Escreva com suas próprias palavras."></textarea>`}<p class="learn-pilot-count">${draft?.response.length||0}/4.000</p>${task.kind==='guidedProduction'&&task.hints.length?html`<details class="learn-pilot-help" @toggle=${(event:Event)=>{if((event.currentTarget as HTMLDetailsElement).open)void this.showHints(task)}}><summary>${r?'Ver apoio':'Ver uma frase inicial'}</summary><ul lang=${this.language}>${task.hints.map(hint=>html`<li>${hint}</li>`)}</ul><span class="learn-pilot-assistance-note">Ajuda registrada quando exibida.</span></details>`:nothing}${previous?html`<div class="learn-pilot-help"><button class="button" ?disabled=${this.busy} @click=${()=>this.showModels(task)}>${this.modelsOpen?'Ocultar exemplos':'Ver exemplos da tentativa anterior'}</button>${this.modelsOpen?html`<ul class="learn-pilot-models" lang=${this.language}>${task.exampleAnswers.map(example=>html`<li>${example}</li>`)}</ul>`:nothing}</div>`:nothing}${rubric?html`<details class="learn-pilot-help"><summary>O que a tarefa pede</summary><ul>${rubric.criteria.map(criterion=>html`<li>${criterion.descriptionPt}</li>`)}</ul></details>`:nothing}<p class="learn-pilot-limits">${feedbackLimits}</p>${this.formError?html`<p class="learn-pilot-error" role="alert">${this.formError}</p>`:nothing}<button class="button primary" ?disabled=${this.busy} @click=${()=>this.submitTask()}>Registrar tentativa</button></section>`;
 }
 private renderStage(){
  const lesson=this.bundle!.lesson;const stage=this.progress!.currentStage;
  if(stage===0)return html`<section class="learn-pilot-stage" aria-labelledby="pilot-stage-title"><p class="learn-pilot-kicker">Aula-piloto · ${this.languageName} · prévia local</p><h2 id="pilot-stage-title" data-pilot-heading tabindex="-1">Objetivo da aula</h2><div class="learn-pilot-objective"><p>${lesson.canDo}</p></div><p class="learn-pilot-scenario">${lesson.scenario}</p><p class="learn-pilot-limits">Material escrito. Esta aula não avalia fala, pronúncia, listening ou nível CEFR.</p><button class="button primary" ?disabled=${this.busy} @click=${()=>this.continueStage()}>Começar</button></section>`;
  if(stage===1)return html`<section class="learn-pilot-stage" aria-labelledby="pilot-stage-title"><p class="learn-pilot-kicker">Contexto e diálogo · leitura</p><h2 id="pilot-stage-title" data-pilot-heading tabindex="-1">Antes de responder, leia a conversa</h2><ol class="learn-pilot-dialogue" lang=${this.language} aria-label="Diálogo escrito">${lesson.dialogue.map(line=>html`<li><strong>${line.speaker}</strong><p>${line.text}</p></li>`)}</ol><div class="learn-pilot-help-actions"><button class="button" aria-expanded=${this.glossaryOpen} @click=${()=>this.showGlossary()}>${this.glossaryOpen?'Fechar glossário':'Abrir glossário'}</button><button class="button" aria-expanded=${this.translationOpen} @click=${()=>this.showTranslation()}>${this.translationOpen?'Fechar resumo':'Ver resumo em português'}</button></div>${this.glossaryOpen?html`<dl class="learn-pilot-glossary">${lesson.support.glossary.map(item=>html`<div><dt lang=${this.language}>${item.source}</dt><dd>${item.pt}</dd></div>`)}</dl>`:nothing}${this.translationOpen?html`<p class="learn-pilot-translation" lang="pt-BR">${lesson.support.summaryPt}</p>`:nothing}<p class="learn-pilot-assistance-note">O apoio é opcional. O que for exibido ficará registrado junto às tentativas.</p><button class="button primary" ?disabled=${this.busy} @click=${()=>this.continueStage()}>Ir para as perguntas</button></section>`;
  if(stage>=2&&stage<=6){const task=taskForStage(this.bundle!,stage);return task?this.renderStep(task):nothing;}
  const events=this.events;const comprehension=events.filter(event=>event.taskKind==='comprehension');const open=events.filter(event=>event.taskKind==='guidedProduction'||event.taskKind==='transfer');const practice=events.filter(event=>event.taskKind==='notice');const comprehensionTasks=new Set(comprehension.map(event=>event.taskId)).size;const openTasks=new Set(open.map(event=>event.taskId)).size;
  return html`<section class="learn-pilot-stage" aria-labelledby="pilot-stage-title"><p class="learn-pilot-kicker">Aula registrada localmente</p><h2 id="pilot-stage-title" data-pilot-heading tabindex="-1">Resumo</h2><ul class="learn-pilot-summary"><li>${comprehensionTasks}/2 perguntas de compreensão com tentativa registrada</li><li>${practice.length} observações registradas como prática, sem avaliação</li><li>${openTasks}/2 etapas abertas tentadas · ${open.length} respostas registradas como <code>uncertain</code></li></ul><p>As respostas abertas permanecem sem nota automática. O progresso não representa fluência nem nível CEFR.</p><p class="learn-pilot-assistance-note">${this.progress!.shownAssistance.length} ajudas exibidas nesta aula.</p><button class="button" ?disabled=${this.busy} @click=${()=>this.restartReview()}>Revisar etapas</button><a class="button" href=${this.returnHref}>Voltar ao ${this.languageName}</a></section>`;
 }

 render(){
  if(this.loading)return html`<section class="learn-pilot" aria-busy="true"><p role="status">Carregando aula e progresso local…</p></section>`;
  if(this.error||!this.bundle||!this.progress)return html`<section class="learn-pilot" aria-labelledby="pilot-error-title"><h1 id="pilot-error-title">A aula não pôde ser aberta</h1><p role="alert">${this.error||'O progresso local não está disponível.'}</p><p>Seu histórico legado permanece separado e intacto.</p><button class="button" @click=${()=>this.retryStorage()}>Tentar novamente</button><a class="button" href=${this.returnHref}>Voltar ao Learn de ${this.languageName}</a></section>`;
  const stage=this.progress.currentStage;
  return html`<section class="learn-pilot" aria-labelledby="pilot-title"><header class="learn-pilot-header"><div><p class="learn-pilot-kicker">2T Learn / PRÉVIA LOCAL</p><h1 id="pilot-title">${this.bundle.lesson.title}</h1></div><a class="button" href=${this.returnHref}>Sair da aula</a></header><div class="learn-pilot-progress"><div class="learn-pilot-progress-label"><span>Etapa ${Math.min(stage+1,8)} de 8 · ${stageNames[stage]}</span><span>${this.storageError?'Há alterações não salvas':this.saving?'Salvando…':'Salvo neste navegador'}</span></div><progress max="7" value=${Math.min(stage,7)} aria-label="Progresso da aula"></progress></div>${this.storageError?html`<div class="learn-pilot-error" role="alert"><p>${this.storageError}</p><button class="button" ?disabled=${this.busy} @click=${()=>this.progress&&this.queueSave(this.progress).catch(()=>{})}>Tentar salvar novamente</button></div>`:nothing}${this.notice?html`<p class="learn-pilot-live" role="status" aria-live="polite">${this.notice}</p>`:nothing}<div class="learn-pilot-content">${this.renderStage()}</div>${stage>0&&stage<7?html`<nav class="learn-pilot-nav" aria-label="Navegação da aula"><button class="button" ?disabled=${this.busy} @click=${()=>this.previousStage()}>Voltar etapa</button></nav>`:nothing}</section>`;
 }
}
