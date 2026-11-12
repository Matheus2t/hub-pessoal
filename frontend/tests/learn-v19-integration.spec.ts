import {test,expect} from '@playwright/test';
import {serveBuiltSite} from './helpers/serve-built-site';
import {canPlayLearnAudio,canAssessLearnAudio,type LearnAudioAsset,type LearnAudioPolicy} from '../src/learn/audio-assets';
import {isLearnV19AudioPreviewEnabled} from '../src/learn/pilot-preview';

const policy:LearnAudioPolicy={audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true,publicRelease:false};
const fixture:LearnAudioAsset={
 id:'en-v19-fixture-01',language:'en',activityId:'en-v19-fixture-01',
 skill:'listening',referenceText:'Hello',locale:'en-US',accent:null,
 source:'local-v19-technical',licenseStatus:'review-pending',contentVersion:1,
 validationStatus:'technical-passed',assessmentEnabled:false,assetUrl:'/learn/audio/en-v19-fixture-01.mp3',
};
function localItems(){
 return ['en','ru'].flatMap(lang=>Array.from({length:34},(_,i)=>({
  id:`${lang}-v19-fixture-${String(i+1).padStart(2,'0')}`,
  language:lang,kind:i===0?'listening':i===1?'dictation':'bridge',
  title:i===0?'Aviso de viagem':i===1?'Ditado simples':`Ponte ${i}`,
  level:'A2',source:i===0?'V13':i===1?'V14':'V11',
  durationSeconds:4.2,state:'awaiting_owner_review',
  questions:i===0?[{id:`${lang}-q1`,kind:'single_choice',prompt:'Qual é o destino?',options:[{id:'a',label:'Museu'},{id:'b',label:'Escola'}]}]:[],
  instruction:i===1?'Ouça e escreva o que ouviu.':'',
  transcript:lang==='en'?'The bus goes to the museum.':'Автобус едет в музей.',
  audioUrl:`/learn/audio/${lang}-v19-fixture-${String(i+1).padStart(2,'0')}.mp3`
 })));
}
test('V19 local-only authorization prevents public playback and automatic assessment',()=>{
 expect(isLearnV19AudioPreviewEnabled('matheus2t.com.br','?learn-preview=audio-v19')).toBe(false);
 expect(isLearnV19AudioPreviewEnabled('127.0.0.1','')).toBe(false);
 expect(isLearnV19AudioPreviewEnabled('127.0.0.1','?learn-preview=audio-v19')).toBe(true);
 expect(canPlayLearnAudio(fixture,policy,'matheus2t.com.br','?learn-preview=audio-v19')).toBe(false);
 expect(canPlayLearnAudio(fixture,policy,'127.0.0.1','')).toBe(false);
 expect(canPlayLearnAudio(fixture,policy,'127.0.0.1','?learn-preview=audio-v19')).toBe(true);
 expect(canAssessLearnAudio(fixture,policy,'127.0.0.1','?learn-preview=audio-v19')).toBe(false);
 expect(canAssessLearnAudio({...fixture,validationStatus:'approved',licenseStatus:'approved'},policy,'127.0.0.1','?learn-preview=audio-v19')).toBe(false);
});
test('V19 public route stays blocked even when the query flag is supplied',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/#/learn/en/audio-v19');
 await expect(page.getByRole('heading',{name:'Prévia indisponível'})).toBeVisible();
 await expect(page.locator('learn-v19-local-preview')).toHaveCount(0);
 await expect(page.locator('learn-recording-player')).toHaveCount(0);
});
test('V19 local study preview uses player for listening, dictation and bridges without saving',async({page})=>{
 await serveBuiltSite(page);
 const items=localItems();
 await page.route('**/learn/v19/preview.json',r=>r.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({version:1,preview:true,assessmentEnabled:false,publicRelease:false,records:items}),
 }));
 await page.goto('/?learn-preview=audio-v19#/learn/en/audio-v19');
 const root=page.locator('learn-v19-local-preview');
 await expect(root.getByRole('heading',{name:'Áudios em preparação'})).toBeVisible();
 await expect(root.getByRole('button',{name:/Listening/})).toHaveAttribute('aria-pressed','true');
 await expect(root.locator('learn-recording-player')).toBeVisible();
 await expect(root.getByRole('heading',{name:'Aviso de viagem'})).toBeVisible();
 await expect(root.getByText('Qual é o destino?')).toBeVisible();
 await expect(root.locator('learn-session')).toHaveCount(0);
 await expect(root.getByText('The bus goes to the museum.')).toHaveCount(0);
 await root.getByRole('button',{name:'Mostrar roteiro'}).click();
 await expect(root.getByText('The bus goes to the museum.')).toBeVisible();
 await root.getByRole('button',{name:/Ditados/}).click();
 await expect(root.getByRole('heading',{name:'Ditado simples'})).toBeVisible();
 await expect(root.getByRole('textbox',{name:'Escreva o que ouviu'})).toBeVisible();
 await expect(root.getByText('The bus goes to the museum.')).toHaveCount(0);
 await root.getByRole('button',{name:/Atividades-ponte/}).click();
 await expect(root.getByRole('heading',{name:'Ponte 2'})).toBeVisible();
 await expect(root.getByText('Sem pontuação.')).toBeVisible();
 await expect(root.locator('learn-recording-player')).toHaveCount(1);
});
test('V19 preview stays within screen in both themes and different viewports',async({page})=>{
 await serveBuiltSite(page);
 await page.route('**/learn/v19/preview.json',r=>r.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({version:1,preview:true,assessmentEnabled:false,publicRelease:false,records:localItems()}),
 }));
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:900});
  for(const theme of ['dark','light']){
   await page.goto('/?learn-preview=audio-v19#/learn/ru/audio-v19');
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await expect(page.locator('learn-recording-player')).toBeVisible();
   const overflow=await page.evaluate(()=>({
    total:document.documentElement.scrollWidth,viewport:innerWidth,
    offenders:[...document.querySelectorAll<HTMLElement>('body *')]
      .filter(x=>x.getBoundingClientRect().right>innerWidth+.5 ||
         x.getBoundingClientRect().left<-.5 ||
         x.scrollWidth>x.clientWidth+2)
      .slice(0,15).map(x=>({tag:x.tagName,klass:typeof x.className==='string'?x.className.slice(0,80):'',
        left:Math.round(x.getBoundingClientRect().left),
        right:Math.round(x.getBoundingClientRect().right),
        scroll:x.scrollWidth,client:x.clientWidth})),
    root:{html:document.documentElement.scrollWidth,body:document.body.scrollWidth}
   }));
   expect(overflow.total<=overflow.viewport,JSON.stringify({width,theme,overflow})).toBe(true);
  }
 }
});
