import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {serveBuiltSite} from './helpers/serve-built-site';
import {parseLearnAudioManifest,audioAvailabilityFor,canAssessLearnAudio,canPlayLearnAudio,safeLearnAudioUrl,type LearnAudioAsset,type LearnAudioPolicy} from '../src/learn/audio-assets';
import {evaluateDictation,evaluateListeningChoice,evaluateListeningOpenAnswer} from '../src/learn/audio-assessment';
import {parseBackup,validAttempt} from '../src/learn/backup';
import {makePlan} from '../src/learn/planning';
import type {Attempt,Backup,PlanSettings} from '../src/learn/model';
import type {Curriculum} from '../src/learn/content';
import {isLearnAudioFixturePreviewEnabled} from '../src/learn/pilot-preview';

function wave(seconds=1.6):Buffer {
  const rate=8000,samples=Math.floor(rate*seconds),data=Buffer.alloc(samples*2),header=Buffer.alloc(44);
  header.write('RIFF',0);header.writeUInt32LE(36+data.length,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);
  for(let i=0;i<samples;i++)data.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*1000),i*2);
  return Buffer.concat([header,data]);
}
const manifestSource=JSON.parse(readFileSync('frontend/public/learn/pedagogy-v1/audio-assets.json','utf8'));
const noAudioPolicy:LearnAudioPolicy={audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true};
const fixture:LearnAudioAsset={id:'test-tone-v15',language:'en',activityId:'test-tone-v15',skill:'listening',referenceText:'',locale:'en',accent:null,source:'test-fixture',licenseStatus:'fixture-only',contentVersion:1,validationStatus:'fixture-unvalidated',assessmentEnabled:false,assetUrl:'/learn/audio/fixture-tone.wav'};

test('current manifest has no eligible recordings and rejects unsafe sources',()=>{
  const manifest=parseLearnAudioManifest(manifestSource);
  expect(manifest.assets).toHaveLength(124);
  expect(manifest.policy).toMatchObject({audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true});
  expect(manifest.assets.every(asset=>asset.assetUrl===null&&!asset.assessmentEnabled)).toBe(true);
  expect(manifest.assets.some(asset=>/v13|v14/.test(asset.activityId))).toBe(false);
  expect(audioAvailabilityFor(manifest,'en')).toEqual({listening:false,dictation:false});
  expect(audioAvailabilityFor(manifest,'ru')).toEqual({listening:false,dictation:false});
  expect(safeLearnAudioUrl('https://cdn.example/audio.mp3')).toBeUndefined();
  expect(safeLearnAudioUrl('//cdn.example/learn/audio/file.mp3')).toBeUndefined();
  expect(safeLearnAudioUrl('/learn/audio/../secret.wav')).toBeUndefined();
  expect(isLearnAudioFixturePreviewEnabled('matheus2t.com.br','?learn-preview=audio-v15')).toBe(false);
});

test('only local explicitly labeled fixtures can play; they never enable assessment',()=>{
  expect(canPlayLearnAudio(fixture,noAudioPolicy,'127.0.0.1','?learn-preview=audio-v15')).toBe(true);
  expect(canAssessLearnAudio(fixture,noAudioPolicy,'127.0.0.1','?learn-preview=audio-v15')).toBe(false);
  expect(canPlayLearnAudio(fixture,noAudioPolicy,'matheus2t.com.br','?learn-preview=audio-v15')).toBe(false);
  const unlicensed={...fixture,source:'https://unknown.invalid',licenseStatus:'unknown'};
  expect(canPlayLearnAudio(unlicensed,noAudioPolicy,'127.0.0.1','?learn-preview=audio-v15')).toBe(false);
});

