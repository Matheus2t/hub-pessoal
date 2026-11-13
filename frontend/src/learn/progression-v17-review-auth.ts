import {isLearnAssessmentV17PreviewEnabled} from './pilot-preview';

const KEY='2t-learn-v17-local-reviewers-v1';
const ITERATIONS=310_000;
const SESSION_MS=15*60_000;
interface StoredReviewer {id:string;name:string;normalizedName:string;salt:string;verifier:string;createdAt:number}
interface AuthRecord {schemaVersion:1;reviewers:StoredReviewer[]}
export interface V17Reviewer {id:string;name:string}
let session:{reviewer:V17Reviewer;expiresAt:number}|undefined;
let failedLogins=0;
let retryAfter=0;
let sessionTimer:ReturnType<typeof setTimeout>|undefined;
const bytesToHex=(bytes:Uint8Array)=>[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
const hexToBytes=(hex:string)=>new Uint8Array(hex.match(/.{2}/g)?.map(v=>parseInt(v,16))||[]);
function allowed(){return typeof window!=='undefined'&&isLearnAssessmentV17PreviewEnabled(window.location.hostname,window.location.search)}
function read():AuthRecord{
 try{const raw=localStorage.getItem(KEY);if(!raw)return {schemaVersion:1,reviewers:[]};const value=JSON.parse(raw) as AuthRecord;
  if(value.schemaVersion!==1||!Array.isArray(value.reviewers)||value.reviewers.length>20||value.reviewers.some(r=>typeof r.id!=='string'||typeof r.name!=='string'||typeof r.normalizedName!=='string'||typeof r.salt!=='string'||typeof r.verifier!=='string'||!Number.isFinite(r.createdAt)))throw Error('Credenciais locais inválidas.');return value;
 }catch(error){if(error instanceof Error&&error.message==='Credenciais locais inválidas.')throw error;throw Error('O armazenamento local de revisores está indisponível.')}
}
function write(record:AuthRecord){try{localStorage.setItem(KEY,JSON.stringify(record))}catch{throw Error('Não foi possível salvar os revisores neste navegador. Verifique o armazenamento local.')}}
async function derive(password:string,saltHex:string):Promise<string>{
 if(!globalThis.crypto?.subtle)throw Error('Web Crypto indisponível neste navegador. Use localhost com um navegador atualizado.');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:hexToBytes(saltHex),iterations:ITERATIONS,hash:'SHA-256'},material,256);
 return bytesToHex(new Uint8Array(bits));
}
function validateInput(name:string,password:string){
 const clean=name.trim();if(clean.length<2||clean.length>60)throw Error('Informe um nome de revisor entre 2 e 60 caracteres.');
 if(password.length<16||password.length>256)throw Error('Use uma senha local com pelo menos 16 caracteres.');
 return {name:clean,normalizedName:clean.normalize('NFKC').toLocaleLowerCase()};
}
function openSession(reviewer:V17Reviewer){
 if(sessionTimer)clearTimeout(sessionTimer);session={reviewer,expiresAt:Date.now()+SESSION_MS};
 sessionTimer=setTimeout(()=>{if(session&&Date.now()>=session.expiresAt){session=undefined;sessionTimer=undefined;if(typeof window!=='undefined')window.dispatchEvent(new Event('2t-learn-v17-reviewer-locked'));}},SESSION_MS+50);
 return reviewer;
}
export function localReviewerNames():string[]{return allowed()?read().reviewers.map(r=>r.name):[]}
export function hasLocalReviewer():boolean{return allowed()&&read().reviewers.length>0}
export function currentV17Reviewer():V17Reviewer|undefined{
 if(!allowed()){logoutV17Reviewer();return undefined}
 if(!session||Date.now()>session.expiresAt){logoutV17Reviewer();return undefined}
 return openSession(session.reviewer);
}
export async function createFirstV17Reviewer(name:string,password:string):Promise<V17Reviewer>{
 if(!allowed())throw Error('A revisão só pode ser ativada em localhost.');
 const record=read();if(record.reviewers.length)throw Error('A conta local já existe; entre com uma conta autorizada.');
 const values=validateInput(name,password),salt=bytesToHex(crypto.getRandomValues(new Uint8Array(16))),verifier=await derive(password,salt);
 const reviewer:StoredReviewer={id:crypto.randomUUID(),...values,salt,verifier,createdAt:Date.now()};write({schemaVersion:1,reviewers:[reviewer]});
 return openSession({id:reviewer.id,name:reviewer.name});
}
export async function addV17Reviewer(name:string,password:string):Promise<V17Reviewer>{
 const active=currentV17Reviewer();if(!active)throw Error('Entre novamente para cadastrar outro revisor.');
 const record=read(),values=validateInput(name,password);if(record.reviewers.length>=20)throw Error('Limite de contas locais atingido.');
 if(record.reviewers.some(r=>r.normalizedName===values.normalizedName))throw Error('Já existe um revisor com esse nome.');
 const salt=bytesToHex(crypto.getRandomValues(new Uint8Array(16))),verifier=await derive(password,salt),reviewer:StoredReviewer={id:crypto.randomUUID(),...values,salt,verifier,createdAt:Date.now()};
 write({...record,reviewers:[...record.reviewers,reviewer]});return {id:reviewer.id,name:reviewer.name};
}
function equalHex(a:string,b:string){const aa=hexToBytes(a),bb=hexToBytes(b);if(aa.length!==bb.length)return false;let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0}
export async function loginV17Reviewer(name:string,password:string):Promise<V17Reviewer>{
 if(!allowed())throw Error('A revisão só pode ser ativada em localhost.');if(Date.now()<retryAfter)throw Error('Muitas tentativas. Aguarde um minuto e tente novamente.');
 const normalized=name.trim().normalize('NFKC').toLocaleLowerCase(),record=read(),reviewer=record.reviewers.find(r=>r.normalizedName===normalized);
 const actual=await derive(password,reviewer?.salt||'00000000000000000000000000000000');
 if(!reviewer||!equalHex(actual,reviewer.verifier)){failedLogins++;if(failedLogins>=5){retryAfter=Date.now()+60_000;failedLogins=0}throw Error('Nome ou senha incorretos.');}
 failedLogins=0;const identity={id:reviewer.id,name:reviewer.name};return openSession(identity);
}
export function logoutV17Reviewer(){if(sessionTimer)clearTimeout(sessionTimer);sessionTimer=undefined;session=undefined}
export function isV17ReviewAuthenticated(){return !!currentV17Reviewer()}
