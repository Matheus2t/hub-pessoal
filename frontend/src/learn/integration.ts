import type {Backup,Language,LessonEvidenceEvent,LessonProgress} from './model';
import {currentPlan,planAttempts} from './planning';
import {delayedDueAt,pilotCompletionAt} from './delayed-content';
import {pilotTaskIds} from './pilot-content';

export type IntegrationRoute='pilot'|'diagnostic'|'reviews'|'daily'|'dashboard';
export interface IntegrationLink {kind:string;title:string;reason:string;href:string;updatedAt?:number}
export interface ReviewSlot {days:2|7;status:'locked'|'upcoming'|'due'|'inProgress'|'completed'|'notAssessed';dueAt?:number;attempts:number}
export interface CompetencyEvidence {id:string;supported:number;partiallySupported:number;notSupported:number;uncertain:number;notAssessed:number}
export interface LearnIntegrationSummary {
 language:Language;
 pilot:{completedTasks:number;totalTasks:number;completedAt?:number;inProgress:boolean};
 diagnostic:{status:'notStarted'|'inProgress'|'completed'|'skipped';recorded:number;updatedAt?:number};
 reviews:ReviewSlot[];
 evidence:{evaluated:number;uncertain:number;notAssessed:number;pendingReview:number;difficulties:number;competencies:CompetencyEvidence[]};
 resumable:IntegrationLink[];
 suggestions:IntegrationLink[];
 legacyPlan?:{completed:number;goal:number;active:boolean};
}

const pilotId=(language:Language)=>language==='en'?'en-pilot-introductions-01':'ru-pilot-directions-01';
const pilotRoute=(language:Language)=>language==='en'?'pilot-c1':'pilot-c2';
const diagnosticRoute=(language:Language)=>`#/learn/${language}/diagnostic`;
const reviewRoute=(language:Language)=>`#/learn/${language}/reviews`;
const link=(kind:string,title:string,reason:string,activity:IntegrationRoute,language:Language,updatedAt?:number):IntegrationLink=>({kind,title,reason,href:`#/learn/${language}/${activity==='pilot'?pilotRoute(language):activity}`,...(updatedAt===undefined?{}:{updatedAt})});

function latest<T extends {updatedAt:number}>(rows:T[]):T|undefined{return rows.sort((a,b)=>b.updatedAt-a.updatedAt)[0];}
function reviewProbeId(language:Language,days:2|7){return language==='en'?`en-intro-d${days}`:`ru-dir-d${days}`;}

