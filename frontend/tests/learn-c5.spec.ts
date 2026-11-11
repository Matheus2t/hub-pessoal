import {test,expect,type Page} from '@playwright/test';
import {buildSync} from 'esbuild';
import {readFileSync} from 'node:fs';
import {parseBackup} from '../src/learn/backup';
import {isLearnDelayedReviewPreviewEnabled,isLearnDiagnosticPreviewEnabled,isLearnIntegrationPreviewEnabled,isLearnPilotPreviewEnabled} from '../src/learn/pilot-preview';
import {summarizeLearnIntegration} from '../src/learn/integration';

const day=86_400_000;
type Language='en'|'ru';
function pilotEvents(daysAgo=10){
 const language:Language='en',unitId='en-pilot-introductions-01',ids=['en-intro-c1','en-intro-c2','en-intro-n1','en-intro-p1','en-intro-t1'];
 return ids.map((taskId,index)=>{
  const kind=index<2?'comprehension':index===2?'notice':index===3?'guidedProduction':'transfer';
  const submittedAt=Date.now()-daysAgo*day-(ids.length-index-1)*1000;
  return {eventId:`c5-seed:${taskId}`,language,unitId,contentVersion:1,taskId,taskKind:kind,evidenceKind:kind==='notice'?'practiceOnly':kind,response:index===2?'':'registro de teste',shownAssistance:[],startedAt:submittedAt-500,submittedAt,outcome:kind==='notice'?'notAssessed':kind==='comprehension'?'supported':'uncertain',reviewStatus:kind==='notice'||kind==='comprehension'?'notRequired':'pending',assessorKind:kind==='notice'?'unavailable':kind==='comprehension'?'deterministic':'rubricWithReview',feedback:null,sourceContext:`${unitId}@1/${taskId}`,isIndependentClaimAllowed:kind==='transfer'&&language==='en'};
 });
}
function installHarness(page:Page){
 const pageCode=buildSync({entryPoints:['frontend/src/learn/page.ts'],bundle:true,format:'iife',globalName:'LearnC5Page',write:false,platform:'browser'}).outputFiles[0].text;
 const catalogCode=buildSync({entryPoints:['frontend/src/catalog.ts'],bundle:true,format:'iife',globalName:'LearnC5Catalog',write:false,platform:'browser'}).outputFiles[0].text;
 const assets:Record<string,{body:string|Buffer;contentType:string}>={
  '/':{body:'<!doctype html><html lang="pt-BR" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><learn-page language="en" activity="integration"></learn-page><script src="/learn-c5-page.js"></script><script src="/learn-c5-catalog.js"></script></body></html>',contentType:'text/html'},
  '/styles.css':{body:readFileSync('dist/styles.css'),contentType:'text/css'},
  '/learn-c5-page.js':{body:pageCode,contentType:'text/javascript'},
  '/learn-c5-catalog.js':{body:catalogCode,contentType:'text/javascript'},
  '/learn/en.json':{body:readFileSync('frontend/public/learn/en.json'),contentType:'application/json'},
  '/learn/ru.json':{body:readFileSync('frontend/public/learn/ru.json'),contentType:'application/json'}
 };
 return page.route('**/*',async route=>{const url=new URL(route.request().url()),asset=assets[url.pathname];if(url.hostname==='localhost'&&url.port==='3000'&&asset)await route.fulfill({status:200,contentType:asset.contentType,body:asset.body});else await route.fulfill({status:404,body:'not found'});});
}
async function seed(page:Page){
 await installHarness(page);
 await page.goto('http://localhost:3000/?learn-preview=c5-integration#/learn/en/integration');
 const storage=buildSync({entryPoints:['frontend/src/learn/storage.ts'],bundle:true,format:'iife',globalName:'LearnC5Storage',write:false,platform:'browser'}).outputFiles[0].text;
 await page.addScriptTag({content:storage});
 await page.evaluate(async events=>{await (window as any).LearnC5Storage.restoreBackup(JSON.stringify({format:'2t-learn',version:3,exportedAt:Date.now(),attempts:[],cards:[],planning:[],lessonEvents:events,lessonProgress:[]}),true);},pilotEvents());
 await page.reload();
}

test('C5 umbrella preview is exact and never permits public hosts',async()=>{
 for(const host of ['matheus2t.com.br','www.matheus2t.com.br','matheus2t.vercel.app','preview-hub.vercel.app']){
  expect(isLearnIntegrationPreviewEnabled(host,'?learn-preview=c5-integration')).toBe(false);
  expect(isLearnPilotPreviewEnabled('c1',host,'?learn-preview=c5-integration')).toBe(false);
  expect(isLearnPilotPreviewEnabled('c2',host,'?learn-preview=c5-integration')).toBe(false);
  expect(isLearnDiagnosticPreviewEnabled('en',host,'?learn-preview=c5-integration')).toBe(false);
  expect(isLearnDelayedReviewPreviewEnabled(host,'?learn-preview=c5-integration')).toBe(false);
 }
 expect(isLearnIntegrationPreviewEnabled('localhost','?learn-preview=c5-integration')).toBe(true);
 expect(isLearnPilotPreviewEnabled('c1','localhost','?learn-preview=c5-integration')).toBe(true);
 expect(isLearnDiagnosticPreviewEnabled('ru','[::1]','?learn-preview=c5-integration')).toBe(true);
 expect(isLearnDelayedReviewPreviewEnabled('127.0.0.1','?learn-preview=c5-integration')).toBe(true);
 expect(isLearnIntegrationPreviewEnabled('localhost','?learn-preview=c5-integration&extra=1')).toBe(true);
 expect(isLearnIntegrationPreviewEnabled('localhost','?learn-preview=c5')).toBe(false);
});

