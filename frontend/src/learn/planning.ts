import type {Backup,DailyPlan,Language,PlanItem,PlanSettings,Skill} from './model';
import type {Curriculum,Exercise} from './content';
import {localDay} from './engine';
import {errorItems,findExercise} from './recovery';
export const planModes:Skill[]=['vocabulary','listening','dictation','writing','reading','grammar','test'];
export const defaultSettings=(language:Language):PlanSettings=>({language,goal:10,minutes:15,modes:['vocabulary','writing','reading','grammar'],preference:'review'});
export const zone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
export function planDay(now:number,timezone=zone()){const parts=new Intl.DateTimeFormat('en',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-')}
export const planKey=(language:Language,now=Date.now(),timezone=zone())=>`plan:${language}:${planDay(now,timezone)}:${timezone}`;
export function currentPlan(data:Backup,language:Language,now=Date.now(),timezone=zone()):DailyPlan|undefined {const r=data.planning?.find(r=>r.key===planKey(language,now,timezone));return r?.kind==='plan'?r.plan:undefined}
export function currentSettings(data:Backup,language:Language):PlanSettings {const r=data.planning?.find(r=>r.key===`settings:${language}`);return r?.kind==='settings'?r.settings:defaultSettings(language)}
export function planAttempts(data:Backup,plan:DailyPlan){return data.attempts.filter(a=>a.language===plan.language&&a.id===`${plan.id}-${a.itemId}`&&a.at>=plan.createdAt)}
export function planExercise(c:Curriculum,id:string):Exercise|undefined{return findExercise(c,id)}
const hash=(value:string)=>[...value].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
export function makePlan(c:Curriculum,data:Backup,settings:PlanSettings,audioAvailable:boolean,now=Date.now(),timezone=zone(),previous?:DailyPlan):DailyPlan {
 const language=settings.language,history=data.attempts.filter(a=>a.language===language),mistakes=errorItems(language,history).filter(g=>!g.resolved),day=planDay(now,timezone),id=previous?.id||crypto.randomUUID();
 const counts=new Map<string,number>(),topics=new Map<string,number>();for(const a of history){counts.set(a.itemId,(counts.get(a.itemId)||0)+1);topics.set(a.topic,(topics.get(a.topic)||0)+1)}
 const candidates:{itemId:string;mode:PlanItem['mode'];topic:string;priority:number;reason:string}[]=[];
 if(settings.modes.includes('vocabulary'))for(const w of [...c.words,...(c.phrases||[])]){const card=data.cards.find(k=>k.language===language&&k.itemId===w.id),due=!!card&&card.due<=now,error=mistakes.find(g=>g.latest.itemId===w.id);candidates.push({itemId:w.id,mode:'flashcards',topic:w.topic,priority:due?(settings.preference==='review'?0:2):error?1:!counts.has(w.id)?(settings.preference==='new'?0:3):4,reason:due?'Revisão vencida':error?'Erro anterior':!counts.has(w.id)?'Conteúdo novo':'Prática adicional'})}
 for(const e of c.exercises){if(!settings.modes.includes(e.skill)||(!audioAvailable&&['listening','dictation'].includes(e.skill)))continue;const error=mistakes.find(g=>g.latest.itemId===e.id);candidates.push({itemId:e.id,mode:'exercise',topic:e.topic,priority:error?1:!counts.has(e.id)?(settings.preference==='new'?0:3):4,reason:error?'Erro anterior':!counts.has(e.id)?'Conteúdo novo':'Prática adicional'})}
 candidates.sort((a,b)=>a.priority-b.priority||(topics.get(a.topic)||0)-(topics.get(b.topic)||0)||(counts.get(a.itemId)||0)-(counts.get(b.itemId)||0)||hash(`${day}:${a.itemId}`)-hash(`${day}:${b.itemId}`));
 const completed=previous?planAttempts(data,previous):[],kept=completed.map(a=>({attemptId:a.id,itemId:a.itemId,mode:previous?.items.find(i=>i.itemId===a.itemId)?.mode||'exercise',reason:'Resposta registrada'} as PlanItem));
 const items=[...kept,...candidates.filter(e=>!kept.some(k=>k.itemId===e.itemId)).slice(0,Math.max(0,settings.goal-kept.length)).map(e=>({itemId:e.itemId,mode:e.mode,reason:e.reason,attemptId:`${id}-${e.itemId}`}))];
 return {id,language,day,timezone,createdAt:previous?.createdAt||now,goal:settings.goal,minutes:settings.minutes,items};
}
