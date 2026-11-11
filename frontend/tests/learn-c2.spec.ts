import {test,expect,type Page} from '@playwright/test';
import {buildSync} from 'esbuild';
import {parseBackup} from '../src/learn/backup';
import {isLearnC2PreviewEnabled,isLearnPilotPreviewEnabled} from '../src/learn/pilot-preview';

const c2='/?learn-preview=c2#/learn/ru/pilot-c2';
const c1='/?learn-preview=c1#/learn/en/pilot-c1';
async function openRussian(page:Page){
 await page.goto(c2);await expect(page.locator('learn-pilot-player')).toBeVisible();
 await expect(page.locator('#pilot-title')).toContainText('Encontrando uma estação de metrô');
 await expect(page.getByRole('heading',{name:'Objetivo da aula'})).toBeVisible();
}
async function openTransfer(page:Page){
 await openRussian(page);await page.getByRole('button',{name:'Começar'}).click();
 await expect(page.locator('.learn-pilot-dialogue li')).toHaveCount(4);
 await expect(page.locator('.learn-pilot-dialogue')).toHaveAttribute('lang','ru');
 await page.getByRole('button',{name:'Ir para as perguntas'}).click();
 await page.getByLabel('Porque o bilhete precisa ser comprado na farmácia',{exact:true}).check();
 await page.getByRole('button',{name:'Registrar resposta'}).click();
 await expect(page.locator('.learn-pilot-feedback')).toContainText('O diálogo não fala sobre comprar bilhetes');
 await page.getByRole('button',{name:'Tentar novamente'}).click();
 await page.getByLabel('Porque a estação fica perto da farmácia',{exact:true}).check();
 await page.getByRole('button',{name:'Registrar resposta'}).click();await page.getByRole('button',{name:'Continuar'}).click();
 await page.getByLabel('Direita',{exact:true}).check();await page.getByRole('button',{name:'Registrar resposta'}).click();
 await expect(page.locator('.learn-pilot-feedback')).toContainText("'Направо' seria à direita");
 await page.getByRole('button',{name:'Tentar novamente'}).click();
 await page.getByLabel('Esquerda',{exact:true}).check();await page.getByRole('button',{name:'Registrar resposta'}).click();await page.getByRole('button',{name:'Continuar'}).click();
 await expect(page.getByRole('heading',{name:'Perceba como a conversa continua'})).toBeVisible();
 await expect(page.locator('.learn-pilot-explanation')).toContainText('Извините');
 await page.getByRole('button',{name:'Concluir observação'}).click();
 await expect(page.locator('.learn-pilot-feedback')).toContainText('não é uma avaliação de competência');
 await page.getByRole('button',{name:'Continuar'}).click();await expect(page.locator('learn-phonetic-editor')).toBeVisible();
}
async function attachStorage(page:Page){
 const code=buildSync({entryPoints:['frontend/src/learn/storage.ts'],bundle:true,format:'iife',globalName:'LearnC2Storage',write:false,platform:'browser'}).outputFiles[0].text;
 await page.route('**/learn-c2-storage-test.js',route=>route.fulfill({contentType:'application/javascript',body:code}));
 await page.addScriptTag({url:'/learn-c2-storage-test.js'});
}

test('C2 preview requires its own loopback flag and stays unavailable on public hosts',async({page})=>{
 for(const host of ['matheus2t.com.br','www.matheus2t.com.br','matheus2t.vercel.app','preview.vercel.app','remote.example']){
  expect(isLearnC2PreviewEnabled(host,'?learn-preview=c2')).toBe(false);
 }
 expect(isLearnC2PreviewEnabled('localhost','')).toBe(false);
 expect(isLearnC2PreviewEnabled('localhost','?learn-preview=c1')).toBe(false);
 expect(isLearnC2PreviewEnabled('localhost','?learn-preview=c2')).toBe(true);
 expect(isLearnPilotPreviewEnabled('c2','127.0.0.1','?learn-preview=c2')).toBe(true);
 await page.goto('/#/learn/ru/pilot-c2');
 await expect(page.getByRole('heading',{name:'Página do Learn não encontrada'})).toBeVisible();
 await expect(page.locator('learn-pilot-player')).toHaveCount(0);
 await page.goto(c2);await expect(page.locator('learn-pilot-player')).toBeVisible();
});

