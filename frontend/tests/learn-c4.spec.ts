import {test,expect,type Page} from '@playwright/test';
import {buildSync} from 'esbuild';
import {readFileSync} from 'node:fs';
import {parseBackup} from '../src/learn/backup';
import {isLearnDelayedReviewPreviewEnabled} from '../src/learn/pilot-preview';

const day=86_400_000;
type Language='en'|'ru';
function pilotEvents(language:Language,daysAgo:number){
 const unitId=language==='en'?'en-pilot-introductions-01':'ru-pilot-directions-01';
 const ids=language==='en'?['en-intro-c1','en-intro-c2','en-intro-n1','en-intro-p1','en-intro-t1']:['ru-dir-c1','ru-dir-c2','ru-dir-n1','ru-dir-p1','ru-dir-t1'];
 return ids.map((taskId,index)=>{
  const kind=index<2?'comprehension':index===2?'notice':index===3?'guidedProduction':'transfer';
  const evidenceKind=kind==='notice'?'practiceOnly':kind;
  const submittedAt=Date.now()-daysAgo*day-(ids.length-index-1)*1000;
  const shownAssistance=language==='ru'&&taskId==='ru-dir-t1'?[{kind:'lexical-cue',value:'библиотека',taskId,shownAt:submittedAt-400,shownBeforeAttempt:true}]:[];
  return {eventId:`seed:${language}:${taskId}`,language,unitId,contentVersion:1,taskId,taskKind:kind,evidenceKind,response:index===2?'':'registro de teste',shownAssistance,startedAt:submittedAt-500,submittedAt,outcome:kind==='notice'?'notAssessed':kind==='comprehension'?'supported':'uncertain',reviewStatus:kind==='notice'||kind==='comprehension'?'notRequired':'pending',assessorKind:kind==='notice'?'unavailable':kind==='comprehension'?'deterministic':'rubricWithReview',feedback:null,sourceContext:`${unitId}@1/${taskId}`,isIndependentClaimAllowed:kind==='transfer'&&language==='en'};
 });
}
async function installHarness(page:Page){
 const pageCode=buildSync({entryPoints:['frontend/src/learn/page.ts'],bundle:true,format:'iife',globalName:'LearnC4Page',write:false,platform:'browser'}).outputFiles[0].text;
 const catalogCode=buildSync({entryPoints:['frontend/src/catalog.ts'],bundle:true,format:'iife',globalName:'LearnC4Catalog',write:false,platform:'browser'}).outputFiles[0].text;
 const assets:Record<string,{body:string|Buffer;contentType:string}>={
  '/':{body:'<!doctype html><html lang="pt-BR" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><learn-page language="en" activity="reviews"></learn-page><script src="/learn-c4-page.js"></script><script src="/learn-c4-catalog.js"></script></body></html>',contentType:'text/html'},
  '/styles.css':{body:readFileSync('dist/styles.css'),contentType:'text/css'},
  '/learn-c4-page.js':{body:pageCode,contentType:'text/javascript'},
  '/learn-c4-catalog.js':{body:catalogCode,contentType:'text/javascript'},
  '/learn/pedagogy-v1/pilot-delayed-probes.json':{body:readFileSync('frontend/public/learn/pedagogy-v1/pilot-delayed-probes.json'),contentType:'application/json'},
  '/learn/pedagogy-v1/en-pilot.json':{body:readFileSync('frontend/public/learn/pedagogy-v1/en-pilot.json'),contentType:'application/json'},
  '/learn/pedagogy-v1/ru-pilot.json':{body:readFileSync('frontend/public/learn/pedagogy-v1/ru-pilot.json'),contentType:'application/json'},
  '/learn/pedagogy-v1/readiness-manifest.json':{body:readFileSync('frontend/public/learn/pedagogy-v1/readiness-manifest.json'),contentType:'application/json'},
  '/learn/pedagogy-v1/pilot-task-rubrics.json':{body:readFileSync('frontend/public/learn/pedagogy-v1/pilot-task-rubrics.json'),contentType:'application/json'}
 };
 await page.route('**/*',async route=>{const url=new URL(route.request().url()),asset=assets[url.pathname];if(url.hostname==='localhost'&&url.port==='3000'&&asset)await route.fulfill({status:200,contentType:asset.contentType,body:asset.body});else await route.fulfill({status:404,body:'not found'});});
}
async function attachStorage(page:Page){
 const code=buildSync({entryPoints:['frontend/src/learn/storage.ts'],bundle:true,format:'iife',globalName:'LearnC4Storage',write:false,platform:'browser'}).outputFiles[0].text;
 await page.addScriptTag({content:code});
}
async function seed(page:Page,rows:any[]){
 await installHarness(page);await page.goto('http://localhost:3000/');await attachStorage(page);
 await page.evaluate(async events=>{await (window as any).LearnC4Storage.restoreBackup(JSON.stringify({format:'2t-learn',version:3,exportedAt:Date.now(),attempts:[],cards:[],planning:[],lessonEvents:events,lessonProgress:[]}),true);},rows);
}
async function openReviews(page:Page,language:Language){await page.goto(`http://localhost:3000/?learn-preview=c4-delayed#/learn/${language}/reviews`);await page.locator('learn-page').evaluate((el:any,lang)=>{el.language=lang;},language);await expect(page.locator('learn-delayed-review')).toBeVisible();await expect(page.getByRole('heading',{name:`Revisões · ${language==='en'?'Inglês':'Russo'}`})).toBeVisible();}
async function snapshot(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('2t-learn');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});const tx=db.transaction(['lessonEvents','lessonProgress'],'readonly');const [events,progress]=await Promise.all(['lessonEvents','lessonProgress'].map(name=>new Promise<any[]>((resolve,reject)=>{const req=tx.objectStore(name).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})));db.close();return {events,progress};});}

