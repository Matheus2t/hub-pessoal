export type PilotPreviewId='c1'|'c2';
export type DiagnosticPreviewLanguage='en'|'ru';

/** Pilot routes are available only on loopback during local development.
 * Query parameters are an opt-in switch, never an authorization boundary. */
export function isLearnPilotPreviewEnabled(pilot:PilotPreviewId,host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 const hostname=host.toLowerCase();
 const local=hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]'||hostname==='::1';
 return local&&new URLSearchParams(search).get('learn-preview')===pilot;
}

export const isLearnC1PreviewEnabled=(host?:string,search?:string)=>isLearnPilotPreviewEnabled('c1',host,search);
export const isLearnC2PreviewEnabled=(host?:string,search?:string)=>isLearnPilotPreviewEnabled('c2',host,search);
export function isLearnDiagnosticPreviewEnabled(language:DiagnosticPreviewLanguage,host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 const hostname=host.toLowerCase();
 const local=hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]'||hostname==='::1';
 return local&&new URLSearchParams(search).get('learn-preview')===`diagnostic-${language}`;
}

export function isLearnDelayedReviewPreviewEnabled(host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 const hostname=host.toLowerCase();
 const local=hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]'||hostname==='::1';
 return local&&new URLSearchParams(search).get('learn-preview')==='c4-delayed';
}
