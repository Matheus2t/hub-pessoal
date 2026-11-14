/** Public build configuration only. Invitations and credentials never select a server. */
export function callEndpoint():URL {
 const value=(globalThis as typeof globalThis & {__2T_CALL_SIGNAL_URL__?:string}).__2T_CALL_SIGNAL_URL__;
 const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 if(!value&&!local)throw new Error('O 2T Call ainda não tem um sinalizador configurado.');
 const url=value?new URL(value):new URL('/call/ws',location.href);
 if(!value)url.protocol=location.protocol==='https:'?'wss:':'ws:';
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/call/ws'||
  (url.protocol!=='wss:'&&!(local&&url.protocol==='ws:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))
  throw new Error('Configuração segura do sinalizador inválida.');
 return url;
}

// In-memory only: a successful public lobby check means the signaler was
// responsive very recently. Avoid another serial health request on entry.
let responsiveOrigin='',responsiveUntil=0;
export function markSignalerResponsive(endpoint:URL){
 responsiveOrigin=endpoint.origin;responsiveUntil=performance.now()+10000;
}

/** User-initiated cold-start wait; never an idle keep-alive or background ping. */
export async function wakeSignaler(endpoint:URL,signal:AbortSignal){
 signal.throwIfAborted();
 if(endpoint.origin===responsiveOrigin&&performance.now()<responsiveUntil)return;
 const health=new URL('/call/health',endpoint);health.protocol=endpoint.protocol==='wss:'?'https:':'http:';
 const deadline=performance.now()+90000;
 while(!signal.aborted){
  try{
   const response=await fetch(health,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
   if(response.ok){const body=await response.json();if(body.status==='ok'&&body.mode==='single-process'&&body.media===false){markSignalerResponsive(endpoint);return}}
  }catch{if(signal.aborted)throw new DOMException('Cancelled','AbortError')}
  if(performance.now()>=deadline)break;
  await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve()},timer=window.setTimeout(done,2000);signal.addEventListener('abort',done,{once:true})});
 }
 throw new Error('O sinalizador está indisponível. Aguarde e tente novamente.');
}
