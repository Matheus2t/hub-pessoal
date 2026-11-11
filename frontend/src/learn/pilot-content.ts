import type {Language} from './model';

export interface PilotDialogueLine {speaker:string;text:string}
export interface PilotComprehensionStep {
 id:string;kind:'comprehension';evidence:'comprehension';prompt:string;choices:string[];correctIndex:number;
 feedback:string;feedbackByWrongChoice:Record<string,string>;
 assessmentContract:{closedQuestion:true;evidenceScope:'written-comprehension-only'};
}
export interface PilotNoticeStep {
 id:string;kind:'notice';evidence:'practiceOnly';prompt:string;explanation:string;
 assessmentContract:{scoreAsCompetence:false;evidenceScope:'practice-only'};
}
export interface PilotProvidedSupport {
 kind:'lexical-cue';targetWord:string;translationPt:string;shownInPrompt:true;countsAsAssistance:true;evidenceLimitPt:string;
}
export interface PilotOpenStep {
 id:string;kind:'guidedProduction'|'transfer';evidence:'guidedProduction'|'transfer';prompt:string;hints:string[];
 exampleAnswers:string[];rubric:string[];evaluation:'rubric-review-required';modelAnswersVisible:'after-attempt';
 providedSupport?:PilotProvidedSupport;
 assessmentContract:{canUseDeterministicMatchAsFinalGrade:false;assessor:'rubricWithReview';ifNoReliableReviewer:'uncertain';canRetryAfterFeedback:true;evidenceScope:string;visibleHelpMustBeRecorded:true};
}
export type PilotStep=PilotComprehensionStep|PilotNoticeStep|PilotOpenStep;
export type PilotId='en-pilot-introductions-01'|'ru-pilot-directions-01';
export interface PilotLesson {
 schemaVersion:1;id:PilotId;language:Language;contentVersion:1;title:string;canDo:string;scenario:string;
 dialogue:PilotDialogueLine[];support:{visibility:'on-demand';glossary:{source:string;pt:string}[];summaryPt:string};steps:PilotStep[];
 runtimeEnabled:false;status:'editorial-review';editorialFinalization:{engineeringInputReady:true;publicReleaseApproved:false};
}
export interface PilotRubric {
 taskId:string;pilotId:PilotId;language:Language;kind:'guidedProduction'|'transfer';goalPt?:string;
 reviewState:'requires-linguistic-and-learner-review';correctionMode:'rubricWithReview';
 conditions:{modelHiddenDuringAttempt:boolean;hintsAllowed:boolean;doesNotAssess:string[];assistanceMustBeRecorded:true;phoneticKeyboardAllowed?:boolean};
 criteria:{code:string;essential:boolean;descriptionPt:string}[];
}
export interface PilotBundle {lesson:PilotLesson;rubrics:Record<string,PilotRubric>}

interface PilotDefinition {
 language:Language;id:PilotId;contentFile:string;objectiveId:string;dialogueLines:number;
 stepIds:string[];openTaskIds:string[];
}
const definitions:Record<Language,PilotDefinition>={
 en:{language:'en',id:'en-pilot-introductions-01',contentFile:'en-pilot.json',objectiveId:'en-introductions-01',dialogueLines:5,
  stepIds:['en-intro-c1','en-intro-c2','en-intro-n1','en-intro-p1','en-intro-t1'],openTaskIds:['en-intro-p1','en-intro-t1']},
 ru:{language:'ru',id:'ru-pilot-directions-01',contentFile:'ru-pilot.json',objectiveId:'ru-directions-03',dialogueLines:4,
  stepIds:['ru-dir-c1','ru-dir-c2','ru-dir-n1','ru-dir-p1','ru-dir-t1'],openTaskIds:['ru-dir-p1','ru-dir-t1']},
};
export function pilotTaskIds(language:Language):readonly string[]{return definitions[language].stepIds;}
const expectedKinds=['comprehension','comprehension','notice','guidedProduction','transfer'] as const;
const expectedEvidence=['comprehension','comprehension','practiceOnly','guidedProduction','transfer'] as const;
const record=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const nonEmpty=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=3000;
const strings=(value:unknown,min=1,max=40):value is string[]=>Array.isArray(value)&&value.length>=min&&value.length<=max&&value.every(nonEmpty);

