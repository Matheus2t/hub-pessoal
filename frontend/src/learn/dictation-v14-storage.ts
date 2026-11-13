import type {Language,LessonProgress,V14DictationAttempt,V14DictationData,V14DictationDraft} from './model';
import {openLearnDB} from './storage';
import {validLessonProgress} from './backup';
import {appendV14DictationAttempt} from './dictation-v14-state';

const key=(language:Language)=>`v14:${language}`;
const empty=(language:Language):V14DictationData=>({schemaVersion:1,language,attempts:[],drafts:[]});
const emptyRecord=(language:Language):LessonProgress=>({key:key(language),language,unitId:'v14-dictation',contentVersion:1,currentStage:0,shownAssistance:[],drafts:[],updatedAt:Date.now(),v14Dictation:empty(language)});
function finish(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(Error('Não foi possível salvar os dados locais do ditado. O registro anterior foi preservado.'))})}
function requestValue<T>(request:IDBRequest<T>){return new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Falha ao ler o armazenamento local.'))})}
function assertRecord(record:LessonProgress|undefined,language:Language){if(record&&(!validLessonProgress(record)||record.language!==language||record.unitId!=='v14-dictation'||record.key!==key(language)||!record.v14Dictation))throw Error('Dados locais V14 inválidos; nenhum registro foi alterado.')}

export async function loadV14Dictation(language:Language):Promise<V14DictationData>{
 const db=await openLearnDB();try{const tx=db.transaction('lessonProgress','readonly'),done=finish(tx),record=await requestValue<LessonProgress|undefined>(tx.objectStore('lessonProgress').get(key(language)));await done;assertRecord(record,language);return record?.v14Dictation||empty(language)}finally{db.close()}
}

async function update(language:Language,change:(data:V14DictationData)=>V14DictationData):Promise<V14DictationData>{
 const db=await openLearnDB();let result:V14DictationData|undefined;try{const tx=db.transaction('lessonProgress','readwrite'),done=finish(tx),store=tx.objectStore('lessonProgress'),get=store.get(key(language));get.onsuccess=()=>{try{const saved=get.result as LessonProgress|undefined;assertRecord(saved,language);const next=change(saved?.v14Dictation||empty(language));const record={...(saved||emptyRecord(language)),updatedAt:Date.now(),v14Dictation:next};if(!validLessonProgress(record))throw Error('Os dados V14 falharam na validação local.');result=next;store.put(record)}catch{tx.abort()}};await done;if(!result)throw Error('O armazenamento local não retornou o estado salvo.');return result}finally{db.close()}
}

const validItem=(id:string,language:Language)=>new RegExp(`^${language}-dict-v14-(0[1-9]|1[0-6])$`).test(id);
export function saveV14DictationDraft(language:Language,itemId:string,response:string,now=Date.now()):Promise<V14DictationData>{
 if(!validItem(itemId,language)||typeof response!=='string'||response.length>2000)throw Error('Rascunho de ditado inválido.');
 return update(language,data=>{const prior=data.drafts.find(d=>d.itemId===itemId);const drafts=response?data.drafts.filter(d=>d.itemId!==itemId).concat({itemId,response,startedAt:prior?.startedAt??now,updatedAt:now}):data.drafts.filter(d=>d.itemId!==itemId);return {...data,drafts}});
}

export function saveV14DictationAttempt(language:Language,attempt:V14DictationAttempt):Promise<{data:V14DictationData;inserted:boolean}>{
 if(attempt.language!==language||!validItem(attempt.itemId,language))throw Error('Tentativa incompatível com o idioma.');
 let inserted=false;
 return update(language,data=>{
  const next=appendV14DictationAttempt(data,attempt);inserted=next.inserted;return next.data;
 }).then(data=>({data,inserted}));
}
