/** v1 mirrors backend/app/call_protocol.py; no media is sent over this protocol. */
export interface Participant {id:string;name:string;host:boolean;connected:boolean}
export interface AdmissionRequest {id:string;name:string}
export interface Session {
 type:'session';room:string;participant:string;credential:string|null;host:boolean;approved:boolean;
 invite:string|null;expires:number;inviteExpires:number;
}
export type Signal = {type:'offer'|'answer';target:string;sdp:string}|{type:'ice';target:string;candidate:RTCIceCandidateInit|null};
export type ClientMessage =
 |{type:'create';name:string;admin:string}|{type:'join';name:string;room:string;invite:string}
 |{type:'resume';room:string;participant:string;credential:string}
 |{type:'ping'|'leave'|'close'}|{type:'admit'|'reject';target:string}|Signal;
export type ServerMessage = Session
 |{type:'presence';participants:Participant[];reason:string}|{type:'requests';participants:AdmissionRequest[]}
 |{type:'approved'|'pong'}|{type:'closed';reason:string}|{type:'error';code:string}
 |{type:'offer'|'answer';from:string;sdp:string}|{type:'ice';from:string;candidate:RTCIceCandidateInit|null};

export function parseInvite(value:string):{room:string;invite:string}|null {
 try {
  const url=new URL(value,location.href);
  if(url.origin!==location.origin)return null;
  const match=/^#\/call\/([a-f0-9]{32})\?invite=([\w-]{43})$/.exec(url.hash);
  return match?{room:match[1],invite:match[2]}:null;
 }catch{return null}
}
