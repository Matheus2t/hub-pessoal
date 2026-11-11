import {test,expect,type Page} from '@playwright/test';
import {buildSync} from 'esbuild';
import {parseBackup} from '../src/learn/backup';
import {isLearnC1PreviewEnabled} from '../src/learn/pilot-preview';

const previewUrl='/?learn-preview=c1#/learn/en/pilot-c1';
async function openPilot(page:Page){await page.goto(previewUrl);await expect(page.locator('learn-c1-pilot')).toBeVisible();await expect(page.locator('#pilot-title')).toBeVisible();await expect(page.getByRole('heading',{name:'Objetivo da aula'})).toBeVisible();}
async function answerClosed(page:Page,answer:string){await page.getByLabel(answer,{exact:true}).check();await page.getByRole('button',{name:'Registrar resposta'}).click();}
async function reachGuidedProduction(page:Page){
 await openPilot(page);await page.getByRole('button',{name:'Começar'}).click();await page.getByRole('button',{name:'Abrir glossário'}).click();
 await expect(page.locator('.learn-pilot-glossary')).toContainText('What about you?');await page.getByRole('button',{name:'Ver resumo em português'}).click();
 await page.getByRole('button',{name:'Ir para as perguntas'}).click();await answerClosed(page,'Análise de dados');await expect(page.locator('.learn-pilot-feedback')).toContainText('Compreensão correta');await page.getByRole('button',{name:'Continuar'}).click();
 await answerClosed(page,'Convidar Maya a falar sobre si');await page.getByRole('button',{name:'Continuar'}).click();
 await expect(page.getByRole('heading',{name:'Perceba como a conversa continua'})).toBeVisible();
 await page.getByLabel('Sua observação (opcional)').fill('A conversa volta para a outra pessoa.');await page.getByRole('button',{name:'Concluir observação'}).click();await expect(page.locator('.learn-pilot-feedback')).toContainText('não é uma avaliação');await page.getByRole('button',{name:'Continuar'}).click();
}
async function attachStorage(page:Page){
 const code=buildSync({entryPoints:['frontend/src/learn/storage.ts'],bundle:true,format:'iife',globalName:'LearnC1Storage',write:false,platform:'browser'}).outputFiles[0].text;
 await page.route('**/learn-c1-storage-test.js',route=>route.fulfill({contentType:'application/javascript',body:code}));await page.addScriptTag({url:'/learn-c1-storage-test.js'});
}

test('preview route and entry link stay disabled without the explicit flag',async({page})=>{
 expect(isLearnC1PreviewEnabled('matheus2t.com.br','?learn-preview=c1')).toBe(false);
 expect(isLearnC1PreviewEnabled('www.matheus2t.com.br','?learn-preview=c1')).toBe(false);
 expect(isLearnC1PreviewEnabled('matheus2t.vercel.app','?learn-preview=c1')).toBe(false);
 expect(isLearnC1PreviewEnabled('preview-hub.vercel.app','')).toBe(false);
 expect(isLearnC1PreviewEnabled('localhost','?learn-preview=c1')).toBe(true);
 await page.goto('/#/learn/en/pilot-c1');await expect(page.getByRole('heading',{name:'Página do Learn não encontrada'})).toBeVisible();await expect(page.locator('learn-c1-pilot')).toHaveCount(0);
 await page.goto('/#/learn/en');await expect(page.locator('.learn-c1-preview-link')).toHaveCount(0);
});

test('the declarative English pilot renders contextual dialogue and question-specific closed feedback',async({page})=>{
 await openPilot(page);await expect(page.getByText('Consigo me apresentar, dizer brevemente o que estudo ou faço e perguntar sobre outra pessoa.')).toBeVisible();
 await page.getByRole('button',{name:'Começar'}).click();await expect(page.locator('.learn-pilot-dialogue li')).toHaveCount(5);await expect(page.locator('.learn-pilot-dialogue')).toHaveAttribute('lang','en');
 await page.getByRole('button',{name:'Ir para as perguntas'}).click();await answerClosed(page,'Inglês');
 await expect(page.locator('.learn-pilot-feedback')).toContainText('Maya diz');await expect(page.locator('.learn-pilot-feedback')).toContainText('Revise a explicação');
 await page.getByRole('button',{name:'Tentar novamente'}).click();await answerClosed(page,'Análise de dados');await expect(page.locator('.learn-pilot-feedback')).toContainText('Compreensão correta nesta pergunta');
});

