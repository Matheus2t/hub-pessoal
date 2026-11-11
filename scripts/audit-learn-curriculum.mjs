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
const knownLevels=new Set(['A1','A2','B1','B2','C1','C2']);
const requiredText={
  words:['word','translation','example','exampleTranslation','topic','part','level'],
  phrases:['word','translation','example','exampleTranslation','topic','part','level'],
  readings:['title','topic','level','text','translation'],
  lessons:['title','topic','level','objective','explanation','commonErrors'],
  exercises:['skill','topic','level','prompt','explanation']
};
const errors=[];
const results={};
const countBy=(items,key)=>items.reduce((acc,item)=>{const field=String(item?.[key]||'indefinido');acc[field]=(acc[field]||0)+1;return acc},{});
function verify(condition,message){if(!condition)errors.push(message)}
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const normalized=value=>String(value).normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase();
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
  if(!catalog||typeof catalog!=='object'||Array.isArray(catalog)){errors.push(lang+': raiz do catálogo inválida');continue}
  verify(catalog.language===lang,lang+': campo language incorreto');
  verify(catalog.version===1,lang+': versão inesperada');
  const collections={};
  for(const kind of kinds){verify(Array.isArray(catalog[kind]),lang+': coleção ausente ou inválida '+kind);collections[kind]=Array.isArray(catalog[kind])?catalog[kind]:[]}
  const all=kinds.flatMap(kind=>collections[kind].map(item=>({kind,...item})));
  const known=new Set();
  for(const item of all){
    verify(typeof item.id==='string'&&item.id.length>0,lang+': item sem id');
    verify(!known.has(item.id),lang+': ID duplicado '+item.id);
    known.add(item.id);
    verify(typeof item.id==='string'&&item.id.startsWith(lang+'-'),lang+': ID de outro idioma '+item.id);
    verify(item.language===lang,lang+': linguagem divergente '+item.id);
    for(const field of requiredText[item.kind]||[])verify(nonempty(item[field]),lang+': campo vazio '+item.id+'.'+field);
    if(['words','phrases','readings','lessons','exercises'].includes(item.kind))verify(knownLevels.has(item.level),lang+': nível inválido '+item.id);
    for(const [field,value] of Object.entries(item))if(typeof value==='string'&&/\b(?:TODO|TBD|PLACEHOLDER)\b|\[REVIEW\]/u.test(value))verify(false,lang+': marcador editorial não resolvido '+item.id+'.'+field);
    if(['words','phrases'].includes(item.kind)&&Array.isArray(item.translationVariants)){
      const variants=[item.translation,...item.translationVariants].map(normalized);
      verify(new Set(variants).size===variants.length,lang+': variantes de tradução duplicadas '+item.id);
    }
  }
  const words=new Set([...collections.words,...collections.phrases].map(x=>x?.id));
  const units=new Map([...collections.readings,...collections.lessons].map(x=>[x?.id,x]));
  const exercises=new Map(collections.exercises.map(x=>[x?.id,x]));
  for(const x of collections.exercises){
    if(!x||typeof x!=='object'||Array.isArray(x)){verify(false,lang+': exercício não é objeto');continue}
    verify(knownSkills.has(x.skill),lang+': modalidade desconhecida '+x.id);
    verify(Array.isArray(x.answers)&&x.answers.length>0&&x.answers.every(s=>typeof s==='string'&&s.trim()),lang+': resposta ausente '+x.id);
    if(Array.isArray(x.answers))verify(new Set(x.answers.map(normalized)).size===x.answers.length,lang+': variantes de resposta duplicadas '+x.id);
    verify(Array.isArray(x.wordIds)&&x.wordIds.every(id=>words.has(id)),lang+': referência de vocabulário inválida '+x.id);
    verify(!x.unitId||units.has(x.unitId),lang+': unidade ausente '+x.id);
    verify(!['listening','dictation'].includes(x.skill)||typeof x.audio==='string'&&x.audio.trim().length>0,lang+': áudio sem texto '+x.id);
  }
  for(const u of units.values()){
    if(!u||typeof u!=='object'||Array.isArray(u)){verify(false,lang+': unidade não é objeto');continue}
    verify(Array.isArray(u.questionIds)&&u.questionIds.every(id=>exercises.has(id)),lang+': questões ausentes na unidade '+u.id);
    verify(Array.isArray(u.questionIds)&&new Set(u.questionIds).size===u.questionIds.length,lang+': IDs de questões duplicados '+u.id);
    for(const id of u.questionIds||[]){
      const exercise=exercises.get(id);
      if(exercise)verify(exercise.unitId===u.id&&exercise.skill===('text'in u?'reading':'grammar'),lang+': questão vinculada à modalidade/unidade errada '+id);
    }
    verify(u.vocabulary===undefined||Array.isArray(u.vocabulary)&&u.vocabulary.every(id=>words.has(id)),lang+': vocabulário ausente ou inválido na unidade '+u.id);
    if('text'in u){verify(Array.isArray(u.vocabulary)&&u.vocabulary.length>0,lang+': leitura sem vocabulário ligado '+u.id);verify(u.forms===undefined||Array.isArray(u.forms)&&u.forms.every(f=>f&&nonempty(f.text)&&u.vocabulary?.includes(f.wordId)&&typeof u.text==='string'&&u.text.toLocaleLowerCase().includes(f.text.toLocaleLowerCase())),lang+': forma de leitura inválida '+u.id)}
    else verify(Array.isArray(u.examples)&&u.examples.length>0&&u.examples.every(e=>e&&nonempty(e.text)&&nonempty(e.translation)),lang+': exemplos de lição ausentes ou inválidos '+u.id);
  }
  const questions=collections.exercises.filter(x=>x&&typeof x==='object'&&!Array.isArray(x));
  const linked=questions.filter(x=>x.unitId).length;
  const byAnswerLanguage=countBy(questions.map(x=>({answerLanguage:targetAnswer(x,lang)})),'answerLanguage');
  const byLevel=countBy(questions,'level');
  const bySkill=countBy(questions,'skill');
  const byTopic=countBy(questions,'topic');
  const currentModes={
    audioExercises:questions.filter(x=>typeof x.audio==='string'&&x.audio.trim()).length,
    questionsLinkedToReadingOrGrammarUnits:linked,
    questionsNotLinkedToUnits:questions.length-linked,
    dedicatedOralProductionAssessment:0,
    spontaneousDialogueAssessment:0,
  };
  results[lang]={
    totals:{
      words:collections.words.length,
      phrases:collections.phrases.length,
      readings:collections.readings.length,
      grammarLessons:collections.lessons.length,
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
