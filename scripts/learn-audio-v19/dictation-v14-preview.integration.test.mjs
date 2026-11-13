import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {blobSha} from './pipeline.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sourceDocs={en:path.join(root,'docs/learn-ditados-v14-en.json'),ru:path.join(root,'docs/learn-ditados-v14-ru.json')};

async function freePort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();server.close(error=>error?reject(error):resolve(address.port));});});}
function fixtureManifest(privateRoot){
 const audio=Buffer.from('RIFF-local-private-test-audio');fs.mkdirSync(path.join(privateRoot,'audio'),{recursive:true});
 const sources={},records=[];
 for(const language of ['en','ru']){
  const v14Path=path.join(privateRoot,'sources',`v14-dictation-${language}.json`),sourceText=fs.readFileSync(sourceDocs[language],'utf8');
  fs.writeFileSync(v14Path,sourceText);const dictation=JSON.parse(sourceText);sources[`dictation-${language}`]=dictation;
  sources[`listening-${language}`]={units:Array.from({length:16},(_,index)=>({draftId:`${language}-listen-v13-${String(index+1).padStart(2,'0')}`,instructionPt:'Ouça o áudio.'}))};
  sources.bridge ||= {tasks:[]};
  const base=[
   ...Array.from({length:2},(_,i)=>({id:`${language}-bridge-v11-${i+1}`,kind:'bridge',source:'V11',title:`Bridge ${i+1}`,referenceText:'Private fixture',sourceObject:{draftId:`${language}-bridge-v11-${i+1}`,taskInstruction:'Prática local.'}})),
   ...Array.from({length:16},(_,i)=>({id:`${language}-listen-v13-${String(i+1).padStart(2,'0')}`,kind:'listening',source:'V13',title:`Listening ${i+1}`,referenceText:'Private fixture'})),
   ...dictation.units.map(item=>({id:item.draftId,kind:'dictation',source:'V14',title:item.titlePt,referenceText:item.expectedTranscript,sourceProvenance:{commit:'a'.repeat(40),blobSha:blobSha(sourceText),path:`docs/learn-ditados-v14-${language}.json`}})),
  ];
  for(const row of base){
   const assetPath=`audio/${row.id}.mp3`;fs.writeFileSync(path.join(privateRoot,assetPath),audio);
   records.push({id:row.id,language,kind:row.kind,title:row.title,level:'A2',source:row.source,referenceText:row.referenceText,state:'awaiting_owner_review',assessmentEnabled:false,technicalChecks:{status:'passed'},sourceProvenance:row.sourceProvenance||{commit:'a'.repeat(40),blobSha:'d'.repeat(40),path:'fixture'},generation:{version:1,assetPath,bytes:audio.length,sha256:crypto.createHash('sha256').update(audio).digest('hex'),durationSeconds:2}});
   if(row.kind==='bridge')sources.bridge.tasks.push(row.sourceObject);
  }
 }
 fs.writeFileSync(path.join(privateRoot,'manifest.json'),JSON.stringify({schemaVersion:1,publicRelease:false,assessmentEnabled:false,records}));
 for(const [language,file] of Object.entries({'listening-en':'v13-listening-en.json','listening-ru':'v13-listening-ru.json','v11':'v11-bridge.json'})){
  const data=language==='v11'?sources.bridge:sources[language];fs.writeFileSync(path.join(privateRoot,'sources',file),JSON.stringify(data));
 }
 return {audio,records};
}

test('authenticated local V14 HTTP flow returns sanitized catalog and an uncertain attempt only after valid audio evidence',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'2t-learn-v14-')),privateRoot=path.join(temp,'private');fs.mkdirSync(path.join(privateRoot,'sources'),{recursive:true});
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const {audio,records}=fixtureManifest(privateRoot);assert.equal(records.length,68);
 const port=await freePort(),child=spawn(process.execPath,[path.join(root,'scripts/learn-audio-v19/local-study-preview.mjs'),'--experience=dictation-v14'],{cwd:root,env:{...process.env,LEARN_V19_PREVIEW_PORT:String(port),LEARN_V19_PRIVATE_DIR:privateRoot},stdio:['ignore','pipe','pipe']});
 let output='',errors='';
 const ready=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error(`Prévia não inicializou: ${output} ${errors}`)),10000);
  child.stdout.on('data',chunk=>{output+=chunk.toString();const match=output.match(new RegExp(`http://127\\.0\\.0\\.1:${port}/\\?token=[^\\s]+`));if(match){clearTimeout(timer);resolve(match[0]);}});
  child.stderr.on('data',chunk=>{errors+=chunk.toString()});child.once('exit',code=>{clearTimeout(timer);reject(Error(`Servidor saiu (${code}): ${errors}`));});
 });
 t.after(()=>{if(!child.killed)child.kill();});
 const login=await fetch(ready,{redirect:'manual'});assert.equal(login.status,302);assert.match(login.headers.get('location'),/learn-preview=dictation-v14#/);
 const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
 const origin=`http://127.0.0.1:${port}`;
 const unauthorized=await fetch(`${origin}/learn/v14/dictations.json`);assert.equal(unauthorized.status,404);
 const catalogResponse=await fetch(`${origin}/learn/v14/dictations.json`,{headers:{cookie}});assert.equal(catalogResponse.status,200);const catalog=await catalogResponse.json();
 assert.equal(catalog.items.length,32);assert.equal(catalog.items.filter(item=>item.language==='en').length,16);assert.equal(catalog.items.filter(item=>item.language==='ru').length,16);
 assert.ok(catalog.items.every(item=>item.audioAvailable===true&&item.assessmentEnabled===false));
 const catalogText=JSON.stringify(catalog);for(const sourceFile of Object.values(sourceDocs)){const editorial=JSON.parse(fs.readFileSync(sourceFile,'utf8'));for(const item of editorial.units){assert.equal(catalogText.includes(item.expectedTranscript),false);assert.equal(catalogText.includes(item.protectedElementsPt),false);}}
 const badOrigin=await fetch(`${origin}/learn/v14/attempt`,{method:'POST',headers:{cookie,origin:'https://matheus2t.com.br','content-type':'application/json'},body:'{}'});assert.equal(badOrigin.status,403);
 const body={attemptId:crypto.randomUUID(),itemId:'en-dict-v14-01',response:'Resposta não avaliada',startedAt:Date.now()-5000,playback:{completed:true,audibleSeconds:1.9,coveragePercent:0.95,playCount:1,playbackRates:[1]}};
 const noCoverage=await fetch(`${origin}/learn/v14/attempt`,{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({...body,playback:{...body.playback,coveragePercent:0.5}})});assert.equal(noCoverage.status,400);
 const submitted=await fetch(`${origin}/learn/v14/attempt`,{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(submitted.status,200);const result=await submitted.json();assert.equal(result.attempt.outcome,'uncertain');assert.equal(result.attempt.reviewStatus,'awaiting_review');assert.equal(result.attempt.assessmentEnabled,false);assert.equal(result.transcript,JSON.parse(fs.readFileSync(sourceDocs.en,'utf8')).units[0].expectedTranscript);
 const audioResponse=await fetch(`${origin}/learn/audio/en-dict-v14-01.mp3`,{headers:{cookie}});assert.equal(audioResponse.status,200);assert.deepEqual(Buffer.from(await audioResponse.arrayBuffer()),audio);
 const rangeResponse=await fetch(`${origin}/learn/audio/en-dict-v14-01.mp3`,{headers:{cookie,range:'bytes=0-3'}});assert.equal(rangeResponse.status,206);assert.equal(rangeResponse.headers.get('content-range'),`bytes 0-3/${audio.length}`);
});
