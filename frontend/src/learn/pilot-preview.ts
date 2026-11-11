const productionHosts=new Set(['matheus2t.com.br','www.matheus2t.com.br','matheus2t.vercel.app']);

/** Preview flag is opt-in on localhost or a Vercel deployment and always off on production hosts. */
export function isLearnC1PreviewEnabled(host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 const hostname=host.toLowerCase();
 const previewHost=hostname==='localhost'||hostname==='127.0.0.1'||hostname.endsWith('.vercel.app');
 return previewHost&&!productionHosts.has(hostname)&&new URLSearchParams(search).get('learn-preview')==='c1';
}
