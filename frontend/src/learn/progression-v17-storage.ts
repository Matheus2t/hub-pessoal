import type {Language,LessonProgress,V17AssessmentData,V17AssessmentDraft,V17AssessmentAttempt,V17HumanReview,V17ScenarioAcceptance,Grade} from './model';
import {openLearnDB} from './storage';
import {validLessonProgress} from './backup';
import {emptyAssessmentV17,makeV17Attempt,addV17HumanReview} from './progression-v17-assessment';
import {currentV17Reviewer} from './progression-v17-review-auth';
import type {StageScenarioV17} from './progression-v17-content';

const key=(language:Language)=>`v17:${language}`;
function emptyRecord(language:Language):LessonProgress{return {key:key(language),language,unitId:'v17-assessment',contentVersion:1,currentStage:0,shownAssistance:[],drafts:[],updatedAt:Date.now(),v17Assessment:emptyAssessmentV17()}}
function finish(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(Error('Não foi possível salvar a avaliação local. O registro anterior foi preservado.'))})}
function requestValue<T>(request:IDBRequest<T>){return new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Falha de leitura do armazenamento local.'))})}
function authorizedReviewer(id:string){const reviewer=currentV17Reviewer();if(!reviewer||reviewer.id!==id)throw Error('Uma sessão de revisor local autorizada é necessária para esta operação.');return reviewer}
export async function loadV17Assessment(language:Language):Promise<V17AssessmentData>{
 const db=await openLearnDB();try{const tx=db.transaction('lessonProgress','readonly'),done=finish(tx),record=await requestValue<LessonProgress|undefined>(tx.objectStore('lessonProgress').get(key(language)));await done;if(!record)return emptyAssessmentV17();if(!validLessonProgress(record)||record.language!==language||record.unitId!=='v17-assessment'||!record.v17Assessment)throw Error('Os dados V17 locais são inválidos; nenhum registro foi alterado.');return record.v17Assessment;}finally{db.close()}
}
async function mutate<T>(language:Language,change:(data:V17AssessmentData)=>T):Promise<T>{
 const db=await openLearnDB();try{
  const tx=db.transaction('lessonProgress','readwrite'),done=finish(tx),store=tx.objectStore('lessonProgress');
  let result!:T;const get=store.get(key(language));
  get.onsuccess=()=>{try{const saved=get.result as LessonProgress|undefined;let data=saved?.v17Assessment||emptyAssessmentV17();if(saved&&(!validLessonProgress(saved)||saved.language!==language||saved.unitId!=='v17-assessment'))throw Error('Os dados V17 locais são inválidos.');result=change(data);const record={...(saved||emptyRecord(language)),updatedAt:Date.now(),v17Assessment:data};if(!validLessonProgress(record))throw Error('A validação dos dados V17 falhou.');store.put(record)}catch{tx.abort()}};
  await done;return result;
 }finally{db.close()}
}
export function saveV17Draft(language:Language,draft:V17AssessmentDraft):Promise<void>{
 return mutate(language,data=>{const index=data.drafts.findIndex(d=>d.scenarioId===draft.scenarioId&&d.contentFingerprint===draft.contentFingerprint);if(index>=0){const old=data.drafts[index];data.drafts[index]={...draft,draftId:old.draftId,startedAt:old.startedAt,criteriaViewedAt:old.criteriaViewedAt??draft.criteriaViewedAt}}else data.drafts.push(draft);data.drafts=data.drafts.filter(d=>d.contentFingerprint===draft.contentFingerprint||d.scenarioId!==draft.scenarioId).slice(-30);});
}
export function acceptV17ScenarioLocally(language:Language,acceptance:V17ScenarioAcceptance):Promise<void>{
 const reviewer=authorizedReviewer(acceptance.reviewerId);
 return mutate(language,data=>{const active=authorizedReviewer(reviewer.id),authorized={...acceptance,reviewerId:active.id,reviewerName:active.name};if(!data.acceptances.some(a=>a.scenarioId===authorized.scenarioId&&a.contentFingerprint===authorized.contentFingerprint))data.acceptances.push(authorized)});
}
export async function submitV17Draft(language:Language,args:{scenario:StageScenarioV17;fingerprint:string;draftId:string;submittedAt:number}):Promise<V17AssessmentAttempt>{
 return mutate(language,data=>{
  const existing=data.attempts.find(a=>a.attemptId===args.draftId);if(existing)return existing;
  const index=data.drafts.findIndex(d=>d.draftId===args.draftId&&d.scenarioId===args.scenario.id&&d.contentFingerprint===args.fingerprint);if(index<0)throw Error('Rascunho não encontrado. Recarregue a página para recuperar os dados salvos.');
  const draft=data.drafts[index];const attempt=makeV17Attempt({scenario:args.scenario,fingerprint:args.fingerprint,attemptId:draft.draftId,response:draft.response,startedAt:draft.startedAt,submittedAt:args.submittedAt,criteriaViewedAt:draft.criteriaViewedAt,acceptances:data.acceptances});
  data.drafts.splice(index,1);data.attempts.push(attempt);return attempt;
 });
}
export function recordV17Review(language:Language,args:{attemptId:string;reviewer:{id:string;name:string};score:Grade;criteria:V17HumanReview['criteria'];rationale:string;feedback:{whatWorked:string;priorityIssue:string;concreteSuggestion:string};now:number}):Promise<V17AssessmentAttempt>{
 const reviewer=authorizedReviewer(args.reviewer.id);
 return mutate(language,data=>{const active=authorizedReviewer(reviewer.id),index=data.attempts.findIndex(a=>a.attemptId===args.attemptId);if(index<0)throw Error('A tentativa não existe neste idioma.');const next=addV17HumanReview(data.attempts[index],{reviewer:active,score:args.score,criteria:args.criteria,rationale:args.rationale,feedback:args.feedback,now:args.now});data.attempts[index]=next;return next});
}
