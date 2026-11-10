#!/usr/bin/env node
/**
 * 2T Learn – audit of existing curriculum assets (read only).
 * Run: node scripts/audit-learn-curriculum.mjs [--json] [--check]
 * --check: fail only on structural corruption; pedagogical gaps are diagnostics,
 * never inferred evidence of proficiency.
 */
import {readFileSync} from 'node:fs';

const languages=['en','ru'];
const kinds=['words','phrases','readings','lessons','exercises'];
const knownSkills=new Set(['listening','dictation','writing','reading','grammar','test']);
const errors=[];
const results={};
const countBy=(items,key)=>items.reduce((acc,item)=>{const field=String(item[key]||'indefinido');acc[field]=(acc[field]||0)+1;return acc},{});
function verify(condition,message){if(!condition)errors.push(message)}
function targetAnswer(item,language){
  if(language==='ru'){
    if(['vocabulary','listening','reading'].includes(item.skill)||(item.skill==='test'&&['Vocabulário','Compreensão'].includes(item.topic)))return 'pt-BR';
    return /[А-Яа-яЁё]/u.test(item.answers?.[0]||'')?'ru':'pt-BR';
  }
  return ['vocabulary','listening','reading'].includes(item.skill)||(item.skill==='test'&&['Vocabulário','Compreensão'].includes(item.topic))?'pt-BR':'en';
}
for(const lang of languages){
  let catalog;
  try{catalog=JSON.parse(readFileSync('frontend/public/learn/'+lang+'.json','utf8'))}
  catch(error){errors.push(lang+': falha ao ler JSON: '+String(error));continue}
  verify(catalog.language===lang,lang+': campo language incorreto');
  verify(catalog.version===1,lang+': versão inesperada');
  const all=kinds.flatMap(kind=>(catalog[kind]||[]).map(item=>({kind,...item})));
  const known=new Set();
  for(const item of all){
    verify(typeof item.id==='string'&&item.id.length>0,lang+': item sem id');
    verify(!known.has(item.id),lang+': ID duplicado '+item.id);
    known.add(item.id);
    verify(item.language===lang,lang+': linguagem divergente '+item.id);
  }
  const words=new Set([...(catalog.words||[]),...(catalog.phrases||[])].map(x=>x.id));
  const units=new Map([...(catalog.readings||[]),...(catalog.lessons||[])].map(x=>[x.id,x]));
  const exercises=new Map((catalog.exercises||[]).map(x=>[x.id,x]));
  for(const x of catalog.exercises||[]){
    verify(knownSkills.has(x.skill),lang+': modalidade desconhecida '+x.id);
    verify(Array.isArray(x.answers)&&x.answers.length>0&&x.answers.every(s=>typeof s==='string'&&s.trim()),lang+': resposta ausente '+x.id);
    verify(Array.isArray(x.wordIds)&&x.wordIds.every(id=>words.has(id)),lang+': referência de vocabulário inválida '+x.id);
    verify(!x.unitId||units.has(x.unitId),lang+': unidade ausente '+x.id);
    verify(!['listening','dictation'].includes(x.skill)||typeof x.audio==='string'&&x.audio.trim().length>0,lang+': áudio sem texto '+x.id);
  }
  for(const u of units.values()){
    verify(Array.isArray(u.questionIds)&&u.questionIds.every(id=>exercises.has(id)),lang+': questões ausentes na unidade '+u.id);
    verify(!u.vocabulary||u.vocabulary.every(id=>words.has(id)),lang+': vocabulário ausente na unidade '+u.id);
  }
  const questions=catalog.exercises||[];
  const linked=questions.filter(x=>x.unitId).length;
  const byAnswerLanguage=countBy(questions.map(x=>({answerLanguage:targetAnswer(x,lang)})),'answerLanguage');
  const byLevel=countBy(questions,'level');
  const bySkill=countBy(questions,'skill');
  const byTopic=countBy(questions,'topic');
  const currentModes={
    audioExercises:questions.filter(x=>x.audio?.trim()).length,
    questionsLinkedToReadingOrGrammarUnits:linked,
    questionsNotLinkedToUnits:questions.length-linked,
    dedicatedOralProductionAssessment:0,
    spontaneousDialogueAssessment:0,
  };
  results[lang]={
    totals:{
      words:(catalog.words||[]).length,
      phrases:(catalog.phrases||[]).length,
      readings:(catalog.readings||[]).length,
      grammarLessons:(catalog.lessons||[]).length,
      exercises:questions.length
    },
    byLevel,bySkill,byAnswerLanguage,
    topicCount:Object.keys(byTopic).length,
    byTopic,
    currentModes,
    pedagogicalGaps:[
      'A classificação por tema e nivel nao substitui um objetivo comunicativo verificavel.',
      'Nao ha diagnostico inicial validado nem avaliacao direta da producao oral.',
      'Quantidade de acertos e repeticao nao certificam nivel CEFR ou transferencia.',
      'O catalogo usa atividades e aulas separadas; a orquestracao por objetivos fica para o motor novo.',
    ]
  };
}
const output={revision:1,source:'frontend/public/learn/{en,ru}.json',languages:results,errors};
if(process.argv.includes('--json'))console.log(JSON.stringify(output,null,2));
else {
  for(const [lang,r] of Object.entries(results)){
    console.log(lang.toUpperCase()+': '+r.totals.words+' palavras, '+r.totals.phrases+' expressoes, '+r.totals.readings+' leituras, '+r.totals.grammarLessons+' licoes, '+r.totals.exercises+' exercicios');
    console.log('  niveis: '+JSON.stringify(r.byLevel)+' | modalidades: '+JSON.stringify(r.bySkill));
    console.log('  respostas: '+JSON.stringify(r.byAnswerLanguage)+' | ligadas a unidades: '+r.currentModes.questionsLinkedToReadingOrGrammarUnits+'/'+r.totals.exercises);
  }
  if(errors.length)console.error('ERROS ESTRUTURAIS:\n'+errors.join('\n'));
  else console.log('Estrutura do catalogo: OK. Lacunas pedagogicas sao registradas, nao bloqueantes.');
}
if(process.argv.includes('--check')&&errors.length)process.exitCode=1;
