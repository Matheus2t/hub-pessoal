import type {Attempt,Language} from './model';
import type {ProgressionStage,StageStudyProgress} from './progression';
import {stageStudyProgress} from './progression';
import type {StageScenarioV17} from './progression-v17-content';

export type StudyStateV17='not_started'|'in_progress'|'activities_answered';
export type PerformanceV17='not_assessed'|'awaiting_review'|'needs_practice'|'partially_supported'|'supported_for_observed_task';
export type RecommendationV17='explore_current'|'review_recommended'|'next_activity_suggested'|'insufficient_evidence';
/** A classification applies ONLY to an observed individual task, never a proficiency level. */
export interface V17PolicyFacts {
 sourceType?:string;targetLanguage?:Language;sourceLanguage?:Language;
 distinctItemIds?:number;allStageQuestionsAnswered?:boolean;stageQuestionCount?:number;
 sixDistinctItemsAnswered?:boolean;sameItemIdRepeated?:number;correct?:boolean;outcome?:string;
 reviewStatus?:string;teacherApproved?:boolean;independentContext?:boolean;assistanceShown?:boolean;
 source?:string;recordingValidated?:boolean;transcriptViewedBeforeAttempt?:boolean;
 sourceVersion?:string;currentVersion?:string;ratings?:number[];
 spokenProduction?:string;spokenReception?:string;
}
export interface V17PolicyDecision {
 study:StudyStateV17;performance:PerformanceV17;
 recommendation:RecommendationV17;claim:'no_level_claim';
}
/** Deterministic policy simulation for the 16 *synthetic* editorial cases.
 * Do not feed legacy correctness or browser TTS into a CEFR assessment.
 */
export function evaluateV17EvidencePolicy(facts:V17PolicyFacts):V17PolicyDecision {
 let study:StudyStateV17='not_started';
 if(facts.sourceType==='legacy_attempt'&&
     (!facts.targetLanguage||!facts.sourceLanguage||facts.targetLanguage===facts.sourceLanguage)){
  const total=facts.stageQuestionCount||6;
  const distinct=facts.sixDistinctItemsAnswered?6:facts.distinctItemIds||0;
  study=(facts.allStageQuestionsAnswered||distinct>=total)?'activities_answered':distinct?'in_progress':'not_started';
 }
 let performance:PerformanceV17='not_assessed';
 if(facts.sourceType&&facts.sourceType!=='legacy_attempt'){
  const audio=facts.sourceType==='approved_recorded_listening';
  const validAudio=!audio||(facts.source==='recording'&&facts.recordingValidated===true&&facts.transcriptViewedBeforeAttempt===false);
  const validVersion=!facts.sourceVersion||!facts.currentVersion||facts.sourceVersion===facts.currentVersion;
  const isPending=facts.reviewStatus==='pending'||facts.reviewStatus==='disagreement'||facts.outcome==='uncertain';
  if(validAudio&&validVersion&&isPending)performance='awaiting_review';
  else if(validAudio&&validVersion&&facts.teacherApproved===true&&
     facts.reviewStatus==='reviewed'&&facts.independentContext===true&&facts.assistanceShown!==true){
   if(facts.outcome==='supported')performance='supported_for_observed_task';
   else if(facts.outcome==='partially_supported')performance='partially_supported';
   else if(facts.outcome==='needs_practice')performance='needs_practice';
  }
 }
 const recommendation:RecommendationV17=performance==='needs_practice'
  ?'review_recommended':performance==='awaiting_review'
  ?'insufficient_evidence':performance==='supported_for_observed_task'||study==='activities_answered'
  ?'next_activity_suggested':study==='in_progress'?'explore_current':'insufficient_evidence';
 return {study,performance,recommendation,claim:'no_level_claim'};
}
export interface StageSnapshotV17 extends StageStudyProgress {
 studyState:StudyStateV17;performance:PerformanceV17;
 recommendation:RecommendationV17;
}
export function studySnapshotV17(stage:ProgressionStage,attempts:readonly Attempt[],language:Language):StageSnapshotV17 {
 const p=stageStudyProgress(stage,[...attempts],language);
 const studyState:StudyStateV17=p.complete?'activities_answered':p.inProgress?'in_progress':'not_started';
 return {...p,studyState,performance:'not_assessed',
  recommendation:p.complete?'next_activity_suggested':p.inProgress?'explore_current':'next_activity_suggested'};
}
/** Suggestions are reversible. All 15 stages remain accessible, regardless of coverage. */
export function recommendNextStageV17(stages:readonly ProgressionStage[],attempts:readonly Attempt[],language:Language):ProgressionStage|undefined {
 return [...stages].sort((a,b)=>a.sequence-b.sequence).find(stage=>studySnapshotV17(stage,attempts,language).studyState!=='activities_answered');
}
export function isScenarioAlignedV17(stage:ProgressionStage,proposal:StageScenarioV17):boolean{
 return stage.nodeId===proposal.nodeId&&stage.level===proposal.level&&
   proposal.legacyStudyQuestionIds.length===6&&
   proposal.legacyStudyQuestionIds.every(id=>[...stage.grammarQuestionIds,...stage.readingQuestionIds].includes(id));
}
