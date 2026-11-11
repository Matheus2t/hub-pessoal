import {test,expect} from '@playwright/test';
import type {LessonEvidenceEvent} from '../src/learn/model';
import {makeOpenResponseReviewPacket} from '../src/learn/open-review-contract';

function evidence(response:string,assistance:LessonEvidenceEvent['shownAssistance']=[]):LessonEvidenceEvent {
 return {eventId:'review-event-01',language:'en',unitId:'en-pilot-introductions-01',contentVersion:1,taskId:'en-intro-t1',taskKind:'transfer',evidenceKind:'transfer',response,shownAssistance:assistance,startedAt:100,submittedAt:200,outcome:'uncertain',reviewStatus:'pending',assessorKind:'rubricWithReview',feedback:null,sourceContext:'en-pilot-introductions-01@1/en-intro-t1',isIndependentClaimAllowed:false};
}

test('open response review preserves alternatives, grammar issues and ambiguous text without assigning a score',()=>{
 for(const response of ['Hello, I am Maya. I work in design. What do you do?','He go yesterday.','Library?']){
  const source=evidence(response),packet=makeOpenResponseReviewPacket(source,{prompt:'Apresente-se e pergunte à outra pessoa sobre o trabalho.',context:'Primeiro encontro em uma aula de idiomas.',reviewCriteria:['Intenção comunicativa','Sentido essencial','Forma e vocabulário adequados']});
  expect(packet.response).toBe(response);expect(packet.outcome).toBe('uncertain');expect(packet.reviewStatus).toBe('pending');expect(packet.assessorKind).toBe('rubricWithReview');
  expect(packet.reviewCriteria).toContain('Sentido essencial');expect(packet).not.toHaveProperty('grade');expect(packet).not.toHaveProperty('feedback');expect(source.outcome).toBe('uncertain');expect(source.feedback).toBeNull();
 }
});

test('review packet records support timing, language and provenance without mutating evidence',()=>{
 const source=evidence('Где находится библиотека?',[
  {kind:'lexical-cue',value:'библиотека',taskId:'ru-dir-t1',shownAt:50,shownBeforeAttempt:true},
  {kind:'phoneticKeyboard',value:'Teclado fonético russo visível.',taskId:'ru-dir-t1',shownAt:60,shownBeforeAttempt:false},
 ]);
 source.language='ru';source.unitId='ru-pilot-directions-01';source.taskId='ru-dir-t1';source.taskKind='transfer';source.evidenceKind='transfer';
 const before=JSON.stringify(source),packet=makeOpenResponseReviewPacket(source,{prompt:'Pergunte como chegar à biblioteca.',context:'Pessoa visitante pede orientação.',reviewCriteria:['Intenção da pergunta']});
 expect(packet).toMatchObject({language:'ru',unitId:'ru-pilot-directions-01',taskId:'ru-dir-t1',contentVersion:1,outcome:'uncertain',reviewStatus:'pending'});
 expect(packet.assistance).toEqual([{kind:'lexical-cue',value:'библиотека',shownBeforeAttempt:true},{kind:'phoneticKeyboard',value:'Teclado fonético russo visível.',shownBeforeAttempt:false}]);
 expect(JSON.stringify(source)).toBe(before);
});

test('only unresolved open-response evidence can become a manual review packet',()=>{
 const source=evidence('A response');
 expect(()=>makeOpenResponseReviewPacket({...source,outcome:'supported'},{prompt:'Task'})).toThrow(/pendente/);
 expect(()=>makeOpenResponseReviewPacket({...source,reviewStatus:'reviewed'},{prompt:'Task'})).toThrow(/pendente/);
 expect(()=>makeOpenResponseReviewPacket({...source,assessorKind:'deterministic'},{prompt:'Task'})).toThrow(/pendente/);
 expect(()=>makeOpenResponseReviewPacket(evidence('  '),{prompt:'Task'})).toThrow(/pendente/);
});
