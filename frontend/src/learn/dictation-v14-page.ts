import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Language,V14DictationAttempt,V14DictationData} from './model';
import type {LearnAudioAsset,LearnAudioPolicy} from './audio-assets';
import {isLearnDictationV14PreviewEnabled} from './pilot-preview';
import {loadV14Dictation,saveV14DictationAttempt,saveV14DictationDraft} from './dictation-v14-storage';
import './recording-player';

interface DictationItem {id:string;language:Language;level:'A2'|'B1';title:string;objective:string;instruction:string;linkedStageNodeId:string;durationSeconds:number;audioUrl:string;audioState:'awaiting_owner_review'|'approved';technicalStatus:'passed';contentVersion:1;sourceCommit:string;sourceBlobSha:string;audioVersion:number;audioSha256:string;audioAvailable:boolean;assessmentEnabled:boolean;expectedTranscript?:string;segmentCuesTeacherOnly?:string[];protectedElementsPt?:string}
interface DictationCatalog {schemaVersion:1;preview:true;publicRelease:false;assessmentEnabled:false;items:DictationItem[]}
interface PlaybackEvidence {completed:true;audibleSeconds:number;coveragePercent:number;playCount:number;playbackRates:number[]}
interface SubmitResponse {attempt:V14DictationAttempt;transcript:string}
interface HeardEvent {source:'recording';assetId:string;validated:boolean;assessmentEligible:boolean;audibleSeconds:number;coveragePercent:number;playCount:number;playbackRates:number[]}
const playerPolicy:LearnAudioPolicy={audioAssessmentEnabled:false,validatedRecordings:0,generatedAtPlaybackIsDraft:true,publicRelease:false};
const languageName:Record<Language,string>={en:'Inglês',ru:'Russo'};
const validId=(value:unknown,language:Language):value is string=>typeof value==='string'&&new RegExp(`^${language}-dict-v14-(0[1-9]|1[0-6])$`).test(value);

@customElement('learn-dictation-v14')
export class LearnDictationV14Page extends LightElement {
 @property() language:Language='en';
 @state() private items:DictationItem[]=[];
 @state() private data?:V14DictationData;
 @state() private level:'A2'|'B1'='A2';
 @state() private selected='';
 @state() private draft='';
 @state() private heard?:PlaybackEvidence;
 @state() private transcript='';
 @state() private revealFor='';
 @state() private loading=true;
 @state() private busy=false;
 @state() private error='';
 @state() private notice='';
 private generation=0;
 private startedAt=Date.now();
 private saveTimer=0;
 private pendingAttemptId='';

