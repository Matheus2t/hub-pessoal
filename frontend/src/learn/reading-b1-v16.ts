import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Language} from './model';
import {readingB1V16For,type ReadingQuestionV16,type ReadingUnitV16} from './reading-b1-v16-content';
import {isLearnReadingV16PreviewEnabled} from './pilot-preview';

const competency:Record<ReadingQuestionV16['competency'],string>={
 main_idea:'Ideia central',
 evidence_based_inference:'Inferência',
 constraint_or_detail:'Detalhe e ressalva',
 synthesis:'Síntese',
};

/** Editorial-only B1 reading practice; never writes scores, attempts or progress. */
@customElement('learn-reading-v16')
export class LearnReadingV16 extends LightElement {
 @property() language:Language='en';
 @state() private selectedId='';
 @state() private answers:Record<string,string>={};
 @state() private transferAnswer='';
 @state() private submitted=false;
 @state() private showCriteria=false;
 protected willUpdate(changes:PropertyValues<this>){
  if(changes.has('language')&&changes.get('language')!==undefined){
   this.selectedId='';this.answers={};this.transferAnswer='';this.submitted=false;this.showCriteria=false;
  }
 }
 private select(id:string){this.selectedId=id;this.answers={};this.transferAnswer='';this.submitted=false;this.showCriteria=false;}
 private next(units:readonly ReadingUnitV16[],index:number,step:number){
  const next=units[index+step];if(next)this.select(next.id);
 }
 private setAnswer(id:string,answer:string){
  this.answers={...this.answers,[id]:answer};this.submitted=false;
 }
 private complete(unit:ReadingUnitV16){
  if(unit.questions.every(q=>Boolean(this.answers[q.id]?.trim())))this.submitted=true;
 }
 render(){
  if(!isLearnReadingV16PreviewEnabled())return html`<p role="status">Esta prévia editorial não está disponível no site público.</p>`;
  const units=readingB1V16For(this.language);
  const active=units.find(x=>x.id===this.selectedId)||units[0];
  const index=units.indexOf(active);
  const completed=active.questions.filter(q=>Boolean(this.answers[q.id]?.trim())).length;
  return html`<section class="learn-reading-v16" aria-labelledby="reading-v16-title">
   <header class="learn-reading-v16__header">
    <div>
     <p class="learn-reading-v16__kicker">LEARN / B1 · PRÉVIA EDITORIAL</p>
     <h1 id="reading-v16-title">Leitura e interpretação B1</h1>
     <p>Textos em ${this.language==='en'?'Inglês':'Russo'}, questões de interpretação e produção escrita. Prévia formativa, sem notas e sem certificação de nível.</p>
    </div>
    <a class="button" href=${`#/learn/${this.language}`}>Voltar ao Learn</a>
   </header>
   <div class="learn-reading-v16__layout">
    <aside class="learn-reading-v16__index" aria-label="Escolher leitura">
     <label for="reading-v16-selector">Texto B1</label>
     <select id="reading-v16-selector" .value=${active.id}
      @change=${(e:Event)=>this.select((e.target as HTMLSelectElement).value)}>
      ${units.map((u,i)=>html`<option value=${u.id}>${i+1} · ${u.title}</option>`)}
     </select>
     <p><strong>${index+1} de ${units.length}</strong> textos de ${this.language==='en'?'Inglês':'Russo'} · B1</p>
     <p>As respostas ficam apenas nesta tela e não alteram notas, histórico ou progresso.</p>
     <nav class="learn-reading-v16__nav" aria-label="Navegar entre leituras">
      <button type="button" class="button" ?disabled=${index<=0} @click=${()=>this.next(units,index,-1)}>Anterior</button>
      <button type="button" class="button" ?disabled=${index>=units.length-1} @click=${()=>this.next(units,index,1)}>Próximo</button>
     </nav>
    </aside>
    <div class="learn-reading-v16__main">
     <article class="learn-reading-v16__passage" aria-labelledby="reading-v16-passage-title">
      <div class="learn-reading-v16__meta"><span>LEITURA ${String(index+1).padStart(2,'0')} / ${String(units.length).padStart(2,'0')}</span><span>${active.topic} · B1</span></div>
      <h2 id="reading-v16-passage-title" lang=${this.language}>${active.title}</h2>
      <div class="learn-reading-v16__text" lang=${this.language}>
       ${active.text.split(/\n\s*\n/).filter(Boolean).map(p=>html`<p>${p}</p>`)}
      </div>
     </article>
     <section class="learn-reading-v16__questions" aria-labelledby="reading-v16-questions-title">
      <div class="learn-reading-v16__section-heading"><h2 id="reading-v16-questions-title">Interpretação</h2><span>${completed} / ${active.questions.length} respondidas</span></div>
      ${active.questions.map((q,i)=>html`<fieldset class="learn-reading-v16__question">
       <legend><span>${String(i+1).padStart(2,'0')} · ${competency[q.competency]}</span> ${q.promptPt}</legend>
       ${q.kind==='single_choice'?html`<div class="learn-reading-v16__options">
        ${q.optionsPt.map(option=>html`<label>
         <input type="radio" name=${q.id} .checked=${this.answers[q.id]===option.id}
          @change=${()=>this.setAnswer(q.id,option.id)}>
         <span>${option.label}</span>
        </label>`)}
       </div>`:html`<label class="learn-reading-v16__open">Sua interpretação
        <textarea rows="3" maxlength="1800" autocomplete="off" .value=${this.answers[q.id]||''}
         @input=${(e:Event)=>this.setAnswer(q.id,(e.target as HTMLTextAreaElement).value)}
         placeholder="Responda com base nas informações do texto…"></textarea>
       </label>`}
       ${this.submitted?html`<div class="learn-reading-v16__reference">
        <strong>Referência editorial (não homologada)</strong>
        ${q.kind==='single_choice'
          ?html`<p>${q.optionsPt.find(option=>option.id===q.correctOptionId)?.label||'Sem chave editorial'}</p>`
          :html`<p>${q.illustrativeAnswerPt||'Resposta aberta sujeita a revisão'}</p>`}
        <p>${q.explanationPt}</p>
        <details><summary>Trechos do texto utilizados como evidência</summary>
         <ul>${q.evidenceSpans.map(span=>html`<li lang=${this.language}>${span}</li>`)}</ul>
        </details>
       </div>`:nothing}
      </fieldset>`)}
      <div class="learn-reading-v16__action">
       <p>As respostas não são classificadas como certas ou erradas. Concluir permite consultar referências editoriais e trechos de apoio.</p>
       <button type="button" class="button primary" ?disabled=${completed!==active.questions.length}
        @click=${()=>this.complete(active)}>${this.submitted?'Referências disponíveis':'Concluir interpretação'}</button>
      </div>
      ${this.submitted?html`<p class="learn-reading-v16__notice" role="status">Leitura concluída nesta aba. Nenhuma nota foi atribuída ou armazenada.</p>`:nothing}
     </section>
     <section class="learn-reading-v16__transfer" aria-labelledby="reading-v16-transfer-title">
      <div class="learn-reading-v16__section-heading"><h2 id="reading-v16-transfer-title">Escrita de transferência</h2><span>Atividade separada</span></div>
      <p lang=${this.language}>${active.transferTask.prompt}</p>
      <label>Seu texto em ${this.language==='en'?'Inglês':'Russo'}
       <textarea rows="5" maxlength="2500" autocomplete="off" .value=${this.transferAnswer}
        @input=${(e:Event)=>this.transferAnswer=(e.target as HTMLTextAreaElement).value}
        placeholder="Escreva sua mensagem…"></textarea>
      </label>
      <button type="button" class="button" aria-expanded=${this.showCriteria}
       @click=${()=>this.showCriteria=!this.showCriteria}>${this.showCriteria?'Ocultar critérios':'Consultar critérios de escrita'}</button>
      ${this.showCriteria?html`<ul>${active.transferTask.scoringCriteriaPt.map(c=>html`<li>${c}</li>`)}</ul>`:nothing}
      <p class="learn-reading-v16__notice">A escrita livre exige revisão humana e não comprova, isoladamente, domínio de leitura B1.</p>
     </section>
    </div>
   </div>
   <p class="learn-reading-v16__footnote">V16 — conteúdo ainda em revisão editorial. Esta prévia não registra avaliações, não substitui os exercícios legados nem altera os backups.</p>
  </section>`;
 }
}
