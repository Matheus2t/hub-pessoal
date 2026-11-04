import type {AdmissionRequest,ClientMessage,Participant,ServerMessage,Session,Signal,RtcConfig,RoomScreen,ScreenControl,ScreenEvent} from './protocol';
import {callEndpoint,wakeSignaler} from './endpoint';

export const callErrors:Record<string,string>={
 unauthorized:'Credencial inválida.',invalid_invite:'Convite inválido ou expirado.',room_full:'A sala já tem cinco vagas ocupadas ou reservadas.',
 capacity:'Limite de salas ou conexões atingido.',rate_limited:'Muitas tentativas. Aguarde um minuto.',invalid_message:'Mensagem inválida.',
 invalid_target:'Participante indisponível nesta sala.',forbidden:'Apenas o anfitrião pode realizar esta ação.',awaiting_approval:'Aguarde a aprovação do anfitrião.',
 session_expired:'A sala não está mais disponível. Crie outra sala ou peça um novo convite.',expired:'A sala expirou.',host_left:'O anfitrião saiu. Sala encerrada.',
 host_closed:'O anfitrião encerrou a sala.',rejected:'O anfitrião recusou a entrada.',approval_expired:'O prazo para aprovação terminou.',
 replaced:'Esta sessão foi reconectada em outra conexão.',timeout:'A conexão expirou.',slow_client:'A conexão não acompanhou as atualizações.',
 message_too_large:'Mensagem muito grande.',server_stopped:'O sinalizador reiniciou. Crie outra sala ou peça um novo convite.',stale_voice:'A conexão de voz mudou. Tente reconectar o áudio.',turn_unavailable:'O serviço de relay está indisponível. Algumas redes podem impedir a conexão.'
};
export type ConnectionState='idle'|'connecting'|'waiting'|'connected'|'reconnecting'|'closed';

