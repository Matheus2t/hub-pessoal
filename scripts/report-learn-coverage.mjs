#!/usr/bin/env node
/**
 * 2T Learn — read-only curriculum traceability.
 * Full list of legacy IDs can be emitted with --json (no generated assets).
 * Every unlinked item is 'unclassified', NOT 'irrelevant' or 'failed'.
 * --check validates references but does not require 100% mapping prematurely.
 */
import {readFileSync} from 'node:fs';
const root='frontend/public/learn/';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const kinds=['words','phrases','readings','lessons','exercises'];
const errors=[];
const reports=[];
const countBy=(arr,field)=>arr.reduce((acc,item)=>(acc[item[field]??'unknown']=(acc[item[field]??'unknown']||0)+1,acc),{});
for(const lang of ['en','ru']){
  const catalog=read(root+lang+'.json');
  const outline=read(root+'pedagogy-v1/'+lang+'.json');
  const legacy=new Map();
  for(const kind of kinds){
    for(const item of catalog[kind]||[]){
      if(legacy.has(item.id))errors.push(lang+': duplicate global ID '+item.id);
      legacy.set(item.id,{...item,kind});
    }
  }
  const linked=new Map();
  let refCount=0;
  for(const objective of outline.objectives||[]){
    for(const asset of objective.assets||[]){
      refCount++;
      const item=legacy.get(asset.id);
      if(!item){errors.push(lang+': orphan reference '+asset.id+' from '+objective.id);continue;}
      if(item.language!==lang)errors.push(lang+': foreign-language reference '+asset.id);
      const refs=linked.get(asset.id)||[];
      refs.push({objectiveId:objective.id,role:asset.role,note:asset.note});
      linked.set(asset.id,refs);
    }
  }
  const items=[...legacy.values()].map(item=>({
    id:item.id,
    kind:item.kind,
    level:item.level??null,
    topic:item.topic??null,
    skill:item.skill??null,
    mappingStatus:linked.has(item.id)?'mapped-as-support':'unclassified',
    objectiveRefs:linked.get(item.id)||[]
  }));
  const byKind=Object.fromEntries(kinds.map(kind=>{
    const kindItems=items.filter(item=>item.kind===kind);
    const mapped=kindItems.filter(item=>item.mappingStatus==='mapped-as-support').length;
    return [kind,{total:kindItems.length,mapped,unclassified:kindItems.length-mapped}];
  }));
  const exercises=items.filter(item=>item.kind==='exercises');
  const unmapped=exercises.filter(item=>item.mappingStatus==='unclassified');
  const bySkill=Object.fromEntries([...new Set(exercises.map(x=>x.skill))].sort().map(skill=>{
    const arr=exercises.filter(x=>x.skill===skill);
    return [skill,{total:arr.length,mapped:arr.filter(x=>x.mappingStatus==='mapped-as-support').length}];
  }));
  const unmappedByTopic=countBy(unmapped,'topic');
  const candidateTopics=lang==='en'
    ? ['Cumprimentos','Família e pessoas','Trabalho e estudos','Conversas']
    : ['Transporte e viagens','Transporte','Viagens'];
  const candidateReviewQueue=items.filter(x=>x.mappingStatus==='unclassified'&&candidateTopics.includes(x.topic)).map(x=>({
    id:x.id,kind:x.kind,topic:x.topic,level:x.level,skill:x.skill
  }));
  reports.push({
    language:lang,
    source:root+lang+'.json',
    curriculumOutline:root+'pedagogy-v1/'+lang+'.json',
    totalLegacyItems:items.length,totalReferences:refCount,distinctMappedItems:linked.size,
    note:'Mapping status means an objective support link exists; it does NOT claim communicative competence or CEFR alignment.',
    byKind,exercisesBySkill:bySkill,unclassifiedExerciseTopics:unmappedByTopic,
    pilotCandidateTopics:candidateTopics,
    pilotCandidatesForHumanReview:candidateReviewQueue,
    items
  });
}
if(process.argv.includes('--json'))console.log(JSON.stringify({schemaVersion:1,reports,errors},null,2));
else for(const r of reports){
  console.log(r.language.toUpperCase()+': '+r.distinctMappedItems+'/'+r.totalLegacyItems+' unique legacy IDs linked to objectives ('+r.totalReferences+' references)');
  console.log('  '+Object.entries(r.byKind).map(([kind,v])=>kind+': '+v.mapped+'/'+v.total).join(' | '));
  console.log('  '+Object.entries(r.exercisesBySkill).map(([kind,v])=>kind+': '+v.mapped+'/'+v.total).join(' | '));
  console.log('  Pilot review candidates in topic groups: '+r.pilotCandidatesForHumanReview.length+' (NOT automatically linked)');
}
if(errors.length){
  console.error(errors.map(x=>'ERROR: '+x).join('\n'));
  if(process.argv.includes('--check'))process.exitCode=1;
}else if(!process.argv.includes('--json'))console.log('Coverage report OK. Unclassified items remain available in the legacy Learn.');
