import type {Language,Skill} from './model';
import {isLearnAudioFixturePreviewEnabled,isLearnListeningV13PreviewEnabled,isLearnV19AudioPreviewEnabled} from './pilot-preview';

export type AudioSkill=Extract<Skill,'listening'|'dictation'>;
export interface LearnAudioAsset {
  id:string;language:Language;activityId:string;skill:AudioSkill;referenceText:string;
  locale:string;accent:string|null;source:string|null;licenseStatus:string;
  contentVersion:number;validationStatus:string;assessmentEnabled:boolean;assetUrl:string|null;
}
export interface LearnAudioPolicy {
  audioAssessmentEnabled:boolean;validatedRecordings:number;generatedAtPlaybackIsDraft:boolean;publicRelease?:boolean;
}
export interface LearnAudioManifest {schemaVersion:1;policy:LearnAudioPolicy;assets:LearnAudioAsset[]}

const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=500):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const language=(v:unknown):v is Language=>v==='en'||v==='ru';
const audioSkill=(v:unknown):v is AudioSkill=>v==='listening'||v==='dictation';

/** Recordings are same-origin, versioned static assets. Never accept arbitrary remote URLs. */
export function safeLearnAudioUrl(value:string,origin='https://learn.invalid'):string|undefined {
  if(!value.startsWith('/learn/audio/')||value.includes('\\'))return undefined;
  try{
    const url=new URL(value,origin);
    if(url.origin!==new URL(origin).origin||url.search||url.hash||url.username||url.password||!/^\/learn\/audio\/[a-z0-9/_-]+\.(?:mp3|wav|ogg|m4a|webm)$/i.test(url.pathname))return undefined;
    return url.href;
  }catch{return undefined;}
}

export function parseLearnAudioManifest(value:unknown):LearnAudioManifest {
  if(!isObject(value)||value.schemaVersion!==1||!isObject(value.policy)||!Array.isArray(value.assets)||value.assets.length>2000)throw Error('Manifesto de áudio inválido.');
  const policy=value.policy;
  if(typeof policy.audioAssessmentEnabled!=='boolean'||!Number.isInteger(policy.validatedRecordings)||Number(policy.validatedRecordings)<0||typeof policy.generatedAtPlaybackIsDraft!=='boolean'||(policy.publicRelease!==undefined&&typeof policy.publicRelease!=='boolean'))throw Error('Política de áudio inválida.');
  const ids=new Set<string>();
  const assets=value.assets.map((raw):LearnAudioAsset=>{
    if(!isObject(raw)||!text(raw.id,160)||ids.has(raw.id)||!language(raw.language)||!text(raw.activityId,160)||!audioSkill(raw.skill)||typeof raw.referenceText!=='string'||raw.referenceText.length>6000||!text(raw.locale,40)||(raw.accent!==null&&!text(raw.accent,100))||(raw.source!==null&&!text(raw.source,1000))||!text(raw.licenseStatus,300)||!Number.isInteger(raw.contentVersion)||Number(raw.contentVersion)<1||!text(raw.validationStatus,100)||typeof raw.assessmentEnabled!=='boolean'||(raw.assetUrl!==null&&(!text(raw.assetUrl,600)||!safeLearnAudioUrl(raw.assetUrl))))throw Error('Registro de áudio inválido.');
    ids.add(raw.id);
    return raw as unknown as LearnAudioAsset;
  });
  if(policy.audioAssessmentEnabled&&Number(policy.validatedRecordings)<1)throw Error('Política habilita avaliação sem gravações validadas.');
  if(assets.some(asset=>asset.assessmentEnabled&&(!policy.audioAssessmentEnabled||asset.validationStatus!=='approved'||asset.licenseStatus!=='approved'||!asset.assetUrl)))throw Error('Atividade auditiva habilitada sem arquivo e aprovações.');
  return {schemaVersion:1,policy:{audioAssessmentEnabled:policy.audioAssessmentEnabled,validatedRecordings:Number(policy.validatedRecordings),generatedAtPlaybackIsDraft:policy.generatedAtPlaybackIsDraft,...(policy.publicRelease===undefined?{}:{publicRelease:policy.publicRelease})},assets};
}

let manifestPromise:Promise<LearnAudioManifest>|undefined;
export function loadLearnAudioManifest(fetcher:typeof fetch=fetch):Promise<LearnAudioManifest>{
  if(!manifestPromise){manifestPromise=fetcher('/learn/pedagogy-v1/audio-assets.json').then(async response=>{
    if(!response.ok)throw Error('Manifesto de áudio indisponível.');
    return parseLearnAudioManifest(await response.json());
  }).catch(error=>{manifestPromise=undefined;throw error;});}
  return manifestPromise;
}
export function clearLearnAudioManifestCache():void{manifestPromise=undefined;}

export function findLearnAudioAsset(manifest:LearnAudioManifest,language:Language,skill:AudioSkill,activityId:string):LearnAudioAsset|undefined {
  return manifest.assets.find(asset=>asset.language===language&&asset.skill===skill&&asset.activityId===activityId);
}

export function canPlayLearnAudio(asset:LearnAudioAsset|undefined,policy:LearnAudioPolicy,hostname=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
  if(!asset?.assetUrl||!safeLearnAudioUrl(asset.assetUrl))return false;
  const localPreview=isLearnAudioFixturePreviewEnabled(hostname,search);
  if(asset.source==='test-fixture'&&asset.validationStatus==='fixture-unvalidated'&&asset.licenseStatus==='fixture-only')return localPreview;
  // Technical-only recordings may play in the authenticated loopback V19 workspace.
  // Listening completion never confers an approved recording or a graded attempt.
  if(asset.source==='local-v19-technical'&&asset.validationStatus==='technical-passed'&&
     asset.licenseStatus==='review-pending'&&asset.assessmentEnabled===false&&
     !policy.audioAssessmentEnabled&&policy.publicRelease!==true){
    return isLearnV19AudioPreviewEnabled(hostname,search)||isLearnListeningV13PreviewEnabled(hostname,search);
  }
  if(asset.validationStatus!=='approved'||asset.licenseStatus!=='approved')return false;
  return policy.publicRelease===true||localPreview;
}

export function canAssessLearnAudio(asset:LearnAudioAsset|undefined,policy:LearnAudioPolicy,hostname=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
  const localPreview=isLearnAudioFixturePreviewEnabled(hostname,search);
  return canPlayLearnAudio(asset,policy,hostname,search)&&asset?.source!=='test-fixture'&&asset?.validationStatus==='approved'&&asset.licenseStatus==='approved'&&asset.assessmentEnabled&&policy.audioAssessmentEnabled&&policy.validatedRecordings>0&&(policy.publicRelease===true||localPreview);
}

export function audioAvailabilityFor(manifest:LearnAudioManifest|undefined,language:Language,hostname=globalThis.location?.hostname||'',search=globalThis.location?.search||''):{listening:boolean;dictation:boolean} {
  const ready=(skill:AudioSkill)=>!!manifest?.assets.some(asset=>asset.language===language&&asset.skill===skill&&canPlayLearnAudio(asset,manifest.policy,hostname,search));
  return {listening:ready('listening'),dictation:ready('dictation')};
}
