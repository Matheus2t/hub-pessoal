import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Language} from './model';
import {bridgeDraftsForLanguage,type BridgeTaskV11} from './bridge-v11-content';
import {isLearnBridgeV11PreviewEnabled} from './pilot-preview';

type Transition=BridgeTaskV11['transition'];
const transitions:readonly Transition[]=['A1_to_A2','A2_to_B1'];
const transitionLabel=(step:Transition)=>step==='A1_to_A2'?'A1 → A2':'A2 → B1';
const skillLabel:Record<BridgeTaskV11['skill'],string>={
 grammar_bridge:'Gramática',guided_writing:'Escrita guiada',
 reading_inference:'Leitura e inferência',listening_script:'Roteiro de Listening',
 integrated_writing:'Produção escrita',
};

/**
 * V11 is a local editorial study preview, NOT public curricular content.
 * Responses remain in component memory; no grade or learning evidence is generated.
 */
@customElement('learn-bridge-v11')
export class LearnBridgeV11 extends LightElement {
 @property() language:Language='en';
 @state() private transition:Transition='A1_to_A2';
 @state() private selectedId='';
 @state() private answer='';
 @state() private revealModel=false;
 @state() private revealAudioScript=false;

 protected willUpdate(changes:PropertyValues<this>){
  if(changes.has('language')&&changes.get('language')!==undefined){
   this.transition='A1_to_A2';this.selectedId='';this.answer='';
   this.revealModel=false;this.revealAudioScript=false;
  }
 }
 private resetTask(id=''){
  this.selectedId=id;this.answer='';this.revealModel=false;this.revealAudioScript=false;
 }
 private setTransition(value:Transition){
  if(this.transition===value)return;
  this.transition=value;this.resetTask();
 }
 private advance(visible:readonly BridgeTaskV11[],index:number,delta:number){
  const next=visible[index+delta];
  if(next)this.resetTask(next.draftId);
 }
 render(){
  if(!isLearnBridgeV11PreviewEnabled())return html`<p role="status">Esta prévia editorial ainda não está disponível no site público.</p>`;
  const tasks=bridgeDraftsForLanguage(this.language);
  const visible=tasks.filter(task=>task.transition===this.transition);
  const active=visible.find(task=>task.draftId===this.selectedId)||visible[0];
  const index=active?visible.indexOf(active):0;
  const listening=active?.skill==='listening_script';
  return html`<section class="learn-bridge" aria-labelledby="learn-bridge-title">
    <header class="learn-bridge__head">
      <div>
        <p class="learn-bridge__kicker">V11 · PRÉVIA EDITORIAL LOCAL</p>
        <h1 id="learn-bridge-title">Atividades-ponte</h1>
        <p>Prepare a passagem entre A1, A2 e B1 com tarefas de gramática, leitura e escrita. Esta versão é experimental, sem correção automática ou certificado.</p>
      </div>
      <a class="button" href=${`#/learn/${this.language}`}>Voltar ao Learn</a>
    </header>
    <nav class="learn-bridge__steps" aria-label="Transição de nível">
      ${transitions.map(step=>html`<button type="button" class="button"
        aria-pressed=${this.transition===step}
        @click=${()=>this.setTransition(step)}>${transitionLabel(step)}
        <span>${tasks.filter(t=>t.transition===step).length} tarefas</span>
      </button>`)}
    </nav>
    <div class="learn-bridge__layout">
      <aside class="learn-bridge__index" aria-label="Escolher atividade-ponte">
        <label for="bridge-task-selector">Atividade</label>
        <select id="bridge-task-selector" .value=${active?.draftId||''}
          @change=${(e:Event)=>this.resetTask((e.target as HTMLSelectElement).value)}>
          ${visible.map((t,i)=>html`<option value=${t.draftId} ?selected=${t.draftId===active?.draftId}>
            ${String(i+1).padStart(2,'0')} · ${t.objective}
          </option>`)}
        </select>
        <p><strong>${visible.length}</strong> tarefas de ${transitionLabel(this.transition)} · ${this.language==='ru'?'Russo':'Inglês'}</p>
        <p>O conteúdo permanece em revisão editorial independente. Suas respostas não são guardadas nem contam no histórico.</p>
      </aside>
      ${active?html`<article class="learn-bridge__task" aria-labelledby="bridge-task-title">
        <div class="learn-bridge__meta">
          <span>${String(index+1).padStart(2,'0')} / ${String(visible.length).padStart(2,'0')} · ${transitionLabel(this.transition)}</span>
          <span>${skillLabel[active.skill]}</span>
        </div>
        <h2 id="bridge-task-title">${active.objective}</h2>
        <p class="learn-bridge__instruction">${active.taskInstruction}</p>
        ${listening?html`<div class="learn-bridge__audio-warning" role="status">
          <strong>Áudio ainda indisponível.</strong>
          Este roteiro ainda não possui gravação aprovada. Não é uma avaliação de Listening.
        </div>
        <button type="button" class="button" aria-expanded=${this.revealAudioScript}
          @click=${()=>this.revealAudioScript=!this.revealAudioScript}>
          ${this.revealAudioScript?'Ocultar roteiro':'Consultar roteiro editorial'}
        </button>
        ${this.revealAudioScript?html`<div class="learn-bridge__source" lang=${this.language}>${active.stimulusText}</div>`:nothing}
        `:html`
        <div class="learn-bridge__source" lang=${this.language}>${active.stimulusText}</div>
        <label class="learn-bridge__answer">Sua resposta (rascunho nesta aba)
          <textarea rows="4" autocomplete="off" spellcheck="true" maxlength="2000"
            .value=${this.answer}
            @input=${(e:Event)=>this.answer=(e.target as HTMLTextAreaElement).value}
            placeholder="Escreva sua resposta aqui…"></textarea>
        </label>
        <button class="button" type="button" aria-expanded=${this.revealModel}
          @click=${()=>this.revealModel=!this.revealModel}>
          ${this.revealModel?'Ocultar modelos de resposta':'Conferir exemplos de resposta'}
        </button>
        ${this.revealModel?html`<section class="learn-bridge__feedback" aria-label="Exemplos de resposta">
          <h3>Exemplo de resposta</h3>
          <p lang=${this.language}>${active.illustrativeAnswer}</p>
          ${active.acceptedAnswerExamples.length?html`
           <h3>Outras formulações possíveis</h3>
           <ul>${active.acceptedAnswerExamples.map(example=>html`<li lang=${this.language}>${example}</li>`)}</ul>
          `:nothing}
          <p class="learn-bridge__limits">Os exemplos são ilustrativos. Uma resposta diferente pode estar correta; a ferramenta não atribui acertos ou erros.</p>
        </section>`:nothing}
        `}
        <details class="learn-bridge__criteria">
          <summary>O que observar nesta tarefa</summary>
          <p>${active.successEvidence}</p>
          <ul>${active.scoringCriteria.map(criterion=>html`<li>${criterion}</li>`)}</ul>
        </details>
        <footer class="learn-bridge__footer">
          <button type="button" class="button" ?disabled=${index===0}
            @click=${()=>this.advance(visible,index,-1)}>Anterior</button>
          <span>Sem avaliação automática</span>
          <button type="button" class="button primary" ?disabled=${index===visible.length-1}
            @click=${()=>this.advance(visible,index,1)}>Próxima</button>
        </footer>
      </article>`:nothing}
    </div>
    <p class="learn-bridge__bottom">Esta é uma prévia interna para teste de interface e conteúdo. Não altera notas, progresso, dados de avaliação, backups nem a trilha pública.</p>
  </section>`;
 }
}
