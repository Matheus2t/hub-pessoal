import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
import {serveBuiltSite} from './helpers/serve-built-site';
import {isLearnDictationV14PreviewEnabled} from '../src/learn/pilot-preview';
import {parseBackup,validLessonProgress} from '../src/learn/backup';
import {appendV14DictationAttempt} from '../src/learn/dictation-v14-state';
import type {V14DictationAttempt,LessonProgress} from '../src/learn/model';

const attemptId='v14-attempt-0001',editorialCommit='a'.repeat(40),editorialBlobSha='b'.repeat(40),audioSha256='c'.repeat(64);
const now=Date.now();
const attempt:V14DictationAttempt={attemptId,itemId:'en-dict-v14-01',language:'en',level:'A2',linkedStageNodeId:'en-path-05',contentVersion:1,editorialCommit,editorialBlobSha,audioVersion:1,audioSha256,audioStatus:'awaiting_owner_review',response:'I heard a sample.',startedAt:now-5000,submittedAt:now,playback:{completed:true,audibleSeconds:2,coveragePercent:1,playCount:1,playbackRates:[1]},assessmentEnabled:false,matchKind:'disabled',outcome:'uncertain',reviewStatus:'awaiting_review'};
const progress:LessonProgress={key:'v14:en',language:'en',unitId:'v14-dictation',contentVersion:1,currentStage:0,shownAssistance:[],drafts:[],updatedAt:now,v14Dictation:{schemaVersion:1,language:'en',attempts:[attempt],drafts:[]}};

