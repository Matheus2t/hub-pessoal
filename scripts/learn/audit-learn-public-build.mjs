#!/usr/bin/env node
/** Fail closed if localhost-only Learn editorial assets are copied into a public build. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,relative,join,sep} from 'node:path';

const ROOT=resolve('dist');
const root=resolve(ROOT,'learn');
const allowed=new Set(['en.json','ru.json','pedagogy-v1/audio-assets.json']);
const privatePatterns=[
 /(?:^|\/)en-(?:pilot|diagnostic|reading-guide)\.json$/i,
 /(?:^|\/)ru-(?:pilot|diagnostic|reading-guide)\.json$/i,
 /(?:^|\/)readiness-manifest\.json$/i,
 /(?:^|\/)progression-v12\.json$/i,
 /(?:^|\/)pilot-task-rubrics\.json$/i,
 /(?:^|\/)evaluation-policy\.json$/i,
 /(?:^|\/)evidence-contract\.json$/i,
 /(?:^|\/)feedback-casebook\.json$/i,
 /(?:^|\/)audio\/|(?:\.(?:mp3|wav|m4a|ogg|flac|webm)$)/i,
];
function paths(folder){
 if(!existsSync(folder))return [];
 return readdirSync(folder,{withFileTypes:true}).flatMap(item=>{
  const full=join(folder,item.name);
  if(item.isSymbolicLink())throw Error(`Link simbólico no Learn público: ${full}`);
  return item.isDirectory()?paths(full):[full];
 });
}
export function verifyLearnPublicAssets(rootFolder=ROOT){
 const learnDir=resolve(rootFolder,'learn');
 assert.ok(existsSync(learnDir),'dist/learn ausente');
 const names=paths(learnDir).map(p=>relative(learnDir,p).split(sep).join('/')).sort();
 const expected=[...allowed].sort();
 assert.deepEqual(names,expected,`Publicação indevida de arquivos Learn em dist/learn: ${names.join(', ')}`);
 for(const p of names)assert.ok(!privatePatterns.some(pattern=>pattern.test(p)),`Conteúdo privado em assets: ${p}`);
 const manifest=JSON.parse(readFileSync(resolve(learnDir,'pedagogy-v1/audio-assets.json'),'utf8'));
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.policy.audioAssessmentEnabled,false,'Avaliação auditiva deve estar desativada');
 assert.equal(manifest.policy.validatedRecordings,0);
 assert.ok(manifest.assets.length>0);
 for(const asset of manifest.assets){
  assert.equal(asset.assetUrl,null,`Gravação não autorizada em manifesto público: ${asset.id}`);
  assert.equal(asset.assessmentEnabled,false,`Avaliação auditiva habilitada: ${asset.id}`);
 }
 for(const [name,language] of [['en.json','en'],['ru.json','ru']]){
  const catalog=JSON.parse(readFileSync(resolve(learnDir,name),'utf8'));
  assert.equal(catalog.language,language);
  assert.equal(catalog.exercises.length,237,`Catálogo legado ${language} alterado`);
 }
 for(const forbidden of ['learn/v13/preview.json','learn/v19/preview.json','learn/audio','learn-listening-v13-en.json','learn-listening-v13-ru.json','private/learn-audio-v19']){
  assert.ok(!existsSync(resolve(rootFolder,forbidden)),`Arquivo privado incluído na distribuição: ${forbidden}`);
 }
 return {ok:true,files:names,catalogExercises:474,recordingsPublished:0};
}
if(process.argv[1]?.endsWith('/audit-learn-public-build.mjs')){
 try{console.log(JSON.stringify(verifyLearnPublicAssets(),null,2));}
 catch(error){console.error(error?.stack||error);process.exitCode=1;}
}
