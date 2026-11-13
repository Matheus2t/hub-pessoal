import type {V17AssessmentAttempt,V17AssessmentData,V17AssessmentDraft,V17HumanReview,V17ScenarioAcceptance,V17Level,V17Competency,Grade} from './model';
import type {StageScenarioV17} from './progression-v17-content';
import {reviewConsensusV17} from './progression-v17-review-consensus';

export const V17_CONTENT_VERSION=1;
export const V17_RUBRIC_VERSION=1;
export const V17_REVIEW_OUTCOMES={0:'needs_practice',1:'needs_practice',2:'partially_supported',3:'supported_for_observed_task'} as const;
const emptyData=():V17AssessmentData=>({schemaVersion:1,drafts:[],acceptances:[],attempts:[]});

/** Hashes only the reviewed prompt and criteria; changing either invalidates old evidence. */
export async function fingerprintV17(scenario:StageScenarioV17):Promise<string>{
 const source=JSON.stringify([V17_CONTENT_VERSION,scenario.id,scenario.nodeId,scenario.language,scenario.level,scenario.evidenceCategory,scenario.canDoTarget,scenario.independentScenarioPt,scenario.essentialCriteriaPt]);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function emptyAssessmentV17():V17AssessmentData{return emptyData()}
export function makeV17Draft(scenario:StageScenarioV17,fingerprint:string,response:string,now:number,existing?:V17AssessmentDraft,criteriaViewedAt?:number):V17AssessmentDraft{
 if(response.length>2300)throw new Error('A resposta excede o limite de 2.300 caracteres; nenhum texto foi truncado.');
 return {draftId:existing?.draftId||crypto.randomUUID(),scenarioId:scenario.id,contentFingerprint:fingerprint,response,startedAt:existing?.startedAt??now,updatedAt:now,...(existing?.criteriaViewedAt!==undefined||criteriaViewedAt!==undefined?{criteriaViewedAt:Math.min(existing?.criteriaViewedAt??Infinity,criteriaViewedAt??Infinity)}:{})};
}
export function acceptV17Scenario(scenario:StageScenarioV17,fingerprint:string,reviewer:{id:string;name:string},now:number):V17ScenarioAcceptance{
 return {scenarioId:scenario.id,contentFingerprint:fingerprint,acceptedAt:now,reviewerId:reviewer.id,reviewerName:reviewer.name};
}
export function makeV17Attempt(args:{scenario:StageScenarioV17;fingerprint:string;response:string;attemptId?:string;startedAt:number;submittedAt:number;criteriaViewedAt?:number;acceptances:readonly V17ScenarioAcceptance[]}):V17AssessmentAttempt{
 const {scenario,fingerprint,response,attemptId,startedAt,submittedAt,criteriaViewedAt,acceptances}=args;
 if(!response.trim()||response.length>2300||submittedAt<startedAt||!acceptances.some(a=>a.scenarioId===scenario.id&&a.contentFingerprint===fingerprint))throw new Error('A tarefa precisa estar aceita para prática local e conter uma resposta válida.');
 return {attemptId:attemptId||crypto.randomUUID(),scenarioId:scenario.id,language:scenario.language,level:scenario.level as V17Level,competency:scenario.evidenceCategory as V17Competency,contentVersion:V17_CONTENT_VERSION,contentFingerprint:fingerprint,origin:'progression_v17_assessment',prompt:scenario.independentScenarioPt,essentialCriteria:[...scenario.essentialCriteriaPt],response,startedAt,submittedAt,assistanceBeforeSubmission:criteriaViewedAt!==undefined&&criteriaViewedAt<=submittedAt?['criteria']:[],outcome:'uncertain',reviewStatus:'awaiting_review',reviews:[]};
}
export function addV17HumanReview(attempt:V17AssessmentAttempt,input:{reviewer:{id:string;name:string};score:Grade;criteria:V17HumanReview['criteria'];rationale:string;feedback:{whatWorked:string;priorityIssue:string;concreteSuggestion:string};now:number}):V17AssessmentAttempt{
 const rationale=input.rationale.trim();
 const feedback={whatWorked:input.feedback.whatWorked.trim(),priorityIssue:input.feedback.priorityIssue.trim(),concreteSuggestion:input.feedback.concreteSuggestion.trim()};
 if(attempt.reviewStatus==='not_assessed'||!Number.isInteger(input.score)||input.score<0||input.score>3||!Number.isFinite(input.now)||input.now<attempt.submittedAt||(attempt.reviews.length>0&&input.now<attempt.reviews.at(-1)!.reviewedAt)||rationale.length<12||rationale.length>1200||Object.values(feedback).some(value=>value.length<8||value.length>700)||input.criteria.length!==4||input.criteria.some((c,index)=>c.criterion!==(['task','meaning','grammarVocabulary','context'] as const)[index]||!Number.isInteger(c.score)||c.score<0||c.score>3))throw new Error('A revisão precisa de quatro critérios, justificativa, ponto forte, questão principal e sugestão concreta.');
 if((attempt.reviewStatus==='disputed'||reviewConsensusV17(attempt.reviews).disputed)&&attempt.reviews.some(r=>r.reviewerId===input.reviewer.id))throw new Error('Uma divergência exige avaliação de outro revisor autorizado.');
 const prior=attempt.reviews.filter(r=>r.reviewerId===input.reviewer.id).at(-1);
 const decision:V17HumanReview['decision']=!attempt.reviews.length?'initial':prior?'correction':'independent_review';
 const revision:V17HumanReview={revisionId:crypto.randomUUID(),reviewerId:input.reviewer.id,reviewerName:input.reviewer.name,reviewedAt:input.now,rubricVersion:V17_RUBRIC_VERSION,score:input.score,criteria:input.criteria.map(c=>({...c})),rationale,...feedback,outcome:V17_REVIEW_OUTCOMES[input.score],decision};
 const reviews=[...attempt.reviews,revision];
 const {consensus,disputed}=reviewConsensusV17(reviews);
 const outcome=disputed?'uncertain':V17_REVIEW_OUTCOMES[consensus??input.score];
 return {...attempt,reviews,reviewStatus:disputed?'disputed':'reviewed',outcome};
}

export interface V17Recommendation {scenarioId:string;state:'awaiting_review'|'review_recommended'|'practice_independently'|'next_activity_suggested'|'insufficient_evidence';message:string;basis:'pending'|'reviewed'|'legacy_study'|'none'}
/** Uses the latest eligible reviewed observation for an accepted, unchanged prompt only. */
export function recommendV17(scenario:StageScenarioV17,data:V17AssessmentData,currentFingerprint:string,legacyStudyCount=0):V17Recommendation{
 const accepted=data.acceptances.some(a=>a.scenarioId===scenario.id&&a.contentFingerprint===currentFingerprint);
 const attempts=data.attempts.filter(a=>a.scenarioId===scenario.id&&a.contentFingerprint===currentFingerprint&&a.contentVersion===V17_CONTENT_VERSION).sort((a,b)=>a.submittedAt-b.submittedAt);
 const latest=attempts.at(-1);
 if(latest?.reviewStatus==='awaiting_review'||latest?.reviewStatus==='disputed'||(latest&&reviewConsensusV17(latest.reviews).disputed))return {scenarioId:scenario.id,state:'awaiting_review',message:'A resposta aguarda revisão; ela não conta como erro nem como desempenho confirmado.',basis:'pending'};
 if(latest?.reviewStatus==='reviewed'){
  if(latest.assistanceBeforeSubmission.length&&latest.outcome==='needs_practice')return {scenarioId:scenario.id,state:'review_recommended',message:'A revisão recomenda praticar este objetivo. Os critérios foram consultados; tente novamente sem esse apoio.',basis:'reviewed'};
  if(latest.assistanceBeforeSubmission.length)return {scenarioId:scenario.id,state:'practice_independently',message:'Os critérios foram consultados. Tente outro contexto sem esse apoio para observar produção independente.',basis:'reviewed'};
  if(latest.outcome==='needs_practice')return {scenarioId:scenario.id,state:'review_recommended',message:'A revisão recomenda praticar este objetivo novamente.',basis:'reviewed'};
  if(latest.outcome==='partially_supported')return {scenarioId:scenario.id,state:'practice_independently',message:'Parte do objetivo apareceu. Pratique em outro contexto antes de avançar por esta sugestão.',basis:'reviewed'};
  return {scenarioId:scenario.id,state:'next_activity_suggested',message:'O objetivo foi observado nesta tarefa. Você pode experimentar outra atividade; nada fica bloqueado.',basis:'reviewed'};
 }
 if(accepted&&legacyStudyCount)return {scenarioId:scenario.id,state:'practice_independently',message:'Há estudo legado registrado, mas ele não comprova desempenho nesta tarefa. Experimente a proposta aceita.',basis:'legacy_study'};
 return {scenarioId:scenario.id,state:'insufficient_evidence',message:'Ainda não há evidência suficiente para recomendar um desempenho observado.',basis:'none'};
}

export function summarizeV17(data:V17AssessmentData,scenarios:readonly StageScenarioV17[],fingerprints:ReadonlyMap<string,string>){
 return scenarios.map(s=>{
  const fingerprint=fingerprints.get(s.id)||'';
  const latest=[...data.attempts].filter(a=>a.scenarioId===s.id&&a.contentFingerprint===fingerprint).sort((a,b)=>a.submittedAt-b.submittedAt).at(-1);
  const assisted=!!latest?.assistanceBeforeSubmission.length;
  return {scenarioId:s.id,competency:s.evidenceCategory,status:latest&&reviewConsensusV17(latest.reviews).disputed?'uncertain':latest?.reviewStatus==='reviewed'?latest.outcome:latest?.reviewStatus==='disputed'?'uncertain':latest?.reviewStatus==='awaiting_review'?'awaiting_review':'not_assessed',assisted,reviewCount:latest?.reviews.length||0} as const;
 });
}
