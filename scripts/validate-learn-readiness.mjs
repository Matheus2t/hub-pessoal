#!/usr/bin/env node
/**
 * 2T Learn engineering-readiness contract.
 * This is a structural, read-only preflight before Codex implements the
 * disabled pilot engine. It DOES NOT certify linguistic quality or learning.
 */
import {readFileSync,existsSync} from 'node:fs';
const base='frontend/public/learn/pedagogy-v1/';
const read=name=>JSON.parse(readFileSync(base+name+'.json','utf8'));
const errors=[];
const verify=(valid,message)=>{if(!valid)errors.push(message)};
const manifest=read('readiness-manifest');
const evidence=read('evidence-contract');
const policy=read('evaluation-policy');
const rubrics=read('pilot-task-rubrics');
const delayed=read('pilot-delayed-probes');
const allTaskIds=new Set();
let openTaskCount=0;
verify(manifest.schemaVersion===1&&manifest.status==='ready-for-disabled-engineering-prototype'&&manifest.runtimeEnabled===false,'manifest must describe disabled engineering preview');
verify(manifest.languages?.join('/')==='en/ru','both independent languages required');
verify(manifest.preEngineeringChecks?.editorialInternalReviewComplete===true,'internal handoff must be complete');
for(const gate of ['languageExpertApproval','realLearnerTested','publicReleaseAuthorized','validAudioRecordings']){
 verify(manifest.preEngineeringChecks?.[gate]===false,'cannot claim '+gate+' is already done');
}
verify(manifest.preEngineeringChecks?.newEngineBuilt===false,'pre-engineering baseline must remain an accurate snapshot');
verify(manifest.nextEngineeringMilestone?.id==='C1-disabled-English-pilot','first milestone must be English prototype');
verify(manifest.nextEngineeringMilestone?.requiresRuntimeFlagDefault===false,'feature flag must default off');
verify(manifest.nextEngineeringMilestone?.requiresSeparateNewEventStore===true,'new events must not overload old Attempt records');
verify(manifest.nextEngineeringMilestone?.requiresBackupVersionsAccepted?.join('/')==='1/2','old backups must remain importable');
const implementation=manifest.engineeringImplementation;
verify(implementation?.milestoneId==='C1-disabled-English-pilot'&&implementation?.status==='implemented-disabled-prototypes','C1/C2 implementation status must be recorded');
verify(implementation?.runtimeEnabled===false&&implementation?.lessonId==='en-pilot-introductions-01'&&implementation?.implementedLessonIds?.join('/')==='en-pilot-introductions-01/ru-pilot-directions-01','both pilots must remain disabled and bound to their approved content');
verify(implementation?.sharedRuntimeLanguages?.join('/')==='en/ru'&&implementation?.russianPhoneticEditorReused===true&&implementation?.russianTransferLexicalCueRecorded==='библиотека','C2 must reuse the shared runtime and record Russian support');
verify(implementation?.indexedDbVersion===3&&implementation?.backupVersion===3,'additive IndexedDB/backup versions must be documented');
verify(implementation?.importsLegacyBackupVersions?.join('/')==='1/2','legacy v1/v2 imports must remain available');
verify(implementation?.additionalStores?.join('/')==='lessonEvents/lessonProgress','new evidence must use separate additive stores');
verify(implementation?.openResponseOutcomeWithoutReviewer==='uncertain'&&implementation?.publicRouteRequiresExplicitPreviewFlag===true,'pilot safety defaults missing');
verify(implementation?.previewAccess==='loopback-only'&&implementation?.remotePreviewEnabled===false&&implementation?.remoteAccessRequiresServerAuthentication===true,'pilots must never enable remote preview via URL flag');
const diagnostic=manifest.diagnosticImplementation;
verify(diagnostic?.milestoneId==='C3-initial-competency-diagnostic'&&diagnostic?.status==='implemented-disabled-preview'&&diagnostic?.runtimeEnabled===false,'C3 diagnostic must remain a disabled local preview');
verify(diagnostic?.languages?.join('/')==='en/ru'&&diagnostic?.taskCounts?.en===10&&diagnostic?.taskCounts?.ru===10,'C3 must bind the two original ten-task catalogs');
verify(diagnostic?.missingAudioTaskIds?.en?.join('/')==='en-diag-l1/en-diag-l2'&&diagnostic?.missingAudioTaskIds?.ru?.join('/')==='ru-diag-l1/ru-diag-l2','unvalidated listening tasks must remain explicitly not assessed');
verify(diagnostic?.openResponseOutcomeWithoutReviewer==='uncertain'&&diagnostic?.noCEFROrOralClaims===true,'C3 assessment limits must be explicit');
verify(diagnostic?.persistence?.join('/')==='lessonEvents/lessonProgress'&&diagnostic?.indexedDbVersion===3&&diagnostic?.backupVersion===3&&diagnostic?.legacyBackupVersionsAccepted?.join('/')==='1/2','C3 must preserve additive v3 persistence and legacy backup import');
verify(diagnostic?.recordedEvidenceFields?.includes('objectiveId')&&diagnostic?.recordedEvidenceFields?.includes('competencyId')&&evidence.diagnosticEventExtension?.persistenceCompatibility?.includes('version remain unchanged'),'C3 evidence must identify objective, competency and the unchanged persistence version');
verify(diagnostic?.previewAccess==='loopback-only'&&diagnostic?.previewFlags?.en==='diagnostic-en'&&diagnostic?.previewFlags?.ru==='diagnostic-ru','C3 preview flags must remain loopback-only and language-specific');
const previewSource=readFileSync('frontend/src/learn/pilot-preview.ts','utf8');
verify(!previewSource.includes("hostname.endsWith('.vercel.app')"),'C1 must not allow arbitrary Vercel hosts');
verify(previewSource.includes("hostname==='localhost'")&&previewSource.includes("hostname==='127.0.0.1'"),'C1 local preview gate missing');
verify(previewSource.includes("get('learn-preview')===pilot")&&previewSource.includes("'c1'|'c2'"),'C1/C2 must use separate explicit loopback-only preview flags');
verify(previewSource.includes('isLearnDiagnosticPreviewEnabled')&&previewSource.includes('diagnostic-${language}')&&previewSource.includes("hostname==='[::1]'"),'C3 must use an explicit loopback-only gate including IPv6 loopback');
const runtimeSource=readFileSync('frontend/src/learn/pilot-page.ts','utf8');
verify(runtimeSource.includes("@customElement('learn-pilot-player')")&&runtimeSource.includes('loadPilotBundle(language)'),'C1/C2 must share one declarative runner');
verify(runtimeSource.includes("import './phonetic-editor'")&&runtimeSource.includes('onPhoneticInput'),'Russian pilot must use the existing phonetic editor');
verify(runtimeSource.includes("kind==='lexical-cue'")&&runtimeSource.includes('promptAssistance'),'Russian provided lexical support must be recorded by the runner');
const routes=readFileSync('frontend/src/catalog.ts','utf8');
verify(routes.includes("isLearnPilotPreviewEnabled('c1')")&&routes.includes("isLearnPilotPreviewEnabled('c2')"),'both pilot routes must be guarded in the main catalog');
verify(routes.includes("isLearnDiagnosticPreviewEnabled('en')")&&routes.includes("isLearnDiagnosticPreviewEnabled('ru')"),'both diagnostic routes must be guarded by the language-specific preview gate');
const diagnosticRuntime=readFileSync('frontend/src/learn/diagnostic-page.ts','utf8');
verify(diagnosticRuntime.includes("@customElement('learn-diagnostic-player')")&&diagnosticRuntime.includes('recordLessonEvent')&&diagnosticRuntime.includes('skipDiagnostic'),'C3 runner and evidence persistence must be wired');
verify(diagnosticRuntime.includes('learn-phonetic-editor')&&diagnosticRuntime.includes('makeDiagnosticEvent'),'C3 must reuse phonetic input and the typed evidence model');
const diagnosticContract=readFileSync('frontend/src/learn/diagnostic-content.ts','utf8');
verify(diagnosticContract.includes("outcome==='uncertain'")&&diagnosticContract.includes("'notAssessed'")&&diagnosticContract.includes('minTasksBeforeAnyRecommendation'),'C3 must implement uncertainty, missing-media and recommendation thresholds');
for(const path of manifest.docs||[])verify(existsSync(path),'missing handoff document '+path);
for(const path of Object.values(manifest.artifacts||{}).flat()){
 verify(existsSync(base+path),'missing declared content asset '+path);
}
verify(evidence.schemaVersion===1&&evidence.runtimeEnabled===false,'evidence contract must be inactive');
verify(evidence.currentLegacyBaseline?.idbName===manifest.baseline?.legacyLearn?.idbName,'legacy database identity mismatch');
verify(evidence.currentLegacyBaseline?.idbVersion===manifest.baseline?.legacyLearn?.idbVersion,'IDB version mismatch');
verify(evidence.currentLegacyBaseline?.backupVersions?.join('/')==='1/2','expected existing backup v1 and v2');
verify(evidence.futurePersistenceRequirements?.migrateAdditively===true,'must preserve legacy stores');
verify(evidence.futurePersistenceRequirements?.backupV1V2ImportRequired===true,'backup compatibility missing');
verify(evidence.independenceInvariants?.legacyEventsCannotBeRetroactivelyUpgraded===true,'no retroactive proficiency interpretation');
verify(evidence.independenceInvariants?.publicRuntimeDefaultEnabled===false,'do not enable before review');
verify(policy.safetyAndPrivacy?.autoGradingOpenResponses==='disabled','no unchecked semantic auto-grading');
verify(policy.safetyAndPrivacy?.speechAssessment==='unavailable','cannot measure pronunciation without instrument');
for(const outcome of evidence.outcomes||[])verify(policy.outcomes?.includes(outcome),'unknown judgment status '+outcome);
const sources=new Set((evidence.taskEvidenceMap||[]).map(x=>x.source));
for(const x of ['pilot.comprehension','pilot.notice','pilot.guidedProduction','pilot.transfer','diagnostic.listening','delayed.writtenTransfer'])
 verify(sources.has(x),'missing evidence mapping '+x);
