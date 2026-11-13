import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Backup,Language} from './model';
import type {ProgressionManifest,ProgressionTrack,ProgressionStage} from './progression';
import {v17ScenariosFor,v17CheckpointsFor,v17Competencies} from './progression-v17-content';
import {isScenarioAlignedV17,studySnapshotV17,recommendNextStageV17} from './progression-v17-policy';
import {isLearnAssessmentV17PreviewEnabled} from './pilot-preview';

const levelNames={A1:'Fundamentos',A2:'Comunicação cotidiana',B1:'Contexto e interpretação'} as const;
const competencyNames:Record<string,string>={
 written_reception:'Compreensão escrita',written_production:'Produção escrita',
 spoken_reception:'Compreensão auditiva',spoken_production:'Produção oral',
 interaction:'Interação',contextual_recognition:'Gramática em contexto',
 retention_transfer:'Retenção e transferência',
};

/** V17 local, non-scored, non-certifying preview. No writes to IndexedDB. */
@customElement('learn-progression-v17')
export class LearnProgressionV17 extends LightElement {
 @property() language:Language='en';
 @property({attribute:false}) progress?:Backup;
 @state() private track?:ProgressionTrack;
 @state() private loading=true;
 @state() private failed=false;
 @state() private stageId='';
 @state() private draft='';
 @state() private showCriteria=false;
 @state() private selectedLevel:'A1'|'A2'|'B1'='A1';
 private generation=0;
 connectedCallback(){super.connectedCallback();void this.load();}
 disconnectedCallback(){this.generation++;super.disconnectedCallback();}
 protected updated(changes:PropertyValues<this>){
  if(changes.has('language')&&changes.get('language')!==undefined){
   this.stageId='';this.draft='';this.showCriteria=false;this.selectedLevel='A1';
   void this.load();
  }
 }
 private async load(){
  const token=++this.generation;this.loading=true;this.failed=false;
  try{
   const response=await fetch('/learn/progression-v12.json',{cache:'no-cache'});
   if(!response.ok)throw Error('Manifest unavailable');
   const manifest=await response.json() as ProgressionManifest;
   if(manifest.schemaVersion!==1||manifest.publicRelease!==false||manifest.cefrCertified!==false||
     manifest.languageTracks.en.stages.length!==15||manifest.languageTracks.ru.stages.length!==15)
    throw Error('Invalid progression contract');
   if(token===this.generation&&this.isConnected)this.track=manifest.languageTracks[this.language];
  }catch{
   if(token===this.generation&&this.isConnected)this.failed=true;
  }finally{
   if(token===this.generation&&this.isConnected)this.loading=false;
  }
 }
 private selectStage(id:string){this.stageId=id;this.draft='';this.showCriteria=false;}
 private chooseLevel(level:'A1'|'A2'|'B1'){
  this.selectedLevel=level;
  const first=this.track?.stages.find(s=>s.level===level);
  if(first)this.selectStage(first.nodeId);
 }
 render(){
  if(!isLearnAssessmentV17PreviewEnabled())return html`<p role="status">Prévia de avaliação indisponível no site público.</p>`;
  if(this.loading)return html`<p role="status" class="learn-message">Carregando etapas V17…</p>`;
  if(this.failed||!this.track)return html`<section class="learn-message" role="alert"><h2>Etapas indisponíveis</h2><p>Seu histórico foi preservado.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></section>`;
  if(!this.progress)return html`<p class="learn-message" role="status">Carregando histórico local para separar estudo e avaliação…</p>`;
  const stages=[...this.track.stages].sort((a,b)=>a.sequence-b.sequence);
  const proposals=v17ScenariosFor(this.language);
  const checkpoints=v17CheckpointsFor(this.language);
  const next=recommendNextStageV17(stages,this.progress.attempts,this.language);
  const totalStudied=stages.filter(s=>studySnapshotV17(s,this.progress!.attempts,this.language).complete).length;
  const active=stages.find(s=>s.nodeId===this.stageId)||stages.find(s=>s.level===this.selectedLevel)||stages[0];
  const proposal=proposals.find(p=>p.nodeId===active.nodeId);
  const state=studySnapshotV17(active,this.progress.attempts,this.language);
  const level='A1'===this.selectedLevel?'A1':this.selectedLevel;
  const checkpoint=checkpoints.find(c=>c.level===level);
  const proposalIsAligned=!!proposal&&isScenarioAlignedV17(active,proposal);
  return html`<section class="learn-v17" aria-labelledby="learn-v17-title">
   <header class="learn-v17__head">
    <div><p class="learn-v17__eyebrow">LEARN · V17 · PRÉVIA INTERNA</p>
     <h1 id="learn-v17-title">Progressão A1–B1</h1>
     <p>O que foi estudado, o que ainda não foi avaliado e qual atividade praticar em seguida. Esta proposta não concede níveis, notas nem certificados.</p>
    </div><a class="button" href=${`#/learn/${this.language}`}>Voltar ao Learn</a>
   </header>
   <div class="learn-v17__overview" aria-label="Resumo de acompanhamento">
    <div><span>Etapas com estudo registrado</span><strong>${totalStudied} <small>/ 15</small></strong><p>Exercícios distintos respondidos, inclusive respostas incertas ou incorretas</p></div>
    <div><span>Competência comprovada</span><strong>Não avaliada</strong><p>O histórico anterior não demonstra proficiência A1/A2/B1</p></div>
    <div><span>Próxima atividade sugerida</span><strong>${next?`${next.level} · ${String(next.sequence).padStart(2,'0')}`:'Revisar'}</strong><p>${next?.existingLessonTitle||'Revisar o que foi praticado; todo o percurso continua disponível'}</p></div>
   </div>
   <p class="learn-v17__notice">As 15 etapas de cada idioma permanecem acessíveis. Concluir seis exercícios de uma etapa significa <strong>estudo registrado</strong>, não domínio da etapa. Os checkpoints são propostas de prática, não exames habilitados.</p>
   <nav class="learn-v17__levels" aria-label="Níveis curriculares">
    ${(['A1','A2','B1'] as const).map(l=>html`<button type="button" class="button" aria-pressed=${l===level} @click=${()=>this.chooseLevel(l)}>
     <strong>${l}</strong><span>${levelNames[l]}</span><small>${stages.filter(s=>s.level===l&&studySnapshotV17(s,this.progress!.attempts,this.language).complete).length}/${stages.filter(s=>s.level===l).length} estudadas</small>
    </button>`)}
   </nav>
   <div class="learn-v17__layout">
    <aside class="learn-v17__sidebar">
     <label for="v17-stage-select">Etapa de estudo</label>
     <select id="v17-stage-select" .value=${active.nodeId}
      @change=${(e:Event)=>this.selectStage((e.target as HTMLSelectElement).value)}>
      ${stages.filter(s=>s.level===level).map(s=>html`<option value=${s.nodeId}>${s.sequence}. ${s.existingLessonTitle}</option>`)}
     </select>
     <p class="learn-v17__sidebar-muted">Estudo por idioma: ${this.language==='ru'?'Russo':'Inglês'}. Histórico mantido no seu navegador, sem novas gravações nesta prévia.</p>
     <h3>7 competências distintas</h3>
     <ul class="learn-v17__competencies">
      ${v17Competencies.map(c=>html`<li><span>${competencyNames[c.id]}</span><small>Não avaliada</small></li>`)}
     </ul>
    </aside>
    <div class="learn-v17__content">
     <article class="learn-v17__stage" aria-labelledby="v17-stage-title">
      <div class="learn-v17__meta"><span>${active.level} · ETAPA ${String(active.sequence).padStart(2,'0')}</span><span>${state.studyState==='activities_answered'?'Estudo registrado':state.studyState==='in_progress'?'Em andamento':'Não iniciada'}</span></div>
      <h2 id="v17-stage-title">${active.existingLessonTitle}</h2>
      <p class="learn-v17__target">${active.canDoTarget}</p>
      <div class="learn-v17__progress"><div role="progressbar" aria-label="Atividades distintas respondidas" aria-valuemin="0" aria-valuemax=${state.total} aria-valuenow=${state.answered}><span style=${`width:${state.total?(state.answered/state.total*100):0}%`}></span></div><p>${state.answered}/${state.total} atividades distintas respondidas · Desempenho: não avaliado</p></div>
      <div class="learn-v17__practice"><a class="button" href=${`#/learn/${this.language}/grammar`}>Praticar gramática</a><a class="button" href=${`#/learn/${this.language}/reading`}>Praticar leitura</a></div>
     </article>
     ${proposalIsAligned?html`<section class="learn-v17__scenario" aria-labelledby="v17-scenario-title">
      <p class="learn-v17__eyebrow">CENÁRIO DE TRANSFERÊNCIA · RASCUNHO</p>
      <h2 id="v17-scenario-title">Aplicar em uma situação nova</h2>
      <p>${proposal!.independentScenarioPt}</p>
      <p class="learn-v17__notice">Para produção, responda ${this.language==='ru'?'em russo, usando cirílico':'em inglês'}. Quando a proposta pedir explicitamente uma explicação em português, siga o enunciado. Nenhuma resposta recebe pontuação automática.</p>
      <label>Resposta para autoestudo (sem avaliação)
       <textarea rows="5" maxlength="2300" autocomplete="off" .value=${this.draft}
        @input=${(e:Event)=>this.draft=(e.target as HTMLTextAreaElement).value}
        placeholder="Escreva sua resposta neste espaço…"></textarea>
      </label>
      <button type="button" class="button" aria-expanded=${this.showCriteria} @click=${()=>this.showCriteria=!this.showCriteria}>
       ${this.showCriteria?'Ocultar critérios':'Consultar critérios sugeridos'}
      </button>
      ${this.showCriteria?html`<ul class="learn-v17__criteria">${proposal!.essentialCriteriaPt.map(c=>html`<li>${c}</li>`)}</ul>`:nothing}
      <p class="learn-v17__notice">Rascunho não salvo. Sem correção automática: texto livre exige avaliação humana, e uma paráfrase diferente não é erro por si só.</p>
     </section>`:html`<p role="alert" class="learn-message">A proposta desta etapa não corresponde ao manifesto curricular. O treinamento permanece bloqueado.</p>`}
     ${checkpoint?html`<section class="learn-v17__checkpoint" aria-labelledby="v17-checkpoint-title">
      <p class="learn-v17__eyebrow">CHECKPOINT ${level} · PROPOSTA</p><h2 id="v17-checkpoint-title">O que observar ao final do nível</h2>
      <p>${checkpoint.objectivePt}</p>
      <div class="learn-v17__checkpoint-list">${checkpoint.tasks.map(task=>html`<div><strong>${competencyNames[task.kind]}</strong><p>${task.promptPt}</p><small>Não avaliado</small></div>`)}</div>
      <p class="learn-v17__notice">Compreensão auditiva: não avaliada (gravação homologada indisponível). Produção oral e interação: não avaliadas. Os checkpoints não bloqueiam nenhum módulo.</p>
     </section>`:nothing}
    </div>
   </div>
   <p class="learn-v17__footer">Prévia editorial sem liberação pública: os critérios e cenários necessitam aprovação antes de qualquer avaliação. Esta tela não altera o histórico, progresso, backups ou respostas do catálogo legado.</p>
  </section>`;
 }
}
