#!/usr/bin/env node
/**
 * V17 draft CONTRACT validator only; never a learner grader or CEFR test.
 * Checks 474 original exercises, 30 stage mappings, 6 level-checkpoint
 * proposals, and 16 synthetic non-certification cases.
 */
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const fail=[];
const bad=(key,msg)=>fail.push(key+': '+msg);
const manifest=read('frontend/public/learn/progression-v12.json');
const map=read('docs/learn-avaliacao-etapas-v17.json');
const policy=read('docs/learn-avaliacao-politica-v17.json');
const fixtures=read('docs/learn-avaliacao-casos-v17.json');

// Runtime/editorial parity: no second, drifting copy of the 30 V17 proposals.
// This reads static TypeScript literal arrays as JSON; it never runs the browser
// module, accesses learners, or turns editorial examples into assessments.
const runtimeSource=readFileSync(resolve(root,'frontend/src/learn/progression-v17-content.ts'),'utf8');
const runtimeArray=name=>{
 const exp=new RegExp('export const '+name+':[^=]*=([\\s\\S]*?) as [A-Za-z0-9_]+\\[\\];');
 const found=runtimeSource.match(exp);
 if(!found){bad('runtime',name+' literal array missing');return [];}
 try{return JSON.parse(found[1]);}
 catch{bad('runtime',name+' is not parseable static JSON');return [];}
};
const runtimeScenarios=runtimeArray('v17Scenarios');
const runtimeCheckpoints=runtimeArray('v17Checkpoints');
const runtimeCompetencies=runtimeArray('v17Competencies');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
if(runtimeScenarios.length!==30||runtimeCheckpoints.length!==6||runtimeCompetencies.length!==7)
 bad('runtime','expected 30 scenarios, 6 checkpoints and 7 competencies');
for(const lang of ['en','ru']){
 for(const draft of map.stagePlans?.[lang]||[]){
  const r=runtimeScenarios.find(x=>x.id===draft.draftId);
  if(!r){bad(draft.draftId,'missing from runtime V17');continue;}
  for(const field of ['nodeId','language','sequence','level','canDoTarget','legacyStudyQuestionIds','independentScenarioPt','essentialCriteriaPt','evidenceCategory']){
   if(!same(r[field],draft[field]))bad(draft.draftId,'runtime/editorial mismatch: '+field);
  }
  if(r.public!==false)bad(draft.draftId,'runtime scenario publicly released');
 }
}
for(const draft of policy.levelCheckpoints||[]){
 const r=runtimeCheckpoints.find(x=>x.id===draft.draftId);
 if(!r){bad(draft.draftId,'missing runtime checkpoint');continue;}
 for(const field of ['language','level','afterStageNodeId','objectivePt'])
  if(!same(r[field],draft[field]))bad(draft.draftId,'runtime checkpoint mismatch: '+field);
 if(!same(r.tasks,draft.tasks?.map(({kind,promptPt})=>({kind,promptPt}))))
  bad(draft.draftId,'checkpoint task wording mismatch');
 if(r.public!==false||r.spokenReceptionStatus!==draft.spokenReception?.status||
    r.spokenProductionStatus!==draft.spokenProduction?.status||
    r.interactionStatus!==draft.interaction?.status)
  bad(draft.draftId,'checkpoint release or evidence status mismatch');
}
for(const c of policy.competencies||[]){
 const r=runtimeCompetencies.find(x=>x.id===c.id);
 if(!r||r.source!==c.evidence||r.invalidIf!==c.invalidIf)
  bad(c.id,'runtime competency evidence mismatch');
}

const seen=new Set();
const ids=new Set();
let legacyTotal=0,stageTotal=0,levelTotal=0,caseTotal=0;

for(const [name,data] of [['map',map],['policy',policy]]){
 if(data.schemaVersion!==1 || data.publicRelease!==false || data.cefrCertified!==false)bad(name,'release/schema flag');
}
if(map.recordType!=='learn_stage_assessment_drafts_v17')bad('map','recordType');
if(policy.recordType!=='learn_assessment_policy_v17')bad('policy','recordType');
if(manifest.publicRelease!==false || manifest.cefrCertified!==false)bad('manifest','unexpected V12 release');
const competencies=new Set((policy.competencies||[]).map(c=>c.id));
if(competencies.size!==7)bad('policy','expected seven separate competency dimensions');
for(const c of policy.competencies||[])if(!c.evidence||!c.invalidIf)bad('competency',c.id+' incomplete');
if(policy.trackedDimensions?.length!==3)bad('policy','expected study / task performance / recommendation');
if(policy.recommendationRules?.length!==7 || policy.recommendationRules?.some(x=>!x.id||!x.condition||!x.state))bad('policy','incomplete recommendation rules');
if(!policy.claimLimits?.noOverallLevelWithoutExternalValidation || !policy.claimLimits?.noConversionFromPercentToCefr || !policy.claimLimits?.listMissingCompetenciesSeparately)bad('policy','CEFR gate invalid');

