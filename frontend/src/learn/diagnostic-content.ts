import type {DiagnosticCompetencyId,Language,LessonAssistance,LessonEvidenceEvent,LessonOutcome,LessonProgress,LessonTaskKind} from './model';

export interface DiagnosticQuestion {
 id:string;type:'reading'|'recognition'|'guidedProduction'|'independentProduction'|'transfer'|'listening';mode:'closed'|'open';objectiveId:string;band:string;
 stimulus?:string;promptPt:string;choices?:string[];correctIndex?:number;correctAnswer?:string;feedbackPt?:string;evidence:string;
 assessment?:string;exampleAnswers?:string[];requiredMeaning?:string[];acceptableVariations?:string[];commonPitfalls?:string[];assistanceAllowed?:string[];modelAnswersVisible?:string;requiresAudio?:boolean;
 audio?:{status:string;spokenText:string;language:Language;publicUrl:string|null};
 providedSupport?:{kind:string;targetWord:string;translationPt:string;shownInPrompt:boolean;countsAsAssistance:boolean;evidenceLimitPt:string};
}
export interface DiagnosticBundle {
 schemaVersion:number;id:string;language:Language;status:string;runtimeEnabled:boolean;goal:string;
 administration:{optional:boolean;maxUnassistedTasks:number;minTasksBeforeAnyRecommendation:number;noFixedPassPercent:boolean;notAssessedOnMissingMedia:boolean;allowSkip:boolean};
 questions:DiagnosticQuestion[];
}
export type DiagnosticCompetency='Compreensão escrita'|'Reconhecimento contextual'|'Produção escrita'|'Transferência escrita'|'Compreensão auditiva'|'Produção oral';
export interface DiagnosticCompetencyResult {name:DiagnosticCompetency;status:'observed-partially'|'mixed'|'review-required'|'not-assessed'|'needs-practice';supported:number;notSupported:number;uncertain:number;notAssessed:number;taskIds:string[];detail:string}
export interface DiagnosticRecommendation {title:string;reason:string;href:string;assessed:number}

const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string';
const typeToTask:Record<DiagnosticQuestion['type'],LessonTaskKind>={reading:'diagnosticReading',recognition:'diagnosticRecognition',guidedProduction:'diagnosticGuidedProduction',independentProduction:'diagnosticIndependentProduction',transfer:'diagnosticTransfer',listening:'diagnosticListening'};
const typeToEvidence:Record<DiagnosticQuestion['type'],LessonEvidenceEvent['evidenceKind']>={reading:'comprehension',recognition:'recognition',guidedProduction:'guidedProduction',independentProduction:'independentProduction',transfer:'transfer',listening:'comprehension'};
const typeToCompetency:Record<DiagnosticQuestion['type'],DiagnosticCompetencyId>={reading:'written-comprehension',recognition:'contextual-recognition',guidedProduction:'written-production',independentProduction:'written-production',transfer:'written-transfer',listening:'listening-comprehension'};

