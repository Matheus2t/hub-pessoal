export interface PilotDialogueLine {speaker:string;text:string}
export interface PilotComprehensionStep {id:string;kind:'comprehension';evidence:'comprehension';prompt:string;choices:string[];correctIndex:number;feedback:string;feedbackByWrongChoice:Record<string,string>;assessmentContract:{closedQuestion:true;evidenceScope:'written-comprehension-only'}}
export interface PilotNoticeStep {id:string;kind:'notice';evidence:'practiceOnly';prompt:string;explanation:string;assessmentContract:{scoreAsCompetence:false;evidenceScope:'practice-only'}}
export interface PilotOpenStep {id:string;kind:'guidedProduction'|'transfer';evidence:'guidedProduction'|'transfer';prompt:string;hints:string[];exampleAnswers:string[];rubric:string[];evaluation:'rubric-review-required';modelAnswersVisible:'after-attempt';assessmentContract:{canUseDeterministicMatchAsFinalGrade:false;assessor:'rubricWithReview';ifNoReliableReviewer:'uncertain';canRetryAfterFeedback:true;evidenceScope:string;visibleHelpMustBeRecorded:true}}
export type PilotStep=PilotComprehensionStep|PilotNoticeStep|PilotOpenStep;
export interface PilotLesson {schemaVersion:1;id:'en-pilot-introductions-01';language:'en';contentVersion:1;title:string;canDo:string;scenario:string;dialogue:PilotDialogueLine[];support:{visibility:'on-demand';glossary:{source:string;pt:string}[];summaryPt:string};steps:PilotStep[];runtimeEnabled:false;status:'editorial-review';editorialFinalization:{engineeringInputReady:true;publicReleaseApproved:false}}
export interface PilotRubric {taskId:string;pilotId:string;language:'en';kind:'guidedProduction'|'transfer';reviewState:'requires-linguistic-and-learner-review';correctionMode:'rubricWithReview';conditions:{modelHiddenDuringAttempt:boolean;hintsAllowed:boolean;doesNotAssess:string[];assistanceMustBeRecorded:true};criteria:{code:string;essential:boolean;descriptionPt:string}[]}
export interface PilotBundle {lesson:PilotLesson;rubrics:Record<string,PilotRubric>}
const record=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const nonEmpty=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=3000;
const strings=(v:unknown,min=1,max=40):v is string[]=>Array.isArray(v)&&v.length>=min&&v.length<=max&&v.every(nonEmpty);
const expectedSteps=['en-intro-c1','en-intro-c2','en-intro-n1','en-intro-p1','en-intro-t1'];
const expectedKinds=['comprehension','comprehension','notice','guidedProduction','transfer'];
function validateLesson(v:unknown):PilotLesson {
 if(!record(v)||v.schemaVersion!==1||v.id!=='en-pilot-introductions-01'||v.language!=='en'||v.contentVersion!==1||v.runtimeEnabled!==false||v.status!=='editorial-review'||!nonEmpty(v.title)||!nonEmpty(v.canDo)||!nonEmpty(v.scenario)||!record(v.editorialFinalization)||v.editorialFinalization.engineeringInputReady!==true||v.editorialFinalization.publicReleaseApproved!==false)throw Error('Aula incompatível ou liberada para um ambiente não autorizado.');
 if(!Array.isArray(v.dialogue)||v.dialogue.length!==5||v.dialogue.some((line:unknown)=>!record(line)||!nonEmpty(line.speaker)||!nonEmpty(line.text))||!record(v.support)||v.support.visibility!=='on-demand'||!nonEmpty(v.support.summaryPt)||!Array.isArray(v.support.glossary)||!v.support.glossary.length||v.support.glossary.some((item:unknown)=>!record(item)||!nonEmpty(item.source)||!nonEmpty(item.pt)))throw Error('Contexto, diálogo ou ajudas do piloto inválidos.');
 if(!Array.isArray(v.steps)||v.steps.length!==expectedSteps.length)throw Error('Aula incompleta: as etapas esperadas não foram encontradas.');
 for(let i=0;i<v.steps.length;i++){
  const step=v.steps[i];if(!record(step)||step.id!==expectedSteps[i]||step.kind!==expectedKinds[i]||step.evidence!==(['comprehension','comprehension','practiceOnly','guidedProduction','transfer'][i]))throw Error('ID, ordem ou tipo de etapa incompatível.');
  if(step.kind==='comprehension'){
   if(!nonEmpty(step.prompt)||!strings(step.choices,3,8)||!Number.isInteger(step.correctIndex)||step.correctIndex<0||step.correctIndex>=step.choices.length||!nonEmpty(step.feedback)||!record(step.feedbackByWrongChoice)||step.assessmentContract?.closedQuestion!==true||step.assessmentContract?.evidenceScope!=='written-comprehension-only')throw Error(`Pergunta de compreensão inválida: ${step.id}.`);
   const wrong=step.choices.map((_:string,index:number)=>String(index)).filter((index:string)=>Number(index)!==step.correctIndex);
   if(Object.keys(step.feedbackByWrongChoice).length!==wrong.length||wrong.some((key:string)=>!nonEmpty(step.feedbackByWrongChoice[key])))throw Error(`Feedback específico incompleto: ${step.id}.`);
  } else if(step.kind==='notice'){
   if(!nonEmpty(step.prompt)||!nonEmpty(step.explanation)||step.assessmentContract?.scoreAsCompetence!==false||step.assessmentContract?.evidenceScope!=='practice-only')throw Error('A etapa de observação não pode ser avaliada como competência.');
  } else {
   const contract=step.assessmentContract;
   if(!nonEmpty(step.prompt)||!strings(step.exampleAnswers)||!strings(step.rubric)||!Array.isArray(step.hints)||step.hints.some((hint:unknown)=>!nonEmpty(hint))||step.evaluation!=='rubric-review-required'||step.modelAnswersVisible!=='after-attempt'||contract?.canUseDeterministicMatchAsFinalGrade!==false||contract?.assessor!=='rubricWithReview'||contract?.ifNoReliableReviewer!=='uncertain'||contract?.visibleHelpMustBeRecorded!==true||contract?.canRetryAfterFeedback!==true)throw Error(`Resposta aberta inválida: ${step.id}.`);
  }
 }
 return v as PilotLesson;
}
function validateRubrics(v:unknown):Record<string,PilotRubric> {
 if(!record(v)||v.schemaVersion!==1||v.runtimeEnabled!==false||v.status!=='editorial-draft'||!Array.isArray(v.rubrics))throw Error('Rubricas do piloto indisponíveis ou incompatíveis.');
 const result:Record<string,PilotRubric>={};
 for(const id of ['en-intro-p1','en-intro-t1']){
  const rubric=v.rubrics.find((entry:unknown)=>record(entry)&&entry.taskId===id&&entry.pilotId==='en-pilot-introductions-01'&&entry.language==='en');
  if(!record(rubric)||rubric.reviewState!=='requires-linguistic-and-learner-review'||rubric.correctionMode!=='rubricWithReview'||!record(rubric.conditions)||rubric.conditions.assistanceMustBeRecorded!==true||!Array.isArray(rubric.conditions.doesNotAssess)||!rubric.conditions.doesNotAssess.includes('spoken fluency')||!rubric.conditions.doesNotAssess.includes('pronunciation')||!rubric.conditions.doesNotAssess.includes('CEFR level')||!Array.isArray(rubric.criteria)||!rubric.criteria.length||rubric.criteria.some((c:unknown)=>!record(c)||!nonEmpty(c.descriptionPt)))throw Error(`Rubrica inválida ou sem revisão obrigatória: ${id}.`);
  const isTransfer=id==='en-intro-t1';if(rubric.kind!==(isTransfer?'transfer':'guidedProduction')||rubric.conditions.modelHiddenDuringAttempt!==isTransfer||rubric.conditions.hintsAllowed===isTransfer)throw Error(`Condições incompatíveis com a etapa: ${id}.`);
  result[id]=rubric as PilotRubric;
 }
 return result;
}
function validateManifest(v:unknown,lesson:PilotLesson):void {
 if(!record(v)||v.schemaVersion!==1||v.status!=='ready-for-disabled-engineering-prototype'||v.runtimeEnabled!==false||!Array.isArray(v.pilots))throw Error('Manifesto de prontidão inválido.');
 const pilot=v.pilots.find((item:unknown)=>record(item)&&item.id===lesson.id);
 if(!record(pilot)||pilot.language!=='en'||pilot.content!=='en-pilot.json'||pilot.contentVersion!==lesson.contentVersion||pilot.releaseApproved!==false||pilot.hasAudio!==false||JSON.stringify(pilot.expectedSteps)!==JSON.stringify(expectedSteps)||JSON.stringify(pilot.openTaskIds)!==JSON.stringify(['en-intro-p1','en-intro-t1']))throw Error('O piloto não corresponde ao manifesto desativado.');
}
async function fetchJson(path:string):Promise<unknown> {
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
 if(!response.ok)throw Error(`Não foi possível carregar ${path} (${response.status}).`);
 return response.json() as Promise<unknown>;
}
export async function loadEnglishPilot():Promise<PilotBundle> {
 const root='/learn/pedagogy-v1/';const [rawLesson,rawManifest,rawRubrics]=await Promise.all([fetchJson(`${root}en-pilot.json`),fetchJson(`${root}readiness-manifest.json`),fetchJson(`${root}pilot-task-rubrics.json`)]);
 const lesson=validateLesson(rawLesson);validateManifest(rawManifest,lesson);const rubrics=validateRubrics(rawRubrics);
 for(const step of lesson.steps)if((step.kind==='guidedProduction'||step.kind==='transfer')&&!rubrics[step.id])throw Error(`Não há rubrica aprovada para ${step.id}.`);
 return {lesson,rubrics};
}
