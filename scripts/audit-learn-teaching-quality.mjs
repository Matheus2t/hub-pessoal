#!/usr/bin/env node
/**
 * Read-only editorial audit for existing Learn content.
 *
 * Track actual legacy problems, preserve every historical ID and attempt.
 * --check: fail only when a NEW exact assessment duplication or increase in
 * generic writing feedback appears relative to the committed baseline.
 * Non-mechanical issues (linguistic accuracy, CEFR, task suitability) require
 * editorial review and are NOT approved by this script.
 */
import {readFileSync} from 'node:fs';

const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
const root='frontend/public/learn/';
const baseline=read(root+'pedagogy-v1/quality-baseline.json');
const norm=(v)=>String(v||'').trim().replace(/\s+/gu,' ').normalize('NFC').toLowerCase();
const errors=[];
const reports=[];
for(const lang of ['en','ru']){
  const d=read(root+lang+'.json');
  const expected=baseline.languages[lang];
  if(!expected){errors.push(lang+': missing audit baseline');continue;}
  const promptGroups=new Map();
  for(const x of d.exercises){
    const key=norm(x.prompt)+'|'+norm(x.answers?.[0]);
    const group=promptGroups.get(key)||[];
    group.push(x.id);
    promptGroups.set(key,group);
  }
  const repeats=[...promptGroups.values()]
    .filter(ids=>ids.length>1)
    .map(ids=>ids.sort())
    .sort((a,b)=>a.join(',').localeCompare(b.join(',')));
  const known=(expected.knownRepeatedQuestionGroups||[])
    .map(ids=>[...ids].sort())
    .sort((a,b)=>a.join(',').localeCompare(b.join(',')));
  const acceptable=new Set(known.map(ids=>JSON.stringify(ids)));
  for(const ids of repeats){
    if(!acceptable.has(JSON.stringify(ids)))errors.push(lang+': newly repeated question group '+ids.join(', '));
  }
  const noLongerPresent=known.filter(ids=>!repeats.some(other=>JSON.stringify(other)===JSON.stringify(ids)));
  const generic=d.exercises.filter(x=>x.skill==='writing'&&/Outras traduções podem ser válidas/i.test(x.explanation)).length;
  if(generic>expected.maxGenericWritingExplanations)errors.push(lang+': generic feedback increased from '+expected.maxGenericWritingExplanations+' to '+generic);
  const readings=(d.readings||[]).map(x=>({
    id:x.id,level:x.level,whitespaceSeparatedTokens:x.text.trim().split(/\s+/u).length,
    comprehensionChecks:x.questionIds?.length??0
  }));
  const distribution=Object.fromEntries(['A1','A2','B1'].map(level=>[
    level,readings.filter(r=>r.level===level).map(r=>r.whitespaceSeparatedTokens)
  ]));
  const report={
    language:lang,exercises:d.exercises.length,readingCount:readings.length,
    duplicateGroups:repeats,
    repeatedGroupCount:repeats.length,
    previouslyKnownDuplicatesNoLongerFound:noLongerPresent,
    genericWritingExplanationCount:generic,
    writingExerciseCount:d.exercises.filter(x=>x.skill==='writing').length,
    readingTokenDistribution:distribution,
    editorialFlags:[
      'Repeated grammar/test questions must not be treated as independent learning evidence.',
      'Generic translation-based feedback cannot grade legitimate open answers semantically.',
      'CEFR band and reading difficulty require expert review; word count alone does not assess proficiency.',
      'Synthetic spoken audio and written transcripts do not by themselves demonstrate conversation or pronunciation.'
    ]
  };
  reports.push(report);
  if(d.readings.length!==expected.expectedLegacyReadings)errors.push(lang+': reading inventory changed; review baseline before proceeding');
}
if(process.argv.includes('--json'))console.log(JSON.stringify({schemaVersion:1,reports,errors},null,2));
else {
  for(const r of reports) {
    console.log(r.language.toUpperCase()+': '+r.repeatedGroupCount+' known repeated assessment groups; '+r.genericWritingExplanationCount+'/'+r.writingExerciseCount+' generic writing feedback explanations');
    console.log('  Reading tokens (rough only): '+Object.entries(r.readingTokenDistribution).map(([k,v])=>k+' '+v.join('/')).join(' | '));
    console.log('  Pedagogical review required: language quality, contextual appropriateness and difficulty.');
  }
  if(errors.length)console.error(errors.map(s=>'ERROR: '+s).join('\n'));
  else console.log('Legacy editorial audit: baseline preserved. No new known mechanical regressions.');
}
if(process.argv.includes('--check')&&errors.length)process.exitCode=1;
