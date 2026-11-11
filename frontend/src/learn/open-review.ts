import {html} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {LessonEvidenceEvent} from './model';
import type {OpenResponseReviewPacket} from './open-review-contract';
import {makeOpenResponseReviewPacket} from './open-review-contract';

export {makeOpenResponseReviewPacket} from './open-review-contract';
export type {OpenResponseReviewPacket} from './open-review-contract';

const assistanceName:Record<string,string>={wordGloss:'Glossário',translation:'Tradução',sentenceStarter:'Frase inicial',modelAnswer:'Exemplo de resposta',phoneticKeyboard:'Teclado fonético', 'lexical-cue':'Pista de vocabulário',writtenStimulus:'Contexto escrito'};

@customElement('learn-open-response-review')
export class LearnOpenResponseReview extends LightElement {
 @property({attribute:false}) packet!:OpenResponseReviewPacket;
 @state() private error='';
 private download(){
  if(!this.packet)return;
  try{
   const blob=new Blob([JSON.stringify(this.packet,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
   anchor.href=url;anchor.download=`2t-learn-review-${this.packet.language}-${this.packet.eventId.replace(/[^a-zA-Z0-9_-]/g,'-')}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),0);this.error='';
  }catch{this.error='Não foi possível preparar a ficha neste navegador.';}
 }
 render(){
  const packet=this.packet;if(!packet)return html``;
  const before=packet.assistance.filter(item=>item.shownBeforeAttempt),after=packet.assistance.filter(item=>!item.shownBeforeAttempt);
  return html`<section class="learn-open-review" aria-labelledby="open-review-title">
   <div class="learn-open-review__status" role="status"><strong id="open-review-title">Revisão contextual pendente</strong><span>A resposta segue incerta; não recebeu nota nem foi marcada como certa ou errada.</span></div>
   <dl class="learn-open-review__record"><div><dt>Enunciado</dt><dd>${packet.prompt}</dd></div>${packet.context?html`<div><dt>Contexto</dt><dd>${packet.context}</dd></div>`:''}<div><dt>Resposta registrada</dt><dd lang=${packet.language}>${packet.response}</dd></div></dl>
   ${packet.reviewCriteria.length?html`<div class="learn-open-review__criteria"><h4>Pontos para uma revisão humana</h4><ul>${packet.reviewCriteria.map(item=>html`<li>${item}</li>`)}</ul></div>`:''}
   <div class="learn-open-review__assistance"><h4>Apoio registrado</h4>${before.length?html`<p>Antes da resposta</p><ul>${before.map(item=>html`<li><strong>${assistanceName[item.kind]||item.kind}:</strong> ${item.value}</li>`)}</ul>`:html`<p>Nenhuma ajuda prévia foi registrada nesta tentativa.</p>`}${after.length?html`<p>Depois da resposta</p><ul>${after.map(item=>html`<li><strong>${assistanceName[item.kind]||item.kind}:</strong> ${item.value}</li>`)}</ul>`:''}</div>
   <p class="learn-open-review__limit">Não há avaliador confiável disponível. Ainda não há revisor semântico confiável autenticado. Os exemplos não são gabaritos; compartilhar a ficha é uma ação manual.</p>
   <button class="button" type="button" @click=${()=>this.download()}>Baixar ficha para revisão</button>${this.error?html`<p role="alert">${this.error}</p>`:''}
  </section>`;
 }
}

export function renderOpenResponseReview(event:LessonEvidenceEvent,args:{prompt:string;context?:string;reviewCriteria?:string[]}){
 return html`<learn-open-response-review .packet=${makeOpenResponseReviewPacket(event,args)}></learn-open-response-review>`;
}
