import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
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

test('volume updates the active utterance; invalid input and missing locale are rejected',async()=>{
  const state=installSpeech([voice('English local','en-US',true)]),speech=new LearnSpeech();
  const done=speech.play('Hello','en');speech.setVolume(.25);expect(state.last?.volume).toBe(.25);finish(state.last!);await done;
  await expect(speech.play('Hello','ru')).rejects.toThrow('Nenhuma voz compatível');
  await expect(speech.play('Hello','en',1,1.2)).rejects.toThrow('inválidos');
  await expect(speech.play('   ','en')).rejects.toThrow('inválidos');
});

test('asset manifest keeps synthesized and missing recordings ineligible for assessed listening',()=>{
  const manifest=JSON.parse(readFileSync('frontend/public/learn/pedagogy-v1/audio-assets.json','utf8')) as {assets:Array<{language:string;activityId:string;skill:string;referenceText:string;accent:string|null;source:string|null;licenseStatus:string;validationStatus:string;assessmentEnabled:boolean;assetUrl:string|null}>;policy:{audioAssessmentEnabled:boolean;validatedRecordings:number}};
  expect(manifest.assets).toHaveLength(124);expect(manifest.policy).toEqual({audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true});
  expect(manifest.assets.every(item=>!item.assessmentEnabled&&item.assetUrl===null)).toBe(true);
  expect(manifest.assets.filter(item=>item.validationStatus==='draft-unvalidated')).toHaveLength(120);
  expect(manifest.assets.filter(item=>item.validationStatus==='missing-reviewed-recording')).toHaveLength(4);
  expect(manifest.assets.filter(item=>item.skill==='listening'&&item.validationStatus==='draft-unvalidated').every(item=>!!item.source&&!!item.licenseStatus&&!!item.referenceText)).toBe(true);
});

test('browser player offers accessible playback controls and marks synthesis as unvalidated',async({page})=>{
  await page.addInitScript(()=>{
    class Utterance {text:string;voice:any=null;lang='';rate=1;volume=1;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text;}}
    let timer:number|undefined;
    const synth={getVoices:()=>[{name:'Local English',lang:'en-US',localService:true,default:true,voiceURI:'local'}],addEventListener:()=>{},removeEventListener:()=>{},cancel:()=>{if(timer)clearTimeout(timer);},pause:()=>{},resume:()=>{},speak:(utterance:Utterance)=>{timer=window.setTimeout(()=>utterance.onend?.(),900);}};
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
  });
  await page.goto('/#/learn/en/listening');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  const player=page.locator('learn-audio');
  await expect(player).toBeVisible();
  const volume=player.getByRole('slider',{name:'Volume da voz sintetizada'});
  await volume.evaluate((element:HTMLInputElement)=>{element.value='45';element.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(player.locator('output')).toHaveText('45%');
  await player.getByRole('button',{name:'Ouvir / repetir'}).click();
  await expect(player.locator('.learn-audio__status')).toContainText('não validado');
  await player.getByRole('button',{name:'Pausar áudio'}).click();
  await expect(player.getByRole('button',{name:'Continuar áudio'})).toHaveAttribute('aria-pressed','true');
  await player.getByRole('button',{name:'Continuar áudio'}).click();
  await expect(player.getByRole('button',{name:'Ouvir / repetir'})).toBeEnabled({timeout:3000});
  await expect(player.locator('.learn-audio__status')).toContainText('não uma gravação validada');
  for(const theme of ['dark','light'])for(const width of [320,390,768,1366]){
    await page.setViewportSize({width,height:900});
    await page.locator('html').evaluate((element:HTMLElement,value)=>element.dataset.theme=value,theme);
    const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    expect(bounds.scroll,`audio overflow at ${width}px/${theme}`).toBeLessThanOrEqual(bounds.client);
    await expect(player).toBeVisible();
  }
});

test('player recovers when a Russian browser voice loads late and keeps the source text unchanged',async({page})=>{
  await page.addInitScript(()=>{
    const state:{voices:any[];changed?:()=>void;spoken?:{text:string;lang:string;voice:string}}={voices:[]};
    class Utterance {text:string;voice:any=null;lang='';rate=1;volume=1;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text;}}
    const synth={getVoices:()=>state.voices,addEventListener:(name:string,listener:()=>void)=>{if(name==='voiceschanged')state.changed=listener;},removeEventListener:()=>{},cancel:()=>{},pause:()=>{},resume:()=>{},speak:(utterance:Utterance)=>{state.spoken={text:utterance.text,lang:utterance.lang,voice:utterance.voice?.name||''};setTimeout(()=>utterance.onend?.(),0);}};
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    (window as any).__learnSpeechState=state;
    (window as any).__loadRussianVoice=()=>{state.voices=[{name:'Russian local',lang:'ru-RU',localService:true,default:true,voiceURI:'ru-local'}];state.changed?.();};
  });
  await page.goto('/#/learn/ru/listening');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  const player=page.locator('learn-audio'),expected=await page.locator('learn-session').evaluate(el=>(el as any).exercises[0].audio as string);
  await expect(player.getByRole('button',{name:'Ouvir / repetir'})).toBeDisabled();
  await page.evaluate(()=>(window as any).__loadRussianVoice());
  await expect(player.getByRole('button',{name:'Ouvir / repetir'})).toBeEnabled();
  await player.getByRole('button',{name:'Ouvir / repetir'}).click();
  await expect(page.getByRole('button',{name:'Verificar resposta'})).toBeEnabled();
  const spoken=await page.evaluate(()=>(window as any).__learnSpeechState.spoken);
  expect(spoken).toEqual({text:expected,lang:'ru-RU',voice:'Russian local'});
  await expect(player).toContainText('não uma gravação validada');
});
