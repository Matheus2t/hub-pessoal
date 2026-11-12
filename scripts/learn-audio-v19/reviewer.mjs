#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyOwnerDecision, retryRejected, PRIVATE } from './pipeline.mjs';

const PORT = Number(process.env.LEARN_AUDIO_REVIEW_PORT || 8787);
const MANIFEST = path.join(PRIVATE, 'manifest.json');
const ASSET_ROOT = path.join(PRIVATE, 'audio');
const HOST = `127.0.0.1:${PORT}`;
const token = crypto.randomBytes(32).toString('base64url');
const listened = new Set();

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><title>Revisão local de áudios — 2T Learn</title>
<style>
:root{font:16px/1.5 system-ui,sans-serif;color:#f2f2f2;background:#101010;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:#101010;color:#f2f2f2}
header{padding:20px max(20px,calc((100vw - 1120px)/2));border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;gap:16px}
header strong{font-size:20px;letter-spacing:.04em}main{max-width:1120px;margin:24px auto;padding:0 20px 48px}
h1{font-size:26px;line-height:1.2;margin:0 0 8px}.muted{color:#aaa}.summary{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}
.pill,.status{border:1px solid #444;border-radius:999px;padding:4px 10px;font-size:13px}.filters{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
button,select,textarea{font:inherit;color:inherit;background:#191919;border:1px solid #555;border-radius:8px;padding:9px 12px}
button{cursor:pointer}button:hover:not(:disabled){background:#292929;border-color:#999}button:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #fff;outline-offset:2px}
button:disabled{opacity:.45;cursor:not-allowed}.cards{display:grid;gap:12px}
article{border:1px solid #383838;border-radius:12px;padding:16px;background:#151515}
.card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}h2{font-size:17px;margin:0}.meta{font-size:13px;color:#aaa;margin-top:3px}
.script{white-space:pre-wrap;margin:14px 0;padding:12px;border-radius:8px;background:#0e0e0e;border:1px solid #303030}
audio{display:block;width:100%;margin:12px 0}.actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.actions .approve{background:#eee;color:#111;border-color:#eee}
textarea{display:block;width:100%;min-height:60px;margin:10px 0;resize:vertical}.checks{display:flex;align-items:flex-start;gap:8px;margin:10px 0;color:#ddd;font-size:14px}
.warning{border-left:3px solid #999;padding:10px 12px;background:#1b1b1b;margin:16px 0}.empty{padding:24px;border:1px dashed #444;border-radius:10px}
@media(prefers-color-scheme:light){:root,body{background:#f6f6f6;color:#151515}header{border-color:#ddd}.muted,.meta{color:#555}article{background:#fff;border-color:#ddd}.script{background:#f6f6f6;border-color:#ddd}button,select,textarea{background:#fff;color:#111;border-color:#bbb}.warning{background:#eee}.actions .approve{background:#111;color:#fff;border-color:#111}}
@media(max-width:600px){header{padding:14px 16px}main{margin:20px auto;padding:0 14px 32px}.card-head{display:block}.status{display:inline-block;margin-top:8px}}
</style></head><body><header><strong>2T <span class="muted">/ Learn — revisão de áudio</span></strong><span class="status">LOCAL • PRIVADO</span></header>
<main><h1>Revisão de gravações</h1><div class="muted">Ouça cada item antes de decidir. Esta revisão altera somente o manifesto privado local.</div>
<div class="warning">Nenhum arquivo daqui é servido pelo site público. Aprovar uma gravação nesta tela não autoriza sua publicação nem ativa avaliação no Learn.</div>
<div id="summary" class="summary" aria-live="polite"></div>
<div class="filters"><label>Idioma <select id="language"><option value="all">Todos</option><option value="en">Inglês</option><option value="ru">Russo</option></select></label>
<label>Tipo <select id="kind"><option value="all">Todos os tipos</option><option value="bridge">Atividades-ponte</option><option value="listening">Listening</option><option value="dictation">Ditados</option></select></label>
<label>Estado <select id="state"><option value="all">Todos</option><option>planned</option><option>generated</option><option>technical_passed</option><option>awaiting_owner_review</option><option>approved</option><option>rejected</option></select></label></div>
<section id="cards" class="cards" aria-label="Gravações"></section></main>
<script>
const TOKEN=new URLSearchParams(location.search).get('token');
const labels={planned:'Planejado',generated:'Gerado',technical_passed:'Verificação técnica aprovada',awaiting_owner_review:'Aguardando sua revisão',approved:'Aprovado pelo proprietário',rejected:'Rejeitado'};
const kindLabels={bridge:'Atividade-ponte',listening:'Listening',dictation:'Ditado'};
const listenedThisSession=new Set();
let manifest;
const api=async(url,options={})=>{const response=await fetch(url,{...options,headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Falha local');return data};
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node};
function render(){const language=document.querySelector('#language').value,kind=document.querySelector('#kind').value,state=document.querySelector('#state').value;
const records=manifest.records.filter(r=>(language==='all'||r.language===language)&&(kind==='all'||r.kind===kind)&&(state==='all'||r.state===state));
const counts=manifest.records.reduce((a,r)=>(a[r.state]=(a[r.state]||0)+1,a),{});const sum=document.querySelector('#summary');sum.replaceChildren();
for(const [key,value] of Object.entries({Total:manifest.records.length,'Inglês':manifest.records.filter(r=>r.language==='en').length,Russo:manifest.records.filter(r=>r.language==='ru').length,'Aguardando revisão':counts.awaiting_owner_review||0,Aprovados:counts.approved||0}))sum.append(el('span',key+': '+value,'pill'));
const root=document.querySelector('#cards');root.replaceChildren();
if(!records.length){root.append(el('div','Nenhum item neste filtro.','empty'));return}
for(const record of records){const card=el('article'),head=el('div',undefined,'card-head'),titles=el('div'),title=el('h2',record.title||record.id),meta=el('div',record.id+' · '+(record.language==='en'?'Inglês':'Russo')+' · '+(record.level||'nível não informado')+' · '+(kindLabels[record.kind]||record.kind)+' · '+record.source,'meta');
titles.append(title,meta);head.append(titles,el('span',labels[record.state]||record.state,'status'));card.append(head);
const technical=record.technicalChecks?.status==='passed'?'Verificação técnica: aprovada (arquivo/codec/duração/volume/hash). Pronúncia e fidelidade ainda exigem escuta humana.':record.technicalChecks?.status==='failed'?'Verificação técnica falhou: '+record.technicalChecks.error:record.blockedReason?'Pendente: '+record.blockedReason:'Verificação técnica ainda não executada.';
card.append(el('p',technical,'meta'));
const scriptText=record.kind==='dictation'?record.referenceText:(record.scriptSegments||[]).map(turn=>turn.speaker+': '+turn.text).join(String.fromCharCode(10))||record.referenceText;
card.append(el('div',scriptText||'','script'));
if(record.generation?.assetPath){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src='/api/audio/'+encodeURIComponent(record.id);audio.setAttribute('aria-label','Áudio '+record.id);
audio.addEventListener('ended',()=>api('/api/listened',{method:'POST',body:JSON.stringify({id:record.id})}).then(()=>{listenedThisSession.add(record.id);audio.dataset.completed='true';render()}).catch(e=>alert(e.message)));
card.append(audio);card.append(el('div','Duração: '+(record.generation.durationSeconds??'—')+' s · '+(record.generation.format||'—')+' · '+(record.generation.bytes??0)+' bytes · versão '+record.generation.version,'meta'));
const voices=(record.generation.voiceModels||[]).map(voice=>voice.name+' ('+voice.locale+')').join(', ');if(voices)card.append(el('div','Voz(es): '+voices,'meta'));
}else card.append(el('p','Ainda sem arquivo de áudio local.','meta'));
if(record.ownerReview)card.append(el('p',(record.ownerReview.decision==='rejected'?'Motivo':'Observação')+': '+(record.ownerReview.note||'—'),'meta'));
if(record.state==='awaiting_owner_review'&&record.generation?.assetPath){const ack=el('label',undefined,'checks'),check=document.createElement('input');check.type='checkbox';check.disabled=true;check.checked=listenedThisSession.has(record.id);ack.append(check,el('span','Ouvi o áudio integralmente e conferi pronúncia, naturalidade, clareza, velocidade, volume e fidelidade ao roteiro.'));
const note=document.createElement('textarea');note.maxLength=1000;note.placeholder='Observação ou motivo da decisão';note.setAttribute('aria-label','Observação da revisão para '+record.id);
const buttons=el('div',undefined,'actions'),approve=el('button','Aprovar','approve'),reject=el('button','Rejeitar');
approve.disabled=!check.checked;approve.addEventListener('click',()=>decide(record.id,'approved',note.value));reject.addEventListener('click',()=>note.value.trim()?decide(record.id,'rejected',note.value):alert('Escreva o motivo da rejeição.'));
buttons.append(approve,reject);card.append(ack,note,buttons);
}
if(record.state==='rejected'){const retry=el('button','Preparar nova versão');retry.addEventListener('click',()=>api('/api/retry',{method:'POST',body:JSON.stringify({id:record.id})}).then(load).catch(e=>alert(e.message)));card.append(retry)}
root.append(card);
}}
async function decide(id,decision,note){if(!confirm(decision==='approved'?'Registrar sua aprovação explícita para esta versão local?':'Registrar rejeição desta versão?'))return;try{await api('/api/review',{method:'POST',body:JSON.stringify({id,decision,note})});await load()}catch(e){alert(e.message)}}
async function load(){manifest=await api('/api/manifest');render()}
document.querySelector('#language').addEventListener('change',render);document.querySelector('#kind').addEventListener('change',render);document.querySelector('#state').addEventListener('change',render);load().catch(e=>{document.querySelector('#cards').textContent=e.message});
</script></body></html>`;

function send(response, status, body, headers = {}) {
  response.writeHead(status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  response.end(body);
}
function writeManifest(manifest) {
  manifest.updatedAt = new Date().toISOString();
  const temp = MANIFEST + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(manifest, null, 2) + '\n');
  fs.renameSync(temp, MANIFEST);
}
export function isLoopback(remote) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote);
}
export function isAllowedHost(host, port = PORT) {
  return host === `127.0.0.1:${port}`;
}
function validId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{2,80}$/i.test(value);
}
export function safeAsset(record) {
  const name = record.generation?.assetPath;
  if (typeof name !== 'string' || !/^audio\/[a-z0-9][a-z0-9_.-]*\.mp3$/i.test(name)) return null;
  const resolved = path.resolve(PRIVATE, name);
  return resolved.startsWith(path.resolve(ASSET_ROOT) + path.sep) ? resolved : null;
}
async function bodyJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 8192) throw new Error('Corpo acima do limite permitido.');
  }
  return JSON.parse(raw || '{}');
}
function serveAudio(request, response, record) {
  const file = safeAsset(record);
  if (!file || !fs.existsSync(file)) return send(response, 404, JSON.stringify({ error: 'Áudio não encontrado.' }), { 'Content-Type': 'application/json' });
  const stat = fs.statSync(file);
  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return send(response, 416, '');
    const suffixLength = match[2] ? Number(match[2]) : 0;
    const start = match[1] ? Number(match[1]) : Math.max(0, stat.size - suffixLength);
    const end = match[1] ? (match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1) : stat.size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) return send(response, 416, '');
    response.writeHead(206, { 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Content-Length': stat.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(response);
}

function main() {
  if (!fs.existsSync(MANIFEST)) throw new Error('Manifesto não existe. Execute primeiro: node scripts/learn-audio-v19/pipeline.mjs prepare');
  if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error('Porta local inválida.');
  const server = http.createServer(async (request, response) => {
    if (!isAllowedHost(request.headers.host, PORT)) return send(response, 421, 'Host local inválido.');
    if (!isLoopback(request.socket.remoteAddress)) return send(response, 403, 'Somente loopback.');
    const url = new URL(request.url, `http://${HOST}`);
    if (request.method === 'GET' && url.pathname === '/') {
      if (url.searchParams.get('token') !== token) return send(response, 404, 'Sessão local não encontrada.');
      return send(response, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; media-src 'self'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' });
    }
    if (request.headers.authorization !== `Bearer ${token}`) return send(response, 401, JSON.stringify({ error: 'Sessão local inválida.' }), { 'Content-Type': 'application/json' });
    if (request.method === 'POST' && request.headers.origin !== `http://${HOST}`) return send(response, 403, JSON.stringify({ error: 'Origem local inválida.' }), { 'Content-Type': 'application/json' });
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    if (request.method === 'GET' && url.pathname === '/api/manifest') return send(response, 200, JSON.stringify(manifest), { 'Content-Type': 'application/json; charset=utf-8' });
    const audioMatch = /^\/api\/audio\/([^/]+)$/.exec(url.pathname);
    if (request.method === 'GET' && audioMatch) {
      const record = manifest.records.find((item) => item.id === decodeURIComponent(audioMatch[1]));
      return record ? serveAudio(request, response, record) : send(response, 404, 'Not found');
    }
    try {
      const body = await bodyJson(request);
      if (!validId(body.id)) return send(response, 400, JSON.stringify({ error: 'ID inválido.' }), { 'Content-Type': 'application/json' });
      const record = manifest.records.find((item) => item.id === body.id);
      if (!record) return send(response, 404, JSON.stringify({ error: 'Registro não encontrado.' }), { 'Content-Type': 'application/json' });
      if (request.method === 'POST' && url.pathname === '/api/listened') {
        if (!safeAsset(record) || record.state !== 'awaiting_owner_review') return send(response, 409, JSON.stringify({ error: 'Item não está disponível para revisão.' }), { 'Content-Type': 'application/json' });
        listened.add(record.id);
        return send(response, 204, '');
      }
      if (request.method === 'POST' && url.pathname === '/api/review') {
        if (body.decision === 'approved' && !listened.has(record.id)) return send(response, 409, JSON.stringify({ error: 'Ouça a gravação integralmente nesta sessão antes de aprová-la.' }), { 'Content-Type': 'application/json' });
        const updated = applyOwnerDecision(record, body.decision, body.note);
        Object.assign(record, updated);
        writeManifest(manifest);
        listened.delete(record.id);
        return send(response, 200, JSON.stringify({ state: record.state }), { 'Content-Type': 'application/json' });
      }
      if (request.method === 'POST' && url.pathname === '/api/retry') {
        Object.assign(record, retryRejected(record));
        writeManifest(manifest);
        return send(response, 200, JSON.stringify({ state: record.state, version: record.generation.version }), { 'Content-Type': 'application/json' });
      }
      return send(response, 404, 'Not found');
    } catch (error) {
      return send(response, 400, JSON.stringify({ error: error.message }), { 'Content-Type': 'application/json' });
    }
  });
  server.listen(PORT, '127.0.0.1', () => console.log(`Revisão privada ativa em http://127.0.0.1:${PORT}/?token=${token}\nCtrl+C encerra o servidor. Nenhum endpoint público ou conteúdo do site foi alterado.`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
