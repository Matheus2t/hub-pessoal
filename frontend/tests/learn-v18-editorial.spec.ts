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

test('V18/2026-11-13 registra merges atuais e dispensa de avaliadores sem inventar aprovações',()=>{
 const audit=read('docs/learn-revisao-integrada-v18.json');
 const report=readFileSync('docs/learn-revisao-final-v18.md','utf8');
 const owner=audit.ownerEvaluationProcess;
 const integration=audit.integratedTechnicalStatus;
 expect(audit.asOf).toBe('2026-11-13');
 expect(audit.baselineMainSha).toBe('55186744e333f09788f20c9bacf174574a9bfcfb');
 expect(integration.baselineMainSha).toBe(audit.baselineMainSha);
 expect(integration.editorialPRsMerged).toEqual([118,119,121,122]);
 for(const n of [145,147,148,149])expect(integration.technicalAndAuditPRsMerged).toContain(n);
 for(const v of ['v13','v14','v16','v17'])expect(audit.contentInventory[v].technicalPreviewInMain).toBe(true);
 expect(owner).toMatchObject({
  onlyHandsOnTester:'owner',independentExternalReviewerRequired:false,
  externalReviewerWaived:true,studentPilotRequired:false,studentPilotWaived:true,
  preUseAudioListeningApprovalRequired:false,audioHumanListeningPerformed:false,
  personalPracticalAcceptance:'pending_until_owner_uses_learn',
  waivedDoesNotMeanPerformed:true,
 });
 expect(audit.independentExternalLanguageReviewPerformed).toBe(false);
 expect(audit.studentPilotPerformed).toBe(false);
 expect(audit.audioAuditoryApprovalPerformed).toBe(false);
 expect(audit.cefrCertification).toBe(false);
 expect(audit.contentInventory.v19.ownerAuditoryApprovals).toBe(0);
 expect(audit.contentInventory.v19.publicFiles).toBe(0);
 expect(integration.publicContent).toMatchObject({
  legacyExercises:474,englishExercises:237,russianExercises:237,
  v11NonAudioFormativeTasks:20,v13AuditoryAssessmentPublic:false,
  v14AuditoryAssessmentPublic:false,v16ReviewPublic:false,
  v17AssessmentPublic:false,v19AudioFilesPublic:0,
 });
 expect(integration.technicalAudio).toMatchObject({
  privateGenerated:68,technicalInventoryPassed:68,humanListeningApprovals:0,assessmentEnabled:false,
 });
 expect(integration.regressionEvidence).toMatchObject({
  completeLearnRegressionPlaywrightPassed:216,publicSecurityPlaywrightPassed:2,
  theseAreHistoricalCIResultsNotANewEndToEndHomologation:true,
 });
 expect(integration.finalIntegratedHomologationPerformed).toBe(false);
 expect(audit.releaseGates.ownerWaivedExternalReviewAndStudentPilots).toBe(true);
 expect(audit.releaseGates.ownerWaivedPriorListeningForPersonalFormativeUse).toBe(true);
 expect(audit.releaseGates.waiverDoesNotEnableAudioAssessment).toBe(true);
 expect(audit.releaseGates.noPublicDraftsWithoutOwnerApproval).toBe(true);
 for(const ref of ['#118','#119','#121','#122','#145','#147','#148','#149'])expect(report).toContain(ref);
 expect(report).toContain('homologação técnica integrada');
 expect(report).toContain('Dispensado');
 expect(report).toContain('55186744e333f09788f20c9bacf174574a9bfcfb');
});

test('V18/2026-11-13 mantém inventário EN/RU e links de relatórios de auditoria',()=>{
 const en=read('frontend/public/learn/en.json');
 const ru=read('frontend/public/learn/ru.json');
 expect(en.exercises).toHaveLength(237);
 expect(ru.exercises).toHaveLength(237);
 for(const doc of [
  'docs/learn-v14-final-editorial-review-2026-11-13.md',
  'docs/learn-exercise-quality-audit-2026-11-13.md',
  'docs/learn-mobile-ux-audit-2026-11-13.md',
  'docs/learn-security-audit-2026-11-13.md',
  'docs/learn-v17-audit-2026-11-13.md',
  'docs/learn-a1-b1-curricular-audit-2026-11-13.md',
 ]){
  expect(readFileSync(doc,'utf8').length,doc).toBeGreaterThan(250);
 }
});
