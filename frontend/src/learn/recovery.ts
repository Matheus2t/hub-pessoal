import type {Attempt,Language} from './model';
import type {Curriculum,Exercise} from './content';
export function findExercise(c:Curriculum,id:string):Exercise|undefined {
 const e=c.exercises.find(e=>e.id===id);if(e)return e;
 const w=[...c.words,...(c.phrases||[])].find(w=>w.id===id);
 return w?{id:w.id,language:w.language,skill:'vocabulary',topic:w.topic,level:w.level,prompt:`Traduza para português: ${w.word}`,answers:[w.translation,...(w.translationVariants||[])],wordIds:[w.id],explanation:`${w.example} — ${w.exampleTranslation}`}:undefined;
}
export function errorItems(language:Language,history:Attempt[]){
 const own=history.filter(a=>a.language===language),groups=new Map<string,Attempt[]>();
 for(const a of own){const k=`${a.skill}:${a.itemId}`;groups.set(k,[...(groups.get(k)||[]),a])}
 return [...groups.values()].map(rows=>{rows.sort((a,b)=>b.at-a.at||b.id.localeCompare(a.id));return {latest:rows[0],errors:rows.filter(a=>!a.correct),resolved:rows[0].correct}}).filter(g=>g.errors.length).sort((a,b)=>Number(a.resolved)-Number(b.resolved)||b.errors.length-a.errors.length||b.errors[0].at-a.errors[0].at);
}
export function difficultTopics(language:Language,history:Attempt[]){
 const own=history.filter(a=>a.language===language),topics=[...new Set(own.map(a=>a.topic))];
 return topics.map(topic=>{const rows=own.filter(a=>a.topic===topic).sort((a,b)=>b.at-a.at).slice(0,20),errors=rows.filter(a=>!a.correct).length;return {topic,total:rows.length,errors,rate:errors/rows.length}}).filter(t=>t.total>=3&&t.errors>=2).sort((a,b)=>b.rate-a.rate||b.errors-a.errors);
}