verify(evidence.taskEvidenceMap?.find(x=>x.source==='pilot.notice')?.evidence==='practiceOnly','noticing is practice, not mastery');
verify(evidence.taskEvidenceMap?.find(x=>x.source==='diagnostic.listening')?.assessor==='unavailable','no validated listening audio');
verify(rubrics.runtimeEnabled===false&&rubrics.rubrics?.length===4,'the four original writing rubrics must stay inactive');
const rubricIds=new Set(rubrics.rubrics.map(x=>x.taskId));
for(const expected of manifest.pilots||[]){
 const lang=expected.language,pilot=read(lang+'-pilot'),curriculum=read(lang),diag=read(lang+'-diagnostic'),guide=read(lang+'-reading-guide');
 const objective=curriculum.objectives.find(x=>x.id===expected.objective);
 verify(!!objective&&objective.pilotId===expected.id,lang+': objective and pilot mismatch');
 verify(pilot.id===expected.id&&pilot.objectiveId===expected.objective,lang+': pilot ID mismatch');
 verify(pilot.contentVersion===expected.contentVersion&&Number.isInteger(pilot.contentVersion),lang+': content needs immutable numeric version');
 verify(pilot.runtimeEnabled===false&&pilot.status==='editorial-review',lang+': pilot must stay in review');
 verify(pilot.editorialReview?.preventRuntimeUntilApproved===true,lang+': missing historic release gate');
 verify(pilot.editorialFinalization?.engineeringInputReady===true,lang+': internal editorial ready flag missing');
 verify(pilot.editorialFinalization?.publicReleaseApproved===false,lang+': cannot claim learner release');
 verify(pilot.editorialFinalization?.blockingGates?.includes('independent-language-review'),lang+': expert review cannot be skipped');
 verify(pilot.editorialFinalization?.realLearnerResultsAvailable===false,lang+': no real learner study completed');
 verify(pilot.editorialFinalization?.oralEvidenceAvailable===false&&pilot.editorialReview?.audioRecordingAvailable===false,lang+': no oral evaluation or recording');
 verify(pilot.steps?.map(x=>x.id).join('/')===expected.expectedSteps?.join('/'),lang+': frozen pilot sequence changed without review');
 verify(pilot.steps?.filter(x=>['guidedProduction','transfer'].includes(x.kind)).map(x=>x.id).join('/')===expected.openTaskIds?.join('/'),lang+': open task references changed');
 verify(guide.runtimeEnabled===false&&guide.status==='editorial-review',lang+': reading extension still editorial');
 verify(diag.runtimeEnabled===false&&diag.status==='editorial-review',lang+': diagnostic still editorial');
 verify(diag.questions.length===10,lang+': diagnostic bank count changed');
 verify(diag.questions.filter(q=>q.requiresAudio===true).length===2,lang+': missing two blocked audio items');
 for(const q of diag.questions){
  verify(!allTaskIds.has(q.id),lang+': duplicate content task '+q.id);allTaskIds.add(q.id);
  if(q.mode==='open')verify(q.modelAnswersVisible==='after-attempt'&&q.assessment==='rubricWithReview',q.id+': unreleased models and rubric review required');
  if(q.requiresAudio)verify(q.audio?.status==='missing-reviewed-recording'&&q.audio?.publicUrl===null,q.id+': no genuine audio available');
 }
 for(const step of pilot.steps){
  verify(!allTaskIds.has(step.id),lang+': duplicate content task '+step.id);allTaskIds.add(step.id);
  if(step.kind==='comprehension'){
   verify(step.assessmentContract?.evidenceScope==='written-comprehension-only',step.id+': closed question overclaims evidence');
   const wrong=Object.keys(step.feedbackByWrongChoice||{}).map(Number);
   verify(wrong.length===step.choices.length-1&&wrong.every(i=>i!==step.correctIndex&&i>=0&&i<step.choices.length),step.id+': distractor feedback coverage mismatch');
  }else if(step.kind==='notice'){
   verify(step.assessmentContract?.scoreAsCompetence===false,step.id+': noticing cannot count as competence');
  }else {
   openTaskCount++;
   verify(rubricIds.has(step.id),step.id+': detailed rubric not linked');
   verify(step.modelAnswersVisible==='after-attempt',step.id+': model must be hidden before response');
   verify(step.assessmentContract?.canUseDeterministicMatchAsFinalGrade===false,step.id+': no string matching as final grade');
   verify(step.assessmentContract?.ifNoReliableReviewer==='uncertain',step.id+': missing uncertain fallback');
   verify(step.assessmentContract?.visibleHelpMustBeRecorded===true,step.id+': hidden help would overclaim independent output');
  }
 }
 if(expected.requiredLexicalCue){
  const task=pilot.steps.find(s=>s.id===expected.requiredLexicalCue.taskId);
  const cue=task?.providedSupport;
  verify(cue?.kind==='lexical-cue'&&cue.targetWord===expected.requiredLexicalCue.word,lang+': known provided vocabulary cue missing');
  verify(cue?.shownInPrompt===true&&cue?.countsAsAssistance===true,lang+': lexical cue must count as help');
  verify(task?.prompt.includes(cue?.targetWord),lang+': cue must actually be visible in prompt');
 }
 const probeRows=delayed.probes.filter(x=>x.language===lang);
 verify(probeRows.length===2&&probeRows.map(x=>x.timing.recommendedDelayDays).join('/')==='2/7',lang+': follow-ups changed');
 for(const p of probeRows){
  verify(p.runtimeEnabled===false,p.id+': delayed probe released unexpectedly');
  for(const id of [p.readingComprehension.id,p.writtenTransfer.id]){
    verify(!allTaskIds.has(id),lang+': duplicate follow-up task '+id);allTaskIds.add(id);
  }
  verify(p.writtenTransfer.modelHiddenDuringAttempt===true&&p.writtenTransfer.evaluation==='rubricWithReview',p.id+': delayed open task unprotected');
  if(lang==='ru')verify(p.writtenTransfer.assistanceToRecord.includes('lexical-cue'),p.id+': supplied Russian vocabulary cue not logged');
 }
 for(const id of [guide.afterReading.closedProbe.id,guide.afterReading.writtenApplication.id]){
  verify(!allTaskIds.has(id),lang+': duplicate reading guide task '+id);allTaskIds.add(id);
 }
 console.log(lang.toUpperCase()+': '+pilot.steps.length+' pilot steps, '+diag.questions.length+' diagnostic tasks, '+probeRows.length+' delayed occasions; public pilot disabled.');
}
verify(openTaskCount===4,'four specific pilot rubrics required');
verify(delayed.runtimeEnabled===false,'delayed practices cannot be enabled');
const model=readFileSync('frontend/src/learn/model.ts','utf8');
const storage=readFileSync('frontend/src/learn/storage.ts','utf8');
const backup=readFileSync('frontend/src/learn/backup.ts','utf8');
verify(/version:\s*1\s*\|\s*2\s*\|\s*3\b/.test(model),'backup model must retain v1/v2 and add v3');
verify(/indexedDB\.open\(NAME,\s*3\)/.test(storage),'database must upgrade additively from legacy IDB v2');
verify(/\[1,2,3\]\.includes\(Number\(data\.version\)\)/.test(backup),'backup parser must accept v1, v2 and v3');
for(const store of manifest.baseline?.legacyLearn?.stores||[])verify(storage.includes(`contains('${store}')`),`legacy store ${store} must remain intact`);
for(const store of implementation?.additionalStores||[])verify(storage.includes(`contains('${store}')`),`missing additive event store ${store}`);
verify(storage.includes("transaction(['lessonEvents','lessonProgress'],'readwrite')"),'evidence and progress must commit atomically');
console.log('Cross-artifact checks: '+allTaskIds.size+' distinct tasks, '+openTaskCount+' open pilot rubric links, legacy stores preserved in IDB v3, backups v1/v2 imported and v3 round-tripped.');
if(errors.length){
 console.error(errors.map(e=>'ERROR: '+e).join('\n'));
 process.exitCode=1;
}else console.log('C1/C2 + C3 STRUCTURE READY: shared disabled pilots, local-only diagnostics, additive storage and legacy backup compatibility are wired. NOT APPROVED: public learner release or proficiency claims.');