function catalog(audioAvailable=true){return {schemaVersion:1,preview:true,publicRelease:false,assessmentEnabled:false,items:['en','ru'].flatMap(language=>Array.from({length:16},(_,index)=>({
 id:`${language}-dict-v14-${String(index+1).padStart(2,'0')}`,language,level:index<8?'A2':'B1',title:`Ditado ${index+1}`,objective:'Praticar transcrição.',instruction:'Ouça e escreva o que ouviu.',linkedStageNodeId:`${language}-path-${index<8?'05':'11'}`,durationSeconds:2,audioUrl:'/learn/audio/fixture-tone.wav',audioState:'awaiting_owner_review',technicalStatus:'passed',contentVersion:1,sourceCommit:editorialCommit,sourceBlobSha:editorialBlobSha,audioVersion:1,audioSha256, audioAvailable:audioAvailable&&index===0,assessmentEnabled:false,
})))}}
function toneWav(){const rate=8000,samples=rate*2,data=Buffer.alloc(samples),wav=Buffer.alloc(44+samples);for(let i=0;i<samples;i++)data[i]=128+Math.round(28*Math.sin(2*Math.PI*440*i/rate));wav.write('RIFF',0);wav.writeUInt32LE(36+samples,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(samples,40);data.copy(wav,44);return wav;}
function serverAttempt(payload:Record<string,unknown>){return {attempt:{attemptId:payload.attemptId,itemId:payload.itemId,language:'en',level:'A2',linkedStageNodeId:'en-path-05',contentVersion:1,editorialCommit,editorialBlobSha,audioVersion:1,audioSha256,audioStatus:'awaiting_owner_review',response:payload.response,startedAt:payload.startedAt,submittedAt:Date.now(),playback:payload.playback,assessmentEnabled:false,matchKind:'disabled',outcome:'uncertain',reviewStatus:'awaiting_review'},transcript:'Private transcript revealed after submission.'};}
async function serveOfficialMock(page){const root=resolve('dist'),types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};await page.route('https://matheus2t.com.br/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname==='/service-worker.js')return route.fulfill({status:404,body:'disabled'});const file=resolve(root,pathname==='/'?'index.html':pathname.slice(1));if(!file.toLowerCase().startsWith(`${root.toLowerCase()}${sep}`)||!existsSync(file))return route.fulfill({status:404,body:'not found'});return route.fulfill({status:200,contentType:types[extname(file)]||'application/octet-stream',body:readFileSync(file)});});}

test('V14 gate requires exact loopback and opt-in; official host stays blocked with query flag',async({page})=>{
 expect(isLearnDictationV14PreviewEnabled('localhost','?learn-preview=dictation-v14')).toBe(true);
 expect(isLearnDictationV14PreviewEnabled('[::1]','?learn-preview=dictation-v14')).toBe(true);
 expect(isLearnDictationV14PreviewEnabled('127.0.0.1','')).toBe(false);
 expect(isLearnDictationV14PreviewEnabled('127.0.0.1','?learn-preview=audio-v19')).toBe(false);
 expect(isLearnDictationV14PreviewEnabled('matheus2t.com.br','?learn-preview=dictation-v14')).toBe(false);
 await serveOfficialMock(page);
 await page.goto('https://matheus2t.com.br/?learn-preview=dictation-v14#/learn/en/dictation-v14');
 await expect(page.getByRole('heading',{name:'Prévia indisponível'})).toBeVisible();
 await expect(page.locator('learn-dictation-v14')).toHaveCount(0);
 await expect(page.locator('learn-recording-player')).toHaveCount(0);
});

test('local dictation hides transcript until submit, persists per language and survives reload',async({page})=>{
 await serveBuiltSite(page,{status:200,contentType:'audio/wav',body:toneWav()});
 await page.route('**/learn/v14/dictations.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog())}));
 let submitted:Record<string,unknown>|undefined;
 await page.route('**/learn/v14/attempt',async route=>{submitted=route.request().postDataJSON() as Record<string,unknown>;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(serverAttempt(submitted))});});
 await page.goto('/?learn-preview=dictation-v14#/learn/en/dictation-v14');
 const root=page.locator('learn-dictation-v14');
 await expect(root.getByRole('heading',{name:'Ditados A2/B1'})).toBeVisible();
 await expect(root.getByRole('heading',{name:'Ditado 1'})).toBeVisible();
 await expect(root.getByText('Private transcript revealed after submission.')).toHaveCount(0);
 const answer=root.getByRole('textbox',{name:'Sua transcrição'});await answer.fill('I heard a sample.');
 const player=root.locator('learn-recording-player');await player.evaluate(element=>element.addEventListener('heard',event=>{(window as Window&{v14Heard?:unknown}).v14Heard=(event as CustomEvent).detail}));await player.getByRole('button',{name:'Reproduzir gravação'}).click();
 await expect(player.getByText('Reprodução concluída.')).toBeVisible({timeout:5000});
 const heard=await page.evaluate(()=>((window as Window&{v14Heard?:{coveragePercent:number}}).v14Heard));expect(heard?.coveragePercent,JSON.stringify(heard)).toBeGreaterThanOrEqual(0.85);
 const status=await root.locator('[role="status"]').allTextContents();
 expect(status.join(' '),`status after playback: ${status.join(' | ')}`).not.toContain('Reproduza pelo menos 90%');
 await expect(root.getByRole('button',{name:'Enviar tentativa'})).toBeEnabled();
 await root.getByRole('button',{name:'Enviar tentativa'}).click();
 await expect(root.getByText('Private transcript revealed after submission.')).toBeVisible();
 await expect(root.getByText(/Tentativa salva como incerta/)).toBeVisible();
 expect(submitted?.itemId).toBe('en-dict-v14-01');expect((submitted?.playback as {coveragePercent:number}).coveragePercent).toBeGreaterThanOrEqual(0.85);
 await page.reload();
 await expect(root.getByRole('heading',{name:'Tentativas salvas'})).toBeVisible();
 await expect(root.getByText('Private transcript revealed after submission.')).toHaveCount(0);
 await root.getByRole('button',{name:'Ver transcrição após envio'}).click();
 await expect(root.getByText('Private transcript revealed after submission.')).toBeVisible();
 await root.getByRole('link',{name:'Русский'}).click();
 await expect(root.getByText('0 tentativas salvas neste idioma')).toBeVisible();
 await root.getByRole('link',{name:'Inglês'}).click();
 await expect(root.getByText('1 tentativas salvas neste idioma')).toBeVisible();
});

test('player pauses and resumes without enabling submission before completion',async({page})=>{
 await serveBuiltSite(page,{status:200,contentType:'audio/wav',body:toneWav()});
 await page.route('**/learn/v14/dictations.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog())}));
 await page.goto('/?learn-preview=dictation-v14#/learn/en/dictation-v14');
 const root=page.locator('learn-dictation-v14'),player=root.locator('learn-recording-player'),media=player.locator('audio');
 await player.getByRole('button',{name:'Reproduzir gravação'}).click();
 await expect.poll(()=>media.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeGreaterThan(0.2);
 await player.getByRole('button',{name:'Pausar gravação'}).click();
 const pausedAt=await media.evaluate(element=>(element as HTMLAudioElement).currentTime);
 await expect.poll(()=>media.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeLessThanOrEqual(pausedAt+0.02);
 await player.getByRole('button',{name:'Reproduzir gravação'}).click();
 await expect.poll(()=>media.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeGreaterThan(pausedAt+0.1);
 await expect(root.getByRole('button',{name:'Enviar tentativa'})).toBeDisabled();
});

test('drafts persist in IndexedDB v3 and remain isolated by language',async({page})=>{
 await serveBuiltSite(page);
 await page.route('**/learn/v14/dictations.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog())}));
 await page.goto('/?learn-preview=dictation-v14#/learn/en/dictation-v14');
 const root=page.locator('learn-dictation-v14'),answer=root.getByRole('textbox',{name:'Sua transcrição'});
 await answer.fill('A saved English draft.');await answer.blur();
 await expect.poll(()=>page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('2t-learn',3);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const record=await new Promise<any>((resolve,reject)=>{const request=db.transaction('lessonProgress').objectStore('lessonProgress').get('v14:en');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});const version=db.version;db.close();
  return {version,response:record?.v14Dictation?.drafts?.[0]?.response};
 })).toEqual({version:3,response:'A saved English draft.'});
 await page.reload();await expect(root.getByRole('textbox',{name:'Sua transcrição'})).toHaveValue('A saved English draft.');
 await root.getByRole('link',{name:'Русский'}).click();await expect(root.getByRole('textbox',{name:'Sua transcrição'})).toHaveValue('');
});

test('unavailable audio never enables a transcription attempt',async({page})=>{
 await serveBuiltSite(page);
 await page.route('**/learn/v14/dictations.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog(false))}));
 await page.goto('/?learn-preview=dictation-v14#/learn/ru/dictation-v14');
 const root=page.locator('learn-dictation-v14');
 await expect(root.getByText('Áudio indisponível. Nenhuma resposta será registrada até que uma gravação V19 correspondente esteja presente e verificada.')).toBeVisible();
 await expect(root.getByRole('textbox',{name:'Sua transcrição'})).toBeDisabled();
 await expect(root.getByRole('button',{name:'Enviar tentativa'})).toBeDisabled();
 await expect(root.locator('learn-recording-player')).toHaveCount(0);
});

test('failed audio load leaves the attempt disabled and shows an actionable error',async({page})=>{
 await serveBuiltSite(page);
 await page.route('**/learn/v14/dictations.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog(true))}));
 await page.route('**/learn/audio/fixture-tone.wav',route=>route.fulfill({status:404,body:'audio unavailable'}));
 await page.goto('/?learn-preview=dictation-v14#/learn/ru/dictation-v14');
 const failed=page.locator('learn-dictation-v14'),player=failed.locator('learn-recording-player');
 await player.getByRole('button',{name:'Reproduzir gravação'}).click();
 await expect(player.getByText('A gravação não pôde ser carregada. Verifique a conexão e tente novamente.')).toBeVisible();
 await expect(failed.getByRole('button',{name:'Enviar tentativa'})).toBeDisabled();
});

test('V14 backup extension preserves v3 evidence and accepts legacy v1/v2 backups',()=>{
 const empty={attempts:[],cards:[]},v1={format:'2t-learn',version:1,exportedAt:now,...empty};
 const v2={format:'2t-learn',version:2,exportedAt:now,...empty,planning:[]};
 const v3={format:'2t-learn',version:3,exportedAt:now,...empty,planning:[],lessonEvents:[],lessonProgress:[progress]};
 expect(parseBackup(JSON.stringify(v1)).version).toBe(1);
 expect(parseBackup(JSON.stringify(v2)).version).toBe(2);
 const restored=parseBackup(JSON.stringify(v3));expect(restored.version).toBe(3);expect(restored.lessonProgress?.[0].v14Dictation?.attempts[0].attemptId).toBe(attemptId);
 expect(validLessonProgress({...progress,key:'en:en-pilot-introductions-01',unitId:'en-pilot-introductions-01'})).toBe(false);
});

test('V14 attempt append is idempotent and rejects conflicting reuse of an identifier',()=>{
 const data={schemaVersion:1 as const,language:'en' as const,attempts:[],drafts:[{itemId:'en-dict-v14-01',response:'draft',startedAt:now-1000,updatedAt:now}]};
 const first=appendV14DictationAttempt(data,attempt);expect(first.inserted).toBe(true);expect(first.data.attempts).toHaveLength(1);expect(first.data.drafts).toHaveLength(0);
 const duplicate=appendV14DictationAttempt(first.data,attempt);expect(duplicate.inserted).toBe(false);expect(duplicate.data.attempts).toHaveLength(1);
 expect(()=>appendV14DictationAttempt(first.data,{...attempt,response:'tampered'})).toThrow(/dados diferentes/);
});

test('V14 layout stays usable without horizontal overflow at mobile, tablet and desktop sizes',async({page})=>{
 await serveBuiltSite(page);
 await page.route('**/learn/v14/dictations.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog(false))}));
 for(const width of [320,390,768,1366])for(const theme of ['dark','light']){
  await page.setViewportSize({width,height:900});await page.goto('/?learn-preview=dictation-v14#/learn/en/dictation-v14');await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
  const root=page.locator('learn-dictation-v14');await expect(root.getByRole('heading',{name:'Ditados A2/B1'})).toBeVisible();
  const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));expect(dims.scroll,`${width}px ${theme}`).toBeLessThanOrEqual(dims.width);
  await expect(root.getByRole('navigation',{name:'Selecionar idioma'})).toBeVisible();await expect(root.getByRole('button',{name:/A2/})).toBeVisible();
 }
});
