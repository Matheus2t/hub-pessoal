import type {Language,LessonAssistance,LessonEvidenceEvent,LessonOutcome} from './model';

export interface DelayedTask {
 id:string;part:'reading'|'writing';promptPt:string;choices?:string[];correctIndex?:number;explanationPt?:string;
 essentialMeaning?:string[];
 lexicalCue?:{targetWord:string;translationPt:string;purpose:string}|null;
 examplesAfterAttempt?:string[];evaluation?:string;modelHiddenDuringAttempt?:boolean;assistanceToRecord?:string[];
}
export interface DelayedProbe {
 id:string;language:Language;pilotId:string;objectiveId:string;delayDays:2|7;scenarioPt:string;
 stimulus:{text:string;type:'written';mediaAvailable:false;assistiveTextShownBeforeAttempt:true};reading:DelayedTask;writing:DelayedTask;editorialStatus:string;
}
export interface DelayedContent {schemaVersion:number;runtimeEnabled:false;probes:DelayedProbe[]}
const DAY_MS=86_400_000;
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const string=(value:unknown):value is string=>typeof value==='string';

export function parseDelayedContent(value:unknown,language:Language):DelayedContent {
 if(!object(value)||value.schemaVersion!==1||value.runtimeEnabled!==false||!Array.isArray(value.probes)||!object(value.measurementPolicy)||value.measurementPolicy.incompleteOrMissedProbe!=='notAssessed (never zero or learner failure)')throw Error('O catálogo de revisões diferidas está incompleto ou incompatível.');
 const probes=value.probes.filter((probe:unknown)=>object(probe)&&probe.language===language);
 if(probes.length!==2)throw Error(`O catálogo ${language} precisa conter as duas revisões previstas.`);
 const allIds=new Set<string>();
 for(const raw of probes){
  const timing=raw.timing,stimulus=raw.stimulus,read=raw.readingComprehension,write=raw.writtenTransfer;
  if(!string(raw.id)||allIds.has(raw.id)||!string(raw.pilotId)||!string(raw.objectiveId)||!string(raw.scenarioPt)||!object(timing)||![2,7].includes(Number(timing.recommendedDelayDays))||!object(stimulus)||stimulus.type!=='written'||stimulus.mediaAvailable!==false||stimulus.assistiveTextShownBeforeAttempt!==true||!string(stimulus.text)||!object(read)||!object(write)||raw.runtimeEnabled!==false||raw.editorialStatus!=='needs-language-and-learner-review')throw Error(`A revisão ${String(raw.id)} não atende ao contrato local. `);
  allIds.add(raw.id);
  if(!string(read.id)||allIds.has(read.id)||!string(read.promptPt)||!Array.isArray(read.choices)||read.choices.length<2||!Number.isInteger(read.correctIndex)||Number(read.correctIndex)<0||Number(read.correctIndex)>=read.choices.length||read.choices.some((choice:unknown)=>!string(choice))||!string(read.explanationPt)||read.evidence!=='comprehension')throw Error(`A compreensão de ${raw.id} contém um gabarito inválido.`);
  allIds.add(read.id);
  if(!string(write.id)||allIds.has(write.id)||!string(write.promptPt)||write.answerMode!=='open'||write.evaluation!=='rubricWithReview'||write.evidence!=='delayedRecall'||write.modelHiddenDuringAttempt!==true||!Array.isArray(write.examplesAfterAttempt)||!write.examplesAfterAttempt.length||!Array.isArray(write.essentialMeaning)||!write.essentialMeaning.length)throw Error(`A produção de ${raw.id} precisa permanecer aberta e sem correção automática.`);
  allIds.add(write.id);
  if(language==='ru'&&(!object(write.lexicalCue)||!string(write.lexicalCue.targetWord)||!string(write.lexicalCue.translationPt)||!Array.isArray(write.assistanceToRecord)||!write.assistanceToRecord.includes('lexical-cue')))throw Error(`A pista lexical de ${raw.id} precisa ser declarada.`);
 }
 if(new Set(probes.map((probe:Record<string,any>)=>probe.timing.recommendedDelayDays)).size!==2)throw Error(`O catálogo ${language} precisa de D+2 e D+7.`);
 return {schemaVersion:value.schemaVersion,runtimeEnabled:false,probes:probes.map((probe:Record<string,any>)=>({id:probe.id,language:probe.language,pilotId:probe.pilotId,objectiveId:probe.objectiveId,delayDays:probe.timing.recommendedDelayDays,scenarioPt:probe.scenarioPt,stimulus:probe.stimulus,reading:{...probe.readingComprehension,part:'reading'},writing:{...probe.writtenTransfer,part:'writing'},editorialStatus:probe.editorialStatus})).sort((a,b)=>a.delayDays-b.delayDays)} as DelayedContent;
}

