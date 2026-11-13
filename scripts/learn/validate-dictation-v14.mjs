#!/usr/bin/env node
// V14: verificação estrutural de propostas editoriais, NÃO homologação linguística/CEFR/áudio.
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const errors=[];
const fail=(id,reason)=>errors.push(id+': '+reason);
const seen=new Set();
const matrix={en:{A2:0,B1:0},ru:{A2:0,B1:0}};
const progression=JSON.parse(readFileSync(resolve(root,'frontend/public/learn/progression-v12.json'),'utf8'));
const reviewedVariantCounts={en:{'04':1,'07':3,'09':1,'11':1},ru:{'06':3,'11':1,'14':1,'16':1}};
const norm=s=>s.normalize('NFC').toLowerCase().replace(/[\p{P}\p{S}]/gu,'').replace(/\s+/g,' ').trim();

for(const lang of ['en','ru']){
  const file=resolve(root,'docs','learn-ditados-v14-'+lang+'.json');
  const data=JSON.parse(readFileSync(file,'utf8'));
  if(data.schemaVersion!==1||data.recordType!=='learn_dictation_editorial_v14'||data.language!==lang)fail(lang,'manifesto invalido');
  if(data.publicRelease!==false||data.cefrCertified!==false||data.audioStatus!=='no_audio_produced_or_reviewed')fail(lang,'release ou audio indevido');
  if(data.units?.length!==16)fail(lang,'esperado 16 ditados');
  const review=data.internalEditorialReview;
  if(review?.itemsInspected!==16||review.reviewedScriptsOnly!==true||review.audioValidated!==false||review.externalLanguageValidationPerformed!==false||review.releaseAllowed!==false||review.ownerAcceptancePending!==true)fail(lang,'revisão editorial não equivale a aprovação externa ou de áudio');
  for(const [index,item] of (data.units||[]).entries()){
    const expectedId=`${lang}-dict-v14-${String(index+1).padStart(2,'0')}`;
    if(item.draftId!==expectedId)fail(item.draftId||lang,'ordem dos 16 IDs divergente do inventário editorial fixado');
    const id=item.draftId;
    if(seen.has(id))fail(id,'id duplicado');
    seen.add(id);
    if(!new RegExp('^'+lang+'-dict-v14-[0-9]{2}$').test(id))fail(id,'formato do ID');
    if(item.language!==lang)fail(id,'idioma');
    if(!['A2','B1'].includes(item.targetLevel)){fail(id,'nivel fora do escopo');continue;}
    matrix[lang][item.targetLevel]++;
    const match=new RegExp('^'+lang+'-path-([0-9]{2})$').exec(item.linkedStageNodeId||'');
    const stage=match?Number(match[1]):NaN;
    if(!Number.isInteger(stage)||(item.targetLevel==='A2'&&(stage<5||stage>10))||(item.targetLevel==='B1'&&(stage<11||stage>15)))fail(id,'vinculo V12 incorreto');
    const realStage=progression.languageTracks?.[lang]?.stages?.find(row=>row.nodeId===item.linkedStageNodeId);
    if(!realStage||realStage.level!==item.targetLevel||realStage.nodeId!==item.linkedStageNodeId)fail(id,'vínculo não existe no manifesto V12 ou tem nível incorreto');
    if(item.public!==false||item.audioProductionStatus!=='script_only_no_audio'||item.teacherReviewStatus!=='draft_requires_independent_review'||item.existingCatalogExercise!==false)fail(id,'gate editorial');
    if(!item.expectedTranscript?.trim()||!item.objectivePt?.trim()||!item.instructionPt?.trim()||!item.protectedElementsPt?.trim())fail(id,'campos textuais faltando');
    if(item.instructionPt?.includes(item.expectedTranscript))fail(id,'gabarito no enunciado');
    const segments=item.segmentCuesTeacherOnly||[];
    if(!segments.length||segments.some(x=>!x?.trim())||norm(segments.join(' '))!==norm(item.expectedTranscript))fail(id,'segmentos divergentes do texto canônico');
    const p=item.orthographicAlternativePolicy||{};
    if(p.acceptDigitWordEquivalence!=='explicit_full_transcript_variants_only')fail(id,'conversao numerica nao controlada');
    if(lang==='ru'&&p.acceptYoAsE!=='explicit_full_transcript_variants_only_otherwise_uncertain')fail(id,'ё precisa de regra contextual');
    if(!Array.isArray(p.acceptedFullTranscriptVariants))fail(id,'variantes nao sao array');
    const reviewedCount=reviewedVariantCounts[lang][String(index+1).padStart(2,'0')]||0;
    if(p.acceptedFullTranscriptVariants?.length!==reviewedCount)fail(id,'quantidade de variantes alterada sem nova revisão editorial');
    else {
      const all=[item.expectedTranscript,...p.acceptedFullTranscriptVariants];
      if(new Set(all.map(norm)).size!==all.length)fail(id,'variantes duplicadas');
      if(all.some(x=>!x.trim()))fail(id,'variante vazia');
    }
    if(item.assessmentPolicy!=='manual_review_or_uncertain_for_unrecognized_transcription')fail(id,'politica de avaliacao insegura');
    if(item.orthographicAlternativePolicy?.ignoreTerminalPunctuation!==true||item.orthographicAlternativePolicy?.ignoreCapitalization!==true||item.orthographicAlternativePolicy?.collapseWhitespace!==true)fail(id,'normalização declarada divergente do contrato');
    if(lang==='ru'&&!/[А-Яа-яЁё]/.test(item.expectedTranscript))fail(id,'sem cirilico');
  }
}
if(seen.size!==32||Object.values(matrix).some(x=>x.A2!==8||x.B1!==8))fail('inventario','esperados 32 itens, 8 A2 e 8 B1 por idioma');
if(process.argv.includes('--check-dist')){
  const dist=resolve(root,'dist');
  if(!existsSync(dist))fail('dist','build de produção ausente');
  else {
    const files=[];
    const walk=dir=>{for(const name of readdirSync(dir)){const file=resolve(dir,name);if(statSync(file).isDirectory())walk(file);else files.push(file)}};
    walk(dist);
    for(const file of files)if(/\.mp3$/i.test(file)||/learn-ditados-v14-(en|ru)\.json$/i.test(file))fail('bundle','áudio ou fonte editorial privada foi incluída no dist');
    const frontend=resolve(root,'frontend'),sourceFiles=[];
    const walkSource=dir=>{for(const name of readdirSync(dir)){const file=resolve(dir,name);if(statSync(file).isDirectory())walkSource(file);else sourceFiles.push(file)}};
    walkSource(frontend);
    if(sourceFiles.some(file=>/\.(?:ts|js|html|json)$/i.test(file)&&readFileSync(file,'utf8').includes('learn-ditados-v14-en.json'))||sourceFiles.some(file=>/\.(?:ts|js|html|json)$/i.test(file)&&readFileSync(file,'utf8').includes('learn-ditados-v14-ru.json')))fail('frontend','o bundle não pode importar os arquivos editoriais diretamente');
    const publicText=files.filter(file=>/\.(?:html|js|css|json|svg|webmanifest|txt)$/i.test(file)).map(file=>readFileSync(file,'utf8'));
    const joined=publicText.join('\n');
    for(const lang of ['en','ru']){
      const data=JSON.parse(readFileSync(resolve(root,'docs',`learn-ditados-v14-${lang}.json`),'utf8'));
      for(const item of data.units){
        if(joined.includes(item.expectedTranscript))fail(item.draftId,'transcrição canônica encontrada no bundle público');
        for(const variant of item.orthographicAlternativePolicy?.acceptedFullTranscriptVariants||[])if(joined.includes(variant))fail(item.draftId,'variante de gabarito encontrada no bundle público');
      }
    }
  }
}
if(errors.length){console.error(JSON.stringify({ok:false,errors},null,2));process.exitCode=1;}
else console.log(JSON.stringify({ok:true,items:seen.size,matrix,scope:'estrutura somente, sem revisao de audio ou proficiencia'},null,2));
