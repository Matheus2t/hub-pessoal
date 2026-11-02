import type {Curriculum,Exercise} from './content';
import type {Backup,Language} from './model';
import {localDay} from './engine';
export interface PathUnit {id:string;level:string;topic:string;objectives:string[];exercises:Exercise[];coverage:number;mastered:number;total:number}
/** Mastery requires 3 of the last 4 correct, latest correct, on >=2 calendar days. */
export function learningPath(c:Curriculum,data:Backup,language:Language):PathUnit[]{
 const attempts=data.attempts.filter(a=>a.language===language);
 return [...new Set(c.exercises.map(e=>`${e.level}:${e.topic}`))].sort((a,b)=>a.split(':')[0].localeCompare(b.split(':')[0])||Number(!a.includes('Cumprimentos'))-Number(!b.includes('Cumprimentos'))||a.localeCompare(b,'pt-BR')).map(key=>{
  const exercises=c.exercises.filter(e=>`${e.level}:${e.topic}`===key),first=exercises[0];
  const ids=exercises.map(e=>e.id);let coverage=0,mastered=0;
  for(const id of ids){const rows=attempts.filter(a=>a.itemId===id).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));if(rows.length)coverage++;
   const recent=rows.slice(-4);if(recent.length>=3&&recent.at(-1)?.correct&&recent.filter(a=>a.correct).length>=3&&new Set(recent.filter(a=>a.correct).map(a=>localDay(a.at))).size>=2)mastered++;
  }
  return {id:key,level:first.level,topic:first.topic,objectives:[...new Set(exercises.map(e=>e.skill))],exercises,coverage,mastered,total:ids.length};
 });
}