for(const lang of ['en','ru']){
 const catalog=read('frontend/public/learn/'+lang+'.json');
 const stages=manifest.languageTracks[lang].stages;
 const rows=map.stagePlans?.[lang]||[];
 const levels=(policy.levelCheckpoints||[]).filter(x=>x.language===lang);
 legacyTotal+=catalog.exercises.length;
 if(catalog.exercises.length!==237)bad(lang,'expected 237 existing exercises');
 if(stages.length!==15||rows.length!==15||levels.length!==3)bad(lang,'15 stages and 3 checkpoints required');
 const catalogExerciseIds=new Set(catalog.exercises.map(x=>x.id));
 for(let i=0;i<rows.length;i++){
   const p=rows[i],s=stages[i],ref=p?.draftId||'missing-stage';
   stageTotal++;
   if(!s || p.nodeId!==s.nodeId||p.sequence!==s.sequence||p.level!==s.level||p.language!==lang)bad(ref,'V12 stage mismatch');
   if(p.public!==false || p.reviewStatus!=='awaiting_independent_teacher_approval'||p.legacyStudyNotMastery!==true)bad(ref,'unsafe release/mastery flag');
   if(!p.independentScenarioPt?.trim() || p.essentialCriteriaPt?.length!==2 || p.essentialCriteriaPt.some(x=>!x.trim()))bad(ref,'independent rubric incomplete');
   if(!p.assessmentMode?.startsWith('proposed_'))bad(ref,'wrong assessment status');
   if(!competencies.has(p.evidenceCategory))bad(ref,'competency not in policy');
   if(seen.has(ref)||catalogExerciseIds.has(ref))bad(ref,'duplicate ID');
   seen.add(ref);
   const expected=[...(s?.grammarQuestionIds||[]),...(s?.readingQuestionIds||[])];
   if(expected.length!==6 || JSON.stringify(p.legacyStudyQuestionIds)!==JSON.stringify(expected))bad(ref,'legacy question mapping changed');
   if(expected.some(x=>!catalogExerciseIds.has(x)))bad(ref,'missing source catalog exercise');
   if(p.legacyReadingId!==s?.pairedReadingId)bad(ref,'paired reading mismatch');
 }
 const checkpointStages={A1:4,A2:10,B1:15};
 for(const x of levels){
   levelTotal++;
   if(seen.has(x.draftId)||catalogExerciseIds.has(x.draftId))bad(x.draftId,'ID duplicate');
   seen.add(x.draftId);
   const n=checkpointStages[x.level];
   if(x.afterStageNodeId!==lang+'-path-'+String(n).padStart(2,'0'))bad(x.draftId,'checkpoint stage mismatch');
   if(x.tasks?.length!==3 || x.tasks.map(y=>y.kind).join('|')!=='written_reception|written_production|retention_transfer')bad(x.draftId,'checkpoint tasks mismatch');
   if(!x.tasks?.every(y=>y.promptPt?.trim()))bad(x.draftId,'missing task prompt');
   if(x.public!==false||x.reviewStatus!=='awaiting_independent_teacher_approval')bad(x.draftId,'unsafe review/public flag');
   if(x.spokenReception?.status!=='not_assessed_until_validated_recording'||x.spokenProduction?.status!=='not_assessed_in_current_product'||x.interaction?.status!=='not_assessed_in_current_product')bad(x.draftId,'missing skill limitation');
 }
}
if(legacyTotal!==474||stageTotal!==30||levelTotal!==6)bad('totals','expected 474 / 30 / 6');
if(fixtures.recordType!=='learn_progression_assessment_synthetic_cases_v17'||fixtures.appliedToRealLearners!==false||fixtures.public!==false||fixtures.noStoredPersonalData!==true)bad('fixtures','unsafe metadata');

const classifySynthetic=c=>{
 const f=c.facts||{};
 const result={study:'not_started',performance:'not_assessed',claim:'no_level_claim'};
 if(f.sourceType==='legacy_attempt'){
   if(!f.targetLanguage || f.targetLanguage===f.sourceLanguage){
     if(f.allStageQuestionsAnswered||f.sixDistinctItemsAnswered||f.distinctItemIds===6)result.study='activities_answered';
     else if((f.distinctItemIds||0)>0||(f.sameItemIdRepeated||0)>0)result.study='in_progress';
   }
   return result;
 }
 if(f.reviewStatus==='disagreement'||(f.reviewStatus==='pending'&&f.outcome==='uncertain')){
   result.performance='awaiting_review';
   return result;
 }
 if(f.sourceType==='approved_recorded_listening')return result; // No fixture claims verified, independent approved audio
 if(f.teacherApproved===true&&f.reviewStatus==='reviewed'&&f.independentContext===true&&f.assistanceShown===false&&
   (!f.sourceVersion||!f.currentVersion||f.sourceVersion===f.currentVersion)){
   if(f.outcome==='supported')result.performance='supported_for_observed_task';
   if(f.outcome==='needs_practice'){result.performance='needs_practice';result.recommendation='review_recommended';}
 }
 return result;
};
for(const c of fixtures.cases||[]){
 caseTotal++;
 if(!['en','ru'].includes(c.language)||!c.labelPt||!c.reason||!c.expected)bad(c.id,'incomplete fixture');
 if(ids.has(c.id))bad(c.id,'duplicate fixture ID');
 ids.add(c.id);
 const outcome=classifySynthetic(c);
 for(const [k,value]of Object.entries(c.expected||{}))if(outcome[k]!==value)bad(c.id,k+' expected '+value+' received '+outcome[k]);
 if(c.expected.claim!=='no_level_claim')bad(c.id,'unexpected level claim');
}
if(caseTotal!==16||ids.size!==16)bad('fixtures','expected 16 unique cases');
const result={ok:fail.length===0,legacyExercises:legacyTotal,stages:stageTotal,levelCheckpoints:levelTotal,syntheticCases:caseTotal,scope:'editorial_contract_only'};
if(fail.length){result.errors=fail;console.error(JSON.stringify(result,null,2));process.exitCode=1;}
else console.log(JSON.stringify(result,null,2));
