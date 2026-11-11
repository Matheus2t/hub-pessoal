export type Language = 'en' | 'ru';
export type Skill = 'vocabulary' | 'listening' | 'dictation' | 'writing' | 'reading' | 'grammar' | 'test';
export type Grade = 0 | 1 | 2 | 3;
export interface Word {
  id: string; language: Language; word: string; translation: string; example: string;
  exampleTranslation: string; level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'; topic: string;
  part: string; gender?: string; transliteration?: string; translationVariants?: string[];
}
export interface Attempt {
  id: string; language: Language; itemId: string; skill: Skill; topic: string;
  answer: string; expected: string; correct: boolean; at: number; seconds: number;
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
export type LessonTaskKind = 'comprehension'|'notice'|'guidedProduction'|'transfer';
export type LessonOutcome = 'supported'|'partiallySupported'|'notSupported'|'uncertain'|'notAssessed';
export type LessonAssistanceKind = 'wordGloss'|'translation'|'sentenceStarter'|'modelAnswer'|'phoneticKeyboard'|'lexical-cue';
export interface LessonAssistance {kind:LessonAssistanceKind;value:string;taskId:string;shownAt:number}
export interface LessonShownAssistance extends LessonAssistance {shownBeforeAttempt:boolean}
export interface LessonFeedback {whatWorked:string;priorityIssue:string;whyItMatters:string;concreteSuggestion:string;retryPrompt:string;assessmentLimits:string}
export interface LessonEvidenceEvent {
  eventId:string;language:Language;unitId:string;contentVersion:number;taskId:string;
  taskKind:LessonTaskKind;evidenceKind:'comprehension'|'practiceOnly'|'guidedProduction'|'transfer';
  response:string;shownAssistance:LessonShownAssistance[];startedAt:number;submittedAt:number;
  outcome:LessonOutcome;reviewStatus:'pending'|'reviewed'|'notRequired';
  assessorKind:'deterministic'|'rubricWithReview'|'humanReview'|'unavailable';
  feedback:LessonFeedback|null;sourceContext:string;isIndependentClaimAllowed:boolean;
}
export interface LessonDraft {taskId:string;eventId:string;response:string;startedAt:number;updatedAt:number;choiceIndex?:number}
export interface LessonProgress {
  key:string;language:Language;unitId:string;contentVersion:number;currentStage:number;
  shownAssistance:LessonAssistance[];drafts:LessonDraft[];updatedAt:number;
}
export interface Backup {
  format:'2t-learn';version:1|2|3;exportedAt:number;attempts:Attempt[];cards:Card[];
  planning?:PlanningRecord[];lessonEvents?:LessonEvidenceEvent[];lessonProgress?:LessonProgress[];
}
export const languages: Language[] = ['en','ru'];
