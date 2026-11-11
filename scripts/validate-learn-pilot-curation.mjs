#!/usr/bin/env node
/**
 * Validate review of real legacy Learn assets for the first two teaching pilots.
 * This is a curation integrity check, NOT an independent linguistic approval.
 * Zero modifications to learner data, historical IDs or active UI.
 */
import {readFileSync} from 'node:fs';
const base='frontend/public/learn/';
const load=p=>JSON.parse(readFileSync(base+p+'.json','utf8'));
const curation=load('pedagogy-v1/pilot-asset-curation');
const allowed=new Set(['reuse','support_only','needs_revision','defer']);
const slots={
  reuse:new Set(['input-gloss','guided-practice']),
  support_only:new Set(['optional-reference','contrast']),
  needs_revision:new Set(['revision-queue']),
  defer:new Set(['not-in-pilot'])
};
const errors=[];
const check=(c,message)=>{if(!c)errors.push(message)};
check(curation.schemaVersion===1&&curation.status==='editorial-preselection','curation must be an explicit editorial draft');
check(curation.runtimeEnabled===false,'draft must be inactive');
let reviewedCount=0,linkedCount=0;
for(const lang of ['en','ru']){
  const catalog=load(lang),curriculum=load('pedagogy-v1/'+lang);
  const data=curation.languages?.[lang],objectiveId=curation.objectiveByLanguage?.[lang];
  const objective=curriculum.objectives.find(o=>o.id===objectiveId);
  const sourceById=new Map(['words','phrases','readings','lessons','exercises']
    .flatMap(kind=>(catalog[kind]||[]).map(item=>[item.id,{kind,item}])));
  check(data?.reviewStatus==='internal-editorial-review-only',lang+': review must not claim independent approval');
  check(!!objective,lang+': pilot curriculum objective missing');
  const linked=new Set((objective?.assets||[]).map(x=>x.id));
  const decisions=data?.decisions||[];
  check(decisions.length>=15,lang+': insufficient individual curation');
  const unique=new Set();
  const count={reuse:0,support_only:0,needs_revision:0,defer:0};
  for(const d of decisions){
    reviewedCount++;
    check(!unique.has(d.id),lang+': duplicate decision for '+d.id);
    unique.add(d.id);
    const source=sourceById.get(d.id);
    check(!!source,lang+': legacy reference missing '+d.id);
    check(source?.item.language===lang,lang+': foreign language reference '+d.id);
    check(allowed.has(d.decision),lang+': unsupported decision '+d.id);
    check(slots[d.decision]?.has(d.slot),lang+': invalid pedagogical role '+d.id);
    check(typeof d.why==='string'&&d.why.trim().length>=65,lang+': missing specific pedagogical justification '+d.id);
    check(d.countsAsIndependentCompetence===false,lang+': a legacy drill cannot be independent-competence evidence '+d.id);
    if(d.decision==='reuse'){
      check(linked.has(d.id),lang+': reused item lacks explicit curriculum objective link '+d.id);
      linkedCount++;
      count.reuse++;
    } else if(d.decision==='defer'||d.decision==='needs_revision'){
      check(!linked.has(d.id),lang+': deferred or unreviewed item must not be linked to active pilot objective '+d.id);
      count[d.decision]++;
    } else count.support_only++;
    if(d.decision==='needs_revision'){
      check(typeof d.nextAction==='string'&&d.nextAction.trim().length>=65,lang+': unclear revision action for '+d.id);
    } else {
      check(d.nextAction===undefined,lang+': unsupported nextAction on non-revision item '+d.id);
    }
  }
  check(count.reuse>=4&&count.deferred!==0,lang+': expected reuse and explicit editorial decisions');
  check(count.defer>=4&&count.support_only>=4,lang+': require genuine editorial selection, not automatic linking');
  console.log(lang.toUpperCase()+': '+decisions.length+' manually reviewed candidates | '+JSON.stringify(count)+' | '+count.reuse+' reuse entries linked to objective');
}
if(errors.length){
  console.error(errors.map(x=>'ERROR: '+x).join('\n'));
  process.exitCode=1;
}else {
  console.log('Curation structure checked: '+reviewedCount+' specific legacy decisions, '+linkedCount+' pilot reuse entries verified.');
  console.log('Human language review and learner testing remain mandatory before activation.');
}
