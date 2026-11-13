import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Language} from './model';
import type {LearnAudioAsset,LearnAudioPolicy} from './audio-assets';
import {safeLearnAudioUrl} from './audio-assets';
import {isLearnListeningV13PreviewEnabled} from './pilot-preview';
import './recording-player';

type Level='A2'|'B1';
type QuestionKind='single_choice'|'short_answer';
interface TranscriptLine {speaker:string;text:string}
interface Choice {id:string;label:string}
interface ListeningQuestion {id:string;kind:QuestionKind;prompt:string;options:Choice[]}
interface ListeningUnit {
 id:string;language:Language;level:Level;title:string;genre:string;
 transcript:TranscriptLine[];questions:ListeningQuestion[];
 audio:{id:string;assetUrl:string;technicalStatus:'technical-passed';ownerReview:'pending'}|null;
}
interface PreviewResponse {
 schemaVersion:1;previewOnly:true;language:Language;publicRelease:false;
 assessmentEnabled:false;audioAssessmentEnabled:false;units:ListeningUnit[];
}
interface HeardDetail {validated?:boolean;assessmentEligible?:boolean}
const policy:LearnAudioPolicy={audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true,publicRelease:false};

function parsePreview(value:unknown,language:Language):PreviewResponse {
 if(!value||typeof value!=='object')throw Error('Prévia V13 inválida.');
 const data=value as Partial<PreviewResponse>;
 if(data.schemaVersion!==1||data.previewOnly!==true||data.language!==language||data.publicRelease!==false||
    data.assessmentEnabled!==false||data.audioAssessmentEnabled!==false||!Array.isArray(data.units)||data.units.length!==16)
   throw Error('Prévia V13 incompleta ou liberada indevidamente.');
 const ids=new Set<string>(),questions=new Set<string>(),levels:Record<Level,number>={A2:0,B1:0};
 for(const raw of data.units){
  if(!raw||raw.language!==language||!['A2','B1'].includes(raw.level)||!/^([a-z]{2})-listen-v13-\d{2}$/.test(raw.id)||ids.has(raw.id)||
     typeof raw.title!=='string'||!raw.title.trim()||!Array.isArray(raw.transcript)||!raw.transcript.length||!Array.isArray(raw.questions))throw Error('Roteiro V13 inválido.');
  ids.add(raw.id);levels[raw.level]++;
  if(raw.questions.length!==(raw.level==='A2'?2:3))throw Error('Quantidade de questões inválida.');
  for(const q of raw.questions){
   if(!q||typeof q.id!=='string'||questions.has(q.id)||!q.id.startsWith(`${raw.id}-q`)||!q.prompt?.trim()||
      !['single_choice','short_answer'].includes(q.kind)||!Array.isArray(q.options)||
      Object.keys(q).length!==4||!['id','kind','prompt','options'].every(key=>Object.prototype.hasOwnProperty.call(q,key)))throw Error('Questão V13 inválida ou com material de correção exposto.');
   questions.add(q.id);
   if(q.kind==='single_choice'&&(q.options.length!==3||new Set(q.options.map(x=>x.id)).size!==3||q.options.some(x=>!x.id||!x.label)))throw Error('Alternativas inválidas.');
   if(q.kind==='short_answer'&&q.options.length)throw Error('Questão aberta com alternativas.');
  }
  if(raw.audio&&(!raw.audio.id||raw.audio.id!==raw.id||raw.audio.technicalStatus!=='technical-passed'||raw.audio.ownerReview!=='pending'||!safeLearnAudioUrl(raw.audio.assetUrl)))throw Error('Vínculo de áudio não verificado.');
 }
 if(levels.A2!==8||levels.B1!==8)throw Error('Cobertura A2/B1 incompleta.');
 return data as PreviewResponse;
}

@customElement('learn-listening-v13-preview')
export class LearnListeningV13Preview extends LightElement {
 @property() language:Language='en';
 @state() private data?:PreviewResponse;
 @state() private level:Level='A2';
 @state() private selectedId='';
 @state() private loading=true;
 @state() private error='';
 @state() private formError='';
 @state() private answers:Record<string,string>={};
 @state() private resultShown=false;
 @state() private transcriptVisible=false;
 @state() private transcriptConsulted=false;
 @state() private playbackCompleted=false;
 @state() private playbackEligible=false;
 private generation=0;