 connectedCallback(){super.connectedCallback();void this.load();}
 protected willUpdate(changes:PropertyValues){if(changes.has('language')&&changes.get('language')!==undefined){this.level='A2';this.selected='';this.draft='';this.heard=undefined;this.transcript='';this.revealFor='';this.pendingAttemptId='';if(this.isConnected)void this.load();}}
 disconnectedCallback(){this.generation++;if(this.saveTimer)clearTimeout(this.saveTimer);if(this.selected&&this.draft)void this.persistDraft(this.selected,this.draft);super.disconnectedCallback();}
 private async load(){
  const generation=++this.generation;this.loading=true;this.error='';this.notice='';this.heard=undefined;this.transcript='';this.revealFor='';
  if(!isLearnDictationV14PreviewEnabled()){this.loading=false;return;}
  try{
   const [response,data]=await Promise.all([fetch('/learn/v14/dictations.json',{credentials:'same-origin',cache:'no-store'}),loadV14Dictation(this.language)]);
   if(!response.ok)throw Error('A prévia autenticada não está ativa. Inicie `npm run learn:preview-dictation-v14` no computador que contém os áudios privados.');
   const catalog=await response.json() as DictationCatalog;
   const items=catalog.items?.filter(item=>item.language===this.language);
   if(catalog.schemaVersion!==1||catalog.preview!==true||catalog.publicRelease!==false||catalog.assessmentEnabled!==false||items?.length!==16||items.some(item=>!validId(item.id,this.language)||!['A2','B1'].includes(item.level)||typeof item.audioAvailable!=='boolean'||item.expectedTranscript!==undefined))throw Error('O catálogo V14 local não passou na validação.');
   if(generation!==this.generation||!this.isConnected)return;
   this.items=items.sort((a,b)=>a.id.localeCompare(b.id,'en'));
   this.data=data;
   const preferred=data.drafts[0]?.itemId||this.items[0]?.id||'';
   this.selected=this.items.some(item=>item.id===preferred)?preferred:this.items[0]?.id||'';
   const active=this.items.find(item=>item.id===this.selected);this.level=active?.level||'A2';this.draft=data.drafts.find(d=>d.itemId===this.selected)?.response||'';this.startedAt=data.drafts.find(d=>d.itemId===this.selected)?.startedAt||Date.now();
  }catch(reason){if(generation===this.generation&&this.isConnected)this.error=reason instanceof Error?reason.message:'Não foi possível carregar os ditados V14.';}
  finally{if(generation===this.generation&&this.isConnected)this.loading=false;}
 }
 private async persistDraft(itemId:string,response:string){try{this.data=await saveV14DictationDraft(this.language,itemId,response);}catch(reason){this.error=reason instanceof Error?reason.message:'Não foi possível salvar o rascunho local.';}}
 private scheduleDraftSave(){if(this.saveTimer)clearTimeout(this.saveTimer);const id=this.selected,response=this.draft;this.saveTimer=window.setTimeout(()=>{this.saveTimer=0;if(id&&validId(id,this.language))void this.persistDraft(id,response);},250);}
 private async flushDraft(){if(this.saveTimer){clearTimeout(this.saveTimer);this.saveTimer=0;}if(this.selected&&validId(this.selected,this.language))await this.persistDraft(this.selected,this.draft);}
 private chooseLevel(level:'A2'|'B1'){this.level=level;const current=this.visibleItems().find(item=>item.id===this.selected);if(!current){const next=this.visibleItems(level)[0];this.chooseItem(next?.id||'');}}
 private visibleItems(level=this.level){return this.items.filter(item=>item.level===level)}
 private chooseItem(id:string){if(!validId(id,this.language))return;void this.flushDraft();this.selected=id;this.draft=this.data?.drafts.find(d=>d.itemId===id)?.response||'';this.startedAt=this.data?.drafts.find(d=>d.itemId===id)?.startedAt||Date.now();this.heard=undefined;this.transcript='';this.revealFor='';this.error='';this.notice='';this.pendingAttemptId='';}
 private assetFor(item:DictationItem):LearnAudioAsset{return {id:item.id,language:item.language,activityId:item.id,skill:'dictation',referenceText:'',locale:item.language==='ru'?'ru-RU':'en-US',accent:null,source:'local-v19-technical',licenseStatus:'review-pending',contentVersion:item.contentVersion,validationStatus:'technical-passed',assessmentEnabled:false,assetUrl:item.audioAvailable?item.audioUrl:null};}
 private onHeard(event:Event,item:DictationItem){const detail=(event as CustomEvent<HeardEvent>).detail;if(!detail||detail.source!=='recording'||detail.assetId!==item.id||detail.validated||detail.assessmentEligible)return;if(detail.audibleSeconds<0.5||detail.coveragePercent<0.85||detail.playCount<1||!detail.playbackRates.length){this.heard=undefined;this.notice='Reproduza a maior parte do áudio, sem silenciá-lo, para enviar a tentativa.';return;}this.heard={completed:true,audibleSeconds:detail.audibleSeconds,coveragePercent:detail.coveragePercent,playCount:detail.playCount,playbackRates:detail.playbackRates};this.notice='Reprodução concluída; você pode enviar a transcrição.';}
 private async postAttempt(item:DictationItem,attemptId:string,responseText:string,startedAt:number,playback:PlaybackEvidence):Promise<SubmitResponse>{
  const response=await fetch('/learn/v14/attempt',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId,itemId:item.id,response:responseText,startedAt,playback})});
  if(!response.ok)throw Error('A tentativa não foi validada. Nenhuma evidência foi registrada.');
  const result=await response.json() as SubmitResponse;
  if(result.attempt?.itemId!==item.id||result.attempt.language!==this.language||result.attempt.response!==responseText||typeof result.transcript!=='string'||!result.transcript)throw Error('O retorno local da tentativa é inválido.');
  return result;
 }
 private async submit(item:DictationItem){
  if(this.busy||!this.heard||!this.draft.trim()||!item.audioAvailable)return;
  this.busy=true;this.error='';this.notice='';await this.flushDraft();
  const responseText=this.draft,playback=this.heard,attemptId=this.pendingAttemptId||crypto.randomUUID();this.pendingAttemptId=attemptId;
  try{
   const result=await this.postAttempt(item,attemptId,responseText,this.startedAt,playback);
   const saved=await saveV14DictationAttempt(this.language,result.attempt);this.data=saved.data;this.transcript=result.transcript;this.revealFor=result.attempt.attemptId;this.pendingAttemptId='';
   this.notice=result.attempt.outcome==='supported_for_observed_task'?'Transcrição compatível nesta tarefa. Isso não indica nível ou domínio geral.':'Tentativa salva como incerta; o áudio aguarda aprovação auditiva. Compare a transcrição depois do envio.';
  }catch(reason){this.error=reason instanceof Error?reason.message:'Não foi possível enviar a tentativa.';}
  finally{this.busy=false;}
 }
 private async reveal(attempt:V14DictationAttempt){
  const item=this.items.find(row=>row.id===attempt.itemId);if(!item)return;
  this.busy=true;this.error='';
  try{const result=await this.postAttempt(item,attempt.attemptId,attempt.response,attempt.startedAt,attempt.playback);this.transcript=result.transcript;this.revealFor=attempt.attemptId;}
  catch(reason){this.error=reason instanceof Error?reason.message:'A transcrição não está disponível nesta sessão local.';}
  finally{this.busy=false;}
 }
 private newAttempt(item:DictationItem){this.heard=undefined;this.transcript='';this.revealFor='';this.notice='Reproduza a gravação completa para iniciar outra tentativa.';this.pendingAttemptId='';this.draft='';this.startedAt=Date.now();void this.persistDraft(item.id,'');}
 render(){
  if(!isLearnDictationV14PreviewEnabled())return html`<section class="learn-message" role="status"><h1>Prévia indisponível</h1><p>Ditados V14 só abrem em loopback com a sessão local autenticada. Nada é liberado no domínio público.</p><a class="button" href=${`#/learn/${this.language}`}>Voltar ao Learn</a></section>`;
  const visible=this.visibleItems(),active=visible.find(item=>item.id===this.selected)||visible[0],attempts=this.data?.attempts||[],activeAttempts=attempts.filter(attempt=>attempt.itemId===active?.id).sort((a,b)=>b.submittedAt-a.submittedAt);
  return html`<section class="learn-v14" aria-labelledby="learn-v14-title">
   <header class="learn-v14__head"><div><p class="learn-v14__eyebrow">LEARN · V14 · PRÉVIA LOCAL</p><h1 id="learn-v14-title">Ditados A2/B1</h1><p>Prática com áudio privado. Sem certificação ou liberação pública.</p></div><a class="button" href=${`#/learn/${this.language}`}>Voltar ao ${languageName[this.language]}</a></header>
   <nav class="learn-v14__languages" aria-label="Selecionar idioma"><a class="button" aria-current=${this.language==='en'?'page':nothing} href="/?learn-preview=dictation-v14#/learn/en/dictation-v14">Inglês</a><a class="button" aria-current=${this.language==='ru'?'page':nothing} href="/?learn-preview=dictation-v14#/learn/ru/dictation-v14">Русский</a></nav>
   ${this.loading?html`<p role="status" class="learn-v14__state">Carregando os 16 ditados de ${languageName[this.language]}…</p>`:nothing}
   ${this.error?html`<p role="alert" class="learn-v14__state learn-v14__state--error">${this.error}</p>`:nothing}
   ${!this.loading&&!this.error?html`<div class="learn-v14__layout">
    <aside class="learn-v14__index" aria-label="Índice de ditados">
     <div class="learn-v14__levels" aria-label="Selecionar nível">${(['A2','B1'] as const).map(level=>html`<button class="button" type="button" aria-pressed=${this.level===level} @click=${()=>this.chooseLevel(level)}>${level}<small>${this.items.filter(item=>item.level===level).length}</small></button>`)}</div>
     <label for="learn-v14-item">Ditado ${this.level}</label>
     <select id="learn-v14-item" .value=${active?.id||''} @change=${(event:Event)=>this.chooseItem((event.target as HTMLSelectElement).value)}>${visible.map((item,index)=>html`<option value=${item.id}>${String(index+1).padStart(2,'0')} · ${item.title}${attempts.some(attempt=>attempt.itemId===item.id)?' · tentativa salva':''}</option>`)}</select>
     <p>${visible.length} ditados neste nível · ${attempts.length} tentativas salvas neste idioma</p>
     <p>O progresso de Inglês e Russo fica separado no armazenamento local.</p>
    </aside>
    ${active?html`<article class="learn-v14__exercise" aria-labelledby="learn-v14-item-title">
     <div class="learn-v14__meta"><span>${active.level} · ${active.linkedStageNodeId}</span><span>${active.id}</span></div><h2 id="learn-v14-item-title">${active.title}</h2><p class="learn-v14__objective">${active.objective}</p><p lang=${this.language} class="learn-v14__instruction">${active.instruction}</p>
     ${active.audioAvailable?html`<p class="learn-v14__notice" role="note">Gravação tecnicamente verificada; aprovação de pronúncia e naturalidade pendente. Esta tentativa não certifica listening.</p><learn-recording-player .asset=${this.assetFor(active)} .policy=${playerPolicy} @heard=${(event:Event)=>this.onHeard(event,active)}></learn-recording-player>`:html`<p class="learn-v14__notice" role="status">Áudio indisponível. Nenhuma resposta será registrada até que uma gravação V19 correspondente esteja presente e verificada.</p>`}
     <label class="learn-v14__answer" for="learn-v14-answer">Sua transcrição<textarea id="learn-v14-answer" rows="4" maxlength="2000" autocomplete="off" spellcheck="false" lang=${this.language} .value=${this.draft} ?disabled=${!active.audioAvailable} @input=${(event:Event)=>{this.draft=(event.target as HTMLTextAreaElement).value;this.scheduleDraftSave();this.error='';}} @blur=${()=>void this.flushDraft()} placeholder=${this.language==='ru'?'Введите услышанное кириллицей…':'Write what you heard…'}></textarea></label>
     <div class="learn-v14__actions"><button class="button primary" type="button" ?disabled=${this.busy||!active.audioAvailable||!this.heard||!this.draft.trim()} @click=${()=>void this.submit(active)}>${this.busy?'Salvando…':'Enviar tentativa'}</button>${activeAttempts.length?html`<button class="button" type="button" ?disabled=${this.busy} @click=${()=>this.newAttempt(active)}>Nova tentativa</button>`:nothing}</div>
     ${this.notice?html`<p class="learn-v14__state" role="status">${this.notice}</p>`:nothing}
     ${this.transcript&&this.revealFor?html`<section class="learn-v14__review" aria-label="Comparação após a tentativa"><h3>Transcrição após o envio</h3><p lang=${this.language}>${this.transcript}</p><small>Comparação local; não altera a avaliação nem confirma pronúncia.</small></section>`:nothing}
     ${activeAttempts.length?html`<section class="learn-v14__history" aria-labelledby="learn-v14-history"><h3 id="learn-v14-history">Tentativas salvas</h3><ol>${activeAttempts.slice(0,10).map(attempt=>html`<li><div><strong>${attempt.outcome==='supported_for_observed_task'?'Compatível nesta tarefa':'Incerta · revisão auditiva pendente'}</strong><small>${new Date(attempt.submittedAt).toLocaleString('pt-BR')} · ${attempt.playback.playCount} reprodução(ões) · ${attempt.playback.playbackRates.join(' / ')}×</small><p lang=${this.language}>${attempt.response}</p></div><button class="button" type="button" ?disabled=${this.busy} @click=${()=>void this.reveal(attempt)}>Ver transcrição após envio</button></li>`)}</ol></section>`:nothing}
    </article>`:nothing}
   </div>`:nothing}
   <p class="learn-v14__footer">Os 32 áudios permanecem privados e aguardam escuta do responsável. Áudio sem reprodução audível não cria tentativa. Respostas desconhecidas ficam incertas; diferenças não são marcadas como erro.</p>
  </section>`;
 }
}