function validateLesson(value:unknown,definition:PilotDefinition):PilotLesson {
 if(!record(value)||value.schemaVersion!==1||value.id!==definition.id||value.language!==definition.language||value.contentVersion!==1||value.runtimeEnabled!==false||value.status!=='editorial-review'||
  !nonEmpty(value.title)||!nonEmpty(value.canDo)||!nonEmpty(value.scenario)||!record(value.editorialFinalization)||
  value.editorialFinalization.engineeringInputReady!==true||value.editorialFinalization.publicReleaseApproved!==false)
  throw Error('Aula incompatível ou sem os portões editoriais desativados.');
 if(!Array.isArray(value.dialogue)||value.dialogue.length!==definition.dialogueLines||
  value.dialogue.some((line:unknown)=>!record(line)||!nonEmpty(line.speaker)||!nonEmpty(line.text))||
  !record(value.support)||value.support.visibility!=='on-demand'||!nonEmpty(value.support.summaryPt)||!Array.isArray(value.support.glossary)||!value.support.glossary.length||
  value.support.glossary.some((item:unknown)=>!record(item)||!nonEmpty(item.source)||!nonEmpty(item.pt)))
  throw Error('Contexto, diálogo ou ajudas do piloto inválidos.');
 if(!Array.isArray(value.steps)||value.steps.length!==definition.stepIds.length)throw Error('Aula incompleta: as etapas esperadas não foram encontradas.');
 for(let index=0;index<value.steps.length;index++){
  const step=value.steps[index];
  if(!record(step)||step.id!==definition.stepIds[index]||step.kind!==expectedKinds[index]||step.evidence!==expectedEvidence[index])
   throw Error('ID, ordem ou tipo de etapa incompatível.');
  if(step.kind==='comprehension'){
   if(!nonEmpty(step.prompt)||!strings(step.choices,3,8)||!Number.isInteger(step.correctIndex)||step.correctIndex<0||step.correctIndex>=step.choices.length||
    !nonEmpty(step.feedback)||!record(step.feedbackByWrongChoice)||step.assessmentContract?.closedQuestion!==true||step.assessmentContract?.evidenceScope!=='written-comprehension-only')
    throw Error(`Pergunta de compreensão inválida: ${step.id}.`);
   const wrong=step.choices.map((_:string,i:number)=>String(i)).filter((choice:string)=>Number(choice)!==step.correctIndex);
   if(Object.keys(step.feedbackByWrongChoice).length!==wrong.length||wrong.some((choice:string)=>!nonEmpty(step.feedbackByWrongChoice[choice])))
    throw Error(`Feedback específico incompleto: ${step.id}.`);
  }else if(step.kind==='notice'){
   if(!nonEmpty(step.prompt)||!nonEmpty(step.explanation)||step.assessmentContract?.scoreAsCompetence!==false||step.assessmentContract?.evidenceScope!=='practice-only')
    throw Error('A etapa de observação não pode ser avaliada como competência.');
  }else{
   const contract=step.assessmentContract;
   if(!nonEmpty(step.prompt)||!strings(step.exampleAnswers)||!strings(step.rubric)||!Array.isArray(step.hints)||step.hints.some((hint:unknown)=>!nonEmpty(hint))||
    step.evaluation!=='rubric-review-required'||step.modelAnswersVisible!=='after-attempt'||contract?.canUseDeterministicMatchAsFinalGrade!==false||
    contract?.assessor!=='rubricWithReview'||contract?.ifNoReliableReviewer!=='uncertain'||contract?.visibleHelpMustBeRecorded!==true||contract?.canRetryAfterFeedback!==true)
    throw Error(`Resposta aberta inválida: ${step.id}.`);
   if(definition.language==='ru'&&step.id==='ru-dir-t1'){
    const support=step.providedSupport;
    if(!record(support)||support.kind!=='lexical-cue'||support.targetWord!=='библиотека'||support.translationPt!=='biblioteca'||support.shownInPrompt!==true||support.countsAsAssistance!==true||!nonEmpty(support.evidenceLimitPt))
     throw Error('A pista lexical do destino da transferência russa precisa ser comprovada e registrada.');
   }
  }
 }
 return value as PilotLesson;
}