export function parseDiagnostic(value:unknown,language:Language):DiagnosticBundle {
 const expectedId=`${language}-diagnostic-v1`;
 if(!isObject(value)||value.schemaVersion!==1||value.id!==expectedId||value.language!==language||value.runtimeEnabled!==false||!Array.isArray(value.questions)||value.questions.length!==10||!isObject(value.administration))throw Error('O conteúdo do diagnóstico está incompleto ou incompatível.');
 const ids=new Set<string>();
 for(const item of value.questions){
  if(!isObject(item)||!text(item.id)||ids.has(item.id)||!text(item.objectiveId)||!text(item.promptPt)||!text(item.type)||!Object.prototype.hasOwnProperty.call(typeToTask,item.type)||!['closed','open'].includes(String(item.mode)))throw Error('Há uma tarefa diagnóstica inválida.');
  ids.add(item.id);
  if(item.mode==='closed'&&item.type!=='listening'){
   if(!Array.isArray(item.choices)||!Number.isInteger(item.correctIndex)||Number(item.correctIndex)<0||Number(item.correctIndex)>=item.choices.length||item.choices.some((x:unknown)=>!text(x))||item.correctAnswer!==item.choices[Number(item.correctIndex)])throw Error(`O gabarito de ${item.id} não confere com as alternativas.`);
  }
  if(item.mode==='open'&&(item.assessment!=='rubricWithReview'||!Array.isArray(item.exampleAnswers)))throw Error(`A resposta aberta ${item.id} não possui a política de revisão esperada.`);
  if(item.type==='listening'&&(!isObject(item.audio)||item.audio.language!==language||item.audio.status!=='missing-reviewed-recording'||item.audio.publicUrl!==null))throw Error(`Listening ${item.id} requer áudio validado antes de ser habilitado.`);
 }
 const admin=value.administration as DiagnosticBundle['administration'];
 if(admin.optional!==true||admin.allowSkip!==true||admin.minTasksBeforeAnyRecommendation!==4||admin.notAssessedOnMissingMedia!==true)throw Error('A política de aplicação do diagnóstico mudou e precisa de revisão.');
 return value as unknown as DiagnosticBundle;
}

export async function loadDiagnostic(language:Language,fetcher:typeof fetch=fetch):Promise<DiagnosticBundle>{
 const response=await fetcher(`/learn/pedagogy-v1/${language}-diagnostic.json`,{cache:'no-store'});
 if(!response.ok)throw Error('Não foi possível carregar o diagnóstico. Tente novamente.');
 return parseDiagnostic(await response.json(),language);
}

export function taskKindFor(question:DiagnosticQuestion):LessonTaskKind{return typeToTask[question.type];}
export function evidenceKindFor(question:DiagnosticQuestion):LessonEvidenceEvent['evidenceKind'] {return typeToEvidence[question.type];}

export function makeDiagnosticEvent(args:{bundle:DiagnosticBundle;question:DiagnosticQuestion;sessionId:string;eventId:string;response:string;shownAssistance:LessonAssistance[];startedAt:number;submittedAt:number;outcome:LessonOutcome}):LessonEvidenceEvent {
 const {bundle,question,sessionId,eventId,response,shownAssistance,startedAt,submittedAt,outcome}=args;
 const unavailable=outcome==='notAssessed';
 const open=question.mode==='open';
 return {eventId,diagnosticSessionId:sessionId,objectiveId:question.objectiveId,competencyId:typeToCompetency[question.type],language:bundle.language,unitId:bundle.id,contentVersion:bundle.schemaVersion,taskId:question.id,taskKind:taskKindFor(question),evidenceKind:evidenceKindFor(question),response:response.slice(0,4000),shownAssistance:shownAssistance.map(item=>({...item,shownBeforeAttempt:true})),startedAt,submittedAt,outcome,reviewStatus:open&&!unavailable?'pending':'notRequired',assessorKind:question.type==='listening'||unavailable?'unavailable':open?'rubricWithReview':'deterministic',feedback:null,sourceContext:`${bundle.id}@${bundle.schemaVersion}/${question.id}`,isIndependentClaimAllowed:false};
}