test('audio assessment gates comprehension and preserves conservative English/Russian dictation rules',()=>{
  expect(evaluateListeningChoice('b','b',false,true)).toBe('notAssessed');
  expect(evaluateListeningChoice('b','b',true,false)).toBe('notAssessed');
  expect(evaluateListeningChoice('b','b',true,true)).toBe('correct');
  expect(evaluateListeningChoice('a','b',true,true)).toBe('incorrect');
  expect(evaluateListeningOpenAnswer(true,true)).toBe('uncertain');
  expect(evaluateDictation('Do your parents work on Sundays?',{language:'en',canonicalTranscript:'Do your parents work on Sundays?'},false,true)).toBe('notAssessed');
  expect(evaluateDictation('  DO your parents work on Sundays  ',{language:'en',canonicalTranscript:'Do your parents work on Sundays?'},true,true)).toBe('correct');
  expect(evaluateDictation('Do your parent work on Sundays?',{language:'en',canonicalTranscript:'Do your parents work on Sundays?',knownIncorrectVariants:[{text:'Do your parent work on Sundays?',reason:'plural ending'}]},true,true)).toBe('incorrect');
  expect(evaluateDictation('Это ёлка.',{language:'ru',canonicalTranscript:'Это ёлка.'},true,true)).toBe('correct');
  expect(evaluateDictation('Это елка.',{language:'ru',canonicalTranscript:'Это ёлка.'},true,true)).toBe('uncertain');
  expect(evaluateDictation('Это елка.',{language:'ru',canonicalTranscript:'Это ёлка.',acceptedFullTranscriptVariants:['Это елка.']},true,true)).toBe('correct');
  expect(evaluateDictation('Это не ёлка.',{language:'ru',canonicalTranscript:'Это ёлка.'},true,true)).toBe('uncertain');
});

test('audio provenance is additive in IndexedDB v3 backups and legacy v1/v2/v3 remain importable',()=>{
  const attempt:Attempt={id:'audio-unassessed',language:'en',itemId:'en-dictation-017',skill:'dictation',topic:'Dictation',answer:'The child sleeps.',expected:'The child is sleeping.',correct:false,assessmentOutcome:'uncertain',audioEvidence:{source:'browser-synthesis',validated:false,transcriptViewedBeforeAttempt:false},at:100,seconds:5};
  expect(validAttempt(attempt)).toBe(true);
  expect(validAttempt({...attempt,correct:true})).toBe(false);
  expect(validAttempt({...attempt,audioEvidence:{source:'recording',validated:true,transcriptViewedBeforeAttempt:false}})).toBe(false);
  for(const version of [1,2,3] as const){
    const backup={format:'2t-learn',version,exportedAt:100,attempts:[attempt],cards:[],...(version>=2?{planning:[]}:{}),...(version===3?{lessonEvents:[],lessonProgress:[]}:{})};
    const restored=parseBackup(JSON.stringify(backup));
    expect(restored.version).toBe(version);expect(restored.attempts[0].audioEvidence).toEqual(attempt.audioEvidence);
    const historical={...attempt,id:`legacy-${version}`,audioEvidence:undefined,assessmentOutcome:undefined,correct:true};
    expect(parseBackup(JSON.stringify({...backup,attempts:[historical]})).attempts[0].audioEvidence).toBeUndefined();
  }
});

test('daily plan excludes listening and dictation until actual recordings are available',()=>{
  const catalog=JSON.parse(readFileSync('frontend/public/learn/en.json','utf8')) as Curriculum;
  const empty:Backup={format:'2t-learn',version:3,exportedAt:0,attempts:[],cards:[]};
  const settings:PlanSettings={language:'en',goal:30,minutes:20,modes:['listening','dictation'],preference:'new'};
  expect(makePlan(catalog,empty,settings,{listening:false,dictation:false},1_800_000_000_000,'UTC').items).toEqual([]);
  const listeningOnly=makePlan(catalog,empty,settings,{listening:true,dictation:false},1_800_000_000_000,'UTC');
  expect(listeningOnly.items.length).toBeGreaterThan(0);
  expect(listeningOnly.items.every(item=>catalog.exercises.find(exercise=>exercise.id===item.itemId)?.skill==='listening')).toBe(true);
});

