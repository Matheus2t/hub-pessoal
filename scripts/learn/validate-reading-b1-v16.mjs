#!/usr/bin/env node
// V16 — Structural-only validation. NOT independent CEFR/pedagogical approval.
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const errors = [];
const fail = (where, why) => errors.push(where + ': ' + why);
const progression = read('frontend/public/learn/progression-v12.json');
const allNewIds = new Set();
const keys = new Set();
let readingCount = 0, questionCount = 0, transferCount = 0, legacyCount = 0;

for (const lang of ['en', 'ru']) {
  const catalog = read('frontend/public/learn/' + lang + '.json');
  const content = read('docs/learn-leitura-b1-v16-' + lang + '.json');
  legacyCount += catalog.exercises.length;
  if (catalog.exercises.length !== 237) fail(lang, 'legacy count is not 237');
  if (content.language !== lang || content.schemaVersion !== 1 ||
    content.recordType !== 'learn_b1_reading_interpretation_editorial_v16') fail(lang, 'metadata');
  if (content.publicRelease !== false || content.cefrCertified !== false) fail(lang, 'publication flag');
  if (content.units?.length !== 5) fail(lang, 'must have five B1 readings');
  const legacyIds = new Set([
    ...catalog.exercises.map(x=>x.id),
    ...catalog.readings.map(x=>x.id),
    ...catalog.words.map(x=>x.id),
    ...(catalog.lessons || []).map(x=>x.id)
  ]);
  const stages = progression.languageTracks[lang].stages.filter(s => s.level === 'B1');
  for (let i = 0; i < (content.units || []).length; i++) {
    const u = content.units[i];
    const id = u.draftId || 'missing-id';
    readingCount++;
    if (u.language !== lang || u.level !== 'B1' || u.public !== false ||
      u.reviewStatus !== 'draft_requires_independent_language_and_pedagogical_review') fail(id, 'review/publication flags');
    if (!new RegExp('^' + lang + '-reading-b1-v16-[0-9]{2}$').test(id)) fail(id, 'draft ID pattern');
    if (allNewIds.has(id) || legacyIds.has(id)) fail(id, 'ID collision');
    allNewIds.add(id);
    const original = catalog.readings.find(x => x.id === u.legacyReadingId && x.level === 'B1');
    if (!original) fail(id, 'missing original B1 reading');
    const stage = stages.find(x => x.nodeId === u.linkedStageNodeId);
    if (!stage || stage.pairedReadingId !== u.legacyReadingId) fail(id, 'V12 stage/legacy mismatch');
    if (!u.title || !u.text?.trim() || u.text.split(/\s+/).length < (lang === 'en' ? 100 : 90)) fail(id, 'reading text missing/too short for integrity floor');
    if (u.questions?.length !== 4) fail(id, 'expected 4 questions');
    const competencies = ['main_idea', 'evidence_based_inference', 'constraint_or_detail', 'synthesis'];
    for (let j = 0; j < (u.questions || []).length; j++) {
      const q = u.questions[j];
      questionCount++;
      if (q.competency !== competencies[j]) fail(q.draftId, 'question order/competency');
      if (!q.draftId?.startsWith(id + '-q') || allNewIds.has(q.draftId) || legacyIds.has(q.draftId)) fail(q.draftId, 'question ID collision');
      allNewIds.add(q.draftId);
      if (!q.promptPt?.trim() || !q.explanationPt?.trim() || !q.evidenceSpans?.length ||
        q.evidenceSpans.some(s => !u.text.includes(s))) fail(q.draftId, 'missing/mismatched evidence');
      if (q.public !== false || q.independentTeacherApprovalRequired !== true ||
        q.feedbackVisibleOnlyAfterSubmission !== true) fail(q.draftId, 'review and answer-leak flags');
      if (j % 2 === 0) {
        if (q.kind !== 'single_choice' || q.optionsPt?.length !== 3 ||
          new Set(q.optionsPt.map(x=>x.id)).size !== 3 ||
          new Set(q.optionsPt.map(x=>x.label)).size !== 3 ||
          !q.optionsPt.some(x=>x.id===q.correctOptionId)) fail(q.draftId, 'invalid choices');
        keys.add(q.correctOptionId);
      } else {
        if (q.kind !== 'open_response' || !q.illustrativeAnswerPt?.trim() ||
          !q.illustrativeAnswerExamplesPt?.length ||
          !q.rubricHumanPt?.score3 || !q.rubricHumanPt?.uncertain ||
          q.scoringPolicy !== 'human_review_or_uncertain_no_automatic_literal_match') fail(q.draftId, 'unsafe open scoring');
      }
    }
    const t = u.transferTask;
    transferCount++;
    if (!t?.draftId || allNewIds.has(t.draftId) || legacyIds.has(t.draftId)) fail(id, 'transfer ID collision');
    allNewIds.add(t.draftId);
    if (t.public !== false || t.useForReadingMastery !== false ||
      t.assessment !== 'human_review_or_uncertain_no_automatic_literal_match' ||
      !t.scoringCriteriaPt?.length || !(lang === 'en' ? t.promptEn : t.promptRu)) fail(id, 'transfer requirements');
  }
}

