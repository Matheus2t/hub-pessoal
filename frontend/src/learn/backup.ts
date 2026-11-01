import type {Attempt,Backup,Card,PlanningRecord} from './model';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=2000):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const num=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const lang=(v:unknown)=>v==='en'||v==='ru';
const MAX_TIME=8640000000000000;
export function validAttempt(v:unknown):v is Attempt {
  return obj(v)&&text(v.id,120)&&lang(v.language)&&text(v.itemId,120)&&['vocabulary','listening','dictation','writing','reading','grammar','test'].includes(String(v.skill))&&text(v.topic,120)&&typeof v.answer==='string'&&v.answer.length<=2000&&text(v.expected)&&typeof v.correct==='boolean'&&num(v.at,0,MAX_TIME)&&num(v.seconds,0,600)&&(v.grade===undefined||[0,1,2,3].includes(Number(v.grade))&&typeof v.grade==='number');
}
export function validCard(v:unknown):v is Card {
  return obj(v)&&lang(v.language)&&text(v.itemId,120)&&num(v.interval,0,3650)&&num(v.ease,1.3,3)&&num(v.repetitions,0,100000)&&Number.isInteger(v.repetitions)&&num(v.due,0,MAX_TIME)&&num(v.updated,0,MAX_TIME)&&(v.lastGrade===null||typeof v.lastGrade==='number'&&[0,1,2,3].includes(v.lastGrade));
}
export function validPlanning(v:unknown):v is PlanningRecord {
 if(!obj(v)||!lang(v.language)||!text(v.key,240))return false;
 if(v.kind==='settings'){const s=v.settings;return v.key===`settings:${v.language}`&&obj(s)&&s.language===v.language&&Number.isInteger(s.goal)&&num(s.goal,1,100)&&Number.isInteger(s.minutes)&&num(s.minutes,1,180)&&['review','new'].includes(String(s.preference))&&Array.isArray(s.modes)&&s.modes.length>0&&s.modes.length<=7&&new Set(s.modes).size===s.modes.length&&s.modes.every(m=>['vocabulary','listening','dictation','writing','reading','grammar','test'].includes(String(m)))}
 if(v.kind!=='plan'||!obj(v.plan))return false;const p=v.plan;
 if(!text(p.id,80)||p.language!==v.language||!text(p.day,10)||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)||!text(p.timezone,100)||v.key!==`plan:${v.language}:${p.day}:${p.timezone}`||!num(p.createdAt,0,MAX_TIME)||!Number.isInteger(p.goal)||!num(p.goal,1,100)||!Number.isInteger(p.minutes)||!num(p.minutes,1,180)||!Array.isArray(p.items)||p.items.length>100)return false;
 try{new Intl.DateTimeFormat('en',{timeZone:p.timezone})}catch{return false}
 const date=new Date(`${p.day}T12:00:00Z`);if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==p.day)return false;
 return p.items.every(i=>obj(i)&&text(i.attemptId,120)&&text(i.itemId,120)&&i.attemptId===`${p.id}-${i.itemId}`&&['flashcards','exercise'].includes(String(i.mode))&&text(i.reason,200))&&new Set(p.items.map(i=>i.attemptId)).size===p.items.length&&new Set(p.items.map(i=>i.itemId)).size===p.items.length&&(p.activeItemId===undefined||p.items.some(i=>i.itemId===p.activeItemId));
}
export function parseBackup(raw:string):Backup {
  if(raw.length>5_000_000||new TextEncoder().encode(raw).length>5_000_000)throw Error('Backup excede 5 MB.');
  let data:unknown;try{data=JSON.parse(raw)}catch{throw Error('Arquivo JSON inválido.')}
  if(!obj(data)||data.format!=='2t-learn'||![1,2].includes(Number(data.version))||typeof data.version!=='number'||!num(data.exportedAt,0,MAX_TIME)||!Array.isArray(data.attempts)||!Array.isArray(data.cards)||data.attempts.length>10000||data.cards.length>10000||!data.attempts.every(validAttempt)||!data.cards.every(validCard))throw Error('Formato, versão ou registros do backup inválidos.');
  if(data.version===2&&(!Array.isArray(data.planning)||data.planning.length>2000||!data.planning.every(validPlanning)||new Set(data.planning.map(p=>p.key)).size!==data.planning.length))throw Error('Planos do backup inválidos ou duplicados.');
  if(data.version===2){const plans=(data.planning as PlanningRecord[]).filter((r):r is Extract<PlanningRecord,{kind:'plan'}>=>r.kind==='plan');const ids=plans.map(r=>r.plan.id);if(new Set(ids).size!==ids.length)throw Error('Identificadores de planos duplicados.');for(const r of plans)for(const i of r.plan.items){const a=(data.attempts as Attempt[]).find(a=>a.id===i.attemptId);if(a&&(a.language!==r.language||a.itemId!==i.itemId))throw Error('Tentativa incompatível com o plano.');}}
  if(new Set(data.attempts.map(a=>a.id)).size!==data.attempts.length||new Set(data.cards.map(c=>`${c.language}:${c.itemId}`)).size!==data.cards.length)throw Error('Backup contém registros duplicados.');
  return {format:'2t-learn',version:data.version as 1|2,exportedAt:data.exportedAt,attempts:data.attempts,cards:data.cards,...(data.version===2?{planning:data.planning as PlanningRecord[]}:{})};
}
