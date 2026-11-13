import type {V14DictationAttempt,V14DictationData} from './model';

/** Immutable, idempotent append policy used inside the IndexedDB transaction. */
export function appendV14DictationAttempt(data:V14DictationData,attempt:V14DictationAttempt):{data:V14DictationData;inserted:boolean}{
 const previous=data.attempts.find(row=>row.attemptId===attempt.attemptId);
 if(previous){if(JSON.stringify(previous)!==JSON.stringify(attempt))throw Error('O identificador da tentativa já foi usado com dados diferentes.');return {data,inserted:false};}
 if(data.attempts.length>=10000)throw Error('O histórico local de ditados atingiu seu limite; exporte um backup antes de continuar.');
 return {data:{...data,attempts:[...data.attempts,attempt],drafts:data.drafts.filter(draft=>draft.itemId!==attempt.itemId)},inserted:true};
}