/** One transport per mounted page. Session secrets stay in RAM and never enter URLs/storage. */
export class CallSignaling {
 state:ConnectionState='idle';error='';notice='';session?:Session;people:Participant[]=[];requests:AdmissionRequest[]=[];
 rtc?:RtcConfig;
 screen:RoomScreen|null=null;
 private socket?:WebSocket;private heartbeat?:number;private retry?:number;private watchdog?:number;private attempts=0;
 private stopped=false;private credential='';private generation=0;
 private endpoint?:URL;private waking?:AbortController;private wakeTimeout?:number;
 constructor(private changed:()=>void,private signal:(message:Extract<ServerMessage,{from:string}>)=>void=()=>{},private screenEvent:(message:ScreenEvent)=>void=()=>{}){}
 start(message:Extract<ClientMessage,{type:'create'|'join'}>){
  this.dispose();this.stopped=false;this.error='';this.session=undefined;this.people=[];this.requests=[];this.credential='';this.attempts=0;
  try{this.endpoint=callEndpoint()}catch(error){this.fail(error instanceof Error?error.message:'Sinalizador não configurado.');return}
  const http=new URL(this.endpoint);http.protocol=http.protocol==='wss:'?'https:':'http:';
  if(http.origin===location.origin){this.connect(message);return}
  const generation=this.generation,controller=this.waking=new AbortController();
  this.state='connecting';this.notice='Preparando o sinalizador. A primeira conexão pode levar até 90 segundos.';this.changed();
  this.wakeTimeout=window.setTimeout(()=>controller.abort(),90000);
  void wakeSignaler(this.endpoint,controller.signal).then(()=>{if(!this.stopped&&generation===this.generation){this.notice='';this.connect(message)}})
   .catch(()=>{if(!this.stopped&&generation===this.generation)this.fail('Sinalizador indisponível. Aguarde e tente novamente.')})
   .finally(()=>{if(this.waking===controller){window.clearTimeout(this.wakeTimeout);this.waking=undefined}});
 }
 private connect(first:ClientMessage){
  const generation=++this.generation;
  this.state=this.session?'reconnecting':'connecting';this.changed();
  const url=this.endpoint!;
  let socket:WebSocket;
  try{socket=new WebSocket(url)}catch{this.fail('Não foi possível conectar ao sinalizador configurado.');return}
  this.socket=socket;
  let finished=false,lastResponse=performance.now();
  let initial:ClientMessage|undefined=first;
  socket.onopen=()=>{if(finished||generation!==this.generation)return;socket.send(JSON.stringify(initial));initial=undefined;
   this.heartbeat=window.setInterval(()=>{if(performance.now()-lastResponse>20000){disconnected();return}if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'ping'}))},8000)};
  socket.onmessage=event=>{
   if(finished||generation!==this.generation||this.stopped)return;
   let message:ServerMessage;try{message=JSON.parse(event.data)}catch{this.fail('Resposta inválida do sinalizador.');return}
   lastResponse=performance.now();
   if(message.type==='session'){
    window.clearTimeout(this.watchdog);
    this.credential=message.credential??this.credential;
    this.session={...message,credential:null,invite:message.invite??this.session?.invite??null};
    this.state=message.approved?'connected':'waiting';this.attempts=0;this.error='';
    // Clear the invitation from the address bar once accepted into a session.
    if(location.hash!=='#/call')history.replaceState(null,'','#/call');
   }else if(message.type==='rtc_config'){this.rtc=message;if(message.relayAvailable&&this.error===callErrors.turn_unavailable)this.error=''}
   else if(message.type==='presence'){this.people=message.participants;this.screen=message.screen}
   else if(message.type==='screen_granted'||message.type==='screen_denied')this.screenEvent(message);
   else if(message.type==='requests')this.requests=message.participants;
   else if(message.type==='approved'){this.state='connected';if(this.session)this.session.approved=true}
   else if(message.type==='error')this.error=callErrors[message.code]??'Ação recusada pelo servidor.';
   else if(message.type==='closed'){this.fail(message.reason==='left'?'':callErrors[message.reason]??'Sala encerrada.');return}
   else if('from' in message)this.signal(message);
   this.changed();
  };
  const disconnected=()=>{
   if(finished||generation!==this.generation||this.stopped)return;
   finished=true;window.clearInterval(this.heartbeat);window.clearTimeout(this.watchdog);
   socket.onopen=socket.onmessage=socket.onclose=null;socket.close();
   if(this.session&&this.credential&&this.attempts<5){
    this.state='reconnecting';this.screen=null;this.changed();
    this.retry=window.setTimeout(()=>this.connect({type:'resume',room:this.session!.room,participant:this.session!.participant,credential:this.credential}),Math.min(500*2**this.attempts++,4000));
   }else this.fail(this.error||'Sinalizador indisponível. Confira a conexão e tente novamente.');
  };
  socket.onclose=disconnected;
  this.watchdog=window.setTimeout(disconnected,10000);
  socket.onerror=()=>{}; // close supplies the visible failure/retry state without logging secrets.
 }
 send(message:{type:'close'|'rtc_config'}|Extract<ClientMessage,{type:'admit'|'reject'|'media'}>|Signal|ScreenControl){
  if(this.state!=='connected'||this.socket?.readyState!==WebSocket.OPEN)return false;
  this.socket.send(JSON.stringify(message));return true;
 }
 private fail(error:string){this.dispose();this.state='closed';this.error=error;this.people=[];this.requests=[];this.session=undefined;this.changed()}
 leave(){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type:'leave'}));this.dispose();this.session=undefined;this.people=[];this.requests=[];this.error='';this.state='idle';this.changed()}
 dispose(){this.stopped=true;this.generation++;this.waking?.abort();this.waking=undefined;window.clearTimeout(this.wakeTimeout);this.notice='';window.clearInterval(this.heartbeat);window.clearTimeout(this.retry);window.clearTimeout(this.watchdog);this.socket?.close();this.socket=undefined;this.credential='';this.rtc=undefined;this.screen=null}
}
