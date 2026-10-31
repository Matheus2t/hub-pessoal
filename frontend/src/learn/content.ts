import type {Language,Skill,Word} from './model';
export interface Exercise {id:string;language:Language;skill:Skill;topic:string;level:Word['level'];prompt:string;answers:string[];explanation:string;audio?:string;wordIds:string[];acceptYoAsE?:boolean}
export interface Curriculum {language:Language;version:1;words:Word[];exercises:Exercise[]}
/** Content must pass before it can be exposed by the UI. No placeholder generation. */
export function validateCurriculum(data:Curriculum):void {
  if(!['en','ru'].includes(data.language)||data.version!==1)throw Error('Idioma ou versão de conteúdo inválidos.');
  const ids=new Set<string>();
  const add=(id:string)=>{if(!/^[a-z0-9-]{1,120}$/.test(id)||ids.has(id))throw Error('ID inválido ou duplicado.');ids.add(id)};
  const normalized=new Set<string>();
  for(const w of data.words){add(w.id);if(w.language!==data.language||!w.word.trim()||!w.translation.trim()||!w.example.trim()||!w.exampleTranslation.trim()||!w.topic.trim()||!w.part.trim()||!['A1','A2','B1','B2','C1','C2'].includes(w.level))throw Error('Vocabulário incompleto.');if(data.language==='ru'&&!/[А-Яа-яЁё]/.test(w.word))throw Error('Vocabulário russo deve estar em cirílico.');const key=w.word.normalize('NFC').toLowerCase();if(normalized.has(key))throw Error('Entrada repetida.');normalized.add(key)}
  const words=new Set(data.words.map(w=>w.id)),questions=new Set<string>();
  for(const e of data.exercises){add(e.id);if(e.language!==data.language||!e.prompt.trim()||!e.topic.trim()||!e.explanation.trim()||!e.answers.length||e.answers.some(a=>!a.trim())||new Set(e.answers).size!==e.answers.length||e.wordIds.some(id=>!words.has(id))||!['vocabulary','listening','dictation','writing','reading','grammar','test'].includes(e.skill)||!['A1','A2','B1','B2','C1','C2'].includes(e.level))throw Error('Exercício inválido ou referência ausente.');if(['listening','dictation'].includes(e.skill)&&!e.audio?.trim())throw Error('Atividade auditiva sem texto para síntese.');const key=`${e.skill}:${e.prompt.normalize('NFC').trim().toLowerCase()}`;if(questions.has(key))throw Error('Exercício repetido.');questions.add(key)}
}