test('C5 summary isolates languages and separates evaluated, uncertain and not assessed evidence',async()=>{
 const data:any={format:'2t-learn',version:3,exportedAt:Date.now(),attempts:[],cards:[],planning:[],lessonEvents:pilotEvents(),lessonProgress:[]};
 const en=summarizeLearnIntegration(data,'en'),ru=summarizeLearnIntegration(data,'ru');
 expect(en.pilot.completedTasks).toBe(5);expect(en.pilot.completedAt).toBeGreaterThan(0);
 expect(en.reviews.map(item=>item.status)).toEqual(['due','due']);
 expect(en.evidence).toMatchObject({evaluated:2,uncertain:2,notAssessed:1,pendingReview:2,difficulties:0});
 expect(ru.pilot.completedTasks).toBe(0);expect(ru.evidence.evaluated+ru.evidence.uncertain+ru.evidence.notAssessed).toBe(0);
 expect(en.suggestions.some(item=>item.kind==='reviews'&&item.title==='Revisão D+2')).toBe(true);
 for(const version of [1,2,3] as const){const legacy={format:'2t-learn',version,exportedAt:Date.now(),attempts:[],cards:[],...(version>=2?{planning:[]}:{}),...(version===3?{lessonEvents:data.lessonEvents,lessonProgress:[]}:{})};expect(parseBackup(JSON.stringify(legacy)).version).toBe(version);}
});

test('C5 hub, daily plan and dashboard share one local evidence snapshot without rewriting the legacy plan',async({page})=>{
 await seed(page);
 const routePages=await page.evaluate(()=>{const pages:string[]=[];for(const route of ['#/learn/en/integration','#/learn/en/pilot-c1','#/learn/ru/integration','#/learn/ru/diagnostic','#/learn/ru/reviews']){location.hash=route;pages.push((window as any).LearnC5Catalog.currentPage());}location.hash='#/learn/en/integration';return pages;});
 expect(routePages).toEqual(['learnEn','learnEn','learnRu','learnRu','learnRu']);
 await expect(page.locator('learn-integration-hub')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Inglês',exact:true})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Etapas de aprendizagem'}).getByRole('link')).toHaveCount(5);
 await expect(page.getByRole('link',{name:'Aula-piloto'})).toHaveAttribute('href','#/learn/en/pilot-c1');
 await expect(page.getByRole('link',{name:'Diagnóstico'})).toHaveAttribute('href','#/learn/en/diagnostic');
 await expect(page.getByRole('link',{name:'Revisões D+2 / D+7'})).toHaveAttribute('href','#/learn/en/reviews');
 await page.locator('learn-page').evaluate((element:any)=>element.activity='');
 await expect(page.getByRole('link',{name:'Percurso integrado'})).toHaveAttribute('href','#/learn/en/integration');
 await page.locator('learn-page').evaluate((element:any)=>element.activity='integration');await expect(page.locator('learn-integration-hub')).toBeVisible();
 await page.locator('learn-page').evaluate((element:any)=>element.activity='daily');
 await expect(page.locator('.learn-c5-panel')).toContainText('fora da meta do plano legado');
 await expect(page.locator('learn-daily')).toContainText('Monte o plano para começar');
 await page.locator('learn-page').evaluate((element:any)=>element.activity='dashboard');
 const evidence=page.locator('learn-integration-evidence');await expect(evidence).toContainText('Avaliadas');await expect(evidence).toContainText('Incertas');await expect(evidence).toContainText('Não avaliadas');
 await expect(evidence).toContainText('2');await expect(evidence).toContainText('Estas evidências não estimam fluência nem nível CEFR');
 const snapshot=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('2t-learn');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const tx=db.transaction('planning','readonly');const result=await new Promise<number>((resolve,reject)=>{const r=tx.objectStore('planning').count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return result;});expect(snapshot).toBe(0);
 await page.locator('learn-page').evaluate((element:any)=>{element.language='ru';element.activity='integration'});await expect(page.getByRole('heading',{name:'Russo',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Aula-piloto'})).toHaveAttribute('href','#/learn/ru/pilot-c2');await expect(page.locator('learn-integration-hub')).toContainText('0/5 tarefas');
});

test('C5 layout remains readable without horizontal overflow on mobile and desktop in both themes',async({page})=>{
 await seed(page);
 for(const theme of ['dark','light'])for(const width of [320,390,768,1366]){
  await page.locator('html').evaluate((element:any,value)=>element.dataset.theme=value,theme);await page.setViewportSize({width,height:900});
  for(const activity of ['integration','daily','dashboard']){
   await page.locator('learn-page').evaluate((element:any,value)=>element.activity=value,activity);
   if(activity==='integration')await expect(page.locator('learn-integration-hub')).toBeVisible();
   if(activity==='daily')await expect(page.locator('.learn-c5-panel')).toBeVisible();
   if(activity==='dashboard')await expect(page.locator('learn-integration-evidence')).toBeVisible();
   const layout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(layout.scrollWidth,`${activity} overflows at ${width}px/${theme}`).toBeLessThanOrEqual(layout.clientWidth);
  }
 }
});