function competencyFor(question:DiagnosticQuestion):DiagnosticCompetency {
 if(question.type==='reading')return 'Compreensão escrita';
 if(question.type==='recognition')return 'Reconhecimento contextual';
 if(question.type==='guidedProduction'||question.type==='independentProduction')return 'Produção escrita';
 if(question.type==='transfer')return 'Transferência escrita';
 if(question.type==='listening')return 'Compreensão auditiva';
 return 'Produção oral';
}
export function buildDiagnosticResults(bundle:DiagnosticBundle,events:LessonEvidenceEvent[]):{competencies:DiagnosticCompetencyResult[];recommendation:DiagnosticRecommendation} {
 const sessionEvents=events.filter(event=>event.unitId===bundle.id&&event.language===bundle.language);
 const competencies:DiagnosticCompetencyResult[]=[];
 const names:DiagnosticCompetency[]=['Compreensão escrita','Reconhecimento contextual','Produção escrita','Transferência escrita','Compreensão auditiva','Produção oral'];
 for(const name of names){
  const questions=name==='Produção oral'?[]:bundle.questions.filter(question=>competencyFor(question)===name);
  const rows=questions.map(question=>sessionEvents.find(event=>event.taskId===question.id));
  const outcomes=rows.filter((event):event is LessonEvidenceEvent=>!!event).map(event=>event.outcome);
  const supported=outcomes.filter(x=>x==='supported').length,notSupported=outcomes.filter(x=>x==='notSupported').length,uncertain=outcomes.filter(x=>x==='uncertain').length,notAssessed=outcomes.filter(x=>x==='notAssessed').length;
  const assessed=supported+notSupported+uncertain;
  const status:DiagnosticCompetencyResult['status']=uncertain?'review-required':!assessed?'not-assessed':supported&&notSupported?'mixed':notSupported?'needs-practice':'observed-partially';
  const detail=name==='Compreensão auditiva'?'Sem gravações validadas; não avaliada.':name==='Produção oral'?'Não há tarefas orais; não avaliada.':uncertain?'Respostas abertas registradas para revisão; nenhuma foi marcada automaticamente como certa ou errada.':!assessed?'Nenhuma tarefa observável respondida.':supported&&notSupported?'As respostas variaram entre as tarefas; esta amostra não mede domínio.':supported?'Houve resposta compatível com o gabarito nas tarefas indicadas; isso não demonstra domínio geral.':'As respostas não corresponderam ao gabarito destas tarefas fechadas.';
  competencies.push({name,status,supported,notSupported,uncertain,notAssessed,taskIds:questions.map(q=>q.id),detail});
 }
 const assessed=sessionEvents.filter(event=>event.outcome!=='notAssessed').length;
 const openUncertain=sessionEvents.filter(event=>event.outcome==='uncertain').length;
 const closedMisses=sessionEvents.filter(event=>(event.taskKind==='diagnosticReading'||event.taskKind==='diagnosticRecognition')&&event.outcome==='notSupported');
 let recommendation:DiagnosticRecommendation;
 if(assessed<bundle.administration.minTasksBeforeAnyRecommendation){
  recommendation={title:'Evidência insuficiente',reason:`Foram observadas ${assessed} tarefas; ainda não há amostra suficiente para uma recomendação específica. Comece pelas unidades introdutórias e escolha livremente o percurso.`,href:`#/learn/${bundle.language}/path`,assessed};
 }else if(openUncertain){
  recommendation={title:'Prática guiada de escrita',reason:'As respostas abertas precisam de revisão confiável e não foram classificadas automaticamente. Uma prática com apoio é um ponto de partida prudente; você pode escolher outra unidade.',href:`#/learn/${bundle.language}/writing`,assessed};
 }else if(closedMisses.length){
  const labels=[...new Set(closedMisses.map(event=>competencyFor(bundle.questions.find(q=>q.id===event.taskId)!)))].join(' e ');
  recommendation={title:'Revisar compreensão contextual',reason:`Algumas respostas fechadas de ${labels.toLocaleLowerCase('pt-BR')} não corresponderam ao gabarito. Revise esse conteúdo com novos exemplos; o diagnóstico não bloqueia outras unidades.`,href:`#/learn/${bundle.language}/reading`,assessed};
 }else{
  recommendation={title:'Aplicar a escrita em contexto',reason:'As tarefas fechadas foram respondidas, mas esta amostra não avaliou produção oral nem comprovou domínio. Continue com uma atividade escrita contextual e escolha livremente o percurso.',href:`#/learn/${bundle.language}/writing`,assessed};
 }
 return {competencies,recommendation};
}
