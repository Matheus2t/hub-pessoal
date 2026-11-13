import type {Grade,V17HumanReview} from './model';

/** Latest rating per distinct reviewer. A tie between two blocs is NOT agreement.
 * This is local, task-level reviewer consensus, not a CEFR proficiency judgment.
 */
export function reviewConsensusV17(reviews:readonly V17HumanReview[]):{consensus:Grade|undefined;disputed:boolean}{
 const latest=new Map<string,Grade>();
 for(const review of reviews)latest.set(review.reviewerId,review.score);
 const counts=new Map<Grade,number>();
 for(const score of latest.values())counts.set(score,(counts.get(score)||0)+1);
 const maximum=Math.max(0,...counts.values());
 const winners=[...counts].filter(([,count])=>count===maximum);
 const consensus:Grade|undefined=maximum>=2&&winners.length===1?winners[0][0]:undefined;
 return {consensus,disputed:latest.size>1&&consensus===undefined};
}
