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
export interface Backup { format: '2t-learn'; version: 1|2; exportedAt: number; attempts: Attempt[]; cards: Card[];planning?:PlanningRecord[] }
export const languages: Language[] = ['en','ru'];