export function summarizeLearnIntegration(data:Backup,language:Language,now=Date.now()):LearnIntegrationSummary {
 const events=(data.lessonEvents||[]).filter(event=>event.language===language);
 const progress=(data.lessonProgress||[]).filter(item=>item.language===language);
 const id=pilotId(language),taskIds=pilotTaskIds(language),pilotEvents=events.filter(event=>event.unitId===id);
 const completedAt=pilotCompletionAt([...taskIds],pilotEvents);
 const pilotProgress=latest(progress.filter(item=>item.unitId===id&&item.sessionKind!=='delayedReview'));
 const completedTasks=new Set(pilotEvents.map(event=>event.taskId).filter(taskId=>taskIds.includes(taskId))).size;
 const pilotInProgress=completedAt===undefined&&!!pilotProgress&&(pilotProgress.currentStage>0||pilotProgress.drafts.length>0);

 const diagnosticProgress=latest(progress.filter(item=>item.diagnosticSessionId&&item.diagnosticStatus));
 const diagnosticEvents=events.filter(event=>event.diagnosticSessionId&&(!diagnosticProgress?.diagnosticSessionId||event.diagnosticSessionId===diagnosticProgress.diagnosticSessionId));
 const diagnosticStatus=diagnosticProgress?.diagnosticStatus|| (diagnosticEvents.length?'inProgress':'notStarted');

 const delayedProgress=progress.filter(item=>item.sessionKind==='delayedReview'&&item.unitId===id&&item.delayedReview);
 const reviews=( [2,7] as const).map(days=>{
  if(completedAt===undefined)return {days,status:'locked' as const,attempts:0};
  const state=latest(delayedProgress.filter(item=>item.delayedReview?.pilotCompletedAt===completedAt));
  const attempts=state?.delayedReview?.attempts.filter(item=>item.probeId===reviewProbeId(language,days))||[];
  const current=attempts.at(-1),dueAt=delayedDueAt(completedAt,days);
  const status:ReviewSlot['status']=current?.status==='inProgress'?'inProgress':current?.status==='completed'?'completed':current?.status==='notAssessed'?'notAssessed':now>=dueAt?'due':'upcoming';
  return {days,status,dueAt,attempts:attempts.length};
 });

 const outcomes:Record<string,number>={supported:0,partiallySupported:0,notSupported:0,uncertain:0,notAssessed:0};
 const competencies=new Map<string,CompetencyEvidence>();
 for(const event of events){outcomes[event.outcome]=(outcomes[event.outcome]||0)+1;if(!event.competencyId)continue;const row=competencies.get(event.competencyId)||{id:event.competencyId,supported:0,partiallySupported:0,notSupported:0,uncertain:0,notAssessed:0};row[event.outcome]++;competencies.set(event.competencyId,row);}
 const evaluated=outcomes.supported+outcomes.partiallySupported+outcomes.notSupported;
 const daily=currentPlan(data,language,now),dailyItems=daily?planAttempts(data,daily):[];
 const resumable:IntegrationLink[]=[];
 if(diagnosticStatus==='inProgress')resumable.push(link('diagnostic','Retomar diagnóstico','Há respostas e rascunhos salvos para continuar.', 'diagnostic',language,diagnosticProgress?.updatedAt));
 if(pilotInProgress)resumable.push(link('pilot','Retomar aula-piloto',`${completedTasks} de ${taskIds.length} tarefas têm evidências registradas.`,'pilot',language,pilotProgress?.updatedAt));
 const activeReview=delayedProgress.flatMap(item=>item.delayedReview?.attempts.filter(attempt=>attempt.status==='inProgress').map(attempt=>({item,attempt}))||[]).sort((a,b)=>b.attempt.startedAt-a.attempt.startedAt)[0];
 if(activeReview)resumable.push(link('reviews',`Retomar revisão D+${activeReview.attempt.probeId.endsWith('d2')?'2':'7'}`,'A revisão interrompida pode ser retomada.','reviews',language,activeReview.item.updatedAt));
 if(daily?.activeItemId)resumable.push(link('daily','Retomar plano diário','A atividade selecionada no plano permanece salva.','daily',language,daily.createdAt));

 const suggestions:IntegrationLink[]=[];
 if(diagnosticStatus==='notStarted')suggestions.push(link('diagnostic','Diagnóstico inicial','Opcional; registra evidências observadas sem estimar nível CEFR.','diagnostic',language));
 if(completedAt===undefined)suggestions.push(link('pilot',pilotInProgress?'Continuar aula-piloto':'Aula-piloto',pilotInProgress?`${completedTasks} de ${taskIds.length} tarefas registradas; concluir libera a agenda D+2/D+7.`:'A conclusão desta aula inicia os intervalos recomendados D+2 e D+7.','pilot',language,pilotProgress?.updatedAt));
 for(const review of reviews){if(review.status==='due'||review.status==='notAssessed')suggestions.push(link('reviews',`Revisão D+${review.days}`,review.status==='notAssessed'?'Tentativa não avaliada; disponível para refazer sem penalização.':`Vencida em ${new Date(review.dueAt!).toLocaleDateString('pt-BR')}; o atraso não reduz o resultado.`,'reviews',language));}
 if(reviews.some(review=>review.status==='inProgress')&&!resumable.some(item=>item.kind==='reviews'))suggestions.push(link('reviews','Continuar revisões','Há uma revisão em andamento.','reviews',language));
 if(daily)suggestions.push(link('daily','Plano diário legado',`${dailyItems.length}/${daily.goal} respostas registradas; o plano original foi preservado.`,'daily',language));
 if(!suggestions.length)suggestions.push(link('dashboard','Ver acompanhamento','Consulte evidências, pendências e resultados avaliados separados.','dashboard',language));

 return {language,pilot:{completedTasks,totalTasks:taskIds.length,...(completedAt===undefined?{}:{completedAt}),inProgress:pilotInProgress},diagnostic:{status:diagnosticStatus,recorded:diagnosticEvents.length,...(diagnosticProgress?{updatedAt:diagnosticProgress.updatedAt}:{})},reviews,evidence:{evaluated,uncertain:outcomes.uncertain,notAssessed:outcomes.notAssessed,pendingReview:events.filter(event=>event.reviewStatus==='pending').length,difficulties:outcomes.notSupported+outcomes.partiallySupported,competencies:[...competencies.values()]},resumable,suggestions,...(daily?{legacyPlan:{completed:dailyItems.length,goal:daily.goal,active:!!daily.activeItemId}}:{})};
}
