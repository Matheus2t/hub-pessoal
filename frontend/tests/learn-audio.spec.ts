import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {serveBuiltSite} from './helpers/serve-built-site';
import {LearnSpeech} from '../src/learn/speech';

class FakeUtterance {
  voice:SpeechSynthesisVoice|null=null;
  lang='';rate=1;volume=1;
  onend:((event:SpeechSynthesisEvent)=>void)|null=null;
  onerror:((event:SpeechSynthesisErrorEvent)=>void)|null=null;
  constructor(readonly text:string){}
}

const savedSpeech=Object.getOwnPropertyDescriptor(globalThis,'speechSynthesis');
const savedUtterance=Object.getOwnPropertyDescriptor(globalThis,'SpeechSynthesisUtterance');
let fake:{voices:SpeechSynthesisVoice[];last?:FakeUtterance;cancelled:number;paused:number;resumed:number}|undefined;
function installSpeech(voices:SpeechSynthesisVoice[]){
  fake={voices,cancelled:0,paused:0,resumed:0};
  const state=fake;
  Object.defineProperty(globalThis,'speechSynthesis',{configurable:true,value:{getVoices:()=>state.voices,speak:(utterance:FakeUtterance)=>{state.last=utterance;},cancel:()=>state.cancelled++,pause:()=>state.paused++,resume:()=>state.resumed++}});
  Object.defineProperty(globalThis,'SpeechSynthesisUtterance',{configurable:true,value:FakeUtterance});
  return state;
}
function voice(name:string,lang:string,localService:boolean):SpeechSynthesisVoice{return {name,lang,localService,default:false,voiceURI:name} as SpeechSynthesisVoice;}
function finish(utterance:FakeUtterance){utterance.onend?.call(utterance,{} as SpeechSynthesisEvent);}
test.afterEach(()=>{
  if(savedSpeech)Object.defineProperty(globalThis,'speechSynthesis',savedSpeech);else Reflect.deleteProperty(globalThis,'speechSynthesis');
  if(savedUtterance)Object.defineProperty(globalThis,'SpeechSynthesisUtterance',savedUtterance);else Reflect.deleteProperty(globalThis,'SpeechSynthesisUtterance');
  fake=undefined;
});

test('local synthesis selects only the requested language and honors rate and volume',async()=>{
  const remote=voice('English default','en-US',false),local=voice('English local','en-GB',true);
  const state=installSpeech([remote,voice('Russian local','ru-RU',true),local]);
  const speech=new LearnSpeech(),done=speech.play('Hello','en',.75,.4);
  expect(state.last).toMatchObject({text:'Hello',voice:local,lang:'en-GB',rate:.75,volume:.4});
  finish(state.last!);await done;
  expect(speech.voices('ru').map(item=>item.lang)).toEqual(['ru-RU']);
});

test('volume updates the active utterance; missing locale uses system fallback without changing validation',async()=>{
  const state=installSpeech([voice('English local','en-US',true)]),speech=new LearnSpeech();
  const done=speech.play('Hello','en');speech.setVolume(.25);expect(state.last?.volume).toBe(.25);finish(state.last!);await done;
  const fallback=speech.play('Hello','ru');
  expect(state.last).toMatchObject({text:'Hello',lang:'ru-RU',voice:null});
  finish(state.last!);await fallback;
  await expect(speech.play('Hello','en',1,1.2)).rejects.toThrow('inválidos');
  await expect(speech.play('   ','en')).rejects.toThrow('inválidos');
});

test('manifest exposes only the 60 licensed legacy Listening clips for study, never for assessment',()=>{
  const manifest=JSON.parse(readFileSync('frontend/public/learn/pedagogy-v1/audio-assets.json','utf8')) as {assets:Array<{language:string;activityId:string;skill:string;referenceText:string;accent:string|null;source:string|null;licenseStatus:string;validationStatus:string;assessmentEnabled:boolean;assetUrl:string|null}>;policy:{audioAssessmentEnabled:boolean;validatedRecordings:number}};
  expect(manifest.assets).toHaveLength(124);expect(manifest.policy).toEqual({audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true});
  const study=manifest.assets.filter(item=>(item as any).releaseType==='public-study-only');
  expect(study).toHaveLength(60);expect(study.filter(item=>item.language==='en')).toHaveLength(30);expect(study.filter(item=>item.language==='ru')).toHaveLength(30);
  expect(study.every(item=>item.skill==='listening'&&item.validationStatus==='technical-passed-study-only'&&!item.assessmentEnabled&&!!item.assetUrl)).toBe(true);
  expect(manifest.assets.filter(item=>(item as any).releaseType!=='public-study-only').every(item=>!item.assessmentEnabled&&item.assetUrl===null)).toBe(true);
  expect(manifest.assets.filter(item=>item.validationStatus==='draft-unvalidated')).toHaveLength(60);
  expect(manifest.assets.filter(item=>item.validationStatus==='missing-reviewed-recording')).toHaveLength(4);
  expect(study.every(item=>!!item.source&&!!item.licenseStatus&&!!item.referenceText)).toBe(true);
});