test('open answers stay uncertain even when they exactly match a model; help is recorded per attempt',async({page})=>{
 await reachGuidedProduction(page);await expect(page.getByRole('button',{name:'Ver exemplos após a tentativa'})).toHaveCount(0);
 await page.getByLabel('Sua resposta em inglês').fill("Hi, I'm Sam. I study programming.");
 await page.locator('details.learn-pilot-help').filter({has:page.getByText('Ver uma frase inicial')}).locator('summary').click();
 await page.getByRole('button',{name:'Registrar tentativa'}).click();await expect(page.locator('.learn-pilot-feedback')).toContainText('avaliação incerta');
 await expect(page.locator('.learn-pilot-feedback')).toContainText('não há revisor semântico confiável');
 const first=await page.evaluate(async()=>{const request=indexedDB.open('2t-learn');const db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});const tx=db.transaction('lessonEvents','readonly');const rows=await new Promise<any[]>((resolve,reject)=>{const req=tx.objectStore('lessonEvents').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();return rows.find(event=>event.taskId==='en-intro-p1')});
 expect(first.outcome).toBe('uncertain');expect(first.assessorKind).toBe('rubricWithReview');expect(first.reviewStatus).toBe('pending');expect(first.feedback).toBeNull();expect(first.isIndependentClaimAllowed).toBe(false);expect(first.shownAssistance.some((item:any)=>item.kind==='sentenceStarter')).toBe(true);
 await page.getByRole('button',{name:'Nova tentativa'}).click();await expect(page.getByLabel('Sua resposta em inglês')).toHaveValue('');
 await page.getByRole('button',{name:'Ver exemplos da tentativa anterior'}).click();await expect(page.locator('.learn-pilot-models')).toContainText('Hi, I\'m Sam. I study programming.');
 await page.getByLabel('Sua resposta em inglês').fill("Hi, I'm Sam. I study programming.");await page.getByRole('button',{name:'Registrar tentativa'}).click();
 const events=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('2t-learn');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const tx=db.transaction('lessonEvents','readonly');const r=tx.objectStore('lessonEvents').getAll();const rows=await new Promise<any[]>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return rows});
 const guidedRetry=events.filter(event=>event.taskId==='en-intro-p1').sort((a,b)=>a.submittedAt-b.submittedAt).at(-1);expect(guidedRetry.outcome).toBe('uncertain');expect(guidedRetry.isIndependentClaimAllowed).toBe(false);expect(guidedRetry.shownAssistance.some((item:any)=>item.kind==='modelAnswer'&&!item.shownBeforeAttempt)).toBe(true);
 await page.getByRole('button',{name:'Continuar'}).click();await page.getByLabel('Sua resposta em inglês').fill("Hello, I'm Marina. I work in data analysis. What do you study?");await page.getByRole('button',{name:'Registrar tentativa'}).click();
 const allEvents=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('2t-learn');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const tx=db.transaction('lessonEvents','readonly');const r=tx.objectStore('lessonEvents').getAll();const rows=await new Promise<any[]>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return rows});
 const transfer=allEvents.find(event=>event.taskId==='en-intro-t1');expect(transfer.outcome).toBe('uncertain');expect(transfer.feedback).toBeNull();expect(transfer.isIndependentClaimAllowed).toBe(false);expect(transfer.shownAssistance.some((item:any)=>item.kind==='modelAnswer')).toBe(true);
 await page.getByRole('button',{name:'Continuar'}).click();await expect(page.getByRole('heading',{name:'Resumo'})).toBeVisible();await expect(page.locator('.learn-pilot-summary')).toContainText('2/2 etapas abertas tentadas');await expect(page.locator('.learn-pilot-summary')).toContainText('3 respostas registradas como uncertain');
});

test('draft, current stage and submitted evidence recover after reload without duplicates',async({page})=>{
 await reachGuidedProduction(page);const input=page.getByLabel('Sua resposta em inglês');await input.fill('Hello, I am Alex.');await expect(page.getByRole('status')).toContainText('Rascunho salvo neste navegador.');
 await page.reload();await expect(page.getByRole('heading',{name:'Sua vez de se apresentar'})).toBeVisible();await expect(page.getByLabel('Sua resposta em inglês')).toHaveValue('Hello, I am Alex.');
 await page.getByRole('button',{name:'Registrar tentativa'}).click();await expect(page.locator('.learn-pilot-feedback')).toContainText('avaliação incerta');await page.reload();await expect(page.locator('.learn-pilot-feedback')).toContainText('avaliação incerta');await expect(page.getByLabel('Sua resposta em inglês')).toHaveCount(0);
 const count=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('2t-learn');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const tx=db.transaction('lessonEvents','readonly');const req=tx.objectStore('lessonEvents').index('unitId').count('en-pilot-introductions-01');const n=await new Promise<number>((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();return n});expect(count).toBe(4); // two comprehension, one notice and one open response
});

