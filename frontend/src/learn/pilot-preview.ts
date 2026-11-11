/** C1 is a local-only development prototype, not a remotely accessible preview.
 * Query parameters are never an authorization boundary. */
export function isLearnC1PreviewEnabled(host=globalThis.location?.hostname||'',search=globalThis.location?.search||''):boolean {
 const hostname=host.toLowerCase();
 const local=hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]'||hostname==='::1';
 return local&&new URLSearchParams(search).get('learn-preview')==='c1';
}