function validateRubrics(value:unknown,definition:PilotDefinition):Record<string,PilotRubric> {
 if(!record(value)||value.schemaVersion!==1||value.runtimeEnabled!==false||value.status!=='editorial-draft'||!Array.isArray(value.rubrics))
  throw Error('Rubricas do piloto indisponíveis ou incompatíveis.');
 const result:Record<string,PilotRubric>={};
 for(const id of definition.openTaskIds){
  const rubric=value.rubrics.find((entry:unknown)=>record(entry)&&entry.taskId===id&&entry.pilotId===definition.id&&entry.language===definition.language);
  if(!record(rubric)||rubric.reviewState!=='requires-linguistic-and-learner-review'||rubric.correctionMode!=='rubricWithReview'||
   !record(rubric.conditions)||!Array.isArray(rubric.conditions.doesNotAssess)||
   !['spoken fluency','pronunciation','CEFR level'].every((item:string)=>rubric.conditions.doesNotAssess.includes(item))||
   rubric.conditions.assistanceMustBeRecorded!==true||!Array.isArray(rubric.criteria)||!rubric.criteria.length||
   rubric.criteria.some((criterion:unknown)=>!record(criterion)||!nonEmpty(criterion.descriptionPt)))
   throw Error(`Rubrica inválida ou sem revisão obrigatória: ${id}.`);
  const transfer=id===definition.stepIds[4];
  if(rubric.kind!==(transfer?'transfer':'guidedProduction')||rubric.conditions.modelHiddenDuringAttempt!==transfer||rubric.conditions.hintsAllowed===transfer)
   throw Error(`Condições incompatíveis com a etapa: ${id}.`);
  if(definition.language==='ru'&&rubric.conditions.phoneticKeyboardAllowed!==true)
   throw Error(`A rubrica russa precisa permitir o editor fonético: ${id}.`);
  result[id]=rubric as PilotRubric;
 }
 return result;
}

function validateManifest(value:unknown,lesson:PilotLesson,definition:PilotDefinition):void {
 if(!record(value)||value.schemaVersion!==1||value.status!=='ready-for-disabled-engineering-prototype'||value.runtimeEnabled!==false||!Array.isArray(value.pilots))
  throw Error('Manifesto de prontidão inválido.');
 const pilot=value.pilots.find((item:unknown)=>record(item)&&item.id===lesson.id);
 if(!record(pilot)||pilot.language!==definition.language||pilot.content!==definition.contentFile||pilot.objective!==definition.objectiveId||
  pilot.contentVersion!==lesson.contentVersion||pilot.releaseApproved!==false||pilot.hasAudio!==false||
  JSON.stringify(pilot.expectedSteps)!==JSON.stringify(definition.stepIds)||JSON.stringify(pilot.openTaskIds)!==JSON.stringify(definition.openTaskIds))
  throw Error('A aula não corresponde ao piloto desligado registrado no manifesto.');
 if(definition.language==='ru'&&(pilot.requiredLexicalCue?.taskId!=='ru-dir-t1'||pilot.requiredLexicalCue?.word!=='библиотека'))
  throw Error('O manifesto não confirma a pista lexical da transferência russa.');
}

async function fetchJson(path:string):Promise<unknown> {
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
 if(!response.ok)throw Error(`Não foi possível carregar ${path} (${response.status}).`);
 return response.json() as Promise<unknown>;
}

export async function loadPilotBundle(language:Language):Promise<PilotBundle> {
 const definition=definitions[language];const root='/learn/pedagogy-v1/';
 const [rawLesson,rawManifest,rawRubrics]=await Promise.all([
  fetchJson(`${root}${definition.contentFile}`),fetchJson(`${root}readiness-manifest.json`),fetchJson(`${root}pilot-task-rubrics.json`),
 ]);
 const lesson=validateLesson(rawLesson,definition);validateManifest(rawManifest,lesson,definition);
 const rubrics=validateRubrics(rawRubrics,definition);
 for(const step of lesson.steps)if((step.kind==='guidedProduction'||step.kind==='transfer')&&!rubrics[step.id])
  throw Error(`Não há rubrica em revisão para ${step.id}.`);
 return {lesson,rubrics};
}