test('IndexedDB v3 migrates additively, saves events idempotently and round-trips v1/v2/v3 atomically',async({page})=>{
 await page.goto('/');await attachStorage(page);
 const result=await page.evaluate(async()=>{
  const s=(window as any).LearnC1Storage;const attempt={id:'legacy-vocabulary',language:'en',itemId:'en-word-001',skill:'vocabulary',topic:'Cumprimentos',answer:'olá',expected:'olá',correct:true,at:100,seconds:3};
  const legacyV1={format:'2t-learn',version:1,exportedAt:100,attempts:[attempt],cards:[]};const legacyV2={format:'2t-learn',version:2,exportedAt:100,attempts:[attempt],cards:[],planning:[]};
  await s.restoreBackup(JSON.stringify(legacyV1),true);let migrated=await s.snapshot();const afterV1={v:migrated.version,attempts:migrated.attempts.length,events:migrated.lessonEvents.length,progress:migrated.lessonProgress.length};
  await s.restoreBackup(JSON.stringify(legacyV2),true);
  const now=Date.now(),state={key:'en:en-pilot-introductions-01',language:'en',unitId:'en-pilot-introductions-01',contentVersion:1,currentStage:5,shownAssistance:[],drafts:[{taskId:'en-intro-t1',eventId:'draft-1',response:'Hello',startedAt:now-1,updatedAt:now}],updatedAt:now};
  const event={eventId:'event-1',language:'en',unitId:'en-pilot-introductions-01',contentVersion:1,taskId:'en-intro-p1',taskKind:'guidedProduction',evidenceKind:'guidedProduction',response:'Hi, I am Alex.',shownAssistance:[],startedAt:now-100,submittedAt:now,outcome:'uncertain',reviewStatus:'pending',assessorKind:'rubricWithReview',feedback:null,sourceContext:'en-pilot-introductions-01@1/en-intro-p1',isIndependentClaimAllowed:false};
  await s.recordLessonEvent(event,state);const insertedAgain=await s.recordLessonEvent(event,state);const v3=await s.snapshot();const raw=JSON.stringify(v3);let oldRestoreBlocked=false;try{await s.restoreBackup(JSON.stringify(legacyV2))}catch{oldRestoreBlocked=true;}
  const kept=await s.snapshot();let corruptRejected=false;const broken=JSON.parse(raw);broken.lessonEvents[0].outcome='supported';try{await s.restoreBackup(JSON.stringify(broken),true)}catch{corruptRejected=true;}const afterCorruption=await s.snapshot();
  await s.restoreBackup(JSON.stringify(legacyV1),true);const afterExplicitOld={events:(await s.snapshot()).lessonEvents.length,attempts:(await s.snapshot()).attempts.length};
  return {afterV1,insertedAgain,version:v3.version,eventCount:v3.lessonEvents.length,draftCount:v3.lessonProgress[0].drafts.length,legacyCount:v3.attempts.length,oldRestoreBlocked,keptEvents:kept.lessonEvents.length,corruptRejected,atomicEvents:afterCorruption.lessonEvents.length,afterExplicitOld};
 });
 expect(result).toEqual({afterV1:{v:3,attempts:1,events:0,progress:0},insertedAgain:false,version:3,eventCount:1,draftCount:1,legacyCount:1,oldRestoreBlocked:true,keptEvents:1,corruptRejected:true,atomicEvents:1,afterExplicitOld:{events:0,attempts:1}});
 const invalidV3={format:'2t-learn',version:3,exportedAt:100,attempts:[],cards:[],planning:[],lessonEvents:[{eventId:'bad',outcome:'supported'}],lessonProgress:[]};expect(()=>parseBackup(JSON.stringify(invalidV3))).toThrow();
});

test('IndexedDB failure never reports a saved lesson or submitted answer',async({page})=>{
 await page.addInitScript(()=>{IDBFactory.prototype.open=(()=>{throw new DOMException('blocked','UnknownError')}) as IDBFactory['open'];});
 await page.goto(previewUrl);await expect(page.getByRole('heading',{name:'A aula não pôde ser aberta'})).toBeVisible();await expect(page.getByRole('alert')).toContainText('blocked');await expect(page.getByText('Tentativa registrada neste navegador.')).toHaveCount(0);
});

test('pilot fits narrow and wide viewports in light and dark themes',async({page})=>{
 for(const colorScheme of ['dark','light'] as const){await page.emulateMedia({colorScheme});for(const width of [320,390,768,1366]){await page.setViewportSize({width,height:900});await page.goto(previewUrl);await expect(page.locator('#pilot-title')).toBeVisible();await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},colorScheme);const metrics=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,card:document.querySelector('.learn-pilot-content')?.getBoundingClientRect().width}));expect(metrics.scrollWidth,`horizontal overflow at ${width}px/${colorScheme}`).toBeLessThanOrEqual(metrics.width);expect(metrics.card).toBeGreaterThan(0);}}
});
