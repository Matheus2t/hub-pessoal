#!/usr/bin/env node
/**
 * 2T Learn — quality contract for all 474 legacy exercises.
 * Mechanical checks and curated editorial regression anchors only.
 * NOT a CEFR certification, native linguistic audit, or licensed-audio test.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const norm=s=>String(s).normalize('NFC').toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();
const errors=[];
function verify(ok,ref,issue){if(!ok)errors.push(`${ref}: ${issue}`);}
const expectedCounts={listening:30,dictation:30,writing:52,reading:45,grammar:45,test:35};
const inventory=new Map();
for(const line of readFileSync('docs/learn-revisao-itens-474.csv','utf8').split(/\r?\n/u).slice(1)){
 const match=/^"(en|ru)","([^"]+)","([^"]+)","([^"]+)"/u.exec(line);
 if(!match)continue;
 const [,lang,id,skill,level]=match;
 verify(!inventory.has(id),id,'duplicado no inventário congelado');
 inventory.set(id,{lang,skill,level});
}
verify(inventory.size===474,'inventário','474 IDs esperados na base de referência');

const report={schemaVersion:1,perLanguage:{},risksNeedingHumans:[
 'Traduções livres não cadastradas permanecem uncertain: comparação textual não é correção semântica.',
 '120 itens de listening/ditado do legado são textos para síntese e não gravações autorizadas para avaliação.',
 'Rótulos A1/A2/B1 e descritores de dificuldade exigem avaliação independente; acerto isolado não certifica CEFR.',
 'Relações de evidência entre texto de leitura e respostas foram amostradas editorialmente; esta regra valida vínculos, não inferências semânticas.',
]};
for(const language of ['en','ru']){
 const c=read(`frontend/public/learn/${language}.json`);
 const byId=new Map(c.exercises.map(x=>[x.id,x]));
 const byUnit=new Map([...c.readings,...c.lessons].map(x=>[x.id,x]));
 const wordIds=new Set([...c.words,...(c.phrases||[])].map(x=>x.id));
 const actual=Object.fromEntries(Object.keys(expectedCounts).map(skill=>[skill,0]));
 const byLevel={A1:0,A2:0,B1:0};
 const noExactDuplicates=new Map();
 const affected=[];
 verify(c.language===language&&c.version===1,language,'catálogo ou versão inválida');
 verify(c.exercises.length===237&&byId.size===237,language,'exercícios ou IDs legados alterados');
 verify(c.readings.length===15&&c.lessons.length===15,language,'15 leituras/lições devem ser preservadas');
 const verifiedUnitIds=new Set();
 for(const e of c.exercises){
  const ref=e.id;
  const frozen=inventory.get(ref);
  verify(!!frozen&&frozen.lang===language&&frozen.skill===e.skill&&frozen.level===e.level,ref,'identidade/modalidade/nível diverge do inventário histórico');
  verify(e.language===language&&ref.startsWith(language+'-'),ref,'idioma de origem divergente');
  verify(Object.hasOwn(actual,e.skill),ref,'modalidade não reconhecida');
  if(Object.hasOwn(actual,e.skill))actual[e.skill]++;
  verify(Object.hasOwn(byLevel,e.level),ref,'nível curricular não reconhecido');
  if(Object.hasOwn(byLevel,e.level))byLevel[e.level]++;
  verify(typeof e.prompt==='string'&&e.prompt.trim().length>8,ref,'enunciado curto ou ausente');
  verify(typeof e.explanation==='string'&&e.explanation.trim().length>=12,ref,'feedback insuficiente');
  verify(typeof e.topic==='string'&&!!e.topic.trim(),ref,'tema ausente');
  verify(Array.isArray(e.answers)&&e.answers.length>0&&e.answers.every(x=>typeof x==='string'&&x.trim().length>0),ref,'resposta vazia ou ausente');
  if(Array.isArray(e.answers)){
   verify(new Set(e.answers.map(norm)).size===e.answers.length,ref,'variantes idênticas depois da normalização efetiva');
  }
  verify(Array.isArray(e.wordIds)&&e.wordIds.every(id=>wordIds.has(id)),ref,'referência léxica inexistente');
  if(e.unitId){
   const unit=byUnit.get(e.unitId);
   verify(!!unit&&unit.language===language&&unit.level===e.level,ref,'unidade de outra língua ou nível');
   verify(unit?.questionIds.includes(e.id),ref,'questão não listada na unidade');
   verify(!!unit&&(e.skill==='reading'?Object.hasOwn(unit,'text'):e.skill==='grammar'&&Object.hasOwn(unit,'explanation')),ref,'modalidade não corresponde ao tipo da unidade');
   verifiedUnitIds.add(ref);
  }
  const key=norm(e.prompt)+'|'+norm(e.answers?.[0]);
  if(noExactDuplicates.has(key))verify(false,ref,`enunciado/gabarito idêntico a ${noExactDuplicates.get(key)}`);
  noExactDuplicates.set(key,ref);
  if(['listening','dictation'].includes(e.skill)){
   verify(typeof e.audio==='string'&&e.audio.trim().length>0,ref,'falta transcrição do estímulo auditivo');
   if(e.skill==='dictation')verify(norm(e.answers?.[0])===norm(e.audio),ref,'resposta canônica diverge da fala de referência');
  }
  if(e.skill==='writing'){
   verify(!/outras traduções podem ser válidas/i.test(e.explanation),ref,'feedback de tradução genérico reapareceu');
   if(language==='ru')verify(e.answers.some(v=>/[А-Яа-яЁё]/u.test(v)),ref,'escrita em russo sem resposta em cirílico');
  }
  if(e.questionType==='singleChoice')verify(!!e.options?.some(o=>o.id===e.correctOptionId),ref,'gabarito de múltipla escolha inválido');
  if(e.explanation.includes('PLACEHOLDER')||/\bTODO\b/u.test(e.explanation))verify(false,ref,'marcador editorial remanescente');
 }
 for(const [skill,count] of Object.entries(expectedCounts))verify(actual[skill]===count,language,`esperado ${count} exercícios de ${skill}; atual ${actual[skill]}`);
 verify(verifiedUnitIds.size===90,language,'esperadas 45 questões de leitura e 45 de gramática vinculadas');
 for(const unit of byUnit.values()){
  verify(unit.questionIds.length===3&&new Set(unit.questionIds).size===3,unit.id,'três questões distintas por unidade');
  for(const id of unit.questionIds)verify(byId.has(id),unit.id,`questão não encontrada: ${id}`);
 }
 const generic=c.exercises.filter(x=>x.skill==='writing'&&/outras traduções podem ser válidas/i.test(x.explanation)).length;
 verify(generic===0,language,'feedback genérico voltou ao catálogo');
 report.perLanguage[language]={exercises:c.exercises.length,bySkill:actual,byLevel,unitQuestions:verifiedUnitIds.size,duplicatePromptAnswerPairs:0,genericWritingFeedback:generic};
 // Curated checks: prevent the five confirmed semantic fixes from silently disappearing.
 if(language==='ru'){
  const f=(id)=>byId.get(id);
  verify(f('ru-writing-074')?.answers.includes('Моя коллега говорит по-русски.'),'ru-writing-074','a tradução feminina de colega é válida e deve ser aceita');
  verify(f('ru-writing-084')?.answers.includes('Твой ответ правильный.'),'ru-writing-084','a forma informal singular твой precisa continuar aceita');
  verify(f('ru-writing-097')?.answers.includes('Можешь показать мне на карте?'),'ru-writing-097','a forma informal можешь deve continuar aceita');
  verify(f('ru-listening-018')?.explanation.includes('sem pressupor'),'ru-listening-018','explicação parental não deve pressupor composição familiar');
 }else{
  verify(byId.get('en-listening-018')?.explanation.includes('não determina a composição'),'en-listening-018','explicação parental não deve pressupor composição familiar');
 }
}
verify(report.perLanguage.en?.exercises+report.perLanguage.ru?.exercises===474,'total','474 exercícios esperados');
const audio=read('frontend/public/learn/pedagogy-v1/audio-assets.json');
verify(audio.policy?.audioAssessmentEnabled===false&&audio.policy.validatedRecordings===0,'áudio','audição não homologada não pode ativar avaliação');
verify(Array.isArray(audio.assets)&&audio.assets.every(x=>x.assetUrl===null&&x.assessmentEnabled===false),'áudio','nenhum arquivo aprovado ou avaliação habilitada');
if(process.argv.includes('--json'))console.log(JSON.stringify({...report,errors},null,2));
else console.log(JSON.stringify({ok:errors.length===0,...report,errors},null,2));
if(errors.length)process.exitCode=1;
