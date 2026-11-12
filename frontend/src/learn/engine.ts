import type {Attempt, AttemptOutcome, Card, Grade, Language} from './model';
import type {Exercise} from './content';
export const DAY=86400000;
/** Punctuation/space/case only. Cyrillic ё remains distinct unless the exercise opts out. */
export function normalizeAnswer(text:string,acceptYoAsE=false):string {
  let value=text.normalize('NFC').toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();
  if(acceptYoAsE)value=value.replace(/ё/g,'е');
  return value;
}
export function evaluateAnswer(answer:string,variants:readonly string[],acceptYoAsE=false):boolean {
  const value=normalizeAnswer(answer,acceptYoAsE);
  return !!value&&variants.some(v=>normalizeAnswer(v,acceptYoAsE)===value);
}
/** Exact validated variants remain deterministic; unrecognized open writing is not called wrong. */
export function evaluateExerciseAnswer(answer:string,exercise:Pick<Exercise,'answers'|'acceptYoAsE'|'skill'>):AttemptOutcome {
  if(evaluateAnswer(answer,exercise.answers,exercise.acceptYoAsE))return 'correct';
  return exercise.skill==='writing'?'uncertain':'incorrect';
}
/** Historical rows retain their original boolean interpretation. */
export function attemptOutcome(attempt:Pick<Attempt,'correct'|'assessmentOutcome'>):AttemptOutcome {
  return attempt.assessmentOutcome==='uncertain'?'uncertain':attempt.correct?'correct':'incorrect';
}
export function attemptDisplayOutcome(attempt:Attempt):string {
  if(attempt.audioEvidence&&!attempt.audioEvidence.validated)return attempt.audioEvidence.transcriptViewedBeforeAttempt?'Não avaliada · transcrição consultada':'Não avaliada · gravação não homologada';
  if(attempt.audioEvidence?.transcriptViewedBeforeAttempt)return 'Assistida · transcrição consultada';
  return attemptOutcome(attempt)==='uncertain'?'Incerta':attemptOutcome(attempt)==='correct'?'Correta':'Revisar';
}
export function newCard(language:Language,itemId:string,now=Date.now()):Card {
  return {language,itemId,interval:0,ease:2.5,repetitions:0,due:now,updated:now,lastGrade:null};
}
/** Deterministic SM-2-inspired schedule: forget 10min, hard 1d, good 1/6/EF days. */
export function schedule(card:Card,grade:Grade,now=Date.now()):Card {
  if(![0,1,2,3].includes(grade)||!Number.isFinite(now)||now<0)throw Error('Revisão inválida.');
  const ease=Math.max(1.3,Math.min(3,card.ease+[-.2,-.15,0,.15][grade]));
  const repetitions=grade===0?0:card.repetitions+1;
  const interval=grade===0?10/1440:grade===1?1:card.repetitions===0?1:card.repetitions===1?6:Math.min(3650,Math.max(1,Math.round(card.interval*ease*(grade===3?1.3:1))));
  return {...card,ease,repetitions,interval,due:now+Math.round(interval*DAY),updated:now,lastGrade:grade};
}
export const localDay=(n:number)=>{const d=new Date(n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export function summarize(language:Language,attempts:Attempt[],cards:Card[],now=Date.now()) {
  const history=attempts.filter(a=>a.language===language),own=cards.filter(c=>c.language===language);
  const days=new Set(history.map(a=>localDay(a.at)));let streak=0;
  const cursor=new Date(now);if(!days.has(localDay(+cursor)))cursor.setDate(cursor.getDate()-1);
  while(days.has(localDay(+cursor))){streak++;cursor.setDate(cursor.getDate()-1);}
  const assessed=history.filter(a=>attemptOutcome(a)!=='uncertain'),correct=assessed.filter(a=>attemptOutcome(a)==='correct').length;
  const topics=[...new Set(history.map(a=>a.topic))].map(topic=>{const rows=history.filter(a=>a.topic===topic);return {topic,total:rows.length,assessed:rows.filter(a=>attemptOutcome(a)!=='uncertain').length,errors:rows.filter(a=>attemptOutcome(a)==='incorrect').length,uncertain:rows.filter(a=>attemptOutcome(a)==='uncertain').length}});
  return {attempts:history.length,correct,incorrect:assessed.length-correct,uncertain:history.length-assessed.length,accuracy:assessed.length?correct/assessed.length:null,seconds:history.reduce((n,a)=>n+a.seconds,0),days:days.size,streak,studied:new Set(history.filter(a=>a.skill==='vocabulary').map(a=>a.itemId)).size,mastered:own.filter(c=>c.repetitions>=3&&c.interval>=21&&c.lastGrade!==0&&c.lastGrade!==1).length,due:own.filter(c=>c.due<=now).length,topics:topics.sort((a,b)=>b.errors-a.errors),history};
}
