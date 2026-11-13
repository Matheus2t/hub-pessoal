export const V14_LEVELS=Object.freeze(['A2','B1']);
export const SAFE_PLAYBACK_RATES=Object.freeze([0.5,0.75,0.9,1]);

export function normalizeDictation(value){
 if(typeof value!=='string')return '';
 return value.normalize('NFC').toLocaleLowerCase('und').replace(/\s+/gu,' ').trim().replace(/[.!?;:,…。！？]+$/u,'').trim();
}

export function evaluateDictation({response,expectedTranscript,acceptedFullTranscriptVariants=[],assessmentEnabled=false}){
 if(typeof response!=='string'||!response.trim())return {matchKind:'disabled',outcome:'not_assessed',reviewStatus:'not_assessed'};
 if(!assessmentEnabled)return {matchKind:'disabled',outcome:'uncertain',reviewStatus:'awaiting_review'};
 const candidate=normalizeDictation(response);
 const canonical=normalizeDictation(expectedTranscript);
 const variants=acceptedFullTranscriptVariants.map(normalizeDictation);
 if(candidate&&candidate===canonical)return {matchKind:'canonical',outcome:'supported_for_observed_task',reviewStatus:'not_required'};
 if(candidate&&variants.includes(candidate))return {matchKind:'authorized_variant',outcome:'supported_for_observed_task',reviewStatus:'not_required'};
 return {matchKind:'unrecognized',outcome:'uncertain',reviewStatus:'awaiting_review'};
}

export function isValidDictationPlayback(value,durationSeconds){
 return !!value&&value.completed===true&&Number.isFinite(value.audibleSeconds)&&value.audibleSeconds>=0.5&&value.audibleSeconds<=durationSeconds+1&&Number.isFinite(value.coveragePercent)&&value.coveragePercent>=0.85&&value.coveragePercent<=1&&Number.isInteger(value.playCount)&&value.playCount>=1&&value.playCount<=1000&&Array.isArray(value.playbackRates)&&value.playbackRates.length>0&&value.playbackRates.length<=1000&&value.playbackRates.every(rate=>SAFE_PLAYBACK_RATES.includes(rate));
}

export function makeV14PreviewCatalog({manifest,records,sources,sourceBlobShas,verifiedAudio}){
 if(manifest?.schemaVersion!==1||manifest.publicRelease!==false||manifest.assessmentEnabled!==false||!Array.isArray(records)||records.length!==68)throw Error('Manifesto V19 não pode liberar avaliações ou publicação.');
 const sourceById=new Map();
 for(const language of ['en','ru'])for(const item of sources[`dictation-${language}`]?.units||[])sourceById.set(item.draftId,item);
 const rows=records.filter(record=>record.kind==='dictation').map(record=>{
  const source=sourceById.get(record.id);
  if(!source||source.language!==record.language||source.draftId!==record.id||record.state!=='awaiting_owner_review'&&record.state!=='approved'||record.technicalChecks?.status!=='passed'||record.sourceProvenance?.blobSha!==sourceBlobShas[record.language]||record.sourceProvenance?.path!==`docs/learn-ditados-v14-${record.language}.json`||!record.generation?.sha256||!Number.isInteger(record.generation?.version))throw Error(`Proveniência V14 incompatível: ${record.id}`);
  return {
   id:record.id,language:record.language,level:source.targetLevel,title:source.titlePt,objective:source.objectivePt,instruction:source.instructionPt,
   linkedStageNodeId:source.linkedStageNodeId,durationSeconds:record.generation.durationSeconds,
   audioUrl:`/learn/audio/${record.id}.mp3`,audioState:record.state,technicalStatus:record.technicalChecks.status,
   contentVersion:1,sourceCommit:record.sourceProvenance.commit,sourceBlobSha:record.sourceProvenance.blobSha,
   audioVersion:record.generation.version,audioSha256:record.generation.sha256,audioAvailable:verifiedAudio.has(record.id),
   assessmentEnabled:false,
  };
 });
 if(rows.length!==32||rows.filter(row=>row.language==='en').length!==16||rows.filter(row=>row.language==='ru').length!==16)throw Error('Inventário V14 precisa conter 16 itens por idioma.');
 return {schemaVersion:1,preview:true,publicRelease:false,assessmentEnabled:false,items:rows};
}

export function prepareV14Submission({item,source,response,playback,assessmentEnabled=false}){
 if(!item||!source||source.draftId!==item.id||source.language!==item.language||!isValidDictationPlayback(playback,item.durationSeconds))throw Error('A tentativa exige a gravação correspondente reproduzida com áudio audível.');
 if(typeof response!=='string'||!response.trim()||response.length>2000)throw Error('A transcrição precisa conter entre 1 e 2.000 caracteres.');
 const result=evaluateDictation({response,expectedTranscript:source.expectedTranscript,acceptedFullTranscriptVariants:source.orthographicAlternativePolicy?.acceptedFullTranscriptVariants||[],assessmentEnabled:assessmentEnabled&&item.audioState==='approved'&&item.assessmentEnabled===true});
 return {result,transcript:source.expectedTranscript};
}
