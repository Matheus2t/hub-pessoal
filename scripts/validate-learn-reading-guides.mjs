#!/usr/bin/env node
/**
 * Validate editorial (not yet released) reading guides and assessment isolation.
 * Existing Learn content and student data are read-only.
 * Successful checks do NOT imply CEFR classification or expert linguistic approval.
 */
import {readFileSync} from 'node:fs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const base='frontend/public/learn/';
const errors=[];
const fail=(ok,msg)=>{if(!ok)errors.push(msg);};
for(const lang of ['en','ru']){
  const catalog=read(base+lang+'.json');
  const outline=read(base+'pedagogy-v1/'+lang+'.json');
  const pilot=read(base+'pedagogy-v1/'+lang+'-pilot.json');
  const diagnostic=read(base+'pedagogy-v1/'+lang+'-diagnostic.json');
  const guide=read(base+'pedagogy-v1/'+lang+'-reading-guide.json');
  const objectiveIds=new Set((outline.objectives||[]).map(x=>x.id));
  const original=catalog.readings.find(x=>x.id===guide.sourceReadingId);
  fail(guide.schemaVersion===1&&guide.language===lang,lang+': invalid guide schema or language');
  fail(guide.status==='editorial-review'&&guide.runtimeEnabled===false,lang+': draft guide must be inactive');
  fail(guide.levelInterpretation?.notCertified===true,lang+': guide must not certify CEFR');
  fail(objectiveIds.has(guide.objectiveId),lang+': reading guide objective absent from curriculum');
  fail(!!original&&original.language===lang,lang+': source reading not found');
  fail(guide.beforeReading?.translationInitiallyVisible===false,lang+': do not reveal full translation by default');
  fail(Array.isArray(guide.chunks)&&guide.chunks.length>=3,lang+': needs contextual excerpts');
  const chunks=guide.chunks||[];
  const foundQuotes=new Set();
  for(const chunk of chunks){
    fail(typeof chunk.sourceQuote==='string'&&original?.text?.includes(chunk.sourceQuote),lang+': chunk quote not found exactly in original');
    fail(!foundQuotes.has(chunk.sourceQuote),lang+': duplicate excerpt');
    foundQuotes.add(chunk.sourceQuote);
    fail(typeof chunk.explanationPt==='string'&&chunk.explanationPt.length>=70,lang+': insufficient chunk explanation');
    fail(Array.isArray(chunk.helpOnDemand)&&chunk.helpOnDemand.length>=2,lang+': excerpt must support help on request');
  }
  fail(Array.isArray(guide.legacyQuestionIds)&&guide.legacyQuestionIds.length===original?.questionIds?.length,
      lang+': old reading questions must be referenced without changing IDs');
  for(const id of original?.questionIds||[]){
    fail(guide.legacyQuestionIds?.includes(id),lang+': original question missing in guide: '+id);
    fail(catalog.exercises.some(e=>e.id===id&&e.unitId===original.id),lang+': old reading question orphaned: '+id);
  }
  const after=guide.afterReading||{},closed=after.closedProbe||{},open=after.writtenApplication||{};
  fail(typeof after.newText==='string'&&after.newText.length>=35&&after.newText!==original?.text,lang+': independent reading context missing');
  fail(typeof after.contextChange==='string'&&after.contextChange.length>=30,lang+': transfer context not explained');
  fail(Array.isArray(closed.choices)&&closed.choices.length===3&&new Set(closed.choices).size===3,lang+': new reading probe choices invalid');
  fail(Number.isInteger(closed.correctIndex)&&closed.correctIndex>=0&&closed.correctIndex<3,lang+': invalid correct answer');
  fail(typeof closed.why==='string'&&closed.why.length>=50,lang+': new reading probe requires explanation');
  fail(open.assessment==='rubricWithReview'&&open.helpInitiallyVisible===false,lang+': open responses cannot be auto-graded or model-led');
  fail(Array.isArray(open.requiredMeaning)&&open.requiredMeaning.length>=2,lang+': production criteria missing');
  fail(Array.isArray(open.examplesAfterAttempt)&&open.examplesAfterAttempt.length>=2,lang+': alternative valid answers missing');
  fail(typeof open.feedbackPrinciple==='string'&&open.feedbackPrinciple.length>=45,lang+': targeted feedback policy absent');
  fail(Array.isArray(guide.reviewFlags)&&guide.reviewFlags.length>=3,lang+': editorial gate missing');
  const newIDs=[closed.id,open.id];
  fail(newIDs.every(id=>typeof id==='string'&&id.startsWith(lang+'-')&&!catalog.exercises.some(e=>e.id===id)),
      lang+': new diagnostic tasks must not reuse legacy IDs');
  const separation=diagnostic.assessmentIntegrity||{};
  fail(separation.reviewStatus==='editorial-review-required',lang+': diagnostic must not be labelled validated');
  fail(separation.pilotReference===pilot.id,lang+': wrong training pilot for diagnostic');
  fail(typeof separation.diagnosticDistinctContext==='string'&&separation.diagnosticDistinctContext.length>=10,
      lang+': diagnostic context separation unspecified');
  const pilotPrompts=new Set(pilot.steps.map(x=>x.prompt.toLowerCase().replace(/\s+/g,' ').trim()));
  fail((diagnostic.questions||[]).every(x=>!pilotPrompts.has(x.promptPt?.toLowerCase().replace(/\s+/g,' ').trim())),
      lang+': verbatim task prompt reused from training pilot');
  console.log(lang.toUpperCase()+': 1 contextual reading guide, '+chunks.length+' anchored excerpts, 1 novel reading probe, 1 reviewed open task; diagnostic scenario separation recorded');
}
if(errors.length){
  console.error(errors.map(x=>'ERROR: '+x).join('\n'));
  process.exitCode=1;
}else console.log('Learn reading/assessment editorial contracts valid. Human-language and learner validation still required.');