test('recording player is user-started, responsive, adjustable and releases media on removal',async({page})=>{
  await serveBuiltSite(page,{status:200,contentType:'audio/wav',body:wave()});
  await page.goto('/?learn-preview=audio-v15');
  await page.evaluate(()=>import('/learn.js'));
  await page.evaluate(({asset,policy})=>{
    const element=document.createElement('learn-recording-player') as HTMLElement&{asset:LearnAudioAsset;policy:LearnAudioPolicy};
    element.asset=asset;element.policy=policy;
    element.addEventListener('heard',event=>{(window as any).__audioHeard=(event as CustomEvent).detail});
    document.body.append(element);(window as any).__audioPlayer=element;
  },{asset:fixture,policy:noAudioPolicy});
  const player=page.locator('learn-recording-player').last(),audio=player.locator('audio');
  await expect(player.getByText('Fixture técnico: tom de teste, sem fala. Não é material de estudo.')).toBeVisible();
  await expect(audio).toHaveAttribute('preload','none');
  expect(await audio.evaluate((element:HTMLAudioElement)=>element.paused)).toBe(true);
  await player.getByRole('button',{name:'Reproduzir gravação'}).click();
  await page.waitForFunction(()=>{const audio=document.querySelector('learn-recording-player audio') as HTMLAudioElement;return audio&&audio.readyState>=1;});
  await player.getByRole('button',{name:'Pausar gravação'}).click();
  expect(await audio.evaluate((element:HTMLAudioElement)=>element.paused)).toBe(true);
  await player.getByLabel('Velocidade da gravação').selectOption('0.75');
  expect(await audio.evaluate((element:HTMLAudioElement)=>element.playbackRate)).toBe(.75);
  await player.getByLabel('Volume da gravação').evaluate((element:HTMLInputElement)=>{element.value='35';element.dispatchEvent(new Event('input',{bubbles:true}))});
  expect(await audio.evaluate((element:HTMLAudioElement)=>element.volume)).toBeCloseTo(.35);
  await player.getByRole('button',{name:'Repetir gravação'}).click();
  await expect(player.getByRole('button',{name:'Repetir gravação'})).toHaveAttribute('aria-pressed','true');
  await player.getByRole('button',{name:'Reiniciar gravação'}).click();
  await expect.poll(()=>audio.evaluate((element:HTMLAudioElement)=>element.currentTime)).toBeLessThan(.25);
  await player.getByRole('button',{name:'Pausar gravação'}).click();
  for(const theme of ['dark','light'])for(const width of [1366,768,390,320]){
    await page.setViewportSize({width,height:900});
    await page.locator('html').evaluate((element:HTMLElement,value)=>element.dataset.theme=value,theme);
    const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    expect(bounds.scroll,`audio-player overflow at ${width}/${theme}`).toBeLessThanOrEqual(bounds.client);
    await expect(player).toBeVisible();
  }
  const audioHandle=await audio.elementHandle();
  await player.evaluate(element=>element.remove());
  expect(audioHandle).not.toBeNull();
  expect(await audioHandle!.evaluate((element:HTMLAudioElement)=>({paused:element.paused,src:element.getAttribute('src')}))).toEqual({paused:true,src:null});
});

test('media load failure is announced and no automatic retry is started',async({page})=>{
  await serveBuiltSite(page,{status:404,contentType:'text/plain',body:'missing'});
  let requests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/learn/audio/fixture-tone.wav')requests++});
  await page.goto('/?learn-preview=audio-v15');
  await page.evaluate(()=>import('/learn.js'));
  await page.evaluate(({asset,policy})=>{const element=document.createElement('learn-recording-player') as HTMLElement&{asset:LearnAudioAsset;policy:LearnAudioPolicy};element.asset=asset;element.policy=policy;document.body.append(element)}, {asset:fixture,policy:noAudioPolicy});
  const player=page.locator('learn-recording-player').last();
  await player.getByRole('button',{name:'Reproduzir gravação'}).click();
  await expect(player.getByRole('alert')).toContainText('não pôde ser carregada');
  expect(requests).toBe(1);
  await player.locator('audio').evaluate(element=>element.dispatchEvent(new Event('error')));
  await expect(player.getByRole('alert')).toContainText('não pôde ser carregada');
  expect(requests).toBe(1);
});