test('Russian lesson shares the runner, gives distractor feedback, and keeps open answers uncertain',async({page})=>{
 await openTransfer(page);
 const editor=page.locator('learn-phonetic-editor textarea');
 await editor.fill('shch');await expect(editor).toHaveValue('щ');
 await expect(page.locator('.learn-pilot-count')).toContainText('1/4.000');
 await expect(page.getByRole('button',{name:/Fonético ligado/})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Registrar tentativa'}).click();
 await expect(page.locator('.learn-pilot-feedback')).toContainText('avaliação incerta');
 await expect(page.locator('learn-open-response-review')).toContainText('Teclado fonético');await expect(page.locator('learn-open-response-review dd[lang="ru"]')).toContainText('щ');
 await page.getByRole('button',{name:'Continuar'}).click();
 await expect(page.getByRole('heading',{name:'Encontre a biblioteca'})).toBeVisible();
 await expect(page.getByText('foi fornecida no enunciado e será registrada como ajuda lexical')).toBeVisible();
 const transfer=page.locator('learn-phonetic-editor textarea');
 await transfer.fill('Извините, где библиотека?');
 await page.getByRole('button',{name:'Registrar tentativa'}).click();
 await expect(page.locator('.learn-pilot-feedback')).toContainText('avaliação incerta');
 await expect(page.locator('learn-open-response-review')).toContainText('Pista de vocabulário');await expect(page.locator('learn-open-response-review dd[lang="ru"]')).toContainText('Извините, где библиотека?');
 const events=await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('2t-learn');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const tx=db.transaction('lessonEvents','readonly'),r=tx.objectStore('lessonEvents').index('unitId').getAll('ru-pilot-directions-01');
  const rows=await new Promise<any[]>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return rows;
 });
 const guided=events.find(event=>event.taskId==='ru-dir-p1');
 expect(guided.language).toBe('ru');expect(guided.outcome).toBe('uncertain');expect(guided.feedback).toBeNull();
 expect(guided.shownAssistance.some((item:any)=>item.kind==='phoneticKeyboard'&&item.shownBeforeAttempt)).toBe(true);
 const submittedTransfer=events.find(event=>event.taskId==='ru-dir-t1');
 expect(submittedTransfer.response).toBe('Извините, где библиотека?');expect(submittedTransfer.outcome).toBe('uncertain');
 expect(submittedTransfer.isIndependentClaimAllowed).toBe(false);
 expect(submittedTransfer.shownAssistance.some((item:any)=>item.kind==='lexical-cue'&&item.value==='библиотека'&&item.shownBeforeAttempt)).toBe(true);
 expect(submittedTransfer.shownAssistance.some((item:any)=>item.kind==='phoneticKeyboard'&&item.shownBeforeAttempt)).toBe(true);
 await page.getByRole('button',{name:'Continuar'}).click();await expect(page.getByRole('heading',{name:'Resumo'})).toBeVisible();
 await expect(page.locator('.learn-pilot-summary')).toContainText('2/2 perguntas de compreensão');
 await expect(page.locator('.learn-pilot-summary')).toContainText('2/2 etapas abertas tentadas');
});

