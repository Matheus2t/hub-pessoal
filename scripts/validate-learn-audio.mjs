import {readFileSync,writeFileSync} from 'node:fs';

const root='frontend/public/learn/pedagogy-v1/';
const languages=['en','ru'];
const assets=[];
const errors=[];
const read=path=>JSON.parse(readFileSync(path,'utf8'));

for(const language of languages){
  const catalog=read(`frontend/public/learn/${language}.json`);
  for(const exercise of catalog.exercises.filter(item=>['listening','dictation'].includes(item.skill))){
    assets.push({
      id:`catalog:${language}:${exercise.id}`,
      language,
      activityId:exercise.id,
      skill:exercise.skill,
      referenceText:exercise.audio,
      locale:language,
      accent:null,
      source:'Web Speech API; generated locally at playback using an installed browser/OS voice.',
      licenseStatus:'device-provider-terms-not-reviewed; no recording is stored or redistributed',
      contentVersion:1,
      validationStatus:'draft-unvalidated',
      assessmentEnabled:false,
      assetUrl:null
    });
  }
  const diagnostic=read(`${root}${language}-diagnostic.json`);
  for(const task of diagnostic.questions.filter(item=>item.type==='listening')){
    assets.push({
      id:`diagnostic:${language}:${task.id}`,
      language,
      activityId:task.id,
      skill:'listening',
      referenceText:task.audio?.spokenText??'',
      locale:language,
      accent:null,
      source:null,
      licenseStatus:'not-acquired; no recording available',
      contentVersion:diagnostic.schemaVersion,
      validationStatus:task.audio?.status==='missing-reviewed-recording'?'missing-reviewed-recording':'unverified',
      assessmentEnabled:false,
      assetUrl:null
    });
  }
}

assets.sort((a,b)=>a.language.localeCompare(b.language)||a.activityId.localeCompare(b.activityId));
const expected={schemaVersion:1,policy:{audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true},assets};
const path=`${root}audio-assets.json`;

if(process.argv.includes('--write')){
  writeFileSync(path,JSON.stringify(expected,null,2)+'\n');
  console.log(`Manifest generated: ${assets.length} assets; no validated recordings.`);
  process.exit(0);
}

let actual;
try{actual=read(path);}catch(error){errors.push(`manifest unavailable: ${String(error)}`);}
if(actual){
  if(actual.schemaVersion!==1)errors.push('unexpected manifest schemaVersion');
  if(actual.policy?.audioAssessmentEnabled!==false||actual.policy?.validatedRecordings!==0||actual.policy?.generatedAtPlaybackIsDraft!==true)errors.push('unsafe assessment policy');
  const map=new Map((Array.isArray(actual.assets)?actual.assets:[]).map(item=>[item.id,item]));
  if(map.size!==assets.length)errors.push(`asset count mismatch: expected ${assets.length}, found ${map.size}`);
  for(const source of assets){
    const item=map.get(source.id);
    if(!item){errors.push(`missing ${source.id}`);continue;}
    for(const key of ['language','activityId','skill','referenceText','locale','accent','source','licenseStatus','contentVersion','validationStatus','assessmentEnabled','assetUrl']){
      if(JSON.stringify(item[key])!==JSON.stringify(source[key]))errors.push(`${source.id}: ${key} differs from source content/policy`);
    }
  }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Audio manifest valid: ${assets.length} entries, 0 validated recordings, evidence disabled.`);
