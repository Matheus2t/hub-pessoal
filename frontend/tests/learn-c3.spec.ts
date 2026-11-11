import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {parseBackup} from '../src/learn/backup';
import {buildDiagnosticResults,makeDiagnosticEvent,parseDiagnostic,type DiagnosticBundle} from '../src/learn/diagnostic-content';
import {isLearnDiagnosticPreviewEnabled} from '../src/learn/pilot-preview';

const paths={en:'/?learn-preview=diagnostic-en#/learn/en/diagnostic',ru:'/?learn-preview=diagnostic-ru#/learn/ru/diagnostic'};
const catalog=(language:'en'|'ru')=>parseDiagnostic(JSON.parse(readFileSync(`frontend/public/learn/pedagogy-v1/${language}-diagnostic.json`,'utf8')),language);
async function openDiagnostic(page:Page,language:'en'|'ru'){
 await page.goto(paths[language]);await expect(page.locator('learn-diagnostic-player')).toBeVisible();
 await expect(page.getByRole('heading',{name:`Diagnóstico inicial de ${language==='en'?'Inglês':'Russo'}`})).toBeVisible();
}
async function begin(page:Page){await page.getByRole('button',{name:'Começar'}).click();await expect(page.getByRole('progressbar',{name:'Progresso do diagnóstico'})).toBeVisible();}
async function notKnowAndContinue(page:Page){await page.getByRole('button',{name:'Não sei'}).click();await page.getByRole('button',{name:'Continuar'}).click();}
async function databaseRows(page:Page){return page.evaluate(async()=>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('2t-learn');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
 const tx=db.transaction(['lessonEvents','lessonProgress'],'readonly'),eventRequest=tx.objectStore('lessonEvents').getAll(),progressRequest=tx.objectStore('lessonProgress').getAll();
 const [events,progress]=await Promise.all([new Promise<any[]>((resolve,reject)=>{eventRequest.onsuccess=()=>resolve(eventRequest.result);eventRequest.onerror=()=>reject(eventRequest.error)}),new Promise<any[]>((resolve,reject)=>{progressRequest.onsuccess=()=>resolve(progressRequest.result);progressRequest.onerror=()=>reject(progressRequest.error)})]);
 await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});const version=db.version;db.close();return {version,events,progress};
 });}

test('C3 uses both ten-task catalogs with verified closed keys and unavailable listening',()=>{
 for(const language of ['en','ru'] as const){
  const bundle=catalog(language);expect(bundle.questions).toHaveLength(10);
  const listening=bundle.questions.filter(question=>question.type==='listening');expect(listening).toHaveLength(2);
  expect(listening.every(question=>question.audio?.status==='missing-reviewed-recording'&&question.audio.publicUrl===null)).toBe(true);
  expect(bundle.questions.filter(question=>question.mode==='open').every(question=>question.assessment==='rubricWithReview')).toBe(true);
 }
});

test('closed feedback is deterministic, open answers stay uncertain, and recommendation is explained',async({page})=>{
 await openDiagnostic(page,'en');await begin(page);
 await page.getByLabel('À tarde',{exact:true}).check();await page.getByRole('button',{name:'Registrar resposta'}).click();
 await expect(page.locator('.learn-diagnostic')).toContainText('Compatível com o gabarito desta tarefa');
 await expect(page.locator('.learn-diagnostic')).toContainText('Ela trabalha à tarde');await page.getByRole('button',{name:'Continuar'}).click();
 await page.getByLabel('Porque há uma passagem gratuita',{exact:true}).check();await page.getByRole('button',{name:'Registrar resposta'}).click();
 await expect(page.locator('.learn-diagnostic')).toContainText('Não corresponde ao gabarito');await expect(page.locator('.learn-diagnostic')).toContainText('Porque a estação não está funcionando');await page.getByRole('button',{name:'Continuar'}).click();
 await page.getByLabel('Nice to meet you too.',{exact:true}).check();await page.getByRole('button',{name:'Registrar resposta'}).click();await page.getByRole('button',{name:'Continuar'}).click();
 await notKnowAndContinue(page);await expect(page.getByRole('heading',{name:'Produção escrita'})).toBeVisible();
 await page.getByLabel('Sua resposta').fill('Hi, I am Alex. I study design.');await page.getByRole('button',{name:'Registrar resposta para revisão'}).click();
 await expect(page.locator('.learn-diagnostic')).toContainText('ficou como incerta');await expect(page.locator('.learn-diagnostic')).toContainText('Não há avaliador confiável');
 const before=await databaseRows(page);const answerEvent=before.events.find(event=>event.taskId==='en-diag-p1');
 expect(answerEvent.outcome).toBe('uncertain');expect(answerEvent.assessorKind).toBe('rubricWithReview');expect(answerEvent.feedback).toBeNull();expect(answerEvent.response).toBe('Hi, I am Alex. I study design.');expect(answerEvent.objectiveId).toBe('en-introductions-01');expect(answerEvent.competencyId).toBe('written-production');
 await page.getByRole('button',{name:'Ver exemplos após a tentativa'}).click();await expect(page.locator('.learn-diagnostic__examples')).toBeVisible();
 const after=await databaseRows(page);expect(after.events.find(event=>event.taskId==='en-diag-p1').shownAssistance.some((item:any)=>item.kind==='modelAnswer')).toBe(false);
 expect(after.progress.find(progress=>progress.unitId==='en-diagnostic-v1').shownAssistance.some((item:any)=>item.kind==='modelAnswer'&&item.taskId==='en-diag-p1')).toBe(true);
 await page.getByRole('button',{name:'Continuar'}).click();await page.getByRole('button',{name:'Pular diagnóstico'}).click();
 await expect(page.getByRole('heading',{name:'Resultado'})).toBeVisible();await expect(page.locator('.learn-diagnostic__recommendation')).toContainText('Prática guiada de escrita');
 await expect(page.locator('.learn-diagnostic__recommendation')).toContainText('precisam de revisão confiável');await expect(page.locator('.learn-diagnostic__result')).toContainText('Listening sem áudio validado ficou não avaliado');
 await expect(page.locator('.learn-diagnostic__result')).toContainText('Você conhece uma pessoa em uma aula.');
 const rows=await databaseRows(page),session=rows.events.filter(event=>event.unitId==='en-diagnostic-v1'&&event.diagnosticSessionId===rows.progress.find(item=>item.unitId==='en-diagnostic-v1').diagnosticSessionId);
 expect(rows.version).toBe(3);expect(session).toHaveLength(10);expect(new Set(session.map(event=>event.eventId)).size).toBe(10);
 expect(session.filter(event=>event.taskKind==='diagnosticListening').every(event=>event.outcome==='notAssessed'&&event.assessorKind==='unavailable')).toBe(true);
 expect(session.some(event=>event.outcome==='supported')).toBe(true);expect(session.some(event=>event.outcome==='notSupported')).toBe(true);
 await expect(page.locator('.learn-diagnostic__limits')).toContainText('Não mede nível CEFR, fala, pronúncia ou fluência');
});