test('C4 route requires the exact local preview flag and never opens on public hosts',async({page})=>{
 for(const host of ['matheus2t.com.br','www.matheus2t.com.br','matheus2t.vercel.app','preview-hub.vercel.app'])expect(isLearnDelayedReviewPreviewEnabled(host,'?learn-preview=c4-delayed')).toBe(false);
 expect(isLearnDelayedReviewPreviewEnabled('localhost','')).toBe(false);expect(isLearnDelayedReviewPreviewEnabled('localhost','?learn-preview=c4-delayed')).toBe(true);expect(isLearnDelayedReviewPreviewEnabled('127.0.0.1','?learn-preview=c4-delayed')).toBe(true);expect(isLearnDelayedReviewPreviewEnabled('[::1]','?learn-preview=c4-delayed')).toBe(true);
 await installHarness(page);await page.goto('http://localhost:3000/#/learn/en/reviews');expect(await page.evaluate(()=>((window as any).LearnC4Catalog.currentPage()))).toBe('learnInvalid');await expect(page.getByRole('heading',{name:'Prévia indisponível'})).toBeVisible();await page.goto('http://localhost:3000/?learn-preview=c4-delayed#/learn/en/reviews');expect(await page.evaluate(()=>((window as any).LearnC4Catalog.currentPage()))).toBe('learnEn');await expect(page.getByRole('heading',{name:'Revisões D+2 e D+7'})).toBeVisible();
});

