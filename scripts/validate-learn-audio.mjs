import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root='frontend/public/learn/pedagogy-v1/';
const languages=['en','ru'];
const assets=[];
const errors=[];
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

for(const language of languages){
  const catalog=read(`frontend/public/learn/${language}.json`);
  for(const exercise of catalog.exercises.filter(item=>['listening','dictation'].includes(item.skill))){
    const publicListening=exercise.skill==='listening';
    const assetPath=`frontend/public/learn/audio/${language}/${exercise.id}.mp3`;
    const available=publicListening&&existsSync(assetPath);
    if(publicListening&&!available)errors.push(`${exercise.id}: licensed public audio file missing`);
    assets.push({
      id:`catalog:${language}:${exercise.id}`,
      language,
      activityId:exercise.id,
      skill:exercise.skill,
      referenceText:exercise.audio,
      locale:publicListening?(language==='en'?'en-US':'ru-RU'):language,
      accent:publicListening?(language==='en'?'General American':'Russian'):null,
      source:publicListening?'Piper TTS 1.8.0; OHF-Voice CC0 voice-model chain; generated locally from the 2T exercise text.': 'Web Speech API; generated locally at playback using an installed browser/OS voice.',
      licenseStatus:publicListening?'CC0 voice-model/data chain (official Piper commercial-use list); exercise text authored in 2T':'device-provider-terms-not-reviewed; no recording is stored or redistributed',
      contentVersion:1,
      validationStatus:publicListening&&available?'technical-passed-study-only':'draft-unvalidated',
      assessmentEnabled:false,
      assetUrl:available?`/learn/audio/${language}/${exercise.id}.mp3`:null,
      ...(available?{releaseType:'public-study-only',sha256:hash(assetPath)}:{})
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
  if(errors.length){console.error(errors.join('\n'));process.exit(1);}
  writeFileSync(path,JSON.stringify(expected,null,2)+'\n');
  console.log(`Manifest generated: ${assets.length} assets; ${assets.filter(asset=>asset.releaseType==='public-study-only').length} public study-only recordings; no assessed recordings.`);
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
    for(const key of ['releaseType','sha256'])if(JSON.stringify(item[key])!==JSON.stringify(source[key]))errors.push(`${source.id}: ${key} differs from source/provenance`);
  }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Audio manifest valid: ${assets.length} entries, ${assets.filter(asset=>asset.releaseType==='public-study-only').length} public study-only recordings, 0 assessed recordings.`);