test('all 60 hosted Listening assets are valid MP3 streams decodable by Chromium',async({page})=>{
  await serveBuiltSite(page);await page.goto('/');
  const result=await page.evaluate(async()=>{
    const manifest=await (await fetch('/learn/pedagogy-v1/audio-assets.json')).json() as {assets:Array<{releaseType?:string;assetUrl:string|null}>};
    const assets=manifest.assets.filter(asset=>asset.releaseType==='public-study-only');
    const context=new AudioContext(),decoded:Array<{url:string;duration:number;channels:number}> = [];
    try{
      for(const asset of assets){
        if(!asset.assetUrl)throw Error('Áudio sem URL pública.');
        const response=await fetch(asset.assetUrl,{cache:'no-store'});
        if(!response.ok||!response.headers.get('content-type')?.includes('audio/mpeg'))throw Error(`MP3 indisponível: ${asset.assetUrl}`);
        const buffer=await context.decodeAudioData(await response.arrayBuffer());
        decoded.push({url:asset.assetUrl,duration:buffer.duration,channels:buffer.numberOfChannels});
      }
      return {count:assets.length,decoded};
    }finally{await context.close();}
  });
  expect(result.count).toBe(60);expect(result.decoded).toHaveLength(60);
  for(const clip of result.decoded){expect(clip.duration,clip.url).toBeGreaterThan(0);expect(clip.duration,clip.url).toBeLessThan(90);expect(clip.channels,clip.url).toBe(1);}
});

test('public English and Russian Listening use hosted recordings without SpeechSynthesis',async({page})=>{
  await serveBuiltSite(page);
  await page.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined}));
  for(const lang of ['en','ru'] as const){
    await page.goto(`/#/learn/${lang}/listening`);await page.getByRole('button',{name:'Iniciar prática'}).click();
    const session=page.locator('learn-session'),player=session.locator('learn-recording-player');
    await expect(player).toBeVisible();await expect(session.locator('learn-audio')).toHaveCount(0);
    const media=player.locator('audio');await expect(media).toHaveAttribute('src',new RegExp(`/learn/audio/${lang}/${lang}-listening-001\\.mp3$`));
    await expect(player.getByRole('slider',{name:'Volume da gravação'})).toBeVisible();
    await player.getByRole('button',{name:'Reproduzir gravação'}).click();
    await expect.poll(()=>media.evaluate((audio:HTMLAudioElement)=>!audio.paused)).toBe(true);
    await expect.poll(()=>media.evaluate((audio:HTMLAudioElement)=>audio.currentTime)).toBeGreaterThan(0);
    await player.getByRole('button',{name:'Pausar gravação'}).click();await expect.poll(()=>media.evaluate((audio:HTMLAudioElement)=>audio.paused)).toBe(true);
    await player.getByRole('button',{name:'Reproduzir gravação'}).click();
    await player.getByRole('combobox',{name:'Velocidade da gravação'}).selectOption('0.75');
    await expect.poll(()=>media.evaluate((audio:HTMLAudioElement)=>audio.playbackRate)).toBe(0.75);
    const volume=player.getByRole('slider',{name:'Volume da gravação'});
    await volume.evaluate((input:HTMLInputElement)=>{input.value='50';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await expect.poll(()=>media.evaluate((audio:HTMLAudioElement)=>audio.volume)).toBe(0.5);
    await volume.evaluate((input:HTMLInputElement)=>{input.value='100';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await player.getByRole('button',{name:'Parar gravação'}).click();await expect.poll(()=>media.evaluate((audio:HTMLAudioElement)=>audio.paused&&audio.currentTime===0)).toBe(true);
    await player.getByRole('button',{name:'Reproduzir gravação'}).click();
    await expect.poll(()=>session.evaluate((element:any)=>element.heard)).toBe(true);
    const expected=await session.evaluate((element:any)=>element.exercises[0].answers[0]);
    await session.locator('textarea').fill(expected);
    await expect(session.getByRole('button',{name:'Verificar resposta'})).toBeEnabled();
    await expect(player).toContainText('Gravação disponível para estudo');
    await session.getByRole('button',{name:'Verificar resposta'}).click();
    await expect(session.locator('.learn-feedback strong')).toContainText('não avaliada');
    for(const theme of ['dark','light'])for(const width of [320,390,768,1366,1920]){
      await page.setViewportSize({width,height:900});await page.locator('html').evaluate((element:HTMLElement,value)=>element.dataset.theme=value,theme);
      const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
      expect(bounds.scroll,`audio overflow at ${width}px/${theme}`).toBeLessThanOrEqual(bounds.client);
    }
  }
});

test('secondary Russian practice audio recovers when a browser voice loads late',async({page})=>{
  await serveBuiltSite(page);
  await page.addInitScript(()=>{
    const state:{voices:any[];changed?:()=>void;spoken?:{text:string;lang:string;voice:string}}={voices:[]};
    class Utterance {text:string;voice:any=null;lang='';rate=1;volume=1;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text;}}
    const synth={getVoices:()=>state.voices,addEventListener:(name:string,listener:()=>void)=>{if(name==='voiceschanged')state.changed=listener;},removeEventListener:()=>{},cancel:()=>{},pause:()=>{},resume:()=>{},speak:(utterance:Utterance)=>{state.spoken={text:utterance.text,lang:utterance.lang,voice:utterance.voice?.name||''};setTimeout(()=>utterance.onend?.(),0);}};
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    (window as any).__learnSpeechState=state;
    (window as any).__loadRussianVoice=()=>{state.voices=[{name:'Russian local',lang:'ru-RU',localService:true,default:true,voiceURI:'ru-local'}];state.changed?.();};
  });
  await page.goto('/?learn-preview=audio-v15');await page.evaluate(()=>import('/learn.js'));
  await page.evaluate(()=>{const audio=document.createElement('learn-audio') as HTMLElement&{text:string;language:'ru'};audio.text='Здравствуйте';audio.language='ru';document.body.append(audio)});
  const player=page.locator('learn-audio').last(),expected='Здравствуйте';
  await expect(player.getByRole('button',{name:'Ouvir / repetir'})).toBeEnabled();
  await page.evaluate(()=>(window as any).__loadRussianVoice());
  await expect(player.getByRole('button',{name:'Ouvir / repetir'})).toBeEnabled();
  await player.getByRole('button',{name:'Ouvir / repetir'}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__learnSpeechState.spoken?.text)).toBe(expected);
  const spoken=await page.evaluate(()=>(window as any).__learnSpeechState.spoken);
  expect(spoken).toEqual({text:expected,lang:'ru-RU',voice:'Russian local'});
  await expect(player).toContainText('material de prática');
});