test('C4 derives D+2/D+7 from actual English pilot completion, resumes drafts, records intervals and avoids duplicate events',async({page})=>{
 const source=pilotEvents('en',8);await seed(page,source);await openReviews(page,'en');
 const d2=page.locator('.learn-delayed-card').filter({hasText:'Revisão D+2'}),d7=page.locator('.learn-delayed-card').filter({hasText:'Revisão D+7'});
 await expect(d2).toContainText('Pendente');await expect(d7).toContainText('Pendente');await d2.getByRole('button',{name:'Começar revisão'}).click();
 await page.locator('.learn-delayed-task input[type=radio]').first().check();await page.getByRole('button',{name:'Registrar resposta'}).click();await expect(page.locator('.learn-pilot-feedback')).toContainText('gabarito');await page.getByRole('button',{name:'Continuar'}).click();
 const answer=page.getByLabel('Sua resposta em inglês');await answer.fill('Hello, I am Alex.');await expect(page.getByRole('status')).toContainText('Rascunho salvo');await page.reload();await expect(page.getByLabel('Sua resposta em inglês')).toHaveValue('Hello, I am Alex.');await page.getByRole('button',{name:'Registrar resposta para revisão'}).click();await expect(page.locator('.learn-pilot-feedback')).toContainText('incerta');
 const first=await snapshot(page);const d2Write=first.events.find((event:any)=>event.taskId==='en-intro-d2-write');expect(d2Write.outcome).toBe('uncertain');expect(d2Write.reviewStatus).toBe('pending');expect(d2Write.assessorKind).toBe('rubricWithReview');expect(d2Write.delayedReview.dueAt).toBe(d2Write.delayedReview.pilotCompletedAt+2*day);expect(d2Write.delayedReview.elapsedMs).toBe(d2Write.submittedAt-d2Write.delayedReview.pilotCompletedAt);expect(d2Write.shownAssistance.some((item:any)=>item.kind==='writtenStimulus'&&item.shownBeforeAttempt)).toBe(true);expect(d2Write.isIndependentClaimAllowed).toBe(false);
 await page.getByRole('button',{name:'Ver exemplos após a tentativa'}).click();await expect(page.locator('.learn-pilot-models')).toBeVisible();await page.getByRole('button',{name:'Continuar'}).click();await expect(d2).toContainText('Concluída');
 await d7.getByRole('button',{name:'Começar revisão'}).click();await page.locator('.learn-delayed-task input[type=radio]').first().check();await page.getByRole('button',{name:'Registrar resposta'}).click();await page.getByRole('button',{name:'Continuar'}).click();await page.getByLabel('Sua resposta em inglês').fill('I am Alex.');await page.getByRole('button',{name:'Registrar resposta para revisão'}).click();await expect(page.locator('.learn-pilot-feedback')).toContainText('incerta');await page.getByRole('button',{name:'Continuar'}).click();
 const final=await snapshot(page),d7Event=final.events.find((event:any)=>event.taskId==='en-intro-d7-write');expect(d7Event.delayedReview.dueAt).toBe(d7Event.delayedReview.pilotCompletedAt+7*day);expect(d7Event.delayedReview.previousReviewAt).toBeGreaterThan(d7Event.delayedReview.pilotCompletedAt);expect(final.events.filter((event:any)=>event.delayedReview?.attemptId===d2EventAttempt(final.events,'en-intro-d2-read')).length).toBe(2);expect(new Set(final.events.map((event:any)=>event.eventId)).size).toBe(final.events.length);
 await attachStorage(page);const state=final.progress.find((item:any)=>item.sessionKind==='delayedReview'),duplicate=await page.evaluate(async([event,progress])=>(window as any).LearnC4Storage.recordLessonEvent(event,progress),[d7Event,state]);expect(duplicate).toBe(false);expect((await snapshot(page)).events).toHaveLength(final.events.length);
 const backup={format:'2t-learn',version:3,exportedAt:Date.now(),attempts:[],cards:[],planning:[],lessonEvents:final.events,lessonProgress:final.progress};expect(parseBackup(JSON.stringify(backup)).lessonEvents).toHaveLength(final.events.length);expect(parseBackup(JSON.stringify({format:'2t-learn',version:1,exportedAt:1,attempts:[],cards:[]})).version).toBe(1);expect(parseBackup(JSON.stringify({format:'2t-learn',version:2,exportedAt:1,attempts:[],cards:[],planning:[]})).version).toBe(2);
});
function d2EventAttempt(events:any[],taskId:string){return events.find(event=>event.taskId===taskId)?.delayedReview?.attemptId;}