 connectedCallback(){super.connectedCallback();void this.load();}
 disconnectedCallback(){this.generation++;super.disconnectedCallback();}
 protected willUpdate(changes:PropertyValues){
  if(changes.has('language')&&changes.get('language')!==undefined){this.level='A2';this.selectedId='';this.resetAnswers();void this.load();}
 }
 private resetAnswers(){this.answers={};this.resultShown=false;this.formError='';this.transcriptVisible=false;this.transcriptConsulted=false;this.playbackCompleted=false;this.playbackEligible=false;}
 private async load(){
  const generation=++this.generation;
  if(!isLearnListeningV13PreviewEnabled()){this.loading=false;this.error='Prévia indisponível fora do ambiente local.';return;}
  this.loading=true;this.error='';
  try{
   const response=await fetch(`/learn/v13/preview.json?language=${this.language}`,{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('Sessão local indisponível. Reabra a prévia autenticada.');
   const parsed=parsePreview(await response.json(),this.language);
   if(generation!==this.generation||!this.isConnected)return;
   this.data=parsed;
   if(!parsed.units.some(unit=>unit.level===this.level&&unit.id===this.selectedId))this.selectedId=parsed.units.find(unit=>unit.level===this.level)?.id||'';
  }catch(error){if(generation===this.generation&&this.isConnected)this.error=error instanceof Error?error.message:'Não foi possível carregar a prévia.';}
  finally{if(generation===this.generation&&this.isConnected)this.loading=false;}
 }
 private get units(){return (this.data?.units||[]).filter(unit=>unit.level===this.level);}
 private get active(){return this.units.find(unit=>unit.id===this.selectedId)||this.units[0];}
 private setLevel(level:Level){this.level=level;this.selectedId=this.data?.units.find(unit=>unit.level===level)?.id||'';this.resetAnswers();}
 private select(id:string){this.selectedId=id;this.resetAnswers();}
 private move(delta:number){const index=this.units.findIndex(unit=>unit.id===this.active?.id);const next=this.units[index+delta];if(next)this.select(next.id);}
 private setAnswer(id:string,value:string){this.answers={...this.answers,[id]:value};this.resultShown=false;}
 private async submit(){
  if(!this.active||!this.active.questions.some(q=>Boolean(this.answers[q.id]?.trim()))){this.formError='Responda ao menos uma questão para concluir a prática.';return;}
  this.formError='';this.resultShown=true;
 }
 private assetFor(unit:ListeningUnit):LearnAudioAsset|undefined {
  if(!unit.audio)return undefined;
  return {id:unit.audio.id,language:unit.language,activityId:unit.id,skill:'listening',referenceText:unit.transcript.map(line=>line.text).join(' '),
   locale:unit.language==='ru'?'ru-RU':'en-US',accent:null,source:'local-v19-technical',licenseStatus:'review-pending',contentVersion:1,
   validationStatus:'technical-passed',assessmentEnabled:false,assetUrl:unit.audio.assetUrl};
 }
 private onHeard(event:Event){const detail=(event as CustomEvent<HeardDetail>).detail;this.playbackCompleted=true;this.playbackEligible=detail?.validated===true&&detail?.assessmentEligible===true;}
 render(){
  if(!isLearnListeningV13PreviewEnabled())return html`<p class="learn-message" role="status">Listening V13 está restrito à prévia local autenticada.</p>`;
  const unit=this.active,index=this.units.findIndex(item=>item.id===unit?.id),total=this.units.length;
  return html`<section class="learn-listening-v13" aria-labelledby="learn-v13-title">
   <header class="learn-listening-v13__head">
    <div><p class="learn-listening-v13__eyebrow">PRÉVIA LOCAL · V13</p><h1 id="learn-v13-title">Listening A2/B1</h1>
     <p>Os roteiros e áudios estão em revisão. Esta prática não salva respostas nem atribui nota.</p></div>
    <a class="button" href=${`#/learn/${this.language}`}>Voltar ao Learn</a>
   </header>
   <p class="learn-listening-v13__policy" role="note">Níveis curriculares provisórios. Sem certificação CEFR; respostas abertas ficam sem avaliação automática.</p>
   ${this.loading?html`<p role="status">Carregando roteiros locais…</p>`:nothing}
   ${this.error?html`<p class="learn-message" role="alert">${this.error}<button class="button" type="button" @click=${()=>void this.load()}>Tentar novamente</button></p>`:nothing}
   ${!this.loading&&!this.error&&unit?html`
    <div class="learn-listening-v13__levels" role="group" aria-label="Nível curricular">
     ${(['A2','B1'] as Level[]).map(level=>html`<button class="button" type="button" aria-pressed=${this.level===level} @click=${()=>this.setLevel(level)}>${level}<span>${this.data?.units.filter(item=>item.level===level).length||0}</span></button>`)}
    </div>
    <div class="learn-listening-v13__layout">
     <aside class="learn-listening-v13__index" aria-label="Selecionar exercício">
      <label for="learn-v13-exercise">Exercício</label>
      <select id="learn-v13-exercise" .value=${unit.id} @change=${(event:Event)=>this.select((event.target as HTMLSelectElement).value)}>
       ${this.units.map(item=>html`<option value=${item.id}>${item.title}</option>`)}
      </select>
      <p>${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</p>
      <p>Roteiro: ${unit.id}</p>
      <p>As questões abertas não são corrigidas automaticamente.</p>
     </aside>
     <article class="learn-listening-v13__exercise" aria-label="Exercício de compreensão auditiva">
      <div class="learn-listening-v13__meta"><span>${unit.level} · ${unit.genre==='announcement'?'Comunicado':'Diálogo'}</span><span>${unit.id}</span></div>
      <h2>${unit.title}</h2>
      ${unit.audio?html`<p class="learn-listening-v13__notice">Áudio técnico disponível para estudo; aguarda homologação auditiva e não habilita avaliação.</p>
       <learn-recording-player .asset=${this.assetFor(unit)} .policy=${policy} @heard=${(event:Event)=>this.onHeard(event)}></learn-recording-player>`:
       html`<p class="learn-listening-v13__notice" role="status">Áudio V19 correspondente indisponível neste ambiente. O roteiro não será tratado como evidência de Listening.</p>`}
      ${unit.audio&&!this.playbackCompleted?html`<p class="learn-listening-v13__notice" role="status">Ouça a gravação até o fim para abrir as questões. A conclusão técnica não gera avaliação.</p>`:html`
       ${!unit.audio?html`<p class="learn-listening-v13__notice" role="note">Sem áudio: as questões abaixo servem apenas para revisão do roteiro, sem evidência de compreensão auditiva.</p>`:nothing}
       <div class="learn-listening-v13__questions">
        ${unit.questions.map((question,i)=>html`<fieldset>
         <legend><span class="learn-listening-v13__question-index">${String(i+1).padStart(2,'0')}</span>${question.prompt}</legend>
         ${question.kind==='single_choice'?question.options.map(option=>html`<label><input type="radio" name=${question.id} value=${option.id} .checked=${this.answers[question.id]===option.id} @change=${()=>this.setAnswer(question.id,option.id)} />${option.label}</label>`):
           html`<label class="learn-listening-v13__open-answer" for=${question.id}>Resposta aberta
            <textarea id=${question.id} rows="3" .value=${this.answers[question.id]||''} @input=${(event:Event)=>this.setAnswer(question.id,(event.target as HTMLTextAreaElement).value)}></textarea>
           </label><p class="learn-listening-v13__hint">Sem correção literal. Respostas não avaliadas ficam pendentes de revisão humana.</p>`}
         ${this.resultShown?html`<p class="learn-listening-v13__outcome" role="status">${this.answers[question.id]?.trim()?question.kind==='single_choice'?'Não avaliada (notAssessed): áudio não homologado.':'Incerta (uncertain): precisa de revisão humana.':'Não respondida (notAssessed).'}</p>`:nothing}
        </fieldset>`)}
       </div>
       ${this.formError?html`<p class="learn-listening-v13__outcome" role="alert">${this.formError}</p>`:nothing}
       <button class="button learn-listening-v13__submit" type="button" @click=${()=>void this.submit()}>Concluir prática</button>
       ${this.resultShown?html`<p class="learn-listening-v13__result" role="status">Sem nota ou registro de progresso. ${this.transcriptConsulted?'O roteiro foi consultado; a resposta não conta como evidência independente.':this.playbackCompleted&&!this.playbackEligible?'A reprodução técnica foi concluída, mas não equivale a áudio homologado.':this.playbackEligible?'A gravação não está habilitada para avaliação nesta prévia.':'Nenhuma evidência auditiva foi registrada.'}</p>`:nothing}`}
      <button class="button learn-listening-v13__transcript-toggle" type="button" aria-expanded=${this.transcriptVisible} @click=${()=>{this.transcriptVisible=!this.transcriptVisible;if(this.transcriptVisible)this.transcriptConsulted=true;this.resultShown=false;}}>${this.transcriptVisible?'Ocultar roteiro':'Consultar roteiro'}</button>
      ${this.transcriptVisible?html`<div class="learn-listening-v13__transcript" lang=${this.language} aria-label="Transcrição consultada">${unit.transcript.map(line=>html`<p><strong>${line.speaker}</strong><span>${line.text}</span></p>`)}</div>`:nothing}
      <nav class="learn-listening-v13__pager" aria-label="Navegação dos exercícios">
       <button class="button" type="button" ?disabled=${index<=0} @click=${()=>this.move(-1)}>Anterior</button>
       <button class="button" type="button" ?disabled=${index<0||index>=total-1} @click=${()=>this.move(1)}>Próximo</button>
      </nav>
     </article>
    </div>`:nothing}
   <p class="learn-listening-v13__footer">Respostas ficam apenas nesta sessão temporária. Nenhum histórico, IndexedDB ou backup é alterado.</p>
  </section>`;
 }
}
