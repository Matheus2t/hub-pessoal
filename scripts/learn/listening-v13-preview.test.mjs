import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {allowedPreviewHost,buildV13PreviewBundle,createV13PreviewServer} from './listening-v13-preview.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const documents=Object.fromEntries(['en','ru'].map(language=>[
 language,JSON.parse(fs.readFileSync(path.join(repo,'docs',`learn-listening-v13-${language}.json`),'utf8')),
]));
const transcript=unit=>unit.transcript.map(line=>line.text).join(' ').replace(/\s+/g,' ').trim();

test('V13 sanitizes real editorial content: 32 scripts, 80 questions, no keys or model answers',()=>{
 const {bundles,audioFiles}=buildV13PreviewBundle(documents);
 let questionCount=0;
 for(const language of ['en','ru']){
  const response=bundles[language];
  assert.equal(response.publicRelease,false);
  assert.equal(response.assessmentEnabled,false);
  assert.equal(response.audioAssessmentEnabled,false);
  assert.equal(response.units.length,16);
  assert.deepEqual(response.units.reduce((counts,unit)=>(counts[unit.level]++,counts),{A2:0,B1:0}),{A2:8,B1:8});
  assert.ok(response.units.every(unit=>unit.language===language&&unit.audio===null));
  questionCount+=response.units.reduce((total,unit)=>total+unit.questions.length,0);
  const json=JSON.stringify(response);
  assert.doesNotMatch(json,/correctOptionId|modelPt|acceptedExamplesPt|essentialEvidence|"evidence"/);
 }
 assert.equal(questionCount,80);
 assert.equal(audioFiles.size,0);
});

test('V19 audio is linked only when ID, language, kind, source, transcript, state and file match',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'learn-v13-audio-'));
 try{
  const audioDir=path.join(temp,'audio');fs.mkdirSync(audioDir);
  const unit=documents.en.units[0],asset='audio/en-listen-v13-01__v1.mp3';
  fs.writeFileSync(path.join(temp,asset),'technical fixture bytes');
  const target={id:unit.draftId,language:'en',level:unit.level,title:unit.titlePt,kind:'listening',source:'V13',state:'awaiting_owner_review',
   technicalChecks:{status:'passed'},generation:{assetPath:asset},referenceText:transcript(unit)};
  const records=[target,...Array.from({length:67},(_,i)=>({id:`other-${i}`,language:'en',kind:'bridge',source:'V11'}))];
  const manifest={schemaVersion:1,publicRelease:false,assessmentEnabled:false,records};
  let bundle=buildV13PreviewBundle(documents,{manifest,privateRoot:temp});
  assert.equal(bundle.bundles.en.units[0].audio.assetUrl,'/learn/audio/en-listen-v13-01.mp3');
  assert.equal(bundle.audioFiles.size,1);
  assert.equal(bundle.bundles.en.audioAssessmentEnabled,false);

  const mismatched={...target,referenceText:'texto divergente'};
  bundle=buildV13PreviewBundle(documents,{manifest:{...manifest,records:[mismatched,...records.slice(1)]},privateRoot:temp});
  assert.equal(bundle.bundles.en.units[0].audio,null);
  bundle=buildV13PreviewBundle(documents,{manifest:{...manifest,records:[{...target,language:'ru'},...records.slice(1)]},privateRoot:temp});
  assert.equal(bundle.bundles.en.units[0].audio,null);
  bundle=buildV13PreviewBundle(documents,{manifest:{...manifest,records:[{...target,state:'approved'},...records.slice(1)]},privateRoot:temp});
  assert.equal(bundle.bundles.en.units[0].audio,null);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('local preview requires one-time token session and serves no public content',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'learn-v13-server-'));
 const dist=path.join(temp,'dist');fs.mkdirSync(dist);fs.writeFileSync(path.join(dist,'index.html'),'<main>local</main>');
 const app=createV13PreviewServer({repoRoot:temp,port:0,token:'test-only-token',documents});
 try{
  await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
  const address=app.server.address(),base=`http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(`${base}/learn/v13/preview.json?language=en`)).status,404);
  assert.equal(allowedPreviewHost('example.com:'+address.port,address.port),false);
  assert.equal(allowedPreviewHost(`127.0.0.1:${address.port}`,address.port),true);
  const login=await fetch(`${base}/?token=test-only-token`,{redirect:'manual'});
  assert.equal(login.status,302);
  assert.equal(login.headers.get('location'), '/?learn-preview=listening-v13#/learn/en/listening-v13');
  const cookie=login.headers.get('set-cookie');
  assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
  const response=await fetch(`${base}/learn/v13/preview.json?language=en`,{headers:{Cookie:cookie.split(';')[0]}});
  assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.units.length,16);assert.equal(body.publicRelease,false);
  assert.equal((await fetch(`${base}/learn/v13/preview.json?language=en`,{headers:{Cookie:cookie.split(';')[0],'Sec-Fetch-Site':'cross-site'}})).status,403);
  assert.equal((await fetch(`${base}/learn/v13/preview.json?language=xx`,{headers:{Cookie:cookie.split(';')[0]}})).status,400);
  const audio=await fetch(`${base}/learn/audio/en-listen-v13-01.mp3`,{method:'HEAD',headers:{Cookie:cookie.split(';')[0]}});
  assert.equal(audio.status,app.audioFiles.has('en-listen-v13-01')?200:404);
  if(audio.status===200)assert.equal(audio.headers.get('content-type'),'audio/mpeg');
  assert.equal((await fetch(`${base}/`,{headers:{Cookie:cookie.split(';')[0]}})).status,200);
 }finally{
  app.server.closeAllConnections?.();await new Promise(resolve=>app.server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});
 }
});

test('current private V19 inventory links and serves all exact V13 recordings as unapproved practice only',{
 skip:!process.env.LEARN_AUDIO_V19_DIR||!fs.existsSync(path.join(process.env.LEARN_AUDIO_V19_DIR,'manifest.json')),
},async()=>{
 const privateRoot=process.env.LEARN_AUDIO_V19_DIR;
 const manifest=JSON.parse(fs.readFileSync(path.join(privateRoot,'manifest.json'),'utf8'));
 const {bundles,audioFiles}=buildV13PreviewBundle(documents,{manifest,privateRoot});
 for(const language of ['en','ru']){
  assert.equal(bundles[language].units.filter(unit=>unit.audio).length,16);
  assert.ok(bundles[language].units.every(unit=>unit.audio?.id===unit.id&&unit.audio.ownerReview==='pending'));
 }
 assert.equal(audioFiles.size,32);
 assert.equal(bundles.en.audioAssessmentEnabled,false);
 assert.equal(bundles.ru.assessmentEnabled,false);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'learn-v13-real-audio-'));
 fs.mkdirSync(path.join(temp,'dist'));fs.writeFileSync(path.join(temp,'dist','index.html'),'<main>local</main>');
 const app=createV13PreviewServer({repoRoot:temp,port:0,token:'private-audio-test',documents,manifest,privateRoot});
 try{
  await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const login=await fetch(`${base}/?token=private-audio-test`,{redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
  const audio=await fetch(`${base}/learn/audio/en-listen-v13-01.mp3`,{headers:{Cookie:cookie,Range:'bytes=0-63'}});
  assert.equal(audio.status,206);assert.equal(audio.headers.get('content-type'),'audio/mpeg');
  assert.equal((await audio.arrayBuffer()).byteLength,64);
 }finally{app.server.closeAllConnections?.();await new Promise(resolve=>app.server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});}
});
