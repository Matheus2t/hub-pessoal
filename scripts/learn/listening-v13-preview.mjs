#!/usr/bin/env node
/** Loopback-only, session-authenticated V13 preview. Editorial JSON and MP3s never enter dist. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO=path.resolve(HERE,'../..');
const HOST='127.0.0.1';
const DEFAULT_PORT=18790;
const COOKIE='learn_v13_preview';
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const languageList=['en','ru'];

function normalizeText(value){return String(value||'').replace(/\s+/g,' ').trim();}
function regularFileInside(root,relative){
 if(typeof relative!=='string'||!/^audio\/[a-z0-9][a-z0-9_.-]*\.mp3$/i.test(relative))return undefined;
 const resolvedRoot=path.resolve(root),base=path.resolve(resolvedRoot,'audio'),resolved=path.resolve(resolvedRoot,relative);
 if(!resolved.startsWith(base+path.sep)||!fs.existsSync(resolved))return undefined;
 try{
  if(fs.lstatSync(resolvedRoot).isSymbolicLink()||fs.lstatSync(base).isSymbolicLink())return undefined;
  const stat=fs.lstatSync(resolved);if(!stat.isFile()||stat.isSymbolicLink())return undefined;
 }
 catch{return undefined;}
 return resolved;
}
function validateEditorial(data,language){
 if(data?.schemaVersion!==1||data.recordType!=='learn_listening_editorial_v13'||data.language!==language||
   data.publicRelease!==false||data.cefrCertified!==false||data.audioStatus!=='script_only_no_audio_generated_or_validated'||
   !Array.isArray(data.units)||data.units.length!==16||data.internalEditorialReview?.releaseAllowed!==false)
  throw Error(`Conteúdo editorial V13 inválido ou liberado: ${language}.`);
 const ids=new Set(),qids=new Set(),levels={A2:0,B1:0};
 for(const unit of data.units){
  if(unit.language!==language||!['A2','B1'].includes(unit.level)||!new RegExp(`^${language}-listen-v13-\\d{2}$`).test(unit.draftId)||ids.has(unit.draftId)||
    unit.public!==false||unit.productionStatus!=='script_only_no_recording'||unit.reviewStatus!=='editorial_draft_requires_independent_language_review'||
    !unit.titlePt?.trim()||!Array.isArray(unit.transcript)||!unit.transcript.length||!Array.isArray(unit.questions))throw Error(`Roteiro V13 inválido: ${unit.draftId||'sem ID'}.`);
  ids.add(unit.draftId);levels[unit.level]++;
  if(unit.questions.length!==(unit.level==='A2'?2:3))throw Error(`Quantidade de questões inválida: ${unit.draftId}.`);
  for(const q of unit.questions){
   if(!q.id||qids.has(q.id)||!q.promptPt?.trim()||!['single_choice','short_answer'].includes(q.kind))throw Error(`Questão V13 inválida: ${q.id||unit.draftId}.`);
   qids.add(q.id);
   if(q.kind==='single_choice'&&(!Array.isArray(q.options)||q.options.length!==3||!q.options.some(o=>o.id===q.correctOptionId)))throw Error(`Alternativas V13 inválidas: ${q.id}.`);
   if(q.kind==='short_answer'&&q.scoring!=='human_or_uncertain_no_strict_string_match')throw Error(`Rubrica aberta inválida: ${q.id}.`);
  }
 }
 if(levels.A2!==8||levels.B1!==8||qids.size!==40)throw Error(`Cobertura V13 inválida: ${language}.`);
 return data;
}

function v19RecordIndex(manifest,privateRoot){
 if(!manifest)return new Map();
 if(manifest.schemaVersion!==1||manifest.publicRelease!==false||manifest.assessmentEnabled!==false||!Array.isArray(manifest.records)||manifest.records.length!==68)
  throw Error('Manifesto V19 ausente de privacidade ou incompleto; nenhuma gravação será servida.');
 const matches=new Map();
 for(const record of manifest.records){
  if(record.source!=='V13'||record.kind!=='listening'||!languageList.includes(record.language)||
     record.state!=='awaiting_owner_review'||record.technicalChecks?.status!=='passed')continue;
  const file=regularFileInside(privateRoot,record.generation?.assetPath);
  if(!file)continue;
  matches.set(record.id,{record,file});
 }
 return matches;
}

export function buildV13PreviewBundle(documents,{manifest,privateRoot}={}){
 const validated=Object.fromEntries(languageList.map(language=>[language,validateEditorial(documents[language],language)]));
 const audioIndex=v19RecordIndex(manifest,privateRoot||'');
 const policy={audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true,publicRelease:false};
 const bundles={},audioFiles=new Map();
 for(const language of languageList){
  const source=validated[language];
  const units=source.units.map(unit=>{
   const candidate=audioIndex.get(unit.draftId),joined=normalizeText(unit.transcript.map(line=>line.text).join(' '));
   const audio=candidate&&candidate.record.language===language&&candidate.record.level===unit.level&&candidate.record.title===unit.titlePt&&candidate.record.referenceText&&
      normalizeText(candidate.record.referenceText)===joined
    ?{id:unit.draftId,assetUrl:`/learn/audio/${unit.draftId}.mp3`,technicalStatus:'technical-passed',ownerReview:'pending'}:null;
   if(audio)audioFiles.set(unit.draftId,candidate.file);
   return {
    id:unit.draftId,language,level:unit.level,title:unit.titlePt,genre:unit.genre,
    transcript:unit.transcript.map(line=>({speaker:line.speaker,text:line.text})),
    questions:unit.questions.map(question=>({id:question.id,kind:question.kind,prompt:question.promptPt,
     options:question.kind==='single_choice'?question.options.map(option=>({id:option.id,label:option.label})):[]})),audio,
   };
  });
  bundles[language]={schemaVersion:1,previewOnly:true,language,publicRelease:false,assessmentEnabled:false,audioAssessmentEnabled:false,units};
 }
 return {bundles,audioFiles,policy};
}

function safeEqual(actual,expected){
 const a=Buffer.from(String(actual||'')),b=Buffer.from(String(expected||''));
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function allowedPreviewHost(requestHost,port){return requestHost===`${HOST}:${port}`;}
function cookieValue(header){
 for(const part of String(header||'').split(';')){const [key,...rest]=part.trim().split('=');if(key===COOKIE)return rest.join('=');}
 return '';
}
function send(res,status,body='',headers={}){
 res.writeHead(status,{'Cache-Control':'no-store, private, max-age=0','X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin',...headers});
 if(res.req?.method==='HEAD')res.end();else res.end(body);
}
function streamAudio(req,res,id,file){
 const stats=fs.statSync(file);let start=0,end=stats.size-1,status=200;
 const range=req.headers.range;
 if(range){
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match)return send(res,416,'Range inválido.',{'Content-Range':`bytes */${stats.size}`});
  if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<1)return send(res,416,'Range inválido.',{'Content-Range':`bytes */${stats.size}`});start=Math.max(0,stats.size-suffix);}
  else{start=Number(match[1]);end=match[2]?Number(match[2]):end;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=stats.size||start>end)return send(res,416,'Range inválido.',{'Content-Range':`bytes */${stats.size}`});
  end=Math.min(end,stats.size-1);status=206;
 }
 const headers={'Content-Type':'audio/mpeg','Content-Length':String(end-start+1),'Accept-Ranges':'bytes',
  ...(status===206?{'Content-Range':`bytes ${start}-${end}/${stats.size}`}:{})};
 res.writeHead(status,{'Cache-Control':'no-store, private, max-age=0','X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin',...headers});
 if(req.method==='HEAD')return res.end();
 fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
}

export function createV13PreviewServer({repoRoot=DEFAULT_REPO,host=HOST,port=0,token=crypto.randomBytes(32).toString('base64url'),documents,manifest,privateRoot}={}){
 if(host!==HOST)throw Error('Prévia V13 só pode vincular em 127.0.0.1.');
 const dist=path.join(repoRoot,'dist');
 if(!fs.existsSync(path.join(dist,'index.html')))throw Error('Build do frontend não encontrado. Execute npm run build.');
 const docs=documents||Object.fromEntries(languageList.map(language=>[language,JSON.parse(fs.readFileSync(path.join(repoRoot,'docs',`learn-listening-v13-${language}.json`),'utf8'))]));
 const resolvedPrivate=privateRoot||process.env.LEARN_AUDIO_V19_DIR||path.join(repoRoot,'private/learn-audio-v19');
 let v19=manifest;
 const manifestFile=path.join(resolvedPrivate,'manifest.json');
 if(v19===undefined&&fs.existsSync(manifestFile))v19=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 const {bundles,audioFiles}=buildV13PreviewBundle(docs,{manifest:v19,privateRoot:resolvedPrivate});
 const authorized=req=>safeEqual(cookieValue(req.headers.cookie),token);
 const serveSite=(res,urlPath)=>{
  if(urlPath==='/service-worker.js')return send(res,404,'Service worker desativado na prévia privada.');
  const target=path.resolve(dist,urlPath==='/'?'index.html':`.${urlPath}`);
  if(!target.startsWith(dist+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()||fs.lstatSync(target).isSymbolicLink())return send(res,404,'Arquivo não encontrado.');
  const type=TYPES[path.extname(target).toLowerCase()];if(!type)return send(res,404,'Formato não permitido.');
  return send(res,200,fs.readFileSync(target),{'Content-Type':type});
 };
 const server=http.createServer((req,res)=>{
  try{
   if(!allowedPreviewHost(req.headers.host,server.address()?.port||port))return send(res,421,'Host inválido.');
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(res,403,'Somente conexões locais.');
   if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Método não permitido.',{Allow:'GET, HEAD'});
   if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))return send(res,403,'Origem inválida.');
   const url=new URL(req.url,`http://${HOST}:${server.address()?.port||port}`);
   if(url.pathname==='/'&&url.searchParams.get('token')===token){
    return send(res,302,'',{'Set-Cookie':`${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/`,Location:'/?learn-preview=listening-v13#/learn/en/listening-v13'});
   }
   if(!authorized(req))return send(res,404,'Prévia local indisponível.');
   if(url.pathname==='/learn/v13/preview.json'){
    const language=url.searchParams.get('language');
    if(!languageList.includes(language))return send(res,400,'Idioma inválido.',{'Content-Type':'text/plain; charset=utf-8'});
    return send(res,200,JSON.stringify(bundles[language]),{'Content-Type':'application/json; charset=utf-8'});
   }
   const audio=/^\/learn\/audio\/([a-z0-9][a-z0-9_-]{2,80})\.mp3$/i.exec(url.pathname);
   if(audio){const file=audioFiles.get(audio[1]);return file?streamAudio(req,res,audio[1],file):send(res,404,'Áudio V13 indisponível.');}
   return serveSite(res,url.pathname);
  }catch{return send(res,500,'Prévia local indisponível. Confira o conteúdo e os arquivos técnicos.');}
 });
 return {server,token,bundles,audioFiles,host,port};
}

export function run(){
 const port=Number(process.env.LEARN_V13_PREVIEW_PORT||DEFAULT_PORT);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Porta de prévia inválida.');
 const app=createV13PreviewServer({port});
 app.server.listen(port,HOST,()=>{
  process.stdout.write(`2T Learn V13 — prévia local sem avaliação. Áudios técnicos disponíveis: ${app.audioFiles.size}/32.\n`);
  process.stdout.write(`Abra somente neste computador: http://${HOST}:${port}/?token=${app.token}\n`);
  process.stdout.write('Não compartilhe a URL. Para encerrar, pressione Ctrl+C.\n');
 });
 return app;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{run();}catch(error){process.stderr.write(`${error.message||error}\n`);process.exitCode=1;}
}