test('Russian diagnostic records the phonetic editor and lexical cue without judging open text',async({page})=>{
 await openDiagnostic(page,'ru');await begin(page);
 for(let i=0;i<4;i++)await notKnowAndContinue(page);
 const editor=page.locator('learn-phonetic-editor textarea');await expect(editor).toBeVisible();await editor.fill('privet');await expect(editor).toHaveValue('привет');
 await page.getByRole('button',{name:'Registrar resposta para revisão'}).click();await expect(page.locator('.learn-diagnostic')).toContainText('ficou como incerta');
 let rows=await databaseRows(page);const guided=rows.events.find(event=>event.taskId==='ru-diag-p1');
 expect(guided.outcome).toBe('uncertain');expect(guided.response).toBe('привет');expect(guided.competencyId).toBe('written-production');expect(guided.shownAssistance.some((item:any)=>item.kind==='phoneticKeyboard'&&item.shownBeforeAttempt)).toBe(true);
 await page.getByRole('button',{name:'Continuar'}).click();await expect(page.locator('.learn-diagnostic__stimulus')).toContainText('парк');
 await page.locator('learn-phonetic-editor textarea').fill('Где парк?');await page.getByRole('button',{name:'Registrar resposta para revisão'}).click();
 rows=await databaseRows(page);const independent=rows.events.find(event=>event.taskId==='ru-diag-p2');
 expect(independent.outcome).toBe('uncertain');expect(independent.isIndependentClaimAllowed).toBe(false);expect(independent.shownAssistance.some((item:any)=>item.kind==='lexical-cue'&&item.value==='парк'&&item.shownBeforeAttempt)).toBe(true);
 await page.goto(paths.en);await expect(page.getByRole('heading',{name:'Diagnóstico inicial de Inglês'})).toBeVisible();
 await page.getByRole('button',{name:'Começar'}).click();
 rows=await databaseRows(page);expect(rows.progress.find(item=>item.unitId==='ru-diagnostic-v1').language).toBe('ru');expect(rows.progress.find(item=>item.unitId==='en-diagnostic-v1').language).toBe('en');
 await page.goto(paths.ru);await expect(page.locator('.learn-diagnostic')).toContainText('Resposta registrada para revisão');
});

test('unfinished draft resumes without duplicate evidence after reload',async({page})=>{
 await openDiagnostic(page,'en');await begin(page);await page.getByLabel('À tarde',{exact:true}).check();
 await expect(page.getByRole('status')).toContainText('Rascunho salvo neste navegador.');await page.reload();
 await expect(page.getByText('Há uma tentativa em andamento')).toBeVisible();await page.getByRole('button',{name:'Continuar diagnóstico'}).click();
 await expect(page.getByLabel('À tarde',{exact:true})).toBeChecked();await page.getByRole('button',{name:'Registrar resposta'}).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click()});
 await page.reload();await expect(page.locator('.learn-diagnostic')).toContainText('Compatível com o gabarito desta tarefa');
 const rows=await databaseRows(page),sessionId=rows.progress.find(item=>item.unitId==='en-diagnostic-v1').diagnosticSessionId;
 expect(rows.events.filter(event=>event.diagnosticSessionId===sessionId&&event.taskId==='en-diag-r1')).toHaveLength(1);
});

