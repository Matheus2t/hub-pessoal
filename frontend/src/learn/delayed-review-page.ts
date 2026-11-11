import {html,nothing} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Language,LessonAssistance,LessonDraft,LessonEvidenceEvent,LessonProgress} from './model';
import {lessonData,recordLessonEvent,saveLessonProgress} from './storage';
import {loadPilotBundle} from './pilot-content';
import {delayedDueAt,loadDelayedContent,makeDelayedReviewEvent,pilotCompletionAt,type DelayedContent,type DelayedProbe,type DelayedTask} from './delayed-content';
import './phonetic-editor';
import {renderOpenResponseReview} from './open-review';
import {renderLearnFlowNav} from './flow-nav';

const languageName={en:'Inglês',ru:'Russo'};
const maxAttempts=20;
function newId():string{return globalThis.crypto?.randomUUID?.()||Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');}
const keyFor=(language:Language,pilotId:string,completedAt:number)=>`${language}:${pilotId}:delayed-review:${completedAt}`;

@customElement('learn-delayed-review')
export class LearnDelayedReview extends LightElement {
 @property() language:Language='en';
 @state() private content?:DelayedContent;
 @state() private progress?:LessonProgress;
 @state() private events:LessonEvidenceEvent[]=[];
 @state() private completedAt?:number;
 @state() private loading=true;
 @state() private busy=false;
 @state() private error='';
 @state() private notice='';
 @state() private activeAttemptId?:string;
 @state() private feedback?:LessonEvidenceEvent;
 @state() private examplesVisible=false;
 @state() private now=Date.now();
 private generation=0;
 private draftTimer?:ReturnType<typeof setTimeout>;
 private dueTimer?:ReturnType<typeof setInterval>;
 private saveQueue:Promise<void>=Promise.resolve();

 protected willUpdate(changes:Map<PropertyKey,unknown>){if(changes.has('language'))void this.load();}
 connectedCallback(){super.connectedCallback();this.dueTimer=setInterval(()=>{this.now=Date.now();},30_000);}
 disconnectedCallback(){this.generation++;if(this.dueTimer)clearInterval(this.dueTimer);if(this.draftTimer&&this.progress){clearTimeout(this.draftTimer);void this.queueSave(this.progress).catch(()=>{});}super.disconnectedCallback();}

 private get pilotId(){return this.language==='en'?'en-pilot-introductions-01':'ru-pilot-directions-01';}
 private probe(id:string|undefined){return this.content?.probes.find(item=>item.id===id);}
 private currentAttempt(){return this.progress?.delayedReview?.attempts.find(item=>item.attemptId===this.activeAttemptId);}
 private currentProbe(){return this.probe(this.currentAttempt()?.probeId);}
 private currentTask():DelayedTask|undefined {const attempt=this.currentAttempt(),probe=this.currentProbe();return attempt&&probe?(attempt.currentTaskIndex===0?probe.reading:attempt.currentTaskIndex===1?probe.writing:undefined):undefined;}
 private taskDraft(task=this.currentTask()):LessonDraft|undefined{return task?this.progress?.drafts.find(item=>item.taskId===task.id):undefined;}
 private attemptsFor(probeId:string){return this.progress?.delayedReview?.attempts.filter(item=>item.probeId===probeId)||[];}
 private latestAttempt(probeId:string){return this.attemptsFor(probeId).at(-1);}
 private dueAt(probe:DelayedProbe){return this.completedAt===undefined?0:delayedDueAt(this.completedAt,probe.delayDays);}
 private isDue(probe:DelayedProbe){return this.now>=this.dueAt(probe);}

 private initialProgress(completedAt:number):LessonProgress{return {key:keyFor(this.language,this.pilotId,completedAt),language:this.language,unitId:this.pilotId,contentVersion:1,currentStage:0,shownAssistance:[],drafts:[],updatedAt:Date.now(),sessionKind:'delayedReview',delayedReview:{pilotCompletedAt:completedAt,attempts:[]}};}
 private async load(){
  const token=++this.generation,language=this.language;this.loading=true;this.error='';this.notice='';this.content=undefined;this.progress=undefined;this.events=[];this.completedAt=undefined;this.activeAttemptId=undefined;this.feedback=undefined;
  try{
   const [content,pilot,source]=await Promise.all([loadDelayedContent(language),loadPilotBundle(language),lessonData(language,this.pilotId)]);
   if(!this.isConnected||token!==this.generation)return;
   const completedAt=pilotCompletionAt(pilot.lesson.steps.map(step=>step.id),source.events.filter(event=>event.language===language&&event.unitId===pilot.lesson.id));
   this.content=content;
   if(completedAt===undefined){this.loading=false;return;}
   this.completedAt=completedAt;const stored=await lessonData(language,this.pilotId,keyFor(language,this.pilotId,completedAt));
   if(!this.isConnected||token!==this.generation)return;
   const progress=stored.progress||this.initialProgress(completedAt);
   this.progress=progress;this.events=stored.events.filter(event=>event.delayedReview?.pilotCompletedAt===completedAt);
   const active=progress.delayedReview?.attempts.find(item=>item.status==='inProgress');
   if(active){this.activeAttemptId=active.attemptId;await this.ensureTaskDraft(active);}
   this.loading=false;
  }catch(error){if(this.isConnected&&token===this.generation){this.error=error instanceof Error?error.message:'Não foi possível carregar as revisões.';this.loading=false;}}
 }

 private queueSave(progress:LessonProgress):Promise<void>{
  const copy=JSON.parse(JSON.stringify(progress)) as LessonProgress;
  const operation=this.saveQueue.catch(()=>undefined).then(()=>saveLessonProgress(copy));this.saveQueue=operation;
  return operation.then(()=>{if(this.isConnected)this.notice='Rascunho salvo neste navegador.';});
 }
 private scheduleDraftSave(){if(!this.progress)return;if(this.draftTimer)clearTimeout(this.draftTimer);const copy=this.progress;this.draftTimer=setTimeout(()=>{this.draftTimer=undefined;void this.queueSave(copy).catch(error=>{if(this.isConnected)this.error=error instanceof Error?error.message:'Não foi possível salvar o rascunho.';});},180);}
 private async flushDraft(){if(this.draftTimer&&this.progress){clearTimeout(this.draftTimer);this.draftTimer=undefined;await this.queueSave(this.progress);}await this.saveQueue;}

 private assistanceFor(probe:DelayedProbe,task:DelayedTask,attemptId:string,at:number):LessonAssistance[]{
  const assistance:LessonAssistance[]=[{kind:'writtenStimulus',value:probe.stimulus.text,taskId:task.id,attemptId,shownAt:at}];
  if(task.part==='writing'&&this.language==='ru'){
   if(task.lexicalCue)assistance.push({kind:'lexical-cue',value:task.lexicalCue.targetWord,taskId:task.id,attemptId,shownAt:at});
   assistance.push({kind:'phoneticKeyboard',value:'Teclado fonético russo disponível no campo de resposta.',taskId:task.id,attemptId,shownAt:at});
  }
  return assistance;
 }
 private async ensureTaskDraft(attempt=this.currentAttempt()){
  const probe=this.probe(attempt?.probeId),task=attempt&&probe?(attempt.currentTaskIndex===0?probe.reading:attempt.currentTaskIndex===1?probe.writing:undefined):undefined;
  if(!attempt||!probe||!task||!this.progress)return;
  const existing=this.progress.drafts.find(item=>item.taskId===task.id&&item.eventId===`c4:${attempt.attemptId}:${task.id}`);
  if(existing)return;
  const now=Date.now(),draft:LessonDraft={taskId:task.id,eventId:`c4:${attempt.attemptId}:${task.id}`,response:'',startedAt:now,updatedAt:now};
  const next={...this.progress,currentStage:attempt.currentTaskIndex,drafts:[draft],shownAssistance:[...this.progress.shownAssistance,...this.assistanceFor(probe,task,attempt.attemptId,now)],updatedAt:now};
  await this.queueSave(next);if(this.isConnected)this.progress=next;
 }

 private async startProbe(probe:DelayedProbe,showFirstTask=true){
  if(!this.progress||!this.completedAt||!this.isDue(probe)||this.busy)return;
  if((this.progress.delayedReview?.attempts.length||0)>=maxAttempts){this.error='O limite local de tentativas desta sessão foi atingido.';return;}
  this.busy=true;this.error='';
  try{
   const now=Date.now(),attemptId=newId(),attempt={attemptId,probeId:probe.id,status:'inProgress' as const,startedAt:now,currentTaskIndex:0};
   const next={...this.progress,currentStage:0,drafts:[],updatedAt:now,delayedReview:{...this.progress.delayedReview!,attempts:[...this.progress.delayedReview!.attempts,attempt]}};
   this.progress=next;this.activeAttemptId=attemptId;if(showFirstTask)await this.ensureTaskDraft(attempt);this.notice=showFirstTask?'Revisão iniciada.':'Revisão marcada como não avaliada.';
  }catch(error){this.error=error instanceof Error?error.message:'Não foi possível iniciar a revisão.';}
  finally{this.busy=false;}
 }

 private updateDraft(change:Partial<LessonDraft>){
  const task=this.currentTask(),draft=this.taskDraft(task);if(!task||!draft||!this.progress||this.busy)return;
  const updated={...draft,...change,updatedAt:Date.now()};this.progress={...this.progress,drafts:this.progress.drafts.map(item=>item.eventId===draft.eventId?updated:item),updatedAt:Date.now()};this.scheduleDraftSave();
 }
 private choiceChanged(event:Event,index:number){(event.currentTarget as HTMLInputElement).checked&&this.updateDraft({choiceIndex:index});}
 private answerChanged(event:Event){this.updateDraft({response:(event.currentTarget as HTMLTextAreaElement).value});}
 private phoneticChanged(event:CustomEvent<string>){this.updateDraft({response:event.detail});}

 private previousReviewAt(probe:DelayedProbe):number|undefined{
  if(probe.delayDays!==7||!this.progress)return undefined;
  const day2=this.content?.probes.find(item=>item.delayDays===2),completed=day2&&this.latestAttempt(day2.id)?.status==='completed'?this.latestAttempt(day2.id)?.completedAt:undefined;
  return completed;
 }
 private async submitTask(){
  const task=this.currentTask(),probe=this.currentProbe(),attempt=this.currentAttempt(),draft=this.taskDraft(task);
  if(!task||!probe||!attempt||!draft||!this.progress||this.busy)return;
  if(task.part==='reading'&&(draft.choiceIndex===undefined||!task.choices||draft.choiceIndex<0||draft.choiceIndex>=task.choices.length)){this.error='Escolha uma alternativa antes de continuar.';return;}
  if(task.part==='writing'&&!draft.response.trim()){this.error='Escreva uma resposta antes de registrar a tentativa.';return;}
  this.busy=true;this.error='';this.notice='';
  try{
   await this.flushDraft();const submittedAt=Date.now(),response=task.part==='reading'?task.choices![draft.choiceIndex!]:draft.response.trim(),outcome=task.part==='reading'?(draft.choiceIndex===task.correctIndex?'supported':'notSupported'):'uncertain';
   const assistance=this.progress.shownAssistance.filter(item=>item.taskId===task.id&&item.attemptId===attempt.attemptId);
   const event=makeDelayedReviewEvent({probe,task,attemptId:attempt.attemptId,pilotCompletedAt:this.completedAt!,response,shownAssistance:assistance,startedAt:draft.startedAt,submittedAt,outcome,previousReviewAt:this.previousReviewAt(probe)});
   const nextIndex=attempt.currentTaskIndex+1,done=nextIndex===2,attempts=this.progress.delayedReview!.attempts.map(item=>item.attemptId===attempt.attemptId?{...item,status:done?'completed' as const:'inProgress' as const,currentTaskIndex:nextIndex,...(done?{completedAt:submittedAt}:{})}:item);
   let next:LessonProgress={...this.progress,currentStage:done?0:nextIndex,drafts:[],updatedAt:submittedAt,delayedReview:{...this.progress.delayedReview!,attempts}};
   if(!done){const nextTask=probe.writing,now=Date.now();next={...next,currentStage:1,drafts:[{taskId:nextTask.id,eventId:`c4:${attempt.attemptId}:${nextTask.id}`,response:'',startedAt:now,updatedAt:now}],shownAssistance:[...next.shownAssistance,...this.assistanceFor(probe,nextTask,attempt.attemptId,now)]};}
   await recordLessonEvent(event,next);if(!this.isConnected)return;
   this.progress=next;this.events=[...this.events.filter(item=>item.eventId!==event.eventId),event];this.feedback=event;this.examplesVisible=false;this.notice=outcome==='uncertain'?'Resposta registrada para revisão; ela permanece incerta.':outcome==='supported'?'Resposta compatível com o gabarito desta tarefa.':'Resposta não corresponde ao gabarito desta tarefa.';
   if(done){this.activeAttemptId=undefined;this.notice='Revisão concluída. A resposta aberta continua incerta, sem nota automática.';}
   else {await this.updateComplete;this.querySelector<HTMLElement>('[data-delayed-heading]')?.focus();}
  }catch(error){if(this.isConnected)this.error=error instanceof Error?error.message:'Não foi possível registrar a revisão. A resposta não foi marcada como salva.';}
  finally{this.busy=false;}
 }

 private async continueAfterFeedback(){if(!this.feedback)return;this.feedback=undefined;this.examplesVisible=false;await this.updateComplete;this.querySelector<HTMLElement>('[data-delayed-heading]')?.focus();}
 private async showExamples(){
  const task=this.feedback?.taskId&&this.findTask(this.feedback.taskId),attemptId=this.feedback?.delayedReview?.attemptId;
  if(!task||task.part!=='writing'||!this.feedback||!attemptId||!this.progress||this.examplesVisible)return;
  const examples=task.examplesAfterAttempt||[],shownAt=Math.max(Date.now(),this.feedback.submittedAt+1);
  const additions=examples.map(value=>({kind:'modelAnswer' as const,value,taskId:task.id,attemptId,shownAt}));
  const next={...this.progress,shownAssistance:[...this.progress.shownAssistance,...additions],updatedAt:shownAt};
  try{await this.queueSave(next);if(this.isConnected){this.progress=next;this.examplesVisible=true;}}catch(error){if(this.isConnected)this.error=error instanceof Error?error.message:'Não foi possível salvar a ajuda exibida.';}
 }
 private findTask(taskId:string):DelayedTask|undefined{for(const probe of this.content?.probes||[])if(probe.reading.id===taskId)return probe.reading;else if(probe.writing.id===taskId)return probe.writing;return undefined;}

 private async skipRemaining(){
  const probe=this.currentProbe(),attempt=this.currentAttempt();if(!probe||!attempt||!this.progress||this.busy)return;
  this.busy=true;this.error='';
  try{
   for(let index=attempt.currentTaskIndex;index<2;index++){
    const task=index===0?probe.reading:probe.writing,now=Date.now(),draft=this.progress.drafts.find(item=>item.taskId===task.id&&item.eventId===`c4:${attempt.attemptId}:${task.id}`),alreadyShown=this.progress.shownAssistance.some(item=>item.taskId===task.id&&item.attemptId===attempt.attemptId);
    const shown=alreadyShown?this.progress.shownAssistance.filter(item=>item.taskId===task.id&&item.attemptId===attempt.attemptId):[];
    const event=makeDelayedReviewEvent({probe,task,attemptId:attempt.attemptId,pilotCompletedAt:this.completedAt!,response:'',shownAssistance:shown,startedAt:draft?.startedAt||now,submittedAt:now,outcome:'notAssessed',previousReviewAt:this.previousReviewAt(probe)});
    const nextIndex=index+1,done=nextIndex===2,attempts=this.progress.delayedReview!.attempts.map(item=>item.attemptId===attempt.attemptId?{...item,status:done?'notAssessed' as const:'inProgress' as const,currentTaskIndex:nextIndex,...(done?{completedAt:now}:{})}:item);
    const next:LessonProgress={...this.progress,currentStage:done?0:nextIndex,drafts:[],updatedAt:now,delayedReview:{...this.progress.delayedReview!,attempts}};
    await recordLessonEvent(event,next);if(!this.isConnected)return;
    this.progress=next;this.events=[...this.events.filter(item=>item.eventId!==event.eventId),event];
   }
   this.activeAttemptId=undefined;this.feedback=undefined;this.notice='Revisão marcada como não avaliada. Você pode tentar novamente depois, sem penalização.';
  }catch(error){if(this.isConnected)this.error=error instanceof Error?error.message:'Não foi possível salvar a revisão como não avaliada.';}
  finally{this.busy=false;}
 }
 private async skipFromCard(probe:DelayedProbe){if(!this.progress||this.busy||!this.isDue(probe))return;const active=this.latestAttempt(probe.id);if(active?.status==='inProgress'){this.activeAttemptId=active.attemptId;await this.skipRemaining();return;}await this.startProbe(probe,false);if(this.activeAttemptId)await this.skipRemaining();}

 private status(probe:DelayedProbe):'upcoming'|'due'|'inProgress'|'completed'|'notAssessed'{
  const last=this.latestAttempt(probe.id);if(last?.status==='inProgress')return 'inProgress';if(last?.status==='completed')return 'completed';if(last?.status==='notAssessed')return 'notAssessed';return this.isDue(probe)?'due':'upcoming';
 }
 private completionLabel(attempt:{completedAt?:number}){return attempt.completedAt?new Date(attempt.completedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';}
 private eventsForAttempt(attemptId:string){return this.events.filter(event=>event.delayedReview?.attemptId===attemptId).sort((a,b)=>a.submittedAt-b.submittedAt);}
 private renderProbe(probe:DelayedProbe){
  const status=this.status(probe),last=this.latestAttempt(probe.id),dueAt=this.dueAt(probe),attemptEvents=last?this.eventsForAttempt(last.attemptId):[];
  return html`<article class="learn-delayed-card" aria-labelledby=${`delayed-${probe.id}`}><div class="learn-delayed-card__top"><span>D+${probe.delayDays}</span><span>${status==='upcoming'?`Disponível ${new Date(dueAt).toLocaleDateString('pt-BR')}`:status==='due'?'Pendente':status==='inProgress'?'Em andamento':status==='completed'?'Concluída':'Não avaliada'}</span></div><h2 id=${`delayed-${probe.id}`}>${probe.delayDays===2?'Revisão D+2':'Revisão D+7'}</h2><p>${probe.scenarioPt}</p>${status==='upcoming'?html`<p class="learn-delayed-muted">Disponível em ${new Date(dueAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}.</p>`:nothing}${status==='due'||status==='inProgress'||status==='notAssessed'?html`<div class="learn-delayed-actions"><button class="button primary" ?disabled=${this.busy||status==='inProgress'} @click=${()=>this.startProbe(probe)}>${status==='inProgress'?'Continuar revisão':status==='notAssessed'?'Tentar novamente':'Começar revisão'}</button><button class="button" ?disabled=${this.busy} @click=${()=>this.skipFromCard(probe)}>Marcar como não avaliada</button></div>`:nothing}${status==='completed'&&last?html`<p class="learn-delayed-muted">Concluída em ${this.completionLabel(last)} · ${attemptEvents.filter(event=>event.outcome!=='notAssessed').length}/2 tarefas observadas.</p><ul class="learn-delayed-outcomes">${attemptEvents.map(event=>html`<li>${event.taskId.endsWith('-read')?html`Compreensão` : html`Produção escrita`}: ${event.outcome==='supported'?'compatível com o gabarito':event.outcome==='notSupported'?'resposta diferente do gabarito':event.outcome==='uncertain'?'aguarda revisão': 'não avaliada'}${event.delayedReview?html` · ${(event.delayedReview.elapsedMs/86_400_000).toFixed(1)} dias desde a aula`:nothing}</li>`)}</ul>`:nothing}</article>`;
 }

 private renderTask(){
  const task=this.currentTask(),probe=this.currentProbe(),attempt=this.currentAttempt(),draft=this.taskDraft(task);if(!task||!probe||!attempt||!draft)return nothing;
  const index=attempt.currentTaskIndex,progress=this.progress!;
  return html`<section class="learn-pilot-stage learn-delayed-task" aria-labelledby="delayed-task-title"><p class="learn-pilot-kicker">D+${probe.delayDays} · ${index===0?'Compreensão escrita':'Aplicação escrita'}</p><h2 id="delayed-task-title" data-delayed-heading tabindex="-1">${index===0?'Leia o novo contexto':'Use o que aprendeu em outra situação'}</h2><div class="learn-diagnostic__stimulus" lang=${this.language}><p>${probe.stimulus.text}</p></div><p lang="pt-BR">${task.promptPt}</p>${task.part==='reading'?html`<form @submit=${(event:Event)=>{event.preventDefault();void this.submitTask()}}><fieldset class="learn-pilot-choices"><legend>Selecione uma resposta</legend>${task.choices!.map((choice,i)=>html`<label class="learn-pilot-choice"><input type="radio" name=${task.id} .checked=${draft.choiceIndex===i} @change=${(event:Event)=>this.choiceChanged(event,i)}><span>${choice}</span></label>`)}</fieldset>${this.error?html`<p class="learn-pilot-error" role="alert">${this.error}</p>`:nothing}<button class="button primary" type="submit" ?disabled=${this.busy}>Registrar resposta</button></form>`:html`${this.language==='ru'?html`<p class="learn-pilot-assistance" role="note">A pista lexical ${task.lexicalCue?.targetWord||''} foi fornecida e será registrada como ajuda.</p><learn-phonetic-editor class="learn-pilot-answer" .value=${draft.response} .disabled=${this.busy} .maxlength=${4000} @answer-changed=${(event:CustomEvent<string>)=>this.phoneticChanged(event)}></learn-phonetic-editor>`:html`<label class="learn-pilot-label" for="delayed-answer">Sua resposta em inglês</label><textarea id="delayed-answer" class="learn-pilot-answer" lang="en" maxlength="4000" .value=${draft.response} @input=${(event:Event)=>this.answerChanged(event)} placeholder="Escreva com suas próprias palavras."></textarea>`}<p class="learn-pilot-count">${draft.response.length}/4.000</p>${this.error?html`<p class="learn-pilot-error" role="alert">${this.error}</p>`:nothing}<button class="button primary" ?disabled=${this.busy} @click=${()=>this.submitTask()}>Registrar resposta para revisão</button>`}<p class="learn-pilot-limits">Esta revisão observa compreensão escrita e transferência em contexto novo; não mede fala, fluência, nível CEFR nem memória além do intervalo observado.</p><button class="learn-delayed-skip" ?disabled=${this.busy} @click=${()=>this.skipRemaining()}>Pular revisão sem penalização</button><p role="status" aria-live="polite">${this.notice||'Rascunho salvo neste navegador.'}</p></section>`;
 }
 private renderFeedback(){
  const event=this.feedback,task=event?this.findTask(event.taskId):undefined;if(!event||!task)return nothing;
  const explanation=task.part==='reading'?task.explanationPt:'';
  return html`<section class="learn-pilot-feedback" aria-live="polite"><h2>${event.outcome==='supported'?'Resposta compatível com o gabarito':event.outcome==='notSupported'?'Resposta diferente do gabarito':'Resposta registrada para revisão'}</h2>${explanation?html`<p>${explanation}</p>`:html`${renderOpenResponseReview(event,{prompt:task.promptPt,context:this.currentProbe()?.stimulus.text,reviewCriteria:task.essentialMeaning||[]})}<button class="button" ?disabled=${this.busy} @click=${()=>this.showExamples()}>${this.examplesVisible?'Exemplos exibidos':'Ver exemplos após a tentativa'}</button>${this.examplesVisible?html`<ul class="learn-pilot-models" lang=${this.language}>${task.examplesAfterAttempt?.map(example=>html`<li>${example}</li>`)}</ul>`:nothing}`}${this.error?html`<p class="learn-pilot-error" role="alert">${this.error}</p>`:nothing}<button class="button primary" ?disabled=${this.busy} @click=${()=>this.continueAfterFeedback()}>Continuar</button></section>`;
 }
 private renderDashboard(){
  if(!this.completedAt)return html`<section class="learn-pilot-stage"><p class="learn-pilot-kicker">C4 · PRÉVIA LOCAL</p><h1>Revisões D+2 e D+7</h1><p>As revisões aparecem após a conclusão registrada da aula-piloto de ${languageName[this.language]}.</p><a class="button primary" href=${this.language==='en'?'/?learn-preview=c1#/learn/en/pilot-c1':'/?learn-preview=c2#/learn/ru/pilot-c2'}>Abrir aula-piloto</a><a class="button" href=${`/?learn-preview=c4-delayed#/learn/${this.language}`}>Voltar ao Learn</a></section>`;
  const total=this.content?.probes.length||0,done=this.content?.probes.filter(probe=>this.status(probe)==='completed'||this.status(probe)==='notAssessed').length||0;
  return html`<section class="learn-delayed-dashboard"><header class="learn-pilot-header"><div><p class="learn-pilot-kicker">2T Learn / PRÉVIA LOCAL</p><h1>Revisões · ${languageName[this.language]}</h1></div><a class="button" href=${`#/learn/${this.language}`}>Voltar ao idioma</a></header><p class="learn-delayed-intro">A contagem começa na data de conclusão da aula-piloto: ${new Date(this.completedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}.</p><p class="learn-delayed-note">D+2 também é prática e pode influenciar D+7. Um atraso não gera penalidade. Os intervalos usam o relógio deste navegador.</p><div class="learn-delayed-grid">${this.content?.probes.map(probe=>this.renderProbe(probe))}</div><p class="learn-delayed-progress" role="status">${done}/${total} revisões registradas · respostas abertas seguem sem nota automática.</p><p class="learn-pilot-limits">Essas observações não comprovam fluência, nível CEFR nem memória duradoura.</p></section>`;
 }

 render(){
  if(this.loading)return html`<section class="learn-pilot" aria-busy="true"><p role="status">Carregando revisões e progresso local…</p></section>`;
  if(this.error&&!this.content)return html`<section class="learn-pilot"><div class="learn-pilot-error" role="alert">${this.error}</div><button class="button" @click=${()=>this.load()}>Tentar novamente</button></section>`;
  return html`<section class="learn-pilot learn-delayed" aria-label="Revisões espaçadas">${renderLearnFlowNav(this.language,'reviews')}${this.error?html`<p class="learn-pilot-error" role="alert">${this.error}</p>`:nothing}${this.feedback?this.renderFeedback():this.activeAttemptId?this.renderTask():this.renderDashboard()}</section>`;
 }
}
