#!/usr/bin/env node
/**
 * Curricular sequencing and traceability contract for 2T Learn A1–B1.
 * Checks real catalog links and personalized scaffolding notes, NOT CEFR mastery.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>JSON.parse(readFileSync(path,'utf8'));
const source=read('docs/learn-progressao-a1-b1-v10.json');
const runtime=read('frontend/public/learn/progression-v12.json');
const errors=[];
const requireValid=(condition,where,message)=>{if(!condition)errors.push(`${where}: ${message}`);};
const levelFor=sequence=>sequence<=4?'A1':sequence<=10?'A2':'B1';
requireValid(source.publicRelease===false&&source.cefrCertified===false,'V10','publicação/CEFR não autorizados');
requireValid(runtime.publicRelease===false&&runtime.cefrCertified===false,'V12','publicação/CEFR não autorizados');
requireValid(runtime.schemaVersion===1&&source.schemaVersion===1,'contrato','schema inválido');

const findings={languages:2,stages:0,uniqueExerciseLinks:0,levelCounts:{A1:0,A2:0,B1:0},legacyExercises:0};
for(const language of ['en','ru']){
 const track=source.languageTracks?.[language],published=runtime.languageTracks?.[language];
 const catalog=read(`frontend/public/learn/${language}.json`);
 const lessons=new Map(catalog.lessons.map(x=>[x.id,x]));
 const readings=new Map(catalog.readings.map(x=>[x.id,x]));
 const exercises=new Map(catalog.exercises.map(x=>[x.id,x]));
 requireValid(catalog.exercises.length===237,language,'catálogo legado com cardinalidade alterada');
 requireValid(exercises.size===237,language,'IDs de exercícios legados duplicados');
 findings.legacyExercises+=catalog.exercises.length;
 const units=track?.units||[],stages=published?.stages||[];
 requireValid(units.length===15&&stages.length===15,language,'precisa ter 15 etapas');
 requireValid(JSON.stringify(track?.stageGuides)===JSON.stringify(published?.stageGuides),language,'guias divergentes');
 const used=new Set();
 for(let index=0;index<15;index++){
  const unit=units[index],stage=stages[index],where=`${language}-path-${String(index+1).padStart(2,'0')}`;
  if(!unit||!stage){requireValid(false,where,'etapa não encontrada');continue;}
  findings.stages++;findings.levelCounts[levelFor(index+1)]++;
  // V12 is generated from V10. Never allow two competing curricula.
  const projected={
   nodeId:unit.nodeId,sequence:unit.sequence,level:unit.level,
   existingLessonId:unit.existingLessonId,existingLessonTitle:unit.existingLessonTitle,
   existingObjective:unit.existingObjective,canDoTarget:unit.canDoTarget,
   checkpointDraft:unit.checkpointDraft,prerequisiteNodeIds:unit.prerequisiteNodeIds,
   pairedReadingId:unit.pairedReadingId,readingQuestionIds:unit.readingQuestionIds,
   grammarQuestionIds:unit.grammarQuestionIds,linkingCaveat:unit.linkingCaveat,status:unit.status,
  };
  requireValid(JSON.stringify(stage)===JSON.stringify(projected),where,'V12 não corresponde ao fonte V10');
  requireValid(unit.nodeId===where&&unit.sequence===index+1&&unit.level===levelFor(index+1),where,'ordem/nível curricular inválido');
  const previous=index===0?[]:[`${language}-path-${String(index).padStart(2,'0')}`];
  requireValid(JSON.stringify(unit.prerequisiteNodeIds)===JSON.stringify(previous),where,'pré-requisito fora da sequência');
  requireValid(unit.status==='draft_mapping_not_published',where,'etapa publicada sem autorização');
  const note=unit.linkingCaveat||'';
  requireValid(note.length>95&&note.startsWith('Leitura')&&!note.includes('O pareamento de leitura por nível e ordem'),where,'falta ressalva individual de ponte gramática/leitura');
  const lesson=lessons.get(unit.existingLessonId),reading=readings.get(unit.pairedReadingId);
  requireValid(!!lesson&&lesson.language===language&&lesson.level===unit.level&&lesson.title===unit.existingLessonTitle,where,'lição inexistente/idioma/nível divergente');
  requireValid(!!reading&&reading.language===language&&reading.level===unit.level,where,'leitura inexistente/idioma/nível divergente');
  requireValid(unit.grammarQuestionIds?.length===3&&unit.readingQuestionIds?.length===3,where,'faltam três questões de cada modalidade');
  requireValid(JSON.stringify(unit.grammarQuestionIds)===JSON.stringify(lesson?.questionIds),where,'questões gramaticais divergem da lição');
  requireValid(JSON.stringify(unit.readingQuestionIds)===JSON.stringify(reading?.questionIds),where,'questões de leitura divergem do texto');
  for(const [skill,unitId,ids] of [
   ['grammar',unit.existingLessonId,unit.grammarQuestionIds||[]],
   ['reading',unit.pairedReadingId,unit.readingQuestionIds||[]],
  ]){
   for(const id of ids){
    const exercise=exercises.get(id);
    requireValid(!used.has(id),where,`questão vinculada duas vezes: ${id}`);
    used.add(id);findings.uniqueExerciseLinks++;
    requireValid(!!exercise&&exercise.language===language&&exercise.level===unit.level&&exercise.skill===skill&&exercise.unitId===unitId,where,`questão fora da unidade/nível: ${id}`);
   }
  }
 }
 requireValid(used.size===90,language,'esperados 90 IDs distintos vinculados');
}

const en=read('frontend/public/learn/en.json'),ru=read('frontend/public/learn/ru.json');
const sourceText=(catalog,id)=>catalog.readings.find(x=>x.id===id)?.text||'';
// Regression anchors for concrete pedagogical jumps: do not silently
// replace lesson/reading pairs without also revising their scaffolding.
const anchors=[
 ['en-path-01',sourceText(en,'en-reading-01').includes('is raining'),'A1 reading anticipates present continuous'],
 ['en-path-10',sourceText(en,'en-reading-10').includes('Amir notices'),'past-simple stage uses present-tense reading'],
 ['en-path-11',sourceText(en,'en-v2-reading-001').includes('had become'),'present-perfect stage reading introduces past perfect'],
 ['ru-path-01',sourceText(ru,'ru-reading-01').includes('чтобы они не промокли'),'first Cyrillic reading anticipates purpose clause'],
 ['ru-path-04',sourceText(ru,'ru-reading-04').includes('к бабушке'),'A1 plural reading anticipates dative'],
 ['ru-path-08',sourceText(ru,'ru-reading-08').includes('без письменного стола'),'A2 question reading anticipates genitive'],
 ['ru-path-15',sourceText(ru,'ru-v2-reading-005').includes('лампы'),'movement stage reading has unrelated theme'],
];
for(const [id,present,reason]of anchors)requireValid(present,id,`fonte alterada: reauditar ressalva (${reason})`);
requireValid(findings.stages===30&&findings.uniqueExerciseLinks===180&&findings.legacyExercises===474,'inventário','30 etapas/180 vínculos/474 exercícios esperados');
if(errors.length){console.error(JSON.stringify({ok:false,errors,findings},null,2));process.exitCode=1;}
else console.log(JSON.stringify({ok:true,...findings,scope:'sequência e coerência de IDs; notas editoriais, sem certificação CEFR'},null,2));