test('backup v1/v2 remain readable and v3 preserves diagnostic evidence and progress',()=>{
 const base={format:'2t-learn',exportedAt:10,attempts:[],cards:[]};
 expect(parseBackup(JSON.stringify({...base,version:1})).version).toBe(1);
 expect(parseBackup(JSON.stringify({...base,version:2,planning:[]})).version).toBe(2);
 const bundle=catalog('ru'),question=bundle.questions[0],progress={key:`ru:${bundle.id}`,language:'ru' as const,unitId:bundle.id,contentVersion:1,currentStage:10,shownAssistance:[],drafts:[],updatedAt:20,diagnosticSessionId:'session-one',diagnosticStatus:'completed' as const};
 const event=makeDiagnosticEvent({bundle,question,sessionId:'session-one',eventId:'session-one:ru-diag-r1',response:question.correctAnswer||'',shownAssistance:[],startedAt:10,submittedAt:20,outcome:'supported'});
 const backup=parseBackup(JSON.stringify({...base,version:3,planning:[],lessonEvents:[event],lessonProgress:[progress]}));
 expect(backup.lessonEvents?.[0].diagnosticSessionId).toBe('session-one');expect(backup.lessonProgress?.[0].unitId).toBe('ru-diagnostic-v1');
 const duplicate=makeDiagnosticEvent({bundle,question,sessionId:'session-one',eventId:'session-one:skip:ru-diag-r1',response:'',shownAssistance:[],startedAt:10,submittedAt:20,outcome:'notAssessed'});
 expect(()=>parseBackup(JSON.stringify({...base,version:3,planning:[],lessonEvents:[event,duplicate],lessonProgress:[progress]}))).toThrow(/duplicadas/);
 expect(()=>parseBackup(JSON.stringify({...base,version:3,planning:[],lessonEvents:[{...event,outcome:'supported',diagnosticSessionId:undefined}],lessonProgress:[progress]}))).toThrow();
});

test('diagnostic route accepts only language-specific loopback preview flags',async({page})=>{
 for(const host of ['matheus2t.com.br','www.matheus2t.com.br','matheus2t.vercel.app','preview.vercel.app','example.com']){
  expect(isLearnDiagnosticPreviewEnabled('en',host,'?learn-preview=diagnostic-en')).toBe(false);
  expect(isLearnDiagnosticPreviewEnabled('ru',host,'?learn-preview=diagnostic-ru')).toBe(false);
 }
 expect(isLearnDiagnosticPreviewEnabled('en','localhost','?learn-preview=diagnostic-ru')).toBe(false);
 expect(isLearnDiagnosticPreviewEnabled('en','localhost','?learn-preview=diagnostic-en')).toBe(true);
 expect(isLearnDiagnosticPreviewEnabled('ru','127.0.0.1','?learn-preview=diagnostic-ru')).toBe(true);
 for(const url of ['/#/learn/en/diagnostic','/?learn-preview=diagnostic-ru#/learn/en/diagnostic']){
  await page.goto(url);await expect(page.locator('learn-diagnostic-player')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Página do Learn não encontrada'})).toBeVisible();
 }
 await page.goto(paths.en);await expect(page.locator('learn-diagnostic-player')).toBeVisible();
});

test('diagnostic remains responsive on phone/tablet/desktop in both themes',async({page})=>{
 await openDiagnostic(page,'en');
 for(const theme of ['dark','light'] as const){
  for(const width of [320,390,768,1366]){
   await page.setViewportSize({width,height:900});await page.goto(paths.en);await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);await expect(page.locator('.learn-diagnostic__panel')).toBeVisible();
   const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,card:document.querySelector('.learn-diagnostic__panel')!.getBoundingClientRect().width}));
   expect(size.scroll,`horizontal overflow at ${width}px/${theme}`).toBeLessThanOrEqual(size.client);expect(size.card).toBeGreaterThan(0);
  }
 }
});

test('report does not infer proficiency and separates written evidence from listening/oral gaps',()=>{
 const bundle=catalog('en') as DiagnosticBundle,events=[bundle.questions[0],bundle.questions[2],bundle.questions[4],bundle.questions[6]].map((question,index)=>makeDiagnosticEvent({bundle,question,sessionId:'report',eventId:`report-${index}`,response:index===2?'free answer':question.correctAnswer||'',shownAssistance:[],startedAt:1,submittedAt:2,outcome:question.mode==='open'?'uncertain':index===1?'notSupported':'supported'}));
 const report=buildDiagnosticResults(bundle,events);
 expect(report.recommendation.title).toBe('Prática guiada de escrita');expect(report.recommendation.assessed).toBe(4);
 expect(report.competencies.find(item=>item.name==='Compreensão auditiva')?.status).toBe('not-assessed');
 expect(report.competencies.find(item=>item.name==='Produção oral')?.status).toBe('not-assessed');
 expect(report.competencies.some(item=>item.name==='Produção escrita'&&item.status==='review-required')).toBe(true);
});
