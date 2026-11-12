import type {Attempt,Backup,Card,LessonAssistance,LessonDraft,LessonEvidenceEvent,LessonFeedback,LessonProgress,LessonShownAssistance,PlanningRecord} from './model';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=2000):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const num=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const lang=(v:unknown)=>v==='en'||v==='ru';
const MAX_TIME=8640000000000000;
export function validAttempt(v:unknown):v is Attempt {
  if(!obj(v))return false;
  const audioSkill=v.skill==='listening'||v.skill==='dictation';
  if(v.audioEvidence!==undefined){
    const evidence=v.audioEvidence;
    if(!audioSkill||!obj(evidence)||!['recording','browser-synthesis'].includes(String(evidence.source))||typeof evidence.validated!=='boolean'||typeof evidence.transcriptViewedBeforeAttempt!=='boolean'||(evidence.recordingId!==undefined&&!text(evidence.recordingId,160))||(evidence.source==='recording'&&!text(evidence.recordingId,160))||(evidence.validated&&evidence.source!=='recording')||(!evidence.validated&&(v.assessmentOutcome!=='uncertain'||v.correct))||(evidence.transcriptViewedBeforeAttempt&&(v.assessmentOutcome!=='uncertain'||v.correct)))return false;
  }
  return text(v.id,120)&&lang(v.language)&&text(v.itemId,120)&&['vocabulary','listening','dictation','writing','reading','grammar','test'].includes(String(v.skill))&&text(v.topic,120)&&typeof v.answer==='string'&&v.answer.length<=2000&&text(v.expected)&&typeof v.correct==='boolean'&&(v.assessmentOutcome===undefined||v.assessmentOutcome==='uncertain'&&(v.skill==='writing'||audioSkill&&v.audioEvidence!==undefined)&&!v.correct)&&num(v.at,0,MAX_TIME)&&num(v.seconds,0,600)&&(v.grade===undefined||[0,1,2,3].includes(Number(v.grade))&&typeof v.grade==='number');
}
export function validCard(v:unknown):v is Card {
  return obj(v)&&lang(v.language)&&text(v.itemId,120)&&num(v.interval,0,3650)&&num(v.ease,1.3,3)&&num(v.repetitions,0,100000)&&Number.isInteger(v.repetitions)&&num(v.due,0,MAX_TIME)&&num(v.updated,0,MAX_TIME)&&(v.lastGrade===null||typeof v.lastGrade==='number'&&[0,1,2,3].includes(v.lastGrade));
}
export function validPlanning(v:unknown):v is PlanningRecord {
 if(!obj(v)||!lang(v.language)||!text(v.key,240))return false;
 if(v.kind==='settings'){const s=v.settings;return v.key===`settings:${v.language}`&&obj(s)&&s.language===v.language&&Number.isInteger(s.goal)&&num(s.goal,1,100)&&Number.isInteger(s.minutes)&&num(s.minutes,1,180)&&['review','new'].includes(String(s.preference))&&Array.isArray(s.modes)&&s.modes.length>0&&s.modes.length<=7&&new Set(s.modes).size===s.modes.length&&s.modes.every(m=>['vocabulary','listening','dictation','writing','reading','grammar','test'].includes(String(m)))}
 if(v.kind!=='plan'||!obj(v.plan))return false;const p=v.plan;
 if(!text(p.id,80)||p.language!==v.language||!text(p.day,10)||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)||!text(p.timezone,100)||v.key!==`plan:${v.language}:${p.day}:${p.timezone}`||!num(p.createdAt,0,MAX_TIME)||!Number.isInteger(p.goal)||!num(p.goal,1,100)||!Number.isInteger(p.minutes)||!num(p.minutes,1,180)||!Array.isArray(p.items)||p.items.length>100)return false;
 try{new Intl.DateTimeFormat('en',{timeZone:p.timezone})}catch{return false}
 const date=new Date(`${p.day}T12:00:00Z`);if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==p.day)return false;
 return p.items.every(i=>obj(i)&&text(i.attemptId,120)&&text(i.itemId,120)&&i.attemptId===`${p.id}-${i.itemId}`&&['flashcards','exercise'].includes(String(i.mode))&&text(i.reason,200))&&new Set(p.items.map(i=>i.attemptId)).size===p.items.length&&new Set(p.items.map(i=>i.itemId)).size===p.items.length&&(p.activeItemId===undefined||p.items.some(i=>i.itemId===p.activeItemId));
}
const assistanceKinds=['wordGloss','translation','sentenceStarter','modelAnswer','phoneticKeyboard','lexical-cue','writtenStimulus'];
const delayedTaskContract:Record<string,{language:'en'|'ru';pilotId:string;probeId:string;objectiveId:string;days:2|7;part:'read'|'write';lexicalCue?:string}>={
 'en-intro-d2-read':{language:'en',pilotId:'en-pilot-introductions-01',probeId:'en-intro-d2',objectiveId:'en-introductions-01',days:2,part:'read'},'en-intro-d2-write':{language:'en',pilotId:'en-pilot-introductions-01',probeId:'en-intro-d2',objectiveId:'en-introductions-01',days:2,part:'write'},
 'en-intro-d7-read':{language:'en',pilotId:'en-pilot-introductions-01',probeId:'en-intro-d7',objectiveId:'en-introductions-01',days:7,part:'read'},'en-intro-d7-write':{language:'en',pilotId:'en-pilot-introductions-01',probeId:'en-intro-d7',objectiveId:'en-introductions-01',days:7,part:'write'},
 'ru-dir-d2-read':{language:'ru',pilotId:'ru-pilot-directions-01',probeId:'ru-dir-d2',objectiveId:'ru-directions-03',days:2,part:'read'},'ru-dir-d2-write':{language:'ru',pilotId:'ru-pilot-directions-01',probeId:'ru-dir-d2',objectiveId:'ru-directions-03',days:2,part:'write',lexicalCue:'больница'},
 'ru-dir-d7-read':{language:'ru',pilotId:'ru-pilot-directions-01',probeId:'ru-dir-d7',objectiveId:'ru-directions-03',days:7,part:'read'},'ru-dir-d7-write':{language:'ru',pilotId:'ru-pilot-directions-01',probeId:'ru-dir-d7',objectiveId:'ru-directions-03',days:7,part:'write',lexicalCue:'музей'}
};
const DAY_MS=86_400_000;
export function validLessonAssistance(v:unknown):v is LessonAssistance {
 return obj(v)&&assistanceKinds.includes(String(v.kind))&&text(v.value,1000)&&text(v.taskId,120)&&num(v.shownAt,0,MAX_TIME)&&(v.attemptId===undefined||text(v.attemptId,80));
}
function validShownAssistance(v:unknown):v is LessonShownAssistance{return validLessonAssistance(v)&&obj(v)&&typeof v.shownBeforeAttempt==='boolean';}
const feedbackKeys=['whatWorked','priorityIssue','whyItMatters','concreteSuggestion','retryPrompt','assessmentLimits'] as const;
export function validLessonFeedback(v:unknown):v is LessonFeedback {
 return obj(v)&&feedbackKeys.every(key=>text(v[key],1000));
}
export function validLessonEvent(v:unknown):v is LessonEvidenceEvent {
 const taskKinds=['comprehension','notice','guidedProduction','transfer','diagnosticReading','diagnosticRecognition','diagnosticGuidedProduction','diagnosticIndependentProduction','diagnosticTransfer','diagnosticListening','delayedRecall'];
 if(!obj(v)||!text(v.eventId,120)||!lang(v.language)||!text(v.unitId,120)||!num(v.contentVersion,1,100)||!Number.isInteger(v.contentVersion)||!text(v.taskId,120)||!taskKinds.includes(String(v.taskKind))||typeof v.response!=='string'||v.response.length>4000||!Array.isArray(v.shownAssistance)||v.shownAssistance.length>100||!v.shownAssistance.every(validShownAssistance)||!num(v.startedAt,0,MAX_TIME)||!num(v.submittedAt,v.startedAt,MAX_TIME)||!['supported','partiallySupported','notSupported','uncertain','notAssessed'].includes(String(v.outcome))||!['pending','reviewed','notRequired'].includes(String(v.reviewStatus))||!['deterministic','rubricWithReview','humanReview','unavailable'].includes(String(v.assessorKind))||(v.feedback!==null&&!validLessonFeedback(v.feedback))||!text(v.sourceContext,300)||typeof v.isIndependentClaimAllowed!=='boolean'||(v.diagnosticSessionId!==undefined&&!text(v.diagnosticSessionId,120)))return false;
 if(v.taskKind==='delayedRecall'){
  const task=delayedTaskContract[String(v.taskId)],timing=v.delayedReview;
  if(!task||!obj(timing)||v.language!==task.language||v.unitId!==task.pilotId||v.contentVersion!==1||v.objectiveId!==task.objectiveId||v.competencyId!==(task.part==='read'?'written-comprehension':'written-transfer')||v.evidenceKind!==(task.part==='read'?'comprehension':'delayedRecall')||v.diagnosticSessionId!==undefined||!text(timing.attemptId,80)||v.eventId!==`c4:${timing.attemptId}:${v.taskId}`||timing.probeId!==task.probeId||timing.recommendedDelayDays!==task.days||!num(timing.pilotCompletedAt,0,MAX_TIME)||timing.dueAt!==timing.pilotCompletedAt+task.days*DAY_MS||v.startedAt<timing.dueAt||timing.elapsedMs!==v.submittedAt-timing.pilotCompletedAt||!text(v.sourceContext,300)||v.sourceContext!==`${task.pilotId}@1/${task.probeId}/${v.taskId}`||v.feedback!==null||v.isIndependentClaimAllowed)return false;
  if(timing.previousReviewAt!==undefined&&(!num(timing.previousReviewAt,timing.pilotCompletedAt+DAY_MS,MAX_TIME)||task.days!==7||timing.previousReviewAt>v.submittedAt))return false;
  const notAssessed=v.outcome==='notAssessed',open=task.part==='write';
  if(notAssessed){if(v.response!==''||v.assessorKind!=='unavailable'||v.reviewStatus!=='notRequired')return false;}
  else if(open){if(v.outcome!=='uncertain'||v.assessorKind!=='rubricWithReview'||v.reviewStatus!=='pending'||!v.response.trim())return false;}
  else if(!['supported','notSupported'].includes(String(v.outcome))||v.assessorKind!=='deterministic'||v.reviewStatus!=='notRequired'||!v.response)return false;
  if(!notAssessed&&!v.shownAssistance.some(item=>item.kind==='writtenStimulus'&&item.taskId===v.taskId&&item.attemptId===timing.attemptId&&item.shownBeforeAttempt===true))return false;
  if(task.lexicalCue&&!notAssessed&&!v.shownAssistance.some(item=>item.kind==='lexical-cue'&&item.taskId===v.taskId&&item.attemptId===timing.attemptId&&item.value===task.lexicalCue&&item.shownBeforeAttempt===true))return false;
  if(task.language==='ru'&&task.part==='write'&&!notAssessed&&!v.shownAssistance.some(item=>item.kind==='phoneticKeyboard'&&item.taskId===v.taskId&&item.attemptId===timing.attemptId&&item.shownBeforeAttempt===true))return false;
  return true;
 }else if(v.delayedReview!==undefined)return false;
 const diagnosticLanguage:Record<string,string>={'en-diagnostic-v1':'en','ru-diagnostic-v1':'ru'};
 if(diagnosticLanguage[v.unitId]){
  const taskRecords:Record<string,{kind:string;objective:string;competency:string}>={
   'en-diag-r1':{kind:'diagnosticReading',objective:'en-routine-02',competency:'written-comprehension'},'en-diag-r2':{kind:'diagnosticReading',objective:'en-navigation-03',competency:'written-comprehension'},
   'en-diag-k1':{kind:'diagnosticRecognition',objective:'en-introductions-01',competency:'contextual-recognition'},'en-diag-k2':{kind:'diagnosticRecognition',objective:'en-work-05',competency:'contextual-recognition'},
   'en-diag-p1':{kind:'diagnosticGuidedProduction',objective:'en-introductions-01',competency:'written-production'},'en-diag-p2':{kind:'diagnosticIndependentProduction',objective:'en-work-05',competency:'written-production'},
   'en-diag-t1':{kind:'diagnosticTransfer',objective:'en-introductions-01',competency:'written-transfer'},'en-diag-t2':{kind:'diagnosticTransfer',objective:'en-navigation-03',competency:'written-transfer'},
   'en-diag-l1':{kind:'diagnosticListening',objective:'en-introductions-01',competency:'listening-comprehension'},'en-diag-l2':{kind:'diagnosticListening',objective:'en-navigation-03',competency:'listening-comprehension'},
   'ru-diag-r1':{kind:'diagnosticReading',objective:'ru-cyrillic-01',competency:'written-comprehension'},'ru-diag-r2':{kind:'diagnosticReading',objective:'ru-directions-03',competency:'written-comprehension'},
   'ru-diag-k1':{kind:'diagnosticRecognition',objective:'ru-cyrillic-01',competency:'contextual-recognition'},'ru-diag-k2':{kind:'diagnosticRecognition',objective:'ru-introductions-02',competency:'contextual-recognition'},
   'ru-diag-p1':{kind:'diagnosticGuidedProduction',objective:'ru-introductions-02',competency:'written-production'},'ru-diag-p2':{kind:'diagnosticIndependentProduction',objective:'ru-directions-03',competency:'written-production'},
   'ru-diag-t1':{kind:'diagnosticTransfer',objective:'ru-directions-03',competency:'written-transfer'},'ru-diag-t2':{kind:'diagnosticTransfer',objective:'ru-routine-04',competency:'written-transfer'},
   'ru-diag-l1':{kind:'diagnosticListening',objective:'ru-introductions-02',competency:'listening-comprehension'},'ru-diag-l2':{kind:'diagnosticListening',objective:'ru-directions-03',competency:'listening-comprehension'}
  };
  const evidenceKinds:Record<string,string>={diagnosticReading:'comprehension',diagnosticRecognition:'recognition',diagnosticGuidedProduction:'guidedProduction',diagnosticIndependentProduction:'independentProduction',diagnosticTransfer:'transfer',diagnosticListening:'comprehension'};
  const skipped=String(v.eventId)===`${v.diagnosticSessionId}:skip:${v.taskId}`;
  const task=taskRecords[String(v.taskId)];
  if(v.language!==diagnosticLanguage[v.unitId]||!String(v.taskId).startsWith(`${v.language}-diag-`)||!text(v.diagnosticSessionId,120)||!task||task.kind!==v.taskKind||task.objective!==v.objectiveId||task.competency!==v.competencyId||v.evidenceKind!==evidenceKinds[String(v.taskKind)]||v.sourceContext!==`${v.unitId}@${v.contentVersion}/${v.taskId}`||v.isIndependentClaimAllowed||v.feedback!==null||(!skipped&&v.eventId!==`${v.diagnosticSessionId}:${v.taskId}`)||(skipped&&(v.outcome!=='notAssessed'||v.response!=='')))return false;
  if(v.taskKind==='diagnosticListening')return v.outcome==='notAssessed'&&v.assessorKind==='unavailable'&&v.reviewStatus==='notRequired'&&v.response===''&&v.shownAssistance.length===0;
  if(v.taskKind==='diagnosticReading'||v.taskKind==='diagnosticRecognition')return v.reviewStatus==='notRequired'&&(v.outcome==='notAssessed'?v.assessorKind==='unavailable':v.assessorKind==='deterministic'&&(v.outcome==='supported'||v.outcome==='notSupported'));
  return v.outcome==='uncertain'&&v.assessorKind==='rubricWithReview'&&v.reviewStatus==='pending'||v.outcome==='notAssessed'&&v.assessorKind==='unavailable'&&v.reviewStatus==='notRequired';
 }
 if(v.diagnosticSessionId!==undefined)return false;
 const pilotLanguage:Record<string,string>={'en-pilot-introductions-01':'en','ru-pilot-directions-01':'ru'};
 if(pilotLanguage[v.unitId]&&pilotLanguage[v.unitId]!==v.language)return false;
 const expected:Record<string,string>={comprehension:'comprehension',notice:'practiceOnly',guidedProduction:'guidedProduction',transfer:'transfer'};
 const taskKind=v.taskKind as LessonEvidenceEvent['taskKind'];
 if(v.evidenceKind!==expected[taskKind]||v.sourceContext!==`${v.unitId}@${v.contentVersion}/${v.taskId}`)return false;
 if(v.taskKind==='comprehension')return v.assessorKind==='deterministic'&&v.reviewStatus==='notRequired'&&(v.outcome==='supported'||v.outcome==='notSupported')&&!v.isIndependentClaimAllowed;
 if(v.taskKind==='notice')return v.assessorKind==='unavailable'&&v.reviewStatus==='notRequired'&&v.outcome==='notAssessed'&&!v.isIndependentClaimAllowed;
 if(v.assessorKind!=='rubricWithReview'||v.reviewStatus!=='pending'||v.outcome!=='uncertain'||v.feedback!==null)return false;
 if(taskKind==='transfer'){
  const shown=v.shownAssistance as LessonEvidenceEvent['shownAssistance'];
  const hasModelOrStarterOrLexicalCue=shown.some(a=>a.kind==='modelAnswer'||a.kind==='sentenceStarter'||a.kind==='lexical-cue');
  if(v.unitId==='ru-pilot-directions-01'&&v.taskId==='ru-dir-t1'&&!shown.some(a=>a.kind==='lexical-cue'&&a.value==='библиотека'&&a.shownBeforeAttempt))return false;
  return v.isIndependentClaimAllowed===!hasModelOrStarterOrLexicalCue;
 }
 return !v.isIndependentClaimAllowed;
}
export function validLessonDraft(v:unknown):v is LessonDraft {
 return obj(v)&&text(v.taskId,120)&&text(v.eventId,120)&&typeof v.response==='string'&&v.response.length<=4000&&num(v.startedAt,0,MAX_TIME)&&num(v.updatedAt,v.startedAt,MAX_TIME)&&(v.choiceIndex===undefined||Number.isInteger(v.choiceIndex)&&num(v.choiceIndex,0,20));
}
export function validLessonProgress(v:unknown):v is LessonProgress {
 if(!obj(v)||!text(v.key,300)||!lang(v.language)||!text(v.unitId,120)||!num(v.contentVersion,1,100)||!Number.isInteger(v.contentVersion)||!Number.isInteger(v.currentStage)||!num(v.currentStage,0,10)||!Array.isArray(v.shownAssistance)||v.shownAssistance.length>(v.sessionKind==='delayedReview'?1000:100)||!v.shownAssistance.every(validLessonAssistance)||!Array.isArray(v.drafts)||v.drafts.length>20||!v.drafts.every(validLessonDraft)||!num(v.updatedAt,0,MAX_TIME)||(v.diagnosticSessionId!==undefined&&!text(v.diagnosticSessionId,120))||(v.diagnosticLastEventId!==undefined&&!text(v.diagnosticLastEventId,120))||(['inProgress','completed','skipped'].includes(String(v.diagnosticStatus))===false&&v.diagnosticStatus!==undefined)||(v.sessionKind!==undefined&&v.sessionKind!=='delayedReview'))return false;
 const isDelayed=v.sessionKind==='delayedReview';
 if(!isDelayed&&(v.key!==`${v.language}:${v.unitId}`||v.delayedReview!==undefined))return false;
 if(isDelayed){
  const pilot=v.unitId==='en-pilot-introductions-01'?'en':v.unitId==='ru-pilot-directions-01'?'ru':undefined,state=v.delayedReview;
  if(!pilot||v.language!==pilot||!obj(state)||!num(state.pilotCompletedAt,0,MAX_TIME)||v.key!==`${v.language}:${v.unitId}:delayed-review:${state.pilotCompletedAt}`||v.contentVersion!==1||v.currentStage>2||v.diagnosticSessionId!==undefined||v.diagnosticStatus!==undefined||v.diagnosticLastEventId!==undefined||!Array.isArray(state.attempts)||state.attempts.length>100)return false;
  const pilotCompletedAt=state.pilotCompletedAt;
  const allowed:Record<string,{days:2|7;tasks:[string,string]}>=pilot==='en'?{'en-intro-d2':{days:2,tasks:['en-intro-d2-read','en-intro-d2-write']},'en-intro-d7':{days:7,tasks:['en-intro-d7-read','en-intro-d7-write']}}:{'ru-dir-d2':{days:2,tasks:['ru-dir-d2-read','ru-dir-d2-write']},'ru-dir-d7':{days:7,tasks:['ru-dir-d7-read','ru-dir-d7-write']}};
  const attempts=state.attempts as unknown[];
  if(!attempts.every((attempt:unknown)=>{
   if(!obj(attempt)||!text(attempt.attemptId,80)||typeof attempt.probeId!=='string'||!Object.prototype.hasOwnProperty.call(allowed,attempt.probeId)||!['inProgress','completed','notAssessed'].includes(String(attempt.status))||!Number.isInteger(attempt.currentTaskIndex)||!num(attempt.currentTaskIndex,0,2)||!num(attempt.startedAt,pilotCompletedAt,MAX_TIME))return false;
   const spec=allowed[attempt.probeId];if(!spec||attempt.startedAt<pilotCompletedAt+spec.days*DAY_MS)return false;
   const done=attempt.status==='completed'||attempt.status==='notAssessed';
   return done?(attempt.currentTaskIndex===2&&num(attempt.completedAt,attempt.startedAt,MAX_TIME)):(attempt.currentTaskIndex<2&&attempt.completedAt===undefined);
  })||new Set(attempts.map((attempt:unknown)=>(attempt as Record<string,unknown>).attemptId)).size!==attempts.length)return false;
  const active=attempts.filter((attempt:unknown)=>obj(attempt)&&attempt.status==='inProgress') as Record<string,any>[];
  if(active.length>1||v.currentStage!==(active[0]?.currentTaskIndex??0)||(active.length===0&&v.drafts.length!==0)||v.drafts.length>1)return false;
  if(active.length){const spec=typeof active[0].probeId==='string'?allowed[active[0].probeId]:undefined;if(!spec)return false;const expected=spec.tasks[Number(active[0].currentTaskIndex)];if(v.drafts.some((draft:unknown)=>!obj(draft)||draft.taskId!==expected||draft.eventId!==`c4:${active[0].attemptId}:${expected}`))return false;}
  const draftIds=(v.drafts as LessonDraft[]);if(new Set(draftIds.map(d=>d.taskId)).size!==draftIds.length||new Set(draftIds.map(d=>d.eventId)).size!==draftIds.length)return false;
  return true;
 }
 const isDiagnostic=v.unitId==='en-diagnostic-v1'||v.unitId==='ru-diagnostic-v1';
 if(isDiagnostic){
  if(!text(v.diagnosticSessionId,120)||!['inProgress','completed','skipped'].includes(String(v.diagnosticStatus))||v.currentStage>10)return false;
  const done=v.diagnosticStatus==='completed'||v.diagnosticStatus==='skipped';
  if(done!==(v.currentStage===10)||(done&&v.drafts.length!==0)||v.drafts.length>1)return false;
  const ids=['r1','r2','k1','k2','p1','p2','t1','t2','l1','l2'];
  const stage=Number(v.currentStage);if(v.drafts.some(d=>d.taskId!==`${v.language}-diag-${ids[stage]}`))return false;
 }
 else if(v.diagnosticSessionId!==undefined||v.diagnosticStatus!==undefined||v.diagnosticLastEventId!==undefined||v.currentStage>7)return false;
 const pilotLanguage:Record<string,string>={'en-pilot-introductions-01':'en','ru-pilot-directions-01':'ru'};
 const diagnosticLanguage:Record<string,string>={'en-diagnostic-v1':'en','ru-diagnostic-v1':'ru'};
 if(pilotLanguage[v.unitId]&&pilotLanguage[v.unitId]!==v.language)return false;
 if(diagnosticLanguage[v.unitId]&&diagnosticLanguage[v.unitId]!==v.language)return false;
 const drafts=v.drafts as LessonDraft[];
 return new Set(drafts.map(d=>d.taskId)).size===drafts.length&&new Set(drafts.map(d=>d.eventId)).size===drafts.length;
}
export function parseBackup(raw:string):Backup {
  if(raw.length>5_000_000||new TextEncoder().encode(raw).length>5_000_000)throw Error('Backup excede 5 MB.');
  let data:unknown;try{data=JSON.parse(raw)}catch{throw Error('Arquivo JSON inválido.')}
  if(!obj(data)||data.format!=='2t-learn'||![1,2,3].includes(Number(data.version))||typeof data.version!=='number'||!num(data.exportedAt,0,MAX_TIME)||!Array.isArray(data.attempts)||!Array.isArray(data.cards)||data.attempts.length>10000||data.cards.length>10000||!data.attempts.every(validAttempt)||!data.cards.every(validCard))throw Error('Formato, versão ou registros do backup inválidos.');
  if((data.version===2||data.version===3)&&(!Array.isArray(data.planning)||data.planning.length>2000||!data.planning.every(validPlanning)||new Set(data.planning.map(p=>p.key)).size!==data.planning.length))throw Error('Planos do backup inválidos ou duplicados.');
  if(data.version===2||data.version===3){const plans=(data.planning as PlanningRecord[]).filter((r):r is Extract<PlanningRecord,{kind:'plan'}>=>r.kind==='plan');const ids=plans.map(r=>r.plan.id);if(new Set(ids).size!==ids.length)throw Error('Identificadores de planos duplicados.');for(const r of plans)for(const i of r.plan.items){const a=(data.attempts as Attempt[]).find(a=>a.id===i.attemptId);if(a&&(a.language!==r.language||a.itemId!==i.itemId))throw Error('Tentativa incompatível com o plano.');}}
  if(data.version===3&&(!Array.isArray(data.lessonEvents)||data.lessonEvents.length>10000||!data.lessonEvents.every(validLessonEvent)||new Set(data.lessonEvents.map(e=>e.eventId)).size!==data.lessonEvents.length||!Array.isArray(data.lessonProgress)||data.lessonProgress.length>2000||!data.lessonProgress.every(validLessonProgress)||new Set(data.lessonProgress.map(p=>p.key)).size!==data.lessonProgress.length))throw Error('Evidências ou rascunhos do backup v3 inválidos ou duplicados.');
  if(data.version===3){
   const events=data.lessonEvents as LessonEvidenceEvent[],progress=data.lessonProgress as LessonProgress[],eventIds=new Set(events.map(e=>e.eventId));
   if(progress.some(p=>p.drafts.some(d=>eventIds.has(d.eventId))))throw Error('O backup v3 associa a mesma tentativa a um evento e a um rascunho.');
   const diagnosticAttempts=events.filter(e=>e.diagnosticSessionId),attemptKeys=diagnosticAttempts.map(e=>`${e.language}:${e.diagnosticSessionId}:${e.taskId}`);
   if(new Set(attemptKeys).size!==attemptKeys.length)throw Error('O backup v3 contém tentativas diagnósticas duplicadas na mesma sessão.');
   if(progress.some(p=>p.diagnosticLastEventId&&!events.some(e=>e.eventId===p.diagnosticLastEventId&&e.language===p.language&&e.unitId===p.unitId&&e.diagnosticSessionId===p.diagnosticSessionId)))throw Error('O progresso diagnóstico aponta para uma evidência ausente.');
   const delayedEvents=events.filter(e=>e.delayedReview);
   for(const event of delayedEvents){const timing=event.delayedReview!,state=progress.find(p=>p.sessionKind==='delayedReview'&&p.key===`${event.language}:${event.unitId}:delayed-review:${timing.pilotCompletedAt}`);if(!state?.delayedReview?.attempts.some(a=>a.attemptId===timing.attemptId&&a.probeId===timing.probeId))throw Error('Uma revisão diferida não possui sessão de retomada correspondente.');}
   for(const state of progress.filter(p=>p.sessionKind==='delayedReview'))for(const attempt of state.delayedReview!.attempts){const rows=delayedEvents.filter(e=>e.language===state.language&&e.unitId===state.unitId&&e.delayedReview?.attemptId===attempt.attemptId);const taskIds=attempt.probeId==='en-intro-d2'?['en-intro-d2-read','en-intro-d2-write']:attempt.probeId==='en-intro-d7'?['en-intro-d7-read','en-intro-d7-write']:attempt.probeId==='ru-dir-d2'?['ru-dir-d2-read','ru-dir-d2-write']:['ru-dir-d7-read','ru-dir-d7-write'];const expected=attempt.status==='inProgress'?attempt.currentTaskIndex:2;if(rows.length!==expected||rows.some((e,index)=>e.taskId!==taskIds[index]))throw Error('A sessão de revisão diferida não corresponde às evidências salvas.');}
  }
  if(new Set(data.attempts.map(a=>a.id)).size!==data.attempts.length||new Set(data.cards.map(c=>`${c.language}:${c.itemId}`)).size!==data.cards.length)throw Error('Backup contém registros duplicados.');
  return {format:'2t-learn',version:data.version as 1|2|3,exportedAt:data.exportedAt,attempts:data.attempts,cards:data.cards,...(data.version>=2?{planning:data.planning as PlanningRecord[]}:{}),...(data.version===3?{lessonEvents:data.lessonEvents as LessonEvidenceEvent[],lessonProgress:data.lessonProgress as LessonProgress[]}:{})};
}