test('late reviews can be skipped without fabricated help and retried without penalty',async({page})=>{
 await seed(page,pilotEvents('en',10));await openReviews(page,'en');const d2=page.locator('.learn-delayed-card').filter({hasText:'Revisão D+2'});await d2.getByRole('button',{name:'Marcar como não avaliada'}).click();await expect(d2).toContainText('Não avaliada');
 let data=await snapshot(page),skipped=data.events.filter((event:any)=>event.delayedReview?.probeId==='en-intro-d2');expect(skipped).toHaveLength(2);expect(skipped.every((event:any)=>event.outcome==='notAssessed'&&event.shownAssistance.length===0)).toBe(true);
 await d2.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.getByRole('heading',{name:'Leia o novo contexto'})).toBeVisible();await page.getByRole('button',{name:'Pular revisão sem penalização'}).click();await expect(page.getByRole('heading',{name:'Revisões · Inglês'})).toBeVisible();data=await snapshot(page);const attempts=data.progress.find((item:any)=>item.sessionKind==='delayedReview').delayedReview.attempts.filter((item:any)=>item.probeId==='en-intro-d2');expect(attempts).toHaveLength(2);expect(attempts[1].attemptId).not.toBe(attempts[0].attemptId);expect(data.events.filter((event:any)=>event.delayedReview?.probeId==='en-intro-d2'&&event.outcome==='notAssessed')).toHaveLength(4);expect(parseBackup(JSON.stringify({format:'2t-learn',version:3,exportedAt:Date.now(),attempts:[],cards:[],planning:[],lessonEvents:data.events,lessonProgress:data.progress})).lessonProgress).toHaveLength(1);
});

test('Russian review keeps language history isolated and records lexical cue and phonetic keyboard',async({page})=>{
 await seed(page,[...pilotEvents('en',9),...pilotEvents('ru',9)]);await openReviews(page,'ru');const d2=page.locator('.learn-delayed-card').filter({hasText:'Revisão D+2'});await d2.getByRole('button',{name:'Começar revisão'}).click();await page.locator('.learn-delayed-task input[type=radio]').first().check();await page.getByRole('button',{name:'Registrar resposta'}).click();await page.getByRole('button',{name:'Continuar'}).click();
 const input=page.locator('learn-phonetic-editor textarea');await expect(input).toBeVisible();await input.fill('Где находится больница?');await page.getByRole('button',{name:'Registrar resposta para revisão'}).click();await expect(page.locator('.learn-pilot-feedback')).toContainText('incerta');const data=await snapshot(page),writing=data.events.find((event:any)=>event.taskId==='ru-dir-d2-write');expect(writing.language).toBe('ru');expect(writing.outcome).toBe('uncertain');expect(writing.shownAssistance.some((item:any)=>item.kind==='lexical-cue'&&item.value==='больница'&&item.shownBeforeAttempt)).toBe(true);expect(writing.shownAssistance.some((item:any)=>item.kind==='phoneticKeyboard'&&item.shownBeforeAttempt)).toBe(true);expect(data.events.filter((event:any)=>event.unitId==='en-pilot-introductions-01').every((event:any)=>event.language==='en')).toBe(true);expect(parseBackup(JSON.stringify({format:'2t-learn',version:3,exportedAt:Date.now(),attempts:[],cards:[],planning:[],lessonEvents:data.events,lessonProgress:data.progress})).lessonEvents).toHaveLength(data.events.length);await page.getByRole('button',{name:'Continuar'}).click();
});

test('C4 cards remain readable and overflow-free from mobile through desktop in both themes',async({page})=>{
 await seed(page,pilotEvents('en',1));await openReviews(page,'en');
 for(const theme of ['dark','light']){
  await page.locator('html').evaluate((element:any,value)=>element.dataset.theme=value,theme);
  for(const width of [320,390,768,1366]){
   await page.setViewportSize({width,height:900});const layout=await page.locator('.learn-delayed-grid').evaluate(element=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,columns:getComputedStyle(element).gridTemplateColumns.split(' ').length,cardWidth:element.querySelector('article')?.getBoundingClientRect().width||0}));
   expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);expect(layout.cardWidth).toBeGreaterThan(200);expect(layout.columns).toBe(width<=650?1:2);
  }
 }
});
