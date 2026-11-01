import type {Attempt,Backup,Card,Language} from './model';
import {parseBackup,validAttempt,validCard} from './backup';
const NAME='2t-learn';
export function openLearnDB():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(NAME,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('attempts'))db.createObjectStore('attempts',{keyPath:'id'}).createIndex('language','language');
      if(!db.objectStoreNames.contains('cards'))db.createObjectStore('cards',{keyPath:['language','itemId']}).createIndex('language','language');
    };
    req.onerror=()=>reject(Error('Não foi possível abrir o armazenamento local.'));
    req.onblocked=()=>reject(Error('Feche outras abas do 2T Learn para atualizar o armazenamento.'));
    req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result)};
  });
}
function complete(tx:IDBTransaction):Promise<void>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(Error('Não foi possível salvar o progresso. Nenhuma alteração parcial foi aplicada.'))})}
function value<T>(r:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function snapshot():Promise<Backup> {
  const db=await openLearnDB();try {const tx=db.transaction(['attempts','cards'],'readonly');const done=complete(tx);const [attempts,cards]=await Promise.all([value<Attempt[]>(tx.objectStore('attempts').getAll()),value<Card[]>(tx.objectStore('cards').getAll())]);await done;return {format:'2t-learn',version:1,exportedAt:Date.now(),attempts,cards}}finally{db.close()}
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
 const db=await openLearnDB();try{const tx=db.transaction('attempts','readwrite'),done=complete(tx),s=tx.objectStore('attempts');for(const a of attempts){const r=s.get(a.id);r.onsuccess=()=>{if(!r.result)s.add(a)}}await done}finally{db.close()}
}
export async function restoreBackup(raw:string,confirmReplacement=false):Promise<void> {
  const backup=parseBackup(raw),db=await openLearnDB();
  try{const tx=db.transaction(['attempts','cards'],'readwrite'),done=complete(tx);const a=tx.objectStore('attempts'),c=tx.objectStore('cards');
    const count=a.count();count.onsuccess=()=>{const second=c.count();second.onsuccess=()=>{if((count.result||second.result)&&!confirmReplacement){tx.abort();return;}a.clear();c.clear();for(const item of backup.attempts)a.add(item);for(const item of backup.cards)c.add(item)}};
    await done;
  }finally{db.close()}
}
export async function languageProgress(language:Language){const data=await snapshot();return {attempts:data.attempts.filter(a=>a.language===language),cards:data.cards.filter(c=>c.language===language)}}
