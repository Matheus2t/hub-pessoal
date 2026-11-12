import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Language} from './model';
import type {LearnAudioAsset,LearnAudioPolicy} from './audio-assets';
import {isLearnV19AudioPreviewEnabled} from './pilot-preview';
import './recording-player';

type Kind='bridge'|'listening'|'dictation';
interface DraftQuestion {id:string;kind:string;prompt:string;options:Array<{id:string;label:string}>}
interface DraftRecording {
 id:string;language:Language;kind:Kind;title:string;level:string;source:string;
 durationSeconds:number;state:string;questions:DraftQuestion[];
 instruction:string;transcript:string;audioUrl:string;
}
interface PreviewResponse {
 version:1;preview:true;assessmentEnabled:false;publicRelease:false;records:DraftRecording[];
}
const policy:LearnAudioPolicy={
 audioAssessmentEnabled:false,validatedRecordings:0,
 generatedAtPlaybackIsDraft:true,publicRelease:false,
};
const titles:Record<Kind,string>={bridge:'Atividades-ponte',listening:'Listening',dictation:'Ditados'};
const kindOrder:Kind[]=['listening','dictation','bridge'];

@customElement('learn-v19-local-preview')
export class LearnV19LocalPreview extends LightElement {
 @property() language:Language='en';
 @state() private records:DraftRecording[]=[];
 @state() private kind:Kind='listening';
 @state() private selected='';
 @state() private loading=true;
 @state() private error='';
 @state() private reveal=false;
 @state() private draft='';
 @state() private answers:Record<string,string>={};
 private generation=0;
 connectedCallback(){super.connectedCallback();void this.load();}
 disconnectedCallback(){this.generation++;super.disconnectedCallback();}
 protected willUpdate(changes:PropertyValues){if(changes.has('language')&&changes.get('language')!==undefined){
   this.selected='';this.reveal=false;this.draft='';this.answers={};
 }}
 private async load(){
  const gen=++this.generation;
  if(!isLearnV19AudioPreviewEnabled()){this.loading=false;this.error='Prévia indisponível fora do ambiente local.';return;}
  this.loading=true;this.error='';
  try{
   const res=await fetch('/learn/v19/preview.json',{credentials:'same-origin',cache:'no-store'});
   if(!res.ok)throw Error('Sessão privada ou arquivos locais indisponíveis.');
   const parsed=await res.json() as PreviewResponse;
   if(parsed.version!==1||parsed.preview!==true||parsed.publicRelease!==false||
      parsed.assessmentEnabled!==false||!Array.isArray(parsed.records)||parsed.records.length!==68)
      throw Error('Inventário de prévia inválido.');
   if(gen!==this.generation||!this.isConnected)return;
   this.records=parsed.records;
  }catch(err){
   if(gen===this.generation&&this.isConnected)this.error=err instanceof Error?err.message:'Não foi possível abrir a prévia.';
  }finally{if(gen===this.generation&&this.isConnected)this.loading=false;}
 }
 private setSelected(id:string){this.selected=id;this.reveal=false;this.draft='';this.answers={};}
 private assetFor(record:DraftRecording):LearnAudioAsset {
  return {
   id:record.id,language:record.language,activityId:record.id,
   skill:record.kind==='dictation'?'dictation':'listening',referenceText:record.transcript,
   locale:record.language==='ru'?'ru-RU':'en-US',accent:null,
   source:'local-v19-technical',licenseStatus:'review-pending',
   contentVersion:1,validationStatus:'technical-passed',
   assessmentEnabled:false,assetUrl:record.audioUrl,
  };
 }
 render(){
  if(!isLearnV19AudioPreviewEnabled())return html`<p class="learn-message" role="status">Prévia V19 indisponível fora do ambiente local.</p>`;
  const all=this.records.filter(r=>r.language===this.language);
  const filtered=all.filter(r=>r.kind===this.kind);
  const active=filtered.find(r=>r.id===this.selected)||filtered[0];
  return html`<section class="learn-v19-preview" aria-labelledby="learn-v19-title">
   <header class="learn-v19-preview__head">
    <div><p class="learn-v19-preview__kicker">AMBIENTE LOCAL · V19</p>
     <h1 id="learn-v19-title">Áudios em preparação</h1>
     <p>Ouça os exercícios no Learn quando quiser. Esta prévia não aprova gravações, não salva respostas e não libera conteúdo ao público.</p>
    </div>
    <a class="button" href=${`#/learn/${this.language}`}>Voltar ao Learn</a>
   </header>
   ${this.loading?html`<p role="status">Carregando os arquivos privados…</p>`:nothing}
   ${this.error?html`<p class="learn-message" role="alert">${this.error}</p>`:nothing}
   ${!this.loading&&!this.error?html`
    <nav class="learn-v19-preview__tabs" aria-label="Tipo de atividade">
     ${kindOrder.map(kind=>html`<button class="button" type="button"
      aria-pressed=${this.kind===kind}
      @click=${()=>{this.kind=kind;this.setSelected('')}}>
       ${titles[kind]} <span>${all.filter(r=>r.kind===kind).length}</span>
      </button>`)}
    </nav>
    <div class="learn-v19-preview__body">
     <aside class="learn-v19-preview__index" aria-label="Selecionar gravação">
      <label for="learn-v19-audio-choice">Exercício</label>
      <select id="learn-v19-audio-choice" .value=${active?.id||''}
       @change=${(e:Event)=>this.setSelected((e.target as HTMLSelectElement).value)}>
       ${filtered.map(r=>html`<option value=${r.id} ?selected=${r.id===active?.id}>${r.title} · ${r.level}</option>`)}
      </select>
      <p>${filtered.length} gravações disponíveis nesta modalidade.</p>
      <p>A aprovação auditiva permanece pendente para todos os arquivos ainda não revisados.</p>
     </aside>
     ${active?html`<article class="learn-v19-preview__exercise" aria-label="Prévia do exercício">
       <div class="learn-v19-preview__meta"><span>${active.level} · ${titles[active.kind]}</span><span>${active.id}</span></div>
       <h2>${active.title}</h2>
       <p class="learn-v19-preview__notice">Gravação tecnicamente verificada; pronúncia e naturalidade ainda não homologadas. Sem pontuação.</p>
       <learn-recording-player .asset=${this.assetFor(active)} .policy=${policy}></learn-recording-player>
       ${active.instruction?html`<p class="learn-v19-preview__instruction">${active.instruction}</p>`:nothing}
       ${active.kind==='dictation'?html`<label class="learn-v19-preview__answer">Escreva o que ouviu
         <textarea .value=${this.draft} rows="3" @input=${(e:Event)=>this.draft=(e.target as HTMLTextAreaElement).value}></textarea>
        </label>`:nothing}
       ${active.kind==='listening'?html`<div class="learn-v19-preview__questions">
        ${active.questions.map(q=>html`<fieldset><legend>${q.prompt}</legend>
          ${q.kind==='single_choice'?q.options.map(o=>html`<label>
            <input type="radio" name=${q.id} .checked=${this.answers[q.id]===o.id}
             @change=${()=>this.answers={...this.answers,[q.id]:o.id}} /> ${o.label}</label>`):
            html`<label>Resposta livre
             <textarea rows="2" @input=${(e:Event)=>this.answers={...this.answers,[q.id]:(e.target as HTMLTextAreaElement).value}}></textarea>
            </label>`}
         </fieldset>`)}
        </div>`:nothing}
       <button class="button" type="button" aria-expanded=${this.reveal}
        @click=${()=>this.reveal=!this.reveal}>${this.reveal?'Ocultar roteiro':'Mostrar roteiro'} </button>
       ${this.reveal?html`<p class="learn-v19-preview__transcript" lang=${this.language}>${active.transcript}</p>`:nothing}
       <p class="learn-v19-preview__footnote">Respostas e reprodução nesta página não alteram notas, progresso ou o estado de aprovação dos áudios.</p>
      </article>`:nothing}
    </div>`:nothing}
  </section>`;
 }
}
