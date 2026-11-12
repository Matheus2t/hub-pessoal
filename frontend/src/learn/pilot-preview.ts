export type PilotPreviewId='c1'|'c2';
export type DiagnosticPreviewLanguage='en'|'ru';

function isLoopback(host:string):boolean {
 const hostname=host.toLowerCase();
 return hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]'||hostname==='::1';
}
export function isLearnIntegrationPreviewEnabled(host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 return isLoopback(host)&&new URLSearchParams(search).get('learn-preview')==='c5-integration';
}
export function isLearnProgressionPreviewEnabled(host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 return isLoopback(host)&&new URLSearchParams(search).get('learn-preview')==='progression-v12';
}
export function isLearnAudioFixturePreviewEnabled(host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 return isLoopback(host)&&new URLSearchParams(search).get('learn-preview')==='audio-v15';
}
function previewFlagEnabled(flag:string,host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 return isLoopback(host)&&(new URLSearchParams(search).get('learn-preview')===flag||isLearnIntegrationPreviewEnabled(host,search));
}

/** Pilot routes are available only on loopback during local development.
 * Query parameters are an opt-in switch, never an authorization boundary. */
export function isLearnPilotPreviewEnabled(pilot:PilotPreviewId,host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 return previewFlagEnabled(pilot,host,search);
}

export const isLearnC1PreviewEnabled=(host?:string,search?:string)=>isLearnPilotPreviewEnabled('c1',host,search);
export const isLearnC2PreviewEnabled=(host?:string,search?:string)=>isLearnPilotPreviewEnabled('c2',host,search);
export function isLearnDiagnosticPreviewEnabled(language:DiagnosticPreviewLanguage,host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 return previewFlagEnabled(`diagnostic-${language}`,host,search);
}

export function isLearnDelayedReviewPreviewEnabled(host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 return previewFlagEnabled('c4-delayed',host,search);
}
