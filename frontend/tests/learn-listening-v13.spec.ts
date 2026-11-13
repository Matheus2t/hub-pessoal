import {test,expect} from '@playwright/test';
import {Buffer} from 'node:buffer';
import {existsSync,readFileSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
import {serveBuiltSite} from './helpers/serve-built-site';
import {isLearnListeningV13PreviewEnabled} from '../src/learn/pilot-preview';

function toneWav(){
 const rate=8000,samples=1600,data=Buffer.alloc(samples),wav=Buffer.alloc(44+samples);
 for(let i=0;i<samples;i++)data[i]=128+Math.round(32*Math.sin(2*Math.PI*440*i/rate));
 wav.write('RIFF',0);wav.writeUInt32LE(36+samples,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);
 wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate,28);
 wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(samples,40);data.copy(wav,44);return wav;
}
function preview(language:'en'|'ru'){
 const units=[];
 for(const level of ['A2','B1'] as const)for(let i=1;i<=8;i++){
  const id=`${language}-listen-v13-${String((level==='A2'?0:8)+i).padStart(2,'0')}`;
  const unit={id,language,level,title:`${language==='en'?'English':'Русский'} ${level} ${i}`,genre:i%2?'announcement':'dialogue',
   transcript:[{speaker:language==='en'?'Announcer':'Диктор',text:language==='en'?'The bus usually leaves at nine and arrives at the museum.':'Автобус обычно отправляется в девять и приезжает к музею.'}],
   questions:[{id:`${id}-q1`,kind:'single_choice',prompt:'Qual é o destino?',options:[{id:'a',label:'Museu'},{id:'b',label:'Escola'},{id:'c',label:'Hospital'}]},
    {id:`${id}-q2`,kind:'short_answer',prompt:'Por que houve a mudança?',options:[]},
    ...(level==='B1'?[{id:`${id}-q3`,kind:'single_choice',prompt:'Qual horário foi informado?',options:[{id:'a',label:'Nove'},{id:'b',label:'Dez'},{id:'c',label:'Onze'}]}]:[])],
   audio:null as null|{id:string;assetUrl:string;technicalStatus:'technical-passed';ownerReview:'pending'} };
  if(level==='A2'&&i===1)unit.audio={id,assetUrl:'/learn/audio/fixture-tone.wav',technicalStatus:'technical-passed',ownerReview:'pending'};
  units.push(unit);
 }
 return {schemaVersion:1,previewOnly:true,language,publicRelease:false,assessmentEnabled:false,audioAssessmentEnabled:false,units};
}

test('V13 preview requires loopback and explicit opt-in; query never unlocks public host',()=>{
 expect(isLearnListeningV13PreviewEnabled('localhost','?learn-preview=listening-v13')).toBe(true);
 expect(isLearnListeningV13PreviewEnabled('127.0.0.1','?learn-preview=listening-v13')).toBe(true);
 expect(isLearnListeningV13PreviewEnabled('[::1]','?learn-preview=listening-v13')).toBe(true);
 expect(isLearnListeningV13PreviewEnabled('127.0.0.1','')).toBe(false);
 expect(isLearnListeningV13PreviewEnabled('matheus2t.com.br','?learn-preview=listening-v13')).toBe(false);
});

test('route is blocked without the loopback opt-in',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/#/learn/en/listening-v13');
 await expect(page.getByRole('heading',{name:'Página do Learn não encontrada'})).toBeVisible();
 await expect(page.locator('learn-listening-v13-preview')).toHaveCount(0);
 await expect(page.locator('learn-recording-player')).toHaveCount(0);
});

test('official hostname blocks V13 even when the preview query is supplied',async({page})=>{
 const root=resolve('dist'),mime:{[key:string]:string}={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
 await page.route('https://matheus2t.com.br/**',async route=>{
  const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
  if(pathname==='/service-worker.js')return route.fulfill({status:404,body:'disabled in test'});
  const file=resolve(root,pathname==='/'?'index.html':pathname.slice(1));
  if(!file.startsWith(`${root}${sep}`)||!existsSync(file))return route.fulfill({status:404,body:'not found'});
  return route.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});
 });
 await page.goto('https://matheus2t.com.br/?learn-preview=listening-v13#/learn/en/listening-v13');
 await expect(page.getByRole('heading',{name:'Página do Learn não encontrada'})).toBeVisible();
 await expect(page.locator('learn-listening-v13-preview')).toHaveCount(0);
 await expect(page.locator('learn-recording-player')).toHaveCount(0);
});