export async function loadDelayedContent(language:Language,fetcher:typeof fetch=fetch):Promise<DelayedContent>{
 const response=await fetcher('/learn/pedagogy-v1/pilot-delayed-probes.json',{cache:'no-store'});
 if(!response.ok)throw Error('Não foi possível carregar as revisões. Tente novamente.');
 return parseDelayedContent(await response.json(),language);
}

export function pilotCompletionAt(stepIds:string[],events:LessonEvidenceEvent[]):number|undefined {
 if(!stepIds.length||new Set(stepIds).size!==stepIds.length)return undefined;
 const firstByTask=stepIds.map(taskId=>events.filter(event=>event.taskId===taskId&&event.taskKind!=='delayedRecall').reduce<number|undefined>((first,event)=>first===undefined?event.submittedAt:Math.min(first,event.submittedAt),undefined));
 return firstByTask.every((value):value is number=>value!==undefined)?Math.max(...firstByTask):undefined;
}

export function delayedDueAt(completedAt:number,delayDays:2|7):number{return completedAt+delayDays*DAY_MS;}
export function observedIntervalDays(completedAt:number,submittedAt:number):number{return Math.max(0,(submittedAt-completedAt)/DAY_MS);}

export function makeDelayedReviewEvent(args:{probe:DelayedProbe;task:DelayedTask;attemptId:string;pilotCompletedAt:number;response:string;shownAssistance:LessonAssistance[];startedAt:number;submittedAt:number;outcome:LessonOutcome;previousReviewAt?:number}):LessonEvidenceEvent {
 const {probe,task,attemptId,pilotCompletedAt,response,shownAssistance,startedAt,submittedAt,outcome,previousReviewAt}=args;
 const notAssessed=outcome==='notAssessed',open=task.part==='writing';
 const delayedReview={probeId:probe.id,attemptId,pilotCompletedAt,dueAt:delayedDueAt(pilotCompletedAt,probe.delayDays),recommendedDelayDays:probe.delayDays,elapsedMs:submittedAt-pilotCompletedAt,...(previousReviewAt===undefined?{}:{previousReviewAt})};
 return {eventId:`c4:${attemptId}:${task.id}`,language:probe.language,unitId:probe.pilotId,contentVersion:1,taskId:task.id,taskKind:'delayedRecall',evidenceKind:task.part==='reading'?'comprehension':'delayedRecall',response:response.slice(0,4000),shownAssistance:shownAssistance.map(item=>({...item,shownBeforeAttempt:item.shownAt<=startedAt})),startedAt,submittedAt,outcome,reviewStatus:notAssessed?'notRequired':open?'pending':'notRequired',assessorKind:notAssessed?'unavailable':open?'rubricWithReview':'deterministic',feedback:null,sourceContext:`${probe.pilotId}@1/${probe.id}/${task.id}`,isIndependentClaimAllowed:false,objectiveId:probe.objectiveId,competencyId:task.part==='reading'?'written-comprehension':'written-transfer',delayedReview};
}
