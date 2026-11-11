import type {Language,LessonEvidenceEvent} from './model';

export interface OpenResponseReviewPacket {
 schemaVersion:1;
 eventId:string;
 language:Language;
 unitId:string;
 contentVersion:number;
 taskId:string;
 taskKind:LessonEvidenceEvent['taskKind'];
 evidenceKind:LessonEvidenceEvent['evidenceKind'];
 prompt:string;
 context:string;
 response:string;
 reviewCriteria:string[];
 assistance:{kind:string;value:string;shownBeforeAttempt:boolean}[];
 outcome:'uncertain';
 reviewStatus:'pending';
 assessorKind:'rubricWithReview';
}

/** Derived handoff only. It never changes or grades the immutable evidence event. */
export function makeOpenResponseReviewPacket(event:LessonEvidenceEvent,args:{prompt:string;context?:string;reviewCriteria?:string[]}):OpenResponseReviewPacket {
 if(event.outcome!=='uncertain'||event.reviewStatus!=='pending'||event.assessorKind!=='rubricWithReview'||!event.response.trim())throw new Error('A ficha só pode ser criada para uma resposta aberta pendente.');
 return {schemaVersion:1,eventId:event.eventId,language:event.language,unitId:event.unitId,contentVersion:event.contentVersion,taskId:event.taskId,taskKind:event.taskKind,evidenceKind:event.evidenceKind,prompt:args.prompt,context:args.context||event.sourceContext,response:event.response,reviewCriteria:(args.reviewCriteria||[]).filter(Boolean),assistance:event.shownAssistance.map(({kind,value,shownBeforeAttempt})=>({kind,value,shownBeforeAttempt})),outcome:'uncertain',reviewStatus:'pending',assessorKind:'rubricWithReview'};
}