test('local V13 playback, questions, transcript assistance, navigation and ungraded feedback',async({page})=>{
 await serveBuiltSite(page,{status:200,contentType:'audio/wav',body:toneWav()});
 await page.addInitScript(()=>{
  const factory=window.indexedDB;let opened=0;
  Object.defineProperty(window,'__v13DbOpens',{get:()=>opened});
  const original=factory.open.bind(factory);factory.open=(...args:Parameters<IDBFactory['open']>)=>{opened++;return original(...args);};
 });
 await page.route('**/learn/v13/preview.json**',route=>{
  const language=new URL(route.request().url()).searchParams.get('language')==='ru'?'ru':'en';
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(preview(language))});
 });
 await page.goto('/?learn-preview=listening-v13#/learn/en/listening-v13');
 const root=page.locator('learn-listening-v13-preview');
 await expect(root.getByRole('heading',{name:'Listening A2/B1'})).toBeVisible();
 await expect(root.getByRole('heading',{name:'English A2 1'})).toBeVisible();
 await expect(root.getByText('The bus usually leaves at nine and arrives at the museum.')).toHaveCount(0);
 const player=root.locator('learn-recording-player');await expect(player).toBeVisible();
 await expect(root.getByText('Qual é o destino?')).toHaveCount(0);
 await expect(root.getByText('Ouça a gravação até o fim para abrir as questões. A conclusão técnica não gera avaliação.')).toBeVisible();
 await player.getByRole('button',{name:'Reproduzir gravação'}).click();
 await expect(player.getByText('Reprodução concluída.')).toBeVisible({timeout:5000});
 await expect(root.getByText('Qual é o destino?')).toBeVisible();
 await root.getByLabel('Museu').check();
 await root.getByLabel('Resposta aberta').fill('A rua estava em obras.');
 await root.getByRole('button',{name:'Concluir prática'}).click();
 await expect(root.getByText(/Não avaliada \(notAssessed\)/)).toBeVisible();
 await expect(root.getByText(/Incerta \(uncertain\)/)).toBeVisible();
 await expect(root.getByText(/reprodução técnica foi concluída, mas não equivale a áudio homologado/i)).toBeVisible();
 await root.getByRole('button',{name:'Consultar roteiro'}).click();
 await expect(root.getByText('The bus usually leaves at nine and arrives at the museum.')).toBeVisible();
 await expect(root.getByText(/Roteiro foi consultado/i)).toHaveCount(0);
 await root.getByRole('button',{name:'Concluir prática'}).click();
 await expect(root.getByText(/O roteiro foi consultado; a resposta não conta como evidência independente/i)).toBeVisible();
 await root.getByRole('button',{name:'B1'}).click();
 await expect(root.locator('fieldset')).toHaveCount(3);
 await root.locator('select').selectOption('en-listen-v13-10');
 await expect(root.getByRole('heading',{name:'English B1 2'})).toBeVisible();
 expect(await page.evaluate(()=>Number((window as Window&{__v13DbOpens?:number}).__v13DbOpens||0))).toBe(0);
});

test('V13 preview avoids horizontal overflow in both themes from 320px to desktop',async({page})=>{
 await serveBuiltSite(page);
 await page.route('**/learn/v13/preview.json**',route=>{
  const language=new URL(route.request().url()).searchParams.get('language')==='ru'?'ru':'en';
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(preview(language))});
 });
 for(const width of [320,390,768,1366,1920]){
  await page.setViewportSize({width,height:900});
  for(const theme of ['dark','light']){
   await page.goto('/?learn-preview=listening-v13#/learn/ru/listening-v13');
   await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
   await expect(page.locator('learn-listening-v13-preview')).toBeVisible();
   await expect(page.getByRole('heading',{name:'Русский A2 1'})).toBeVisible();
   const dims=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
   expect(dims.scroll,`horizontal overflow at ${width}px ${theme}`).toBeLessThanOrEqual(dims.viewport);
  }
 }
});
