import type {Language,Skill,Word} from './model';
export interface Exercise {id:string;language:Language;skill:Skill;topic:string;level:Word['level'];prompt:string;answers:string[];explanation:string;audio?:string;wordIds:string[];acceptYoAsE?:boolean;unitId?:string}
export interface Reading {id:string;language:Language;title:string;topic:string;level:Word['level'];text:string;translation:string;vocabulary:string[];questionIds:string[]}
export interface Lesson {id:string;language:Language;title:string;topic:string;level:Word['level'];objective:string;explanation:string;examples:{text:string;translation:string}[];commonErrors:string;questionIds:string[]}
export interface Curriculum {language:Language;version:1;words:Word[];phrases?:Word[];exercises:Exercise[];readings?:Reading[];lessons?:Lesson[]}
/** Labels and explanations are Portuguese; target-language answers are marked separately. */
export function answerLanguage(e:Exercise):Language|'pt-BR' {
 if(['vocabulary','listening','reading'].includes(e.skill)||e.skill==='test'&&['Vocabulário','Compreensão'].includes(e.topic))return 'pt-BR';
 if(e.language==='ru'&&!/[А-Яа-яЁё]/.test(e.answers[0]))return 'pt-BR';
 return e.language;
}
/** Content must pass before it can be exposed by the UI. No placeholder generation. */
export function validateCurriculum(data:Curriculum):void {
  if(!['en','ru'].includes(data.language)||data.version!==1)throw Error('Idioma ou versão de conteúdo inválidos.');
  const ids=new Set<string>();
  const add=(id:string)=>{if(!/^[a-z0-9-]{1,120}$/.test(id)||ids.has(id))throw Error('ID inválido ou duplicado.');ids.add(id)};
  const normalized=new Set<string>();
  for(const w of [...data.words,...(data.phrases||[])]){add(w.id);if(w.language!==data.language||!w.word.trim()||!w.translation.trim()||!w.example.trim()||!w.exampleTranslation.trim()||!w.topic.trim()||!w.part.trim()||!['A1','A2','B1','B2','C1','C2'].includes(w.level))throw Error('Vocabulário incompleto.');if(data.language==='ru'&&!/[А-Яа-яЁё]/.test(w.word))throw Error('Vocabulário russo deve estar em cirílico.');if(w.translationVariants&&(!Array.isArray(w.translationVariants)||w.translationVariants.some(v=>typeof v!=='string'||!v.trim())||new Set([w.translation,...w.translationVariants]).size!==w.translationVariants.length+1))throw Error('Variantes de tradução inválidas.');const key=w.word.normalize('NFC').toLowerCase();if(normalized.has(key))throw Error('Entrada repetida.');normalized.add(key)}
  const words=new Set([...data.words,...(data.phrases||[])].map(w=>w.id)),questions=new Set<string>();
  for(const e of data.exercises){add(e.id);if(e.language!==data.language||!e.prompt.trim()||!e.topic.trim()||!e.explanation.trim()||!e.answers.length||e.answers.some(a=>!a.trim())||new Set(e.answers).size!==e.answers.length||e.wordIds.some(id=>!words.has(id))||!['vocabulary','listening','dictation','writing','reading','grammar','test'].includes(e.skill)||!['A1','A2','B1','B2','C1','C2'].includes(e.level))throw Error('Exercício inválido ou referência ausente.');if(['listening','dictation'].includes(e.skill)&&!e.audio?.trim())throw Error('Atividade auditiva sem texto para síntese.');const key=`${e.skill}:${(e.audio||e.prompt).normalize('NFC').trim().toLowerCase()}`;if(questions.has(key))throw Error('Exercício repetido.');questions.add(key)}
  const units=[...(data.readings||[]),...(data.lessons||[])];
  for(const u of units){add(u.id);if(u.language!==data.language||!u.title.trim()||!u.topic.trim()||!['A1','A2'].includes(u.level)||u.questionIds.length<3||new Set(u.questionIds).size!==u.questionIds.length||u.questionIds.some(id=>!data.exercises.some(e=>e.id===id&&e.unitId===u.id&&e.skill===('text'in u?'reading':'grammar'))))throw Error('Unidade ou questões inválidas.');
   if('text'in u){if(!u.text.trim()||!u.translation.trim()||!u.vocabulary.length||u.vocabulary.some(id=>!words.has(id)))throw Error('Leitura incompleta.');if(data.language==='ru'&&!/[А-Яа-яЁё]/.test(u.text))throw Error('Leitura russa deve usar cirílico.');}
   else if(!u.objective.trim()||!u.explanation.trim()||!u.commonErrors.trim()||!u.examples.length||u.examples.some(e=>!e.text.trim()||!e.translation.trim()))throw Error('Lição incompleta.');
  }
  if(data.exercises.some(e=>e.unitId&&!units.some(u=>u.id===e.unitId&&u.questionIds.includes(e.id))))throw Error('Referência de unidade ausente.');
}
