import type {Backup, Language} from './model';
import {DAY} from './engine';
export type StudyIntent = 'review'|'new'|'mixed';
interface Candidate {id:string;language:Language;topic:string}
/** Pure selection: independent languages, stable ties, no duplicates or SRS writes. */
export function selectPractice<T extends Candidate>(items:readonly T[], data:Backup, language:Language, intent:StudyIntent, limit:number, now=Date.now()):T[] {
 const history=data.attempts.filter(a=>a.language===language), stats=new Map<string,{count:number;errors:number;last:number;wrong:boolean}>(), topics=new Map<string,number>();
 for(const a of history){const s=stats.get(a.itemId)||{count:0,errors:0,last:0,wrong:false};s.count++;s.errors+=Number(!a.correct);if(a.at>=s.last){s.last=a.at;s.wrong=!a.correct}stats.set(a.itemId,s);topics.set(a.topic,(topics.get(a.topic)||0)+1)}
 const cards=new Map(data.cards.filter(c=>c.language===language).map(c=>[c.itemId,c]));
 const unique=[...new Map(items.filter(i=>i.language===language).map(i=>[i.id,i])).values()];
 const scores=unique.map((item,index)=>{const s=stats.get(item.id),card=cards.get(item.id),due=!!card&&card.due<=now,fresh=!s&&!card,review=due||!!s?.wrong;
  const priority=intent==='new'?(fresh?100:review?30:10):intent==='review'?(due?120:review?100:fresh?20:30):(due?90:review?80:fresh?75:20);
  return {item,index,fresh,review,score:priority-(s&&s.count>=3&&now-s.last<DAY?70:0)+(s?Math.min(20,Math.max(0,(now-s.last)/DAY))*0.5+s.errors/s.count*8-Math.log2(s.count+1)*3:0)-(topics.get(item.topic)||0)*0.1};
 });
 const result:T[]=[],usedTopics=new Map<string,number>();
 while(scores.length&&result.length<Math.max(0,Math.min(10000,limit))){
  // Mixed sessions reserve every second slot for unseen material, when available.
  const wantsNew=intent==='mixed'&&result.length%2===1&&scores.some(s=>s.fresh);
  scores.sort((a,b)=>Number(wantsNew&&b.fresh)-Number(wantsNew&&a.fresh)||(b.score-(usedTopics.get(b.item.topic)||0)*4)-(a.score-(usedTopics.get(a.item.topic)||0)*4)||a.index-b.index);
  const chosen=scores.shift()!.item;result.push(chosen);usedTopics.set(chosen.topic,(usedTopics.get(chosen.topic)||0)+1);
 }
 return result;
}
