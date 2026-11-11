#!/usr/bin/env node
/**
 * 2T Learn delayed retrieval and contextual-transfer content audit.
 * Structural integrity only. Delays and linguistic accuracy are NOT validated.
 */
import {readFileSync} from 'node:fs';
const root='frontend/public/learn/pedagogy-v1/';
const read=n=>JSON.parse(readFileSync(root+n+'.json','utf8'));
const data=read('pilot-delayed-probes');
const errors=[];const check=(c,message)=>{if(!c)errors.push(message)};
check(data.schemaVersion===1&&data.status==='pedagogical-review'&&data.runtimeEnabled===false,'Follow-up probes must remain editorial drafts');
check(data.measurementPolicy?.incompleteOrMissedProbe?.includes('notAssessed'),'Missing work must not be scored as learner failure');
check(data.measurementPolicy?.previousPracticeConfound?.includes('day-2'),'Day-2 review affects subsequent retention; document confounding');
check(data.measurementPolicy?.assistancePolicy?.includes('lexical cue'),'Lexical scaffolding cannot be treated as fully unassisted');
check(data.releaseConditions?.length>=4,'Human review and release gates missing');
const tasks=new Set(),probeIDs=new Set();
const normalize=s=>String(s||'').normalize('NFC').toLocaleLowerCase().replace(/\s+/gu,' ').trim();
for(const lang of ['en','ru']){
  const pilot=read(lang+'-pilot');
  const diagnostic=read(lang+'-diagnostic');
  const curriculum=read(lang);
  const objectives=new Set(curriculum.objectives.map(o=>o.id));
  const tests=(data.probes||[]).filter(p=>p.language===lang);
  check(tests.length===2,lang+': expected two interval probes');
  check(JSON.stringify(tests.map(p=>p.timing.recommendedDelayDays))===JSON.stringify([2,7]),lang+': incorrect follow-up order');
  const existingPrompts=new Set([
    ...pilot.steps.map(x=>normalize(x.prompt)),
    ...diagnostic.questions.map(x=>normalize(x.promptPt))
  ]);
  const previousContexts=new Set();
  for(const p of tests){
    check(!probeIDs.has(p.id),p.id+': duplicate probe ID');probeIDs.add(p.id);
    check(p.id.startsWith(lang+'-'),p.id+': wrong-language probe ID');
    check(p.pilotId===pilot.id,p.id+': pilot reference mismatch');
    check(objectives.has(p.objectiveId),p.id+': objective not in curriculum');
    check(p.runtimeEnabled===false&&p.editorialStatus==='needs-language-and-learner-review',p.id+': must not be active without language review');
    check(p.timing?.intervalIsNotValidated===true,p.id+': intervals not yet empirically calibrated');
    check(p.timing?.clockStartsFrom==='completion of teaching pilot',p.id+': review clock unclear');
    check(typeof p.scenarioPt==='string'&&p.scenarioPt.length>=50,p.id+': missing changed scenario');
    check(!previousContexts.has(normalize(p.scenarioPt)),p.id+': scenario reused from another interval');
    previousContexts.add(normalize(p.scenarioPt));
    check(p.stimulus?.type==='written'&&p.stimulus.mediaAvailable===false,p.id+': not an audio test');
    check(typeof p.stimulus?.text==='string'&&p.stimulus.text.length>=50,p.id+': written context missing');
    const c=p.readingComprehension||{};
    const w=p.writtenTransfer||{};
    check(c.id===p.id+'-read'&&w.id===p.id+'-write',p.id+': task IDs inconsistent');
    for(const id of [c.id,w.id]){
      check(!tasks.has(id),p.id+': reused task ID '+id);
      tasks.add(id);
    }
    check(typeof c.promptPt==='string'&&c.promptPt.length>=25,p.id+': no reading question');
    check(Array.isArray(c.choices)&&c.choices.length===3&&new Set(c.choices).size===3,p.id+': invalid reading distractors');
    check(Number.isInteger(c.correctIndex)&&c.correctIndex>=0&&c.correctIndex<3,p.id+': invalid reading key');
    check(typeof c.explanationPt==='string'&&c.explanationPt.length>=50,p.id+': missing comprehension feedback');
    check(c.evidence==='comprehension',p.id+': reading mislabels evidence');
    check(w.language===lang&&w.answerMode==='open',p.id+': open task language/mode invalid');
    check(w.evaluation==='rubricWithReview'&&w.evidence==='delayedRecall',p.id+': written task must require review');
    check(w.modelHiddenDuringAttempt===true&&w.hintsDuringAttempt===false,p.id+': model or hints must not be visible');
    check(typeof w.promptPt==='string'&&w.promptPt.length>=75,p.id+': task scenario incomplete');
    check(!existingPrompts.has(normalize(w.promptPt)),p.id+': repeated prompt from pilot or diagnosis');
    check(Array.isArray(w.examplesAfterAttempt)&&w.examplesAfterAttempt.length>=2&&new Set(w.examplesAfterAttempt).size===w.examplesAfterAttempt.length,p.id+': legitimate variants missing');
    check(Array.isArray(w.essentialMeaning)&&w.essentialMeaning.length>=3,p.id+': communication rubric incomplete');
    check(Array.isArray(w.feedbackCases)&&w.feedbackCases.length>=2,p.id+': no diagnostic feedback examples');
    check(new Set(w.feedbackCases?.map(x=>x.issue)).size===w.feedbackCases.length,p.id+': repeated feedback issue');
    for(const f of w.feedbackCases||[]){
      check(typeof f.response==='string'&&f.response.length>=10,p.id+': illustrative response missing');
      check(typeof f.feedbackPt==='string'&&f.feedbackPt.length>=70,p.id+': corrective feedback too vague');
    }
    check(typeof w.evaluationLimitPt==='string'&&w.evaluationLimitPt.length>=70,p.id+': limitation statement missing');
    if(lang==='ru'){
      check(w.lexicalCue?.targetWord&&w.lexicalCue?.translationPt,p.id+': Russian destination requires declared lexical cue');
      check(w.assistanceToRecord?.includes('lexical-cue'),p.id+': Russian cue not recorded');
      check(w.evaluationLimitPt.includes('não produção totalmente sem apoio'),p.id+': do not inflate independent proficiency');
    }else{
      check(w.lexicalCue===null&&w.assistanceToRecord.length===0,p.id+': unadvertised English lexical scaffolding');
    }
  }
  console.log(lang.toUpperCase()+': '+tests.length+' delayed review occasions; '+tests.length*2+' separate comprehension/writing items');
}
check(probeIDs.size===4&&tasks.size===8,'Expected four follow-up probes and eight unique tasks');
if(errors.length){console.error(errors.map(x=>'ERROR: '+x).join('\n'));process.exitCode=1}
else console.log('Delayed probe contracts valid; review timing and language quality NOT clinically or pedagogically validated.');