test('Russian draft resumes after reload and remains isolated from English pilot progress',async({page})=>{
 await openTransfer(page);const editor=page.locator('learn-phonetic-editor textarea');
 await editor.fill('shch');await expect(page.getByRole('status')).toContainText('Rascunho salvo neste navegador.');
 await page.reload();await expect(page.locator('learn-phonetic-editor textarea')).toHaveValue('щ');
 await page.goto(c1);await expect(page.locator('learn-pilot-player')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Objetivo da aula'})).toBeVisible();
 await expect(page.locator('learn-phonetic-editor')).toHaveCount(0);
 await page.goto(c2);await expect(page.locator('learn-phonetic-editor textarea')).toHaveValue('щ');
 const states=await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('2t-learn');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const tx=db.transaction('lessonProgress','readonly'),r=tx.objectStore('lessonProgress').getAll();
  const rows=await new Promise<any[]>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return rows;
 });
 expect(states.map(state=>state.key)).toContain('ru:ru-pilot-directions-01');
 expect(states.map(state=>state.key)).not.toContain('en:ru-pilot-directions-01');
 expect(states.find(state=>state.key==='ru:ru-pilot-directions-01').drafts[0].response).toBe('щ');
});

test('v1/v2 imports and Russian v3 evidence round-trip preserve language ownership',async({page})=>{
 await page.goto('/');await attachStorage(page);
 const snapshot=await page.evaluate(async()=>{
  const s=(window as any).LearnC2Storage;
  const attempt={id:'legacy-c2',language:'ru',itemId:'ru-word-001',skill:'vocabulary',topic:'Cumprimentos',answer:'привет',expected:'привет',correct:true,at:100,seconds:3};
  await s.restoreBackup(JSON.stringify({format:'2t-learn',version:1,exportedAt:100,attempts:[attempt],cards:[]}),true);
  await s.restoreBackup(JSON.stringify({format:'2t-learn',version:2,exportedAt:100,attempts:[attempt],cards:[],planning:[]}),true);
  const now=Date.now(),unitId='ru-pilot-directions-01',taskId='ru-dir-t1';
  const help=[{kind:'lexical-cue',value:'библиотека',taskId,shownAt:now-2,shownBeforeAttempt:true},{kind:'phoneticKeyboard',value:'Teclado fonético russo disponível no campo de resposta.',taskId,shownAt:now-2,shownBeforeAttempt:true}];
  const progress={key:'ru:ru-pilot-directions-01',language:'ru',unitId,contentVersion:1,currentStage:6,shownAssistance:help.map(({shownBeforeAttempt,...item}:any)=>item),drafts:[],updatedAt:now};
  const event={eventId:'ru-transfer-event',language:'ru',unitId,contentVersion:1,taskId,taskKind:'transfer',evidenceKind:'transfer',response:'Извините, где библиотека?',shownAssistance:help,startedAt:now-1,submittedAt:now,outcome:'uncertain',reviewStatus:'pending',assessorKind:'rubricWithReview',feedback:null,sourceContext:`${unitId}@1/${taskId}`,isIndependentClaimAllowed:false};
  await s.recordLessonEvent(event,progress);return await s.snapshot();
 });
 expect(snapshot.version).toBe(3);expect(snapshot.attempts[0].language).toBe('ru');
 const parsed=parseBackup(JSON.stringify(snapshot));expect(parsed.lessonEvents?.[0].language).toBe('ru');
 expect(parsed.lessonProgress?.[0].key).toBe('ru:ru-pilot-directions-01');
 expect(()=>parseBackup(JSON.stringify({...snapshot,lessonEvents:[{...snapshot.lessonEvents[0],language:'en'}]}))).toThrow();
});

test('Russian pilot layout stays responsive in both themes',async({page})=>{
 for(const theme of ['dark','light'] as const){
  await page.emulateMedia({colorScheme:theme});
  for(const width of [320,390,768,1366]){
   await page.setViewportSize({width,height:900});await page.goto(c2);
   await expect(page.locator('#pilot-title')).toBeVisible();await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
   const metrics=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,dialogue:document.querySelector('.learn-pilot')?.getBoundingClientRect().width}));
   expect(metrics.scrollWidth,`overflow at ${width}px/${theme}`).toBeLessThanOrEqual(metrics.width);expect(metrics.dialogue).toBeGreaterThan(0);
  }
 }
});
