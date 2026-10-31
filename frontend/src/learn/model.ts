export type Language = 'en' | 'ru';
export type Skill = 'vocabulary' | 'listening' | 'dictation' | 'writing' | 'reading' | 'grammar' | 'test';
export type Grade = 0 | 1 | 2 | 3;
export interface Word {
  id: string; language: Language; word: string; translation: string; example: string;
  exampleTranslation: string; level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'; topic: string;
  part: string; gender?: string; transliteration?: string;
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
export interface Backup { format: '2t-learn'; version: 1; exportedAt: number; attempts: Attempt[]; cards: Card[] }
export const languages: Language[] = ['en','ru'];