test('failed hosted playback offers transcript study without marking audio heard or scoring it',async({page})=>{
  await serveBuiltSite(page);
  await page.route('**/learn/audio/ru/ru-listening-001.mp3',route=>route.fulfill({status:404,contentType:'text/plain',body:'missing'}));
  await page.goto('/#/learn/ru/listening');await page.getByRole('button',{name:'Iniciar prática'}).click();
  const session=page.locator('learn-session'),player=session.locator('learn-recording-player');
  await player.getByRole('button',{name:'Reproduzir gravação'}).click();
  await expect(player.getByRole('alert')).toContainText('não pôde ser carregada');
  await expect(session.evaluate((element:any)=>element.heard)).resolves.toBe(false);
  await session.getByRole('button',{name:'Estudar com a transcrição'}).click();
  await expect(session.locator('.learn-audio-transcript--study')).toBeVisible();
  await expect(session.locator('.learn-audio-transcript--study')).toContainText('здравствуйте');
  const expected=await session.evaluate((element:any)=>element.exercises[0].answers[0]);
  await session.locator('textarea').fill(expected);await session.getByRole('button',{name:'Verificar resposta'}).click();
  await expect(session.locator('.learn-feedback strong')).toContainText('modo de estudo');
  const attempt=await page.evaluate(()=>new Promise<any>((resolve,reject)=>{const request=indexedDB.open('2t-learn',3);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('attempts','readonly'),get=tx.objectStore('attempts').getAll();get.onsuccess=()=>{db.close();resolve(get.result.at(-1))};get.onerror=()=>reject(get.error)}}));
  expect(attempt).toMatchObject({correct:false,assessmentOutcome:'uncertain'});expect(attempt.audioEvidence).toBeUndefined();
});

test('a corrupt hosted file can be retried without counting the failed playback',async({page})=>{
  await serveBuiltSite(page);let fail=true;
  await page.route('**/learn/audio/en/en-listening-001.mp3',route=>fail?route.fulfill({status:200,contentType:'audio/mpeg',body:'not an MP3'}):route.fallback());
  await page.goto('/#/learn/en/listening');await page.getByRole('button',{name:'Iniciar prática'}).click();
  const session=page.locator('learn-session'),player=session.locator('learn-recording-player');
  await player.getByRole('button',{name:'Reproduzir gravação'}).click();
  await expect(player.getByRole('alert')).toContainText('não pôde ser carregada');
  await expect.poll(()=>session.evaluate((element:any)=>element.heard)).toBe(false);
  fail=false;await player.getByRole('button',{name:'Tentar reproduzir gravação'}).click();
  await expect.poll(()=>session.evaluate((element:any)=>element.heard)).toBe(true);
  expect(await session.evaluate((element:any)=>element.heardValidated)).toBe(false);
});