test('only one recording player can reproduce at a time',async({page})=>{
  await serveBuiltSite(page,{status:200,contentType:'audio/wav',body:wave()});
  await page.goto('/?learn-preview=audio-v15');
  await page.evaluate(()=>import('/learn.js'));
  await page.evaluate(({asset,policy})=>{
    for(let index=0;index<2;index++){
      const player=document.createElement('learn-recording-player') as HTMLElement&{asset:LearnAudioAsset;policy:LearnAudioPolicy};
      player.asset={...asset,id:`${asset.id}-${index}`};player.policy=policy;document.body.append(player);
    }
  },{asset:fixture,policy:noAudioPolicy});
  const players=page.locator('learn-recording-player'),first=players.nth(0),second=players.nth(1),firstAudio=first.locator('audio'),secondAudio=second.locator('audio');
  await first.getByRole('button',{name:'Reproduzir gravação'}).click();
  await expect.poll(()=>firstAudio.evaluate((element:HTMLAudioElement)=>!element.paused)).toBe(true);
  await second.getByRole('button',{name:'Reproduzir gravação'}).click();
  await expect.poll(()=>secondAudio.evaluate((element:HTMLAudioElement)=>!element.paused)).toBe(true);
  await expect.poll(()=>firstAudio.evaluate((element:HTMLAudioElement)=>element.paused)).toBe(true);
});

test('future draft activities cannot fall back to browser synthesis when a recording is required',async({page})=>{
  await serveBuiltSite(page);await page.goto('/?learn-preview=audio-v15');await page.evaluate(()=>import('/learn.js'));
  await page.evaluate(()=>{
    const session=document.createElement('learn-session') as HTMLElement&{language:string;mode:string;audioPurpose:string;exercises:unknown[]};
    session.language='en';session.mode='listening';session.audioPurpose='assessment';session.exercises=[{id:'en-v13-draft',language:'en',skill:'listening',topic:'draft',level:'A1',prompt:'Choose what you heard.',answers:['Good morning.'],explanation:'',audio:'Good morning.',audioAssetId:'en-v13-draft',wordIds:[],questionType:'singleChoice',options:[{id:'a',label:'Good morning.'},{id:'b',label:'Good evening.'}],correctOptionId:'a'}];document.body.append(session);
  });
  const session=page.locator('learn-session').last();
  await expect(session.getByRole('status')).toContainText('Gravação aprovada indisponível');
  await expect(session.locator('learn-audio')).toHaveCount(0);
  await expect(session.locator('form')).toHaveCount(0);
  await expect(session).not.toContainText('Good morning.');
});

test('assessment purpose keeps the answer transcript hidden before submission',async({page})=>{
  await serveBuiltSite(page);await page.goto('/?learn-preview=audio-v15');await page.evaluate(()=>import('/learn.js'));
  await page.evaluate(()=>{
    const session=document.createElement('learn-session') as HTMLElement&{language:string;mode:string;audioPurpose:string;exercises:unknown[]};
    session.language='en';session.mode='listening';session.audioPurpose='assessment';session.exercises=[{id:'legacy-listening-assessment',language:'en',skill:'listening',topic:'practice',level:'A1',prompt:'What greeting is used?',answers:['Good morning.'],explanation:'',audio:'Good morning, everyone.',wordIds:[]}];document.body.append(session);
  });
  const session=page.locator('learn-session').last();
  await expect(session.locator('learn-audio')).toBeVisible();
  await expect(session.locator('details.learn-audio-transcript')).toHaveCount(0);
  await expect(session).not.toContainText('Good morning, everyone.');
});

