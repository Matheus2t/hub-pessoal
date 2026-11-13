#!/usr/bin/env node
/**
 * 2T Learn V19: local, authenticated study preview.
 * Never exposes private recordings on Vercel or copies them into dist.
 * Run from the worktree that contains private/learn-audio-v19/:
 * npm run build && node scripts/learn-audio-v19/local-study-preview.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRIVATE, blobSha } from './pipeline.mjs';
import { makeV14PreviewCatalog, prepareV14Submission } from '../learn/dictation-v14-core.mjs';

const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DIST=path.join(REPO,'dist');
// Local-only override lets a fresh feature worktree reuse the existing ignored V19 artifact store.
const PRIVATE_ROOT=process.env.LEARN_V19_PRIVATE_DIR?path.resolve(process.env.LEARN_V19_PRIVATE_DIR):PRIVATE;
const MANIFEST=path.join(PRIVATE_ROOT,'manifest.json');
const AUDIO_DIR=path.join(PRIVATE_ROOT,'audio');
const SOURCES=path.join(PRIVATE_ROOT,'sources');
const HOST='127.0.0.1';
const PORT=Number(process.env.LEARN_V19_PREVIEW_PORT||18789);
const filesByKind={
  bridge:'v11-bridge.json',
  'listening-en':'v13-listening-en.json','listening-ru':'v13-listening-ru.json',
  'dictation-en':'v14-dictation-en.json','dictation-ru':'v14-dictation-ru.json'
};
const mime={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png',
  '.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2',
  '.wasm':'application/wasm','.webmanifest':'application/manifest+json',
  '.txt':'text/plain; charset=utf-8'
};
const token=crypto.randomBytes(32).toString('base64url');
const cookieName='learn_v19_preview';
const verifiedV14Audio=new Map();
const previewExperience=process.argv.includes('--experience=dictation-v14')?'dictation-v14':'audio-v19';

export function allowedPreviewHost(host,port=PORT){return host===`${HOST}:${port}`;}
export function allowedPreviewClient(ip){return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);}
export function safeLocalAudioPath(name){
  if(typeof name!=='string'||!/^audio\/[a-z0-9][a-z0-9_.-]*\.mp3$/i.test(name))return null;
  const resolved=path.resolve(PRIVATE_ROOT,name);
  return resolved.startsWith(AUDIO_DIR+path.sep)?resolved:null;
}
export function previewManifest(raw,sources){
  if(raw?.schemaVersion!==1||raw.publicRelease!==false||raw.assessmentEnabled!==false||
    !Array.isArray(raw.records)||raw.records.length!==68)throw Error('Inventário privado V19 incompleto ou liberado indevidamente.');
  const ids=new Set();
  const bridge=new Map((sources.bridge?.tasks||[]).map(unit=>[unit.draftId,unit]));
  const listening=Object.fromEntries(['en','ru'].map(lang=>[lang,new Map((sources[`listening-${lang}`]?.units||[]).map(unit=>[unit.draftId,unit]))]));
  const dictations=Object.fromEntries(['en','ru'].map(lang=>[lang,new Map((sources[`dictation-${lang}`]?.units||[]).map(unit=>[unit.draftId,unit]))]));
  const records=raw.records.map(record=>{
    if(typeof record.id!=='string'||!/^[a-z0-9][a-z0-9_-]{2,80}$/i.test(record.id)||
      ids.has(record.id)||!['en','ru'].includes(record.language)||
      !['bridge','listening','dictation'].includes(record.kind))throw Error('ID ou tipo privado inválido.');
    ids.add(record.id);
    const pathToAudio=safeLocalAudioPath(record.generation?.assetPath);
    if(!pathToAudio||!fs.existsSync(pathToAudio)||
      !['awaiting_owner_review','approved'].includes(record.state)||
      record.technicalChecks?.status!=='passed')throw Error(`Áudio não verificado: ${record.id}`);
    const source=record.kind==='bridge'?bridge.get(record.id):
      record.kind==='listening'?listening[record.language].get(record.id):
      dictations[record.language].get(record.id);
    if(!source)throw Error(`Fonte editorial privada não encontrada: ${record.id}`);
    const questions=record.kind==='listening'?(source.questions||[]).map(q=>({
      id:q.id,kind:q.kind,prompt:q.promptPt,
      options:q.kind==='single_choice'?(q.options||[]).map(o=>({id:o.id,label:o.label})):[],
    })):[];
    return {
      id:record.id,language:record.language,kind:record.kind,
      title:record.title,level:record.level||'—',
      durationSeconds:record.generation.durationSeconds,
      state:record.state,source:record.source,
      questions,
      instruction:record.kind==='bridge'?source.taskInstruction:
        record.kind==='dictation'?source.instructionPt:'',
      transcript:record.referenceText,
      audioUrl:`/learn/audio/${record.id}.mp3`
    };
  });
  const counts={en:records.filter(r=>r.language==='en').length,ru:records.filter(r=>r.language==='ru').length};
  if(counts.en!==34||counts.ru!==34)throw Error('O inventário precisa conter 34 áudios por idioma.');
  return {version:1,preview:true,assessmentEnabled:false,publicRelease:false,records};
}
function loadPrivate(){
  const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
  const sources=Object.fromEntries(Object.entries(filesByKind).map(([name,file])=>[
    name,JSON.parse(fs.readFileSync(path.join(SOURCES,file),'utf8'))
  ]));
  const sourceBlobShas=Object.fromEntries(['en','ru'].map(language=>[language,blobSha(fs.readFileSync(path.join(SOURCES,filesByKind[`dictation-${language}`]),'utf8'))]));
  return {manifest,sources,sourceBlobShas,preview:previewManifest(manifest,sources)};
}
function verifyV14Audio(record){
  const file=safeLocalAudioPath(record?.generation?.assetPath);
  if(!file||!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||record?.technicalChecks?.status!=='passed'||!Number.isInteger(record?.generation?.bytes)||!/^[a-f0-9]{64}$/.test(record?.generation?.sha256||''))return false;
  const stat=fs.statSync(file),cached=verifiedV14Audio.get(record.id);
  if(cached&&cached.size===stat.size&&cached.mtimeMs===stat.mtimeMs)return stat.size===record.generation.bytes;
  if(stat.size!==record.generation.bytes)return false;
  const digest=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const valid=digest===record.generation.sha256;
  if(valid)verifiedV14Audio.set(record.id,{size:stat.size,mtimeMs:stat.mtimeMs});else verifiedV14Audio.delete(record.id);
  return valid;
}
function v14Catalog(privateData){
  const verified=new Set(privateData.manifest.records.filter(record=>record.kind==='dictation'&&/^([a-z]{2})-dict-v14-\d{2}$/.test(record.id)&&verifyV14Audio(record)).map(record=>record.id));
  return makeV14PreviewCatalog({manifest:privateData.manifest,records:privateData.manifest.records,sources:privateData.sources,sourceBlobShas:privateData.sourceBlobShas,verifiedAudio:verified});
}
function v14Attempt(privateData,body,now=Date.now()){
  if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.attemptId!=='string'||!/^[-a-z0-9]{8,120}$/i.test(body.attemptId)||typeof body.itemId!=='string'||!/^([a-z]{2})-dict-v14-(0[1-9]|1[0-6])$/.test(body.itemId)||typeof body.response!=='string'||body.response.length>2000||!Number.isFinite(body.startedAt)||body.startedAt<0||body.startedAt>now||now-body.startedAt>60*24*60*60*1000)throw Error('Tentativa V14 inválida.');
  const record=privateData.manifest.records.find(item=>item.id===body.itemId&&item.kind==='dictation');
  const catalog=v14Catalog(privateData),item=catalog.items.find(entry=>entry.id===body.itemId);
  const source=(privateData.sources[`dictation-${record?.language}`]?.units||[]).find(entry=>entry.draftId===body.itemId);
  if(!record||!item?.audioAvailable||!source||record.language!==body.itemId.slice(0,2))throw Error('Áudio V14 indisponível ou incompatível.');
  const assessmentEnabled=privateData.manifest.assessmentEnabled===true&&record.assessmentEnabled===true&&record.state==='approved';
  const prepared=prepareV14Submission({item,source,response:body.response,playback:body.playback,assessmentEnabled});
  return {
    attempt:{attemptId:body.attemptId,itemId:item.id,language:item.language,level:item.level,linkedStageNodeId:item.linkedStageNodeId,contentVersion:1,editorialCommit:item.sourceCommit,editorialBlobSha:item.sourceBlobSha,audioVersion:item.audioVersion,audioSha256:item.audioSha256,audioStatus:item.audioState,response:body.response,startedAt:body.startedAt,submittedAt:now,playback:body.playback,assessmentEnabled,...prepared.result},
    transcript:prepared.transcript,
  };
}
async function readJsonBody(req,maxBytes=8192){
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>maxBytes)throw Error('Tentativa excede o limite permitido.');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('Corpo JSON inválido.');}
}
function response(res,status,body,extra={}){
  res.writeHead(status,{
    'Cache-Control':'no-store, private, max-age=0','X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
    'Cross-Origin-Resource-Policy':'same-origin',...extra
  });
  res.end(body);
}
function authorized(req){
  const cookies=(req.headers.cookie||'').split(';').map(x=>x.trim());
  const saved=cookies.find(c=>c.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(typeof saved!=='string'||saved.length!==token.length)return false;
  return crypto.timingSafeEqual(Buffer.from(saved),Buffer.from(token));
}
function serveAudio(req,res,record){
  const file=safeLocalAudioPath(record.generation.assetPath);
  if(!file||!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||
    !['awaiting_owner_review','approved'].includes(record.state)||
    record.technicalChecks?.status!=='passed'||record.id.includes('dict-v14-')&&!verifyV14Audio(record))return response(res,404,'Gravação indisponível.');
  const stats=fs.statSync(file);
  const range=req.headers.range;
  let start=0,end=stats.size-1,status=200;
  if(range){
    const m=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!m||(!m[1]&&!m[2]))return response(res,416,'Intervalo inválido.',{'Content-Range':`bytes */${stats.size}`});
    if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<1)return response(res,416,'Intervalo inválido.');start=Math.max(0,stats.size-suffix);}
    else{start=Number(m[1]);end=m[2]?Number(m[2]):end;}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=stats.size||start>end)
      return response(res,416,'Intervalo inválido.',{'Content-Range':`bytes */${stats.size}`});
    end=Math.min(end,stats.size-1);status=206;
  }
  const headers={
    'Content-Type':'audio/mpeg','Content-Length':String(end-start+1),'Accept-Ranges':'bytes',
    'Cache-Control':'no-store, private, max-age=0','X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin',
    ...(status===206?{'Content-Range':`bytes ${start}-${end}/${stats.size}`}:{})
  };
  res.writeHead(status,headers);
  fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
}
function serveSite(res,pathName){
  if(pathName==='/service-worker.js')return response(res,404,'Service worker desativado na prévia privada.');
  const target=path.resolve(DIST,'.'+(pathName==='/'?'/index.html':pathName));
  if(!target.startsWith(DIST+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()||
    fs.lstatSync(target).isSymbolicLink())return response(res,404,'Arquivo não encontrado.');
  const ext=path.extname(target).toLowerCase();
  if(!mime[ext])return response(res,404,'Formato não permitido.');
  return response(res,200,fs.readFileSync(target),{'Content-Type':mime[ext]});
}
export function run(){
  if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw Error('Porta inválida.');
  if(!fs.existsSync(path.join(DIST,'index.html')))throw Error('Build não encontrado. Execute npm run build.');
  if(!fs.existsSync(MANIFEST))throw Error('Manifesto privado não encontrado neste worktree. Os 68 MP3 devem permanecer aqui.');
  // Fail closed: a missing recording or an exposed/partially exported manifest stops the server.
  loadPrivate();
  const server=http.createServer((req,res)=>{
    try{
      if(!allowedPreviewHost(req.headers.host))return response(res,421,'Host inválido.');
      if(!allowedPreviewClient(req.socket.remoteAddress))return response(res,403,'Somente loopback.');
      if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))
        return response(res,403,'Origem inválida.');
      const u=new URL(req.url,`http://${HOST}:${PORT}`);
      if(u.pathname==='/'&&u.searchParams.get('token')===token){
        const location=previewExperience==='dictation-v14'||u.searchParams.get('experience')==='dictation-v14'
          ?'/?learn-preview=dictation-v14#/learn/en/dictation-v14':'/?learn-preview=audio-v19#/learn/en/audio-v19';
        return response(res,302,'',{'Set-Cookie':`${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/`,
          'Location':location});
      }
      const isV14Post=req.method==='POST'&&u.pathname==='/learn/v14/attempt';
      if(req.method!=='GET'&&req.method!=='HEAD'&&!isV14Post)return response(res,405,'Método não permitido.');
      if(!authorized(req))return response(res,404,'Prévia privada indisponível.');
      if(req.method==='POST'){
        if(req.headers.origin!==`http://${HOST}:${PORT}`||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return response(res,403,'Origem da tentativa inválida.');
        return readJsonBody(req).then(body=>{
          const result=v14Attempt(loadPrivate(),body);
          return response(res,200,JSON.stringify(result),{'Content-Type':'application/json; charset=utf-8'});
        }).catch(()=>response(res,400,'Não foi possível validar a tentativa. Nenhuma evidência foi registrada.'));
      }
      if(u.pathname==='/learn/v14/dictations.json')
        return response(res,200,JSON.stringify(v14Catalog(loadPrivate())),{'Content-Type':'application/json; charset=utf-8'});
      if(u.pathname==='/learn/v19/preview.json')
        return response(res,200,JSON.stringify(loadPrivate().preview),{'Content-Type':'application/json; charset=utf-8'});
      const match=/^\/learn\/audio\/([a-z0-9][a-z0-9_-]{2,80})\.mp3$/i.exec(u.pathname);
      if(match){
        const {manifest}=loadPrivate();
        const record=manifest.records.find(r=>r.id===match[1]);
        return record?serveAudio(req,res,record):response(res,404,'Gravação não encontrada.');
      }
      return serveSite(res,u.pathname);
    }catch(error){return response(res,500,'Prévia indisponível. Verifique os arquivos privados.');}
  });
  server.listen(PORT,HOST,()=>{
    process.stdout.write(`2T Learn ${previewExperience==='dictation-v14'?'V14':'V19'} — prévia privada em loopback.\n`);
    process.stdout.write(`Abra no computador com os MP3: http://${HOST}:${PORT}/?token=${token}${previewExperience==='dictation-v14'?'&experience=dictation-v14':''}\n`);
    process.stdout.write('Para encerrar: Ctrl+C. Não compartilhe a URL nem os arquivos privados.\n');
  });
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{run()}catch(error){process.stderr.write(String(error.message||error)+'\n');process.exitCode=1;}
}
