/** Mirrors backend/app/call_protocol.py; media itself never travels over WebSocket. */
export interface Participant {id:string;name:string;host:boolean;connected:boolean;voice:boolean;microphone:boolean;voiceEpoch:number}
export interface AdmissionRequest {id:string;name:string}
export interface Session {
 type:'session';room:string;participant:string;credential:string|null;host:boolean;approved:boolean;
 invite:string|null;expires:number;inviteExpires:number;
}
export interface RtcConfig {type:'rtc_config';iceServers:RTCIceServer[];turnExpires:number|null;relayAvailable:boolean}
export type Signal = ({type:'offer'|'answer';target:string;sdp:string}|{type:'ice';target:string;candidate:RTCIceCandidateInit|null}) & {epoch:number;targetEpoch:number};
export type RemoteSignal = ({type:'offer'|'answer';from:string;sdp:string}|{type:'ice';from:string;candidate:RTCIceCandidateInit|null}) & {epoch:number;targetEpoch:number};
export type ClientMessage =
 |{type:'create';name:string;admin:string}|{type:'join';name:string;room:string;invite:string}
 |{type:'resume';room:string;participant:string;credential:string}
 |{type:'ping'|'leave'|'close'|'rtc_config'}|{type:'media';active:boolean;microphone:boolean}|{type:'admit'|'reject';target:string}|Signal;
export type ServerMessage = Session
 |{type:'presence';participants:Participant[];reason:string}|{type:'requests';participants:AdmissionRequest[]}
 |{type:'approved'|'pong'}|{type:'closed';reason:string}|{type:'error';code:string}|RtcConfig|RemoteSignal;

export function parseInvite(value:string):{room:string;invite:string}|null {
 try {
  const url=new URL(value,location.href);
  if(url.origin!==location.origin)return null;
  const match=/^#\/call\/([a-f0-9]{32})\?invite=([\w-]{43})$/.exec(url.hash);
  return match?{room:match[1],invite:match[2]}:null;
 }catch{return null}
}
