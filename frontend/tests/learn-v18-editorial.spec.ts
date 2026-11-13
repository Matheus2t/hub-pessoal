import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {bridgeV11Drafts} from '../src/learn/bridge-v11-content';
import {readingB1V16Units} from '../src/learn/reading-b1-v16-content';

const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));

test('V18 reconcilia aceites V11 e mantém V13, V14, V16, V17 e áudios bloqueados',()=>{
 const audit=read('docs/learn-revisao-integrada-v18.json');
 expect(audit.schemaVersion).toBe(2);
 expect(audit.recordType).toBe('learn_internal_editorial_review_v18_reconciled');
 expect(audit.contentInventory.v11.ownerEditorialAccepted).toBe(true);
 expect(audit.contentInventory.v11.publicFormativeNonAudio).toBe(20);
 expect(audit.contentInventory.v11.unapprovedAudioScripts).toBe(4);
 expect(audit.contentInventory.v13.publicAudioAssessmentAuthorized).toBe(false);
 expect(audit.contentInventory.v14.publicAudioAssessmentAuthorized).toBe(false);
 expect(audit.contentInventory.v16.publicReleaseAuthorized).toBe(false);
 expect(audit.contentInventory.v17.publicReleaseAuthorized).toBe(false);
 expect(audit.contentInventory.v19.ownerAuditoryApprovals).toBe(0);
 expect(audit.contentInventory.v19.publicFiles).toBe(0);
 expect(audit.audioAuditoryApprovalPerformed).toBe(false);
 expect(audit.independentExternalLanguageReviewPerformed).toBe(false);
 expect(audit.cefrCertification).toBe(false);
 expect(audit.structuralAudit.inspectedCrossSourceDraftIds).toBe(258);
 expect(audit.structuralAudit.noLegacyExerciseIdCollision).toBe(true);
 expect(audit.releaseGates.unknownOpenResponse).toBe('uncertain_or_human_review');
 expect(audit.releaseGates.browserTtsDoesNotProveListening).toBe(true);
 expect(audit.releaseGates.legacyPracticeDoesNotProveMastery).toBe(true);
});

test('V18 confere que a V11 integrada mantém IDs e conteúdo editorial e libera só não auditivos',()=>{
 const source=read('docs/learn-atividades-ponte-v11.json');
 expect(source.tasks).toHaveLength(24);
 expect(bridgeV11Drafts).toHaveLength(24);
 expect(bridgeV11Drafts.filter(t=>t.public)).toHaveLength(20);
 expect(bridgeV11Drafts.filter(t=>!t.public)).toHaveLength(4);
 const original=new Map(source.tasks.map((t:{draftId:string})=>[t.draftId,t]));
 for(const item of bridgeV11Drafts){
  const old=original.get(item.draftId) as typeof item|undefined;
  expect(old).toBeDefined();
  expect(item.stimulusText).toBe(old!.stimulusText);
  expect(item.taskInstruction).toBe(old!.taskInstruction);
  expect(item.illustrativeAnswer).toBe(old!.illustrativeAnswer);
  expect(item.language).toBe(old!.language);
  expect(item.public).toBe(item.skill!=='listening_script');
 }
 expect(source.tasks.every((t:{public:boolean})=>t.public===false)).toBe(true);
});

test('V18 confirma V16 não pontuada, com trechos de evidência e vínculos válidos',()=>{
 const audit=read('docs/learn-revisao-integrada-v18.json');
 const progression=read('frontend/public/learn/progression-v12.json');
 expect(readingB1V16Units).toHaveLength(10);
 expect(readingB1V16Units.flatMap(u=>u.questions)).toHaveLength(40);
 expect(readingB1V16Units.flatMap(u=>u.questions).filter(q=>q.kind==='open_response')).toHaveLength(20);
 expect(readingB1V16Units.every(u=>u.public===false)).toBe(true);
 const ids=new Set<string>();
 for(const lang of ['en','ru'] as const){
  const catalog=read(`frontend/public/learn/${lang}.json`);
  expect(catalog.exercises).toHaveLength(237);
  const stages=new Set(progression.languageTracks[lang].stages.filter((s:{level:string})=>s.level==='B1').map((s:{nodeId:string})=>s.nodeId));
  for(const unit of readingB1V16Units.filter(x=>x.language===lang)){
   expect(stages.has(unit.linkedStageNodeId)).toBe(true);
   expect(catalog.readings.some((r:{id:string})=>r.id===unit.legacyReadingId)).toBe(true);
   expect(unit.transferTask.useForReadingMastery).toBe(false);
   for(const q of unit.questions){
    expect(q.evidenceSpans.length).toBeGreaterThan(0);
    expect(q.evidenceSpans.every(span=>unit.text.includes(span))).toBe(true);
    if(q.kind==='single_choice'){
     expect(q.optionsPt.some(x=>x.id===q.correctOptionId)).toBe(true);
    } else expect(q.correctOptionId).toBe(null);
    expect(ids.has(q.id)).toBe(false);ids.add(q.id);
   }
  }
 }
 expect(ids.size).toBe(40);
 expect(audit.contentInventory.v16.technicalPreviewInMain).toBe(true);
 expect(audit.contentInventory.v16.publicReleaseAuthorized).toBe(false);
});
