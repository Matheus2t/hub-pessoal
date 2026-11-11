export type Language = 'en' | 'ru';
export type Skill = 'vocabulary' | 'listening' | 'dictation' | 'writing' | 'reading' | 'grammar' | 'test';
export type AttemptOutcome = 'correct' | 'incorrect' | 'uncertain';
export type Grade = 0 | 1 | 2 | 3;
export interface Word {
  id: string; language: Language; word: string; translation: string; example: string;
  exampleTranslation: string; level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'; topic: string;
  part: string; gender?: string; transliteration?: string; translationVariants?: string[];
}
export interface Attempt {
  id: string; language: Language; itemId: string; skill: Skill; topic: string;
  answer: string; expected: string; correct: boolean; at: number; seconds: number;
  /** Additive v3 evidence; absent on historical records. Used only for unrecognized open writing. */
  assessmentOutcome?: 'uncertain';
  grade?: Grade;
}
export interface Card {
  language: Language; itemId: string; interval: number; ease: number; repetitions: number;
  due: number; updated: number; lastGrade: Grade | null;
}
export interface PlanSettings {language:Language;goal:number;minutes:number;modes:Skill[];preference:'review'|'new'}
export interface PlanItem {attemptId:string;itemId:string;mode:'flashcards'|'exercise';reason:string}
export interface DailyPlan {id:string;language:Language;day:string;timezone:string;createdAt:number;goal:number;minutes:number;items:PlanItem[];activeItemId?:string}
export type PlanningRecord = {key:string;kind:'settings';language:Language;settings:PlanSettings}|{key:string;kind:'plan';language:Language;plan:DailyPlan};
export type LessonTaskKind = 'comprehension'|'notice'|'guidedProduction'|'transfer'|'diagnosticReading'|'diagnosticRecognition'|'diagnosticGuidedProduction'|'diagnosticIndependentProduction'|'diagnosticTransfer'|'diagnosticListening'|'delayedRecall';
export type LessonEvidenceKind = 'comprehension'|'practiceOnly'|'guidedProduction'|'transfer'|'recognition'|'independentProduction'|'delayedRecall';
export type DiagnosticCompetencyId='written-comprehension'|'contextual-recognition'|'written-production'|'written-transfer'|'listening-comprehension';
export type LessonOutcome = 'supported'|'partiallySupported'|'notSupported'|'uncertain'|'notAssessed';
export type LessonAssistanceKind = 'wordGloss'|'translation'|'sentenceStarter'|'modelAnswer'|'phoneticKeyboard'|'lexical-cue'|'writtenStimulus';
export interface LessonAssistance {kind:LessonAssistanceKind;value:string;taskId:string;shownAt:number;attemptId?:string}
export interface LessonShownAssistance extends LessonAssistance {shownBeforeAttempt:boolean}
export interface LessonFeedback {whatWorked:string;priorityIssue:string;whyItMatters:string;concreteSuggestion:string;retryPrompt:string;assessmentLimits:string}
export interface DelayedReviewEventData {probeId:string;attemptId:string;pilotCompletedAt:number;dueAt:number;recommendedDelayDays:2|7;elapsedMs:number;previousReviewAt?:number}
export interface LessonEvidenceEvent {
  eventId:string;language:Language;unitId:string;contentVersion:number;taskId:string;
  taskKind:LessonTaskKind;evidenceKind:LessonEvidenceKind;
  response:string;shownAssistance:LessonShownAssistance[];startedAt:number;submittedAt:number;
  outcome:LessonOutcome;reviewStatus:'pending'|'reviewed'|'notRequired';
  assessorKind:'deterministic'|'rubricWithReview'|'humanReview'|'unavailable';
  feedback:LessonFeedback|null;sourceContext:string;isIndependentClaimAllowed:boolean;
  diagnosticSessionId?:string;objectiveId?:string;competencyId?:DiagnosticCompetencyId;delayedReview?:DelayedReviewEventData;
}
export interface LessonDraft {taskId:string;eventId:string;response:string;startedAt:number;updatedAt:number;choiceIndex?:number}
export interface DelayedReviewAttemptProgress {attemptId:string;probeId:string;status:'inProgress'|'completed'|'notAssessed';startedAt:number;currentTaskIndex:number;completedAt?:number}
export interface DelayedReviewProgressState {pilotCompletedAt:number;attempts:DelayedReviewAttemptProgress[]}
export interface LessonProgress {
  key:string;language:Language;unitId:string;contentVersion:number;currentStage:number;
  shownAssistance:LessonAssistance[];drafts:LessonDraft[];updatedAt:number;
  diagnosticSessionId?:string;diagnosticStatus?:'inProgress'|'completed'|'skipped';diagnosticLastEventId?:string;
  sessionKind?:'delayedReview';delayedReview?:DelayedReviewProgressState;
}
export interface Backup {
  format:'2t-learn';version:1|2|3;exportedAt:number;attempts:Attempt[];cards:Card[];
  planning?:PlanningRecord[];lessonEvents?:LessonEvidenceEvent[];lessonProgress?:LessonProgress[];
}
export const languages: Language[] = ['en','ru'];