// Editorial/runtime parity for the existing V16 localhost-only practice preview.
// The TypeScript array is a static literal, not executed code; no learner data,
// scoring, or public-release switches are touched by this validator.
const runtimeSource=readFileSync(resolve(root,'frontend/src/learn/reading-b1-v16-content.ts'),'utf8');
const runtimeMatch=runtimeSource.match(/export const readingB1V16Units:[^=]*=\s*(\[[\s\S]*?\]) as ReadingUnitV16\[\];/);
let runtime=[];
if(!runtimeMatch)fail('runtime','V16 literal array missing from existing implementation');
else {
 try {runtime=JSON.parse(runtimeMatch[1]);}
 catch {fail('runtime','V16 literal array is not static valid JSON');}
}
if(runtime.length!==10)fail('runtime','expected 10 preview readings');
const unchanged=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const normalized=(a,b)=>a===undefined?(b===null?null:Array.isArray(b)?[]:undefined):a;
for(const lang of ['en','ru']){
 const editorial=read('docs/learn-leitura-b1-v16-'+lang+'.json');
 for(const draft of editorial.units||[]){
  const u=runtime.find(x=>x.id===draft.draftId);
  if(!u){fail(draft.draftId,'runtime reading missing');continue;}
  for(const field of ['language','level','legacyReadingId','linkedStageNodeId','genre','topic','title','text','reviewStatus']){
   if(!unchanged(u[field],draft[field]))fail(draft.draftId,'runtime/editorial mismatch: '+field);
  }
  if(u.public!==false)fail(draft.draftId,'runtime preview must not be publicly released');
  if(u.questions?.length!==4){fail(draft.draftId,'runtime must retain 4 questions');continue;}
  for(const dq of draft.questions||[]){
   const q=u.questions.find(x=>x.id===dq.draftId);
   if(!q){fail(dq.draftId,'runtime question missing');continue;}
   for(const field of ['kind','competency','promptPt','optionsPt','correctOptionId',
     'illustrativeAnswerPt','illustrativeAnswerExamplesPt','evidenceSpans','explanationPt','scoringPolicy']){
    if(!unchanged(q[field],normalized(dq[field],q[field])))
     fail(dq.draftId,'runtime/editorial mismatch: '+field);
   }
  }
  const tr=u.transferTask,dt=draft.transferTask;
  if(!tr||tr.id!==dt.draftId||tr.prompt!==(lang==='en'?dt.promptEn:dt.promptRu)||
    !unchanged(tr.scoringCriteriaPt,dt.scoringCriteriaPt)||tr.useForReadingMastery!==false)
   fail(draft.draftId,'runtime transfer writing mismatch');
 }
}

if (readingCount !== 10 || questionCount !== 40 || transferCount !== 10 || legacyCount !== 474) fail('totals', 'expected 10 readings, 40 questions, 10 transfer, 474 legacy');
if (keys.size < 3) fail('answer keys', 'unbalanced or predictable choice keys');
if (errors.length) {console.error(JSON.stringify({ok:false, errors}, null, 2)); process.exitCode=1;}
else console.log(JSON.stringify({ok:true, readings:readingCount, questions:questionCount, transfers:transferCount, legacy:legacyCount, scope:'structural_only'}, null, 2));
