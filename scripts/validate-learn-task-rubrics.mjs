#!/usr/bin/env node
/**
 * Validate per-task human-review rubrics for two Learn pilots.
 * Strictly structural; it cannot certify linguistic validity or grade users.
 */
import {readFileSync} from 'node:fs';
const root='frontend/public/learn/pedagogy-v1/';
const read=n=>JSON.parse(readFileSync(root+n+'.json','utf8'));
const errors=[];const assert=(ok,m)=>{if(!ok)errors.push(m)};
const data=read('pilot-task-rubrics'),policy=read('evaluation-policy');
const statuses=new Set(policy.outcomes);
assert(data.schemaVersion===1&&data.status==='editorial-draft'&&data.runtimeEnabled===false,'Rubrics must remain unreleased editorial drafts');
assert(data.policyFile==='evaluation-policy.json','Rubric policy reference invalid');
assert(policy.safetyAndPrivacy?.autoGradingOpenResponses==='disabled','Open answers must not be graded automatically');
assert(Array.isArray(data.rubrics)&&data.rubrics.length===4,'Expected exactly four approved pilot task references');
const taskSet=new Set(),counts={en:0,ru:0};
for(const lang of ['en','ru']){
 const pilot=read(lang+'-pilot'),entries=data.rubrics.filter(x=>x.language===lang);
 assert(entries.length===2,lang+': needs guided-production and transfer criteria');
 assert(entries.some(x=>x.kind==='guidedProduction')&&entries.some(x=>x.kind==='transfer'),lang+': task kinds incomplete');
 for(const rubric of entries){
   assert(rubric.pilotId===pilot.id,lang+': wrong pilot reference in '+rubric.taskId);
   const task=pilot.steps.find(x=>x.id===rubric.taskId);
   assert(!!task&&task.kind===rubric.kind,lang+': missing/mismatched task '+rubric.taskId);
   assert(task?.evaluation==='rubric-review-required',lang+': task must require human/rubric review');
   assert(!taskSet.has(rubric.taskId),lang+': duplicate rubric '+rubric.taskId);
   taskSet.add(rubric.taskId);counts[lang]++;
   assert(rubric.reviewState==='requires-linguistic-and-learner-review',lang+': review must remain pending');
   assert(rubric.correctionMode==='rubricWithReview',lang+': open response auto-grade prohibited');
   assert(rubric.conditions?.modelHiddenDuringAttempt===(rubric.kind==='transfer'),lang+': improper model-visibility policy');
   assert(rubric.conditions?.hintsAllowed===(rubric.kind==='guidedProduction'),lang+': improper hints policy');
   assert(rubric.conditions?.assistanceMustBeRecorded===true,lang+': assistance must be recorded');
   assert(rubric.conditions?.doesNotAssess?.includes('pronunciation'),lang+': no speech evaluation without evidence');
   assert(Array.isArray(rubric.criteria)&&rubric.criteria.length>=3,lang+': missing criteria');
   assert(rubric.criteria?.filter(x=>x.essential).length>=2,lang+': essential criteria not defined');
   assert(new Set(rubric.criteria?.map(x=>x.code)).size===rubric.criteria.length,lang+': duplicate criterion codes');
   for(const criterion of rubric.criteria||[]){
     assert(typeof criterion.descriptionPt==='string'&&criterion.descriptionPt.trim().length>=55,lang+': criterion not explained '+criterion.code);
   }
   assert(Array.isArray(rubric.feedbackByIssue)&&rubric.feedbackByIssue.length>=3,lang+': insufficient targeted feedback');
   assert(new Set(rubric.feedbackByIssue?.map(x=>x.code)).size===rubric.feedbackByIssue.length,lang+': repeated feedback issue');
   for(const feedback of rubric.feedbackByIssue||[]){
     assert(typeof feedback.howToHelpPt==='string'&&feedback.howToHelpPt.length>=55,lang+': feedback not explained');
     assert(typeof feedback.nextAttemptPt==='string'&&feedback.nextAttemptPt.length>=50,lang+': no follow-up task');
   }
   const cases=rubric.calibrationExamples||[];
   assert(cases.length>=4,lang+': insufficient positive and counterexample cases');
   assert(cases.filter(x=>x.suggestedOutcome==='supported').length>=2,lang+': need at least two valid variants');
   assert(cases.some(x=>x.suggestedOutcome!=='supported'),lang+': no negative/partial example');
   assert(new Set(cases.map(x=>x.response.normalize('NFC').trim())).size===cases.length,lang+': duplicate calibration answer');
   for(const ex of cases){
     assert(ex.requiresHumanReview===true,lang+': no deterministic verdict on free answer');
     assert(statuses.has(ex.suggestedOutcome),lang+': unknown expected outcome '+ex.suggestedOutcome);
     assert(typeof ex.response==='string'&&ex.response.length>=9,lang+': sample response too short');
     assert(typeof ex.reasonPt==='string'&&ex.reasonPt.length>=55,lang+': case rationale missing');
   }
 }
}
assert(taskSet.size===4,'Four unique guided/transfer tasks must be covered');
assert(Array.isArray(data.releaseGates)&&data.releaseGates.length>=4,'Editorial release controls missing');
console.log('Learn rubric contract: '+taskSet.size+' pilot tasks, '+data.rubrics.reduce((a,r)=>a+r.calibrationExamples.length,0)+' response cases, languages '+JSON.stringify(counts));
if(errors.length){console.error(errors.map(x=>'ERROR: '+x).join('\n'));process.exitCode=1}
else console.log('Structurally valid, NOT language-certified or enabled for students.');
