import type {Attempt,Backup,Card,Language,PlanningRecord} from './model';
import {parseBackup,validAttempt,validCard,validPlanning} from './backup';
const NAME='2t-learn';
export function openLearnDB():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(NAME,2);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('attempts'))db.createObjectStore('attempts',{keyPath:'id'}).createIndex('language','language');
      if(!db.objectStoreNames.contains('cards'))db.createObjectStore('cards',{keyPath:['language','itemId']}).createIndex('language','language');
      if(!db.objectStoreNames.contains('planning'))db.createObjectStore('planning',{keyPath:'key'});
    };
    req.onerror=()=>reject(Error('Não foi possível abrir o armazenamento local.'));
    req.onblocked=()=>reject(Error('Feche outras abas do 2T Learn para atualizar o armazenamento.'));
    req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result)};
  });
}
function complete(tx:IDBTransaction):Promise<void>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(Error('Não foi possível salvar o progresso. Nenhuma alteração parcial foi aplicada.'))})}
function value<T>(r:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function snapshot():Promise<Backup> {
  const db=await openLearnDB();try {const tx=db.transaction(['attempts','cards','planning'],'readonly');const done=complete(tx);const [attempts,cards,planning]=await Promise.all([value<Attempt[]>(tx.objectStore('attempts').getAll()),value<Card[]>(tx.objectStore('cards').getAll()),value<PlanningRecord[]>(tx.objectStore('planning').getAll())]);await done;return {format:'2t-learn',version:2,exportedAt:Date.now(),attempts,cards,planning}}finally{db.close()}
}
export async function saveCard(card:Card):Promise<void> {
  if(!validCard(card))throw Error('Cartão inválido.');const db=await openLearnDB();
  try{const tx=db.transaction('cards','readwrite');const done=complete(tx);const store=tx.objectStore('cards');const req=store.get([card.language,card.itemId]);req.onsuccess=()=>{if(!req.result)store.add(card)};await done}finally{db.close()}
}
/** Atomic idempotent attempt + card transition. Repeated clicks cannot double-count. */
export async function recordAttempt(attempt:Attempt,transition?:(previous:Card|undefined)=>Card):Promise<boolean> {
  if(!validAttempt(attempt))throw Error('Tentativa inválida.');const db=await openLearnDB();let inserted=false;
  try{const tx=db.transaction(['attempts','cards'],'readwrite'),done=complete(tx);const attempts=tx.objectStore('attempts'),cards=tx.objectStore('cards');const existing=attempts.get(attempt.id);
    existing.onsuccess=()=>{if(existing.result)return;attempts.add(attempt);inserted=true;if(transition){const req=cards.get([attempt.language,attempt.itemId]);req.onsuccess=()=>{try{const next=transition(req.result);if(!validCard(next)||next.language!==attempt.language||next.itemId!==attempt.itemId)throw Error();cards.put(next)}catch{tx.abort()}}}};
    await done;return inserted;
  }finally{db.close()}
}
/** An assessment is stored atomically, only when every answer is submitted. */
export async function recordAssessment(attempts:Attempt[]):Promise<void> {
 if(!attempts.length||attempts.length>100||!attempts.every(a=>validAttempt(a)&&a.skill==='test'&&a.language===attempts[0].language)||new Set(attempts.map(a=>a.id)).size!==attempts.length)throw Error('Avaliação inválida.');
 const db=await openLearnDB();try{const tx=db.transaction('attempts','readwrite'),done=complete(tx),s=tx.objectStore('attempts');for(const a of attempts){const r=s.get(a.id);r.onsuccess=()=>{try{if(!r.result)s.add(a)}catch{tx.abort()}}}await done}finally{db.close()}
}
export async function restoreBackup(raw:string,confirmReplacement=false):Promise<void> {
  const backup=parseBackup(raw),db=await openLearnDB();
  try{const tx=db.transaction(['attempts','cards','planning'],'readwrite'),done=complete(tx);const a=tx.objectStore('attempts'),c=tx.objectStore('cards'),p=tx.objectStore('planning');let total=0,pending=3;
    for(const store of [a,c,p]){const count=store.count();count.onsuccess=()=>{try{total+=count.result;if(--pending)return;if(total&&!confirmReplacement){tx.abort();return;}a.clear();c.clear();p.clear();for(const item of backup.attempts)a.add(item);for(const item of backup.cards)c.add(item);for(const item of backup.planning||[])p.add(item)}catch{tx.abort()}}}
    await done;
  }finally{db.close()}
}
export async function savePlanning(record:PlanningRecord):Promise<void>{
 if(!validPlanning(record))throw Error('Configuração do plano inválida.');const db=await openLearnDB();try{const tx=db.transaction('planning','readwrite'),done=complete(tx);const s=tx.objectStore('planning');if(record.kind==='settings')s.put(record);else{const r=s.get(record.key);r.onsuccess=()=>{if(!r.result)s.add(record);else if(r.result.plan.id===record.plan.id)s.put(record)}}await done}finally{db.close()}
}
export async function languageProgress(language:Language){const data=await snapshot();return {attempts:data.attempts.filter(a=>a.language===language),cards:data.cards.filter(c=>c.language===language)}}
