#!/usr/bin/env node
/**
 * Validate planned Learn curricula and teaching pilots against the active
 * immutable content catalogs. Read-only: no UI change, no writes to user data.
 *
 * Usage: node scripts/validate-learn-pedagogy.mjs
 */
import {readFileSync} from 'node:fs';
const languages=['en','ru'];
const roles=new Set(['lexical-support','language-support','grammar-support','existing-practice','context']);
const stepKinds=new Set(['comprehension','notice','guidedProduction','transfer']);
const evidenceKinds=new Set(['comprehension','guidedProduction','independentProduction','transfer']);
const read=(file)=>JSON.parse(readFileSync(file,'utf8'));
const root='frontend/public/learn/';
export function validatePedagogicalArtifacts(lang,catalog,outline,pilot){
  const errors=[];
  const check=(condition,message)=>{if(!condition)errors.push(lang+': '+message)};
  check(outline.schemaVersion===1,'unsupported curriculum schema');
  check(outline.language===lang,'curriculum language mismatch');
  check(outline.status==='curriculum-draft','curriculum must remain draft pending pedagogical validation');
  check(Array.isArray(outline.objectives)&&outline.objectives.length>=4,'curriculum objectives missing');
  const objectives=outline.objectives||[];
  const byId=new Map(objectives.map(x=>[x.id,x]));
  check(byId.size===objectives.length,'duplicate objective ID');
  const existing=new Map();
  for(const type of ['words','phrases','readings','lessons','exercises']){
    for(const item of catalog[type]||[]) existing.set(item.id,{type,item});
  }
  let totalRefs=0;
  objectives.forEach((unit,i)=>{
    check(unit.id?.startsWith(lang+'-'),'objective with foreign-language ID');
    check(unit.order===i+1,'invalid objective order: '+unit.id);
    check(typeof unit.canDo==='string'&&unit.canDo.length>=35,'missing observable can-do: '+unit.id);
    check(typeof unit.scenario==='string'&&unit.scenario.length>=20,'missing learner scenario: '+unit.id);
    check(typeof unit.band==='string'&&unit.band.length>=2,'missing indicative band: '+unit.id);
    check(Array.isArray(unit.evidence)&&unit.evidence.includes('comprehension')&&unit.evidence.includes('transfer')&&unit.evidence.every(e=>evidenceKinds.has(e)),'missing/unknown evidence: '+unit.id);
    check(Array.isArray(unit.prerequisites),'missing prerequisite list: '+unit.id);
    for(const prereq of unit.prerequisites||[]){
      check(byId.has(prereq),'unknown prerequisite: '+prereq);
      if(byId.has(prereq))check(byId.get(prereq).order<unit.order,'prerequisite must precede: '+unit.id);
    }
    const assets=unit.assets||[];
    check(assets.length>=2,'objective lacks linked legacy assets: '+unit.id);
    check(new Set(assets.map(x=>x.id)).size===assets.length,'duplicate asset reference: '+unit.id);
    for(const a of assets){
      totalRefs++;
      const ref=existing.get(a.id);
      check(!!ref,'unknown legacy ID: '+a.id);
      if(ref)check(ref.item.language===lang,'asset from wrong language: '+a.id);
      check(roles.has(a.role),'unknown asset role: '+a.id);
      check(typeof a.note==='string'&&a.note.trim().length>=12,'asset role requires human explanation: '+a.id);
    }
  });
  check(pilot.schemaVersion===1,'unsupported pilot schema');
  check(pilot.language===lang,'pilot language mismatch');
  check(pilot.status==='editorial-review'&&pilot.runtimeEnabled===false,'pilot must stay inactive before review');
  check(byId.has(pilot.objectiveId),'pilot objective missing from curriculum');
  check(pilot.id===byId.get(pilot.objectiveId)?.pilotId,'pilot ID mismatch with curriculum');
  check(typeof pilot.canDo==='string'&&pilot.canDo.length>=35,'pilot missing goal');
  check(Array.isArray(pilot.dialogue)&&pilot.dialogue.length>=4,'pilot dialogue incomplete');
  check(Array.isArray(pilot.support?.glossary)&&pilot.support.glossary.length>=2,'pilot glossary missing');
  check(pilot.support?.visibility==='on-demand','translation/help must be requested, not shown by default');
  check(Array.isArray(pilot.steps),'pilot steps missing');
  const steps=pilot.steps||[];
  check(new Set(steps.map(x=>x.id)).size===steps.length,'duplicate pilot step IDs');
  for(const required of ['comprehension','notice','guidedProduction','transfer']){
    check(steps.some(x=>x.kind===required),'pilot must include '+required);
  }
  for(const step of steps){
    check(step.id?.startsWith(lang+'-'),'foreign-language pilot step: '+step.id);
    check(stepKinds.has(step.kind),'unknown step kind: '+step.kind);
    check(typeof step.prompt==='string'&&step.prompt.length>=25,'missing step prompt: '+step.id);
    if(step.kind==='comprehension'){
      check(step.evidence==='comprehension','comprehension evidence mislabeled: '+step.id);
      check(Array.isArray(step.choices)&&step.choices.length>=3,'insufficient choices: '+step.id);
      check(Number.isInteger(step.correctIndex)&&step.correctIndex>=0&&step.correctIndex<=(step.choices?.length??0)-1,'invalid correctIndex: '+step.id);
      check(new Set(step.choices).size===step.choices.length,'duplicate choices: '+step.id);
      check(typeof step.feedback==='string'&&step.feedback.length>=15,'missing teaching feedback: '+step.id);
    }else if(step.kind==='notice'){
      check(step.evidence==='practiceOnly','noticing is not competency evidence: '+step.id);
      check(typeof step.explanation==='string'&&step.explanation.length>=45,'incomplete explanation: '+step.id);
    }else{
      check(step.evidence===(step.kind==='transfer'?'transfer':'guidedProduction'),'incorrect production evidence: '+step.id);
      check(step.evaluation==='rubric-review-required','open-ended tasks cannot be auto-graded: '+step.id);
      check(Array.isArray(step.rubric)&&step.rubric.length>=3,'incomplete rubric: '+step.id);
      check(Array.isArray(step.exampleAnswers)&&step.exampleAnswers.length>=2,'missing alternative natural answers: '+step.id);
      check(Array.isArray(step.hints),'missing hint contract: '+step.id);
      if(step.kind==='transfer')check(step.hints.length===0,'transfer must initially be unassisted: '+step.id);
    }
  }
  check(Array.isArray(pilot.delayedReview?.afterDays)&&pilot.delayedReview.afterDays.length>=2,'review timing missing');
  check(pilot.delayedReview?.afterDays?.every((day,i,a)=>Number.isInteger(day)&&day>0&&(i===0||day>a[i-1])),'review timing invalid');
  check(pilot.delayedReview?.evidence==='delayedRecall','delayed review evidence must be distinct');
  check(Array.isArray(pilot.reviewGates)&&pilot.reviewGates.length>=3,'human editorial gates missing');
  return {errors,objectives:objectives.length,assetLinks:totalRefs,steps:steps.length};
}

let hasFailure=false;
for(const lang of languages){
  const c=read(root+lang+'.json');
  const outline=read(root+'pedagogy-v1/'+lang+'.json');
  const pilot=read(root+'pedagogy-v1/'+lang+'-pilot.json');
  const report=validatePedagogicalArtifacts(lang,c,outline,pilot);
  console.log(lang.toUpperCase()+': '+report.objectives+' objetivos, '+report.assetLinks+' referencias legado, '+report.steps+' passos no piloto; '+report.errors.length+' erros');
  for(const err of report.errors)console.error('ERROR: '+err);
  if(report.errors.length)hasFailure=true;
}
if(hasFailure)process.exitCode=1;
else console.log('2T Learn pedagogy drafts validated. Editorial approval and runtime integration are still pending.');
