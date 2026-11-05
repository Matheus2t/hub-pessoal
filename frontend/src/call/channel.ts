import {callEndpoint,wakeSignaler} from './endpoint';
import type {ChannelRequest,ChannelStatus,ServerMessage} from './protocol';
import {callErrors} from './signaling';

let deviceToken:string|undefined;
export function channelDevice(){
 if(deviceToken)return deviceToken;
 const key='2t-call-channel-device';
 try{
  const stored=localStorage.getItem(key);
  if(stored&&/^[A-Za-z0-9_-]{43}$/.test(stored))return deviceToken=stored;
 }catch{/* Restricted storage still allows joining for this page session. */}
 deviceToken=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 try{localStorage.setItem(key,deviceToken)}catch{/* The token stays only in memory. */}
 return deviceToken;
}

/** One request on the existing protected WSS route. Never keeps an idle socket. */
export async function requestChannel(message:ChannelRequest,signal:AbortSignal):Promise<ChannelStatus>{
 const endpoint=callEndpoint();
 signal.throwIfAborted();
 const wake=new AbortController(),abortWake=()=>wake.abort();
 signal.addEventListener('abort',abortWake,{once:true});
 const wakeTimer=window.setTimeout(abortWake,90000);
 try{await wakeSignaler(endpoint,wake.signal)}
 catch{throw new Error('Sinalizador indisponível. Aguarde e tente novamente.')}
 finally{clearTimeout(wakeTimer);signal.removeEventListener('abort',abortWake)}
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const socket=new WebSocket(endpoint);
  const finish=(result?:ChannelStatus,error?:string)=>{
   clearTimeout(timer);signal.removeEventListener('abort',abort);
   socket.onopen=socket.onmessage=socket.onclose=null;socket.close();
   if(result)resolve(result);else reject(new Error(error??'Não foi possível consultar a sala. Tente novamente.'));
  };
  const abort=()=>finish(undefined,'Consulta cancelada.');
  const timer=window.setTimeout(()=>finish(),16000);
  signal.addEventListener('abort',abort,{once:true});
  socket.onopen=()=>socket.send(JSON.stringify(message));
  socket.onclose=()=>finish();
  socket.onmessage=event=>{
   try{
    const reply=JSON.parse(event.data) as ServerMessage;
    if(reply.type==='channel')finish(reply);
    if(reply.type==='error'||reply.type==='closed'){
     const code=reply.type==='error'?reply.code:reply.reason;
     finish(undefined,code==='invalid_message'?callErrors.channel_unavailable:callErrors[code]);
    }
   }catch{finish()}
  };
 });
}
