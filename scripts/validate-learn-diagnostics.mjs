#!/usr/bin/env node
/**
 * Pedagogical DATA CONTRACT checker; read-only. No learner data or deployment.
 * Does not purport to validate proficiency, naturalness, CEFR or human feedback.
 */
import {readFileSync} from 'node:fs';
const prefix='frontend/public/learn/pedagogy-v1/';
const read=name=>JSON.parse(readFileSync(prefix+name+'.json','utf8'));
const errors=[],logs=[];
const check=(ok,reason)=>{if(!ok)errors.push(reason)};
const nonblank=s=>typeof s==='string'&&s.trim().length>=6;
const policy=read('evaluation-policy'),book=read('feedback-casebook');
check(policy.schemaVersion===1&&policy.status==='pedagogical-draft','policy version/status');
check(policy.safetyAndPrivacy?.autoGradingOpenResponses==='disabled','open response auto-grading must stay off');
check(policy.safetyAndPrivacy?.speechAssessment==='unavailable','speech assessment must stay unavailable');
check(Array.isArray(policy.openResponseRubric?.criteria)&&policy.openResponseRubric.criteria.length>=5,'rubric criteria absent');
check(new Set(policy.rules?.map(r=>r.id)).size===policy.rules?.length,'duplicate policy IDs');
const allowedOutcomes=new Set(policy.outcomes||[]);
const issueTypes=new Set(policy.feedbackContract?.priorityIssueTypes||[]);
const feedbackKeys=policy.feedbackContract?.keys||[];
const pilots=new Map();
const diagIDs=new Set();
let questions=0,audioUnavailable=0,open=0;
for(const lang of ['en','ru']){
  const curriculum=read(lang),pilot=read(lang+'-pilot'),d=read(lang+'-diagnostic');
  pilots.set(lang,pilot);
  const objectives=new Set(curriculum.objectives.map(o=>o.id));
  check(d.schemaVersion===1&&d.language===lang&&d.runtimeEnabled===false&&d.status==='editorial-review',lang+': diagnostic must be reviewed and disabled');
  check(Array.isArray(d.questions)&&d.questions.length>=8&&d.questions.length<=14,lang+': diagnostic length outside review range');
  check(d.administration?.optional===true&&d.administration?.allowSkip===true,lang+': diagnostic must be optional and skippable');
  check(d.administration?.notAssessedOnMissingMedia===true,lang+': missing media cannot be graded');
  let localOpen=0,localAudio=0,closedCount=0;
  const answerPositions=[0,0,0];
  const bands=new Set(),kinds=new Set();
  for(const q of d.questions||[]){
    questions++;kinds.add(q.type);bands.add(q.band);
    check(!diagIDs.has(q.id),q.id+': duplicate global diagnostic ID');diagIDs.add(q.id);
    check(q.id.startsWith(lang+'-diag-'),q.id+': invalid diagnostic ID prefix');
    check(objectives.has(q.objectiveId),q.id+': unknown curriculum objective');
    check(nonblank(q.promptPt)&&nonblank(q.stimulus||q.audio?.spokenText),q.id+': missing prompt/stimulus');
    check(nonblank(q.feedbackPt),q.id+': missing teaching feedback');
    check(['reading','recognition','guidedProduction','independentProduction','transfer','listening'].includes(q.type),q.id+': invalid task type');
    if(q.mode==='closed'){
      check(['reading','recognition','listening'].includes(q.type),q.id+': invalid closed task type');
      check(Array.isArray(q.choices)&&q.choices.length===3&&new Set(q.choices).size===q.choices.length,q.id+': invalid/misleading choices');
      check(Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<3,q.id+': invalid answer index');
      if(Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<3){
        closedCount++;
        answerPositions[q.correctIndex]++;
      }
      check(typeof q.correctAnswer==='string'&&q.correctAnswer===q.choices?.[q.correctIndex],q.id+': canonical answer must match keyed choice');
      check(['recognition','comprehension'].includes(q.evidence),q.id+': inappropriate closed-task evidence');
    }else if(q.mode==='open'){
      localOpen++;open++;
      check(['guidedProduction','independentProduction','transfer'].includes(q.type),q.id+': invalid open task type');
      check(q.assessment==='rubricWithReview',q.id+': open answers must require review');
      check(q.modelAnswersVisible==='after-attempt',q.id+': open answer examples must remain hidden before first response');
      if(q.providedSupport){
        const cue=q.providedSupport;
        check(cue.kind==='lexical-cue'&&cue.countsAsAssistance===true&&cue.shownInPrompt===true,q.id+': disclosed word cue must count as assistance');
        check(typeof cue.targetWord==='string'&&q.promptPt.includes(cue.targetWord),q.id+': declared word cue not present in task');
        check(typeof cue.evidenceLimitPt==='string'&&cue.evidenceLimitPt.length>=80,q.id+': word cue requires explicit limit on interpretation');
      }
      check(Array.isArray(q.requiredMeaning)&&q.requiredMeaning.length>=2,q.id+': no meaningful rubric criteria');
      check(Array.isArray(q.acceptableVariations)&&q.acceptableVariations.length>=2,q.id+': alternative expressions not considered');
      check(Array.isArray(q.commonPitfalls)&&q.commonPitfalls.length>=2,q.id+': no targeted feedback errors');
      check(Array.isArray(q.exampleAnswers)&&q.exampleAnswers.length>=2&&new Set(q.exampleAnswers).size===q.exampleAnswers.length,q.id+': missing distinct model answers');
      check(q.evidence===q.type,q.id+': incorrect open evidence');
      check(Array.isArray(q.assistanceAllowed),q.id+': help metadata missing');
      if(q.type!=='guidedProduction')check(q.assistanceAllowed.length===0,q.id+': unassisted task cannot offer hints during attempt');
    }else check(false,q.id+': task mode must be open/closed');
    if(q.type==='listening'){
      localAudio++;audioUnavailable++;
      check(q.requiresAudio===true,q.id+': listening must require audio');
      check(q.audio?.language===lang,q.id+': mismatched recorded language');
      check(q.audio?.status==='missing-reviewed-recording'&&q.audio?.publicUrl===null,q.id+': no validated audio exists; must stay disabled');
    }else check(q.requiresAudio!==true,q.id+': non-audio task marked listening');
  }
  check(kinds.has('reading')&&kinds.has('recognition')&&kinds.has('transfer')&&kinds.has('listening'),lang+': missing diagnostic categories');
  check(localOpen>=3,lang+': insufficient open-ended probes');
  check(closedCount>=3,lang+': too few closed response-position checks');
  check(Math.max(...answerPositions)-Math.min(...answerPositions)<=1,lang+': answer key is position-biased: '+answerPositions.join('/'));
  check(d.assessmentQuality?.answerKey?.includes('correctAnswer')&&d.assessmentQuality?.distractorOrder?.includes('Balanced'),lang+': answer-key quality policy missing');
  if(lang==='ru'){
    const sign=d.questions.find(q=>q.id==='ru-diag-k1');
    check(sign?.correctAnswer==='ВЫХОД'&&sign?.assessmentScope==='functional-cyrillic-sign-recognition',lang+': Cyrillic probe should be practical station signage');
    for(const id of ['ru-diag-p2','ru-diag-t1']){
      const q=d.questions.find(q=>q.id===id);
      check(q?.providedSupport?.kind==='lexical-cue'&&q.providedSupport.countsAsAssistance===true,lang+': supplied Russian destination word must be counted as help in '+id);
    }
  }
  check(localAudio>=2,lang+': insufficient planned listening probes');
  check(bands.size>=2,lang+': tasks only assess one indicative band');
  logs.push(lang.toUpperCase()+': '+d.questions.length+' probes; '+localOpen+' open rubrics; '+localAudio+' listening probes disabled pending validated audio; answer slots '+answerPositions.join('/'));
}
check(book.schemaVersion===1&&book.status==='expert-review-pending','feedback casebook status');
check(Array.isArray(book.cases)&&book.cases.length>=8,'not enough feedback cases');
const casesSeen=new Set(),counts={en:0,ru:0};
for(const c of book.cases||[]){
  check(!casesSeen.has(c.id),c.id+': duplicate case ID');casesSeen.add(c.id);
  check(['en','ru'].includes(c.language),c.id+': invalid language');
  if(c.language in counts)counts[c.language]++;
  check(allowedOutcomes.has(c.expected),c.id+': invalid expected judgment');
  const pilot=pilots.get(c.language);
  const step=pilot?.steps?.find(s=>s.id===c.taskId);
  check(!!step&&['guidedProduction','transfer'].includes(step.kind),c.id+': must refer to an open pilot task');
  check(nonblank(c.answer),c.id+': blank response');
  const feedback=c.feedback||{};
  for(const field of feedbackKeys)check(field==='priorityIssue' ? typeof feedback[field]==='string'&&feedback[field].length>=3 : nonblank(feedback[field]),c.id+': missing feedback field '+field);
  check(issueTypes.has(feedback.priorityIssue),c.id+': invalid feedback issue type');
  if(c.expected==='supported')check(feedback.priorityIssue==='none',c.id+': fully supported case should not fabricate an error');
  if(c.expected==='uncertain')check(feedback.priorityIssue==='notObservable',c.id+': uncertain case needs explicit uncertainty');
}
check(counts.en>=4&&counts.ru>=4,'feedback casebook should cover both languages');
for(const message of logs)console.log(message);
console.log('Feedback cases: '+(book.cases||[]).length+'; diagnostic tasks: '+questions+'; open tasks requiring review: '+open+'; audio pending review: '+audioUnavailable);
if(errors.length){
  console.error(errors.map(e=>'ERROR: '+e).join('\n'));
  process.exitCode=1;
}else console.log('Pedagogical diagnostics and response-review contracts: structurally valid, NOT released to learners.');
