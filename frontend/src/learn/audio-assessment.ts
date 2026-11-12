import type {Language} from './model';

export type AudioTaskOutcome='correct'|'incorrect'|'uncertain'|'notAssessed';
export interface KnownDictationError {text:string;reason:string}
export interface DictationRubric {language:Language;canonicalTranscript:string;acceptedFullTranscriptVariants?:readonly string[];knownIncorrectVariants?:readonly KnownDictationError[]}

/** Technical normalization only: NFC, case, repeated spaces and terminal punctuation. It preserves е/ё and internal punctuation. */
export function normalizeDictation(text:string,language:Language):string {
  return text.normalize('NFC').toLocaleLowerCase(language==='ru'?'ru-RU':'en-US').replace(/\s+/gu,' ').trim().replace(/[.!?…]+$/u,'').trim();
}

export function evaluateListeningChoice(selectedOptionId:string|undefined,correctOptionId:string,recordingCompleted:boolean,assessmentEligible:boolean):AudioTaskOutcome {
  if(!recordingCompleted||!assessmentEligible)return 'notAssessed';
  if(!selectedOptionId)return 'uncertain';
  return selectedOptionId===correctOptionId?'correct':'incorrect';
}

/** Free response comprehension is never judged by exact string matching. */
export function evaluateListeningOpenAnswer(recordingCompleted:boolean,assessmentEligible:boolean):AudioTaskOutcome {
  if(!recordingCompleted||!assessmentEligible)return 'notAssessed';
  return 'uncertain';
}

export function evaluateDictation(answer:string,rubric:DictationRubric,recordingCompleted:boolean,assessmentEligible:boolean):AudioTaskOutcome {
  if(!recordingCompleted||!assessmentEligible)return 'notAssessed';
  const value=normalizeDictation(answer,rubric.language);
  if(!value)return 'uncertain';
  const accepted=[rubric.canonicalTranscript,...(rubric.acceptedFullTranscriptVariants||[])];
  if(accepted.some(variant=>normalizeDictation(variant,rubric.language)===value))return 'correct';
  if(rubric.knownIncorrectVariants?.some(variant=>normalizeDictation(variant.text,rubric.language)===value))return 'incorrect';
  return 'uncertain';
}
