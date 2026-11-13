import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDictation,isValidDictationPlayback,makeV14PreviewCatalog,normalizeDictation,prepareV14Submission} from './dictation-v14-core.mjs';

test('only collapses whitespace, capitalization and terminal punctuation',()=>{
 assert.equal(normalizeDictation('  DO   you work on Sundays?!  '),'do you work on sundays');
 assert.notEqual(normalizeDictation('we are here'),normalizeDictation("we're here"));
 assert.notEqual(normalizeDictation('ё'),normalizeDictation('е'));
 assert.notEqual(normalizeDictation('three'),normalizeDictation('3'));
});
test('known canonical text can be supported only when assessment and audio are authorized',()=>{
 assert.deepEqual(evaluateDictation({response:'Hello!',expectedTranscript:'Hello.',assessmentEnabled:true}),{matchKind:'canonical',outcome:'supported_for_observed_task',reviewStatus:'not_required'});
 assert.deepEqual(evaluateDictation({response:'Hello!',expectedTranscript:'Hello.',assessmentEnabled:false}),{matchKind:'disabled',outcome:'uncertain',reviewStatus:'awaiting_review'});
});
test('only complete editorial variants are accepted; unknown text stays uncertain',()=>{
 const common={expectedTranscript:'I cancelled it.',acceptedFullTranscriptVariants:['I canceled it.'],assessmentEnabled:true};
 assert.equal(evaluateDictation({response:'I canceled it',...common}).matchKind,'authorized_variant');
 assert.deepEqual(evaluateDictation({response:'I cancel it.',...common}),{matchKind:'unrecognized',outcome:'uncertain',reviewStatus:'awaiting_review'});
});
test('Russian ё/е and word-form numbers are not generalized',()=>{
 assert.equal(evaluateDictation({response:'У нее экзамен.',expectedTranscript:'У неё экзамен.',assessmentEnabled:true}).outcome,'uncertain');
 assert.equal(evaluateDictation({response:'3 дня',expectedTranscript:'три дня',assessmentEnabled:true}).outcome,'uncertain');
 assert.equal(evaluateDictation({response:'У нее экзамен.',expectedTranscript:'У неё экзамен.',acceptedFullTranscriptVariants:['У нее экзамен.'],assessmentEnabled:true}).matchKind,'authorized_variant');
});
test('audio without effective audible playback cannot create an attempt',()=>{
 for(const playback of [{completed:false,audibleSeconds:2,coveragePercent:1,playCount:1,playbackRates:[1]},{completed:true,audibleSeconds:0,coveragePercent:1,playCount:1,playbackRates:[1]},{completed:true,audibleSeconds:8,coveragePercent:0.8,playCount:1,playbackRates:[1]},{completed:true,audibleSeconds:1,coveragePercent:1,playCount:1,playbackRates:[2]}])assert.equal(isValidDictationPlayback(playback,10),false);
 assert.equal(isValidDictationPlayback({completed:true,audibleSeconds:8.5,coveragePercent:0.85,playCount:2,playbackRates:[1,0.75]},10),true);
});
test('preview catalog is balanced, local-only, and strips answer/teacher fields',()=>{
 const records=[],sources={'dictation-en':{units:[]},'dictation-ru':{units:[]}};
 for(const language of ['en','ru'])for(let i=1;i<=16;i++){
  const id=`${language}-dict-v14-${String(i).padStart(2,'0')}`,source={draftId:id,language,targetLevel:i<=8?'A2':'B1',titlePt:'Item',objectivePt:'Objetivo',instructionPt:'Ouça e escreva.',linkedStageNodeId:`${language}-path-${String(i<=8?5:11).padStart(2,'0')}`,expectedTranscript:'gabarito secreto',segmentCuesTeacherOnly:['pista privada'],protectedElementsPt:'não expor',orthographicAlternativePolicy:{acceptedFullTranscriptVariants:[]}};
  sources[`dictation-${language}`].units.push(source);records.push({id,language,kind:'dictation',state:'awaiting_owner_review',technicalChecks:{status:'passed'},sourceProvenance:{blobSha:(language==='en'?'e':'f').repeat(40),path:`docs/learn-ditados-v14-${language}.json`,commit:'c'.repeat(40)},generation:{version:1,sha256:'a'.repeat(64),durationSeconds:2}});
 }
 for(let i=0;i<36;i++)records.push({id:`fixture-nondict-${i}`,language:i<18?'en':'ru',kind:'bridge'});
 const result=makeV14PreviewCatalog({manifest:{schemaVersion:1,publicRelease:false,assessmentEnabled:false},records,sources,sourceBlobShas:{en:'e'.repeat(40),ru:'f'.repeat(40)},verifiedAudio:new Set(records.map(r=>r.id))});
 assert.equal(result.items.length,32);assert.equal(result.items.filter(x=>x.language==='en').length,16);assert.equal(result.items[0].audioAvailable,true);assert.equal(result.assessmentEnabled,false);
 const serialized=JSON.stringify(result);for(const privateText of ['gabarito secreto','pista privada','não expor','expectedTranscript','segmentCuesTeacherOnly','protectedElementsPt'])assert.equal(serialized.includes(privateText),false);
});
test('attempt feedback reveals answer only after audio evidence and remains uncertain while audio approval is pending',()=>{
 const item={id:'en-dict-v14-01',language:'en',audioState:'awaiting_owner_review',audioAvailable:true,assessmentEnabled:false,durationSeconds:2};
 const source={draftId:item.id,language:'en',expectedTranscript:'Do you work?'};
 const playback={completed:true,audibleSeconds:1.7,coveragePercent:0.9,playCount:1,playbackRates:[1]};
 assert.throws(()=>prepareV14Submission({item,source,response:'Do you work?',playback:{...playback,completed:false}}));
 const submitted=prepareV14Submission({item,source,response:'Do you work?',playback,assessmentEnabled:false});
 assert.equal(submitted.result.outcome,'uncertain');assert.equal(submitted.result.reviewStatus,'awaiting_review');assert.equal(submitted.transcript,'Do you work?');
});