test('legacy TTS listening remains practice only and persists an uncertain, non-scored attempt',async({page})=>{
  await serveBuiltSite(page);
  await page.addInitScript(()=>{
    class Utterance {text:string;voice:any=null;lang='';rate=1;volume=1;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text}}
    let timer:number|undefined;
    const synth={getVoices:()=>[{name:'Local English',lang:'en-US',localService:true,default:true,voiceURI:'local'}],addEventListener:()=>{},removeEventListener:()=>{},cancel:()=>{if(timer)clearTimeout(timer)},pause:()=>{},resume:()=>{},speak:(utterance:Utterance)=>{timer=window.setTimeout(()=>utterance.onend?.(),120)}};
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
  });
  await page.goto('/?learn-preview=audio-v15#/learn/en/dictation');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  const session=page.locator('learn-session'),exercise=await session.evaluate((element:any)=>element.exercises[0]);
  await session.locator('learn-audio').getByRole('button',{name:'Ouvir / repetir'}).click();
  await expect(session.getByRole('button',{name:'Verificar resposta'})).toBeEnabled();
  await session.locator('textarea').fill(exercise.answers[0]);
  await session.getByRole('button',{name:'Verificar resposta'}).click();
  await expect(session.locator('.learn-feedback strong')).toHaveText('Resposta salva · não avaliada (gravação não homologada)');
  const attempt=await page.evaluate(()=>new Promise<any>((resolve,reject)=>{const request=indexedDB.open('2t-learn',3);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('attempts','readonly'),get=tx.objectStore('attempts').getAll();get.onsuccess=()=>{db.close();resolve(get.result.at(-1))};get.onerror=()=>reject(get.error)}}));
  expect(attempt).toMatchObject({correct:false,assessmentOutcome:'uncertain',audioEvidence:{source:'browser-synthesis',validated:false,transcriptViewedBeforeAttempt:false}});
});

test('consulted transcript is recorded as assistance and cannot produce independent listening evidence',async({page})=>{
  await serveBuiltSite(page);
  await page.addInitScript(()=>{
    class Utterance{text:string;voice:any=null;lang='';rate=1;volume=1;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text}}
    let timer:number|undefined;const synth={getVoices:()=>[{name:'Local English',lang:'en-US',localService:true,default:true,voiceURI:'local'}],addEventListener:()=>{},removeEventListener:()=>{},cancel:()=>{if(timer)clearTimeout(timer)},pause:()=>{},resume:()=>{},speak:(utterance:Utterance)=>{timer=window.setTimeout(()=>utterance.onend?.(),120)}};
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
  });
  await page.goto('/?learn-preview=audio-v15#/learn/en/listening');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  const session=page.locator('learn-session'),expected=await session.evaluate((element:any)=>element.exercises[0].answers[0]);
  await session.locator('details.learn-audio-transcript summary').click();
  await session.locator('learn-audio').getByRole('button',{name:'Ouvir / repetir'}).click();
  await expect(session.getByRole('button',{name:'Verificar resposta'})).toBeEnabled();
  await session.locator('textarea').fill(expected);
  await session.getByRole('button',{name:'Verificar resposta'}).click();
  await expect(session.locator('.learn-feedback strong')).toHaveText('Resposta salva · transcrição consultada; não é evidência independente');
  const attempt=await page.evaluate(()=>new Promise<any>((resolve,reject)=>{const request=indexedDB.open('2t-learn',3);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('attempts','readonly'),get=tx.objectStore('attempts').getAll();get.onsuccess=()=>{db.close();resolve(get.result.at(-1))};get.onerror=()=>reject(get.error)}}));
  expect(attempt).toMatchObject({correct:false,assessmentOutcome:'uncertain',audioEvidence:{source:'browser-synthesis',validated:false,transcriptViewedBeforeAttempt:true}});
});
