import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Backup,Grade,Language,V17AssessmentAttempt,V17AssessmentData,V17AssessmentDraft,V17CriterionRating} from './model';
import type {ProgressionManifest,ProgressionTrack,ProgressionStage} from './progression';
import {v17ScenariosFor,v17CheckpointsFor,v17Competencies} from './progression-v17-content';
import {isScenarioAlignedV17,studySnapshotV17,recommendNextStageV17} from './progression-v17-policy';
import {isLearnAssessmentV17PreviewEnabled} from './pilot-preview';
import {acceptV17Scenario,fingerprintV17,makeV17Draft,recommendV17,summarizeV17} from './progression-v17-assessment';
import {acceptV17ScenarioLocally,loadV17Assessment,recordV17Review,saveV17Draft,submitV17Draft} from './progression-v17-storage';
import {reviewConsensusV17} from './progression-v17-review-consensus';
import {addV17Reviewer,createFirstV17Reviewer,currentV17Reviewer,hasLocalReviewer,localReviewerNames,loginV17Reviewer,logoutV17Reviewer} from './progression-v17-review-auth';

const levelNames={A1:'Fundamentos',A2:'Comunicação cotidiana',B1:'Contexto e interpretação'} as const;
const competencyNames:Record<string,string>={written_reception:'Compreensão escrita',written_production:'Produção escrita',spoken_reception:'Compreensão auditiva',spoken_production:'Produção oral',interaction:'Interação',contextual_recognition:'Gramática em contexto',retention_transfer:'Retenção e transferência'};
const outcomeNames:Record<string,string>={not_assessed:'Não avaliada',awaiting_review:'Aguardando revisão',uncertain:'Incerta',needs_practice:'Prática recomendada',partially_supported:'Parcial nesta tarefa',supported_for_observed_task:'Observada nesta tarefa',notAssessed:'Não avaliada'};
const criterionNames:Record<V17CriterionRating['criterion'],string>={task:'Cumprimento da tarefa',meaning:'Significado',grammarVocabulary:'Gramática e vocabulário',context:'Adequação ao contexto'};

/** V17 is a loopback-only, human-reviewed formative workflow. It never assigns a level. */
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
 @state() private assessment:V17AssessmentData={schemaVersion:1,drafts:[],acceptances:[],attempts:[]};
 @state() private fingerprints:Record<string,string>={};
 @state() private authReady=false;
 @state() private reviewers:string[]=[];
 @state() private reviewer?:{id:string;name:string};
 @state() private authError='';
 @state() private error='';
 @state() private notice='';
 @state() private busy=false;
 @state() private nameInput='';
 @state() private passwordInput='';
 @state() private confirmPassword='';
 @state() private addName='';
 @state() private addPassword='';
 @state() private acceptChecked=false;
 private generation=0;
 private onReviewerLocked=()=>{this.reviewer=undefined;this.authError='A sessão local expirou. Entre novamente para revisar.';};
 private criteriaViewedAt?:number;
 private saveTimer?:ReturnType<typeof setTimeout>;
 private saveQueue:Promise<unknown>=Promise.resolve();
 connectedCallback(){super.connectedCallback();window.addEventListener('2t-learn-v17-reviewer-locked',this.onReviewerLocked);void this.load();}
 disconnectedCallback(){window.removeEventListener('2t-learn-v17-reviewer-locked',this.onReviewerLocked);this.generation++;if(this.saveTimer)void this.flushDraft();super.disconnectedCallback();}
 protected updated(changes:PropertyValues<this>){
  if(changes.has('language')&&changes.get('language')!==undefined){this.stageId='';this.draft='';this.showCriteria=false;this.selectedLevel='A1';this.criteriaViewedAt=undefined;void this.load();}
 }
 private async load(){
  const token=++this.generation;this.loading=true;this.failed=false;this.authError='';
  try{
   const [response,data]=await Promise.all([fetch('/learn/progression-v12.json',{cache:'no-cache'}),loadV17Assessment(this.language)]);
   if(!response.ok)throw Error('Manifest indisponível.');
   const manifest=await response.json() as ProgressionManifest;
   if(manifest.schemaVersion!==1||manifest.publicRelease!==false||manifest.cefrCertified!==false||manifest.languageTracks.en.stages.length!==15||manifest.languageTracks.ru.stages.length!==15)throw Error('Contrato curricular inválido.');
   const scenarios=v17ScenariosFor(this.language),pairs=await Promise.all(scenarios.map(async scenario=>[scenario.id,await fingerprintV17(scenario)] as const));
   if(token===this.generation&&this.isConnected){
    const track=manifest.languageTracks[this.language];this.track=track;this.assessment=data;this.fingerprints=Object.fromEntries(pairs);
    const firstStage=track.stages.find(stage=>stage.nodeId===this.stageId)||track.stages.find(stage=>stage.level===this.selectedLevel),firstScenario=scenarios.find(item=>item.nodeId===firstStage?.nodeId),firstFingerprint=firstScenario?Object.fromEntries(pairs)[firstScenario.id]:undefined;
    const savedDraft=firstScenario?data.drafts.find(item=>item.scenarioId===firstScenario.id&&item.contentFingerprint===firstFingerprint):undefined;
    this.draft=savedDraft?.response||'';this.criteriaViewedAt=savedDraft?.criteriaViewedAt;
    this.reviewer=currentV17Reviewer();this.reviewers=localReviewerNames();this.authReady=true;
   }
  }catch(error){if(token===this.generation&&this.isConnected){this.failed=true;this.error=error instanceof Error?error.message:'Falha ao carregar os dados locais.';}}
  finally{if(token===this.generation&&this.isConnected)this.loading=false;}
 }
 private selectStage(id:string){
  // Save the previous task while its stage/language context is still active.
  // A fast keyboard/touch navigation must not discard the debounce buffer.
  if(this.saveTimer)void this.flushDraft();
  const scenario=v17ScenariosFor(this.language).find(item=>item.nodeId===id),fingerprint=scenario?this.fingerprints[scenario.id]:undefined;
  const saved=scenario?this.assessment.drafts.find(item=>item.scenarioId===scenario.id&&item.contentFingerprint===fingerprint):undefined;
  this.stageId=id;this.draft=saved?.response||'';this.criteriaViewedAt=saved?.criteriaViewedAt;this.showCriteria=false;this.acceptChecked=false;this.error='';
 }
 private chooseLevel(level:'A1'|'A2'|'B1'){const first=this.track?.stages.find(s=>s.level===level);if(first)this.selectStage(first.nodeId);this.selectedLevel=level;}
 private getActive(stages:ProgressionStage[]){return stages.find(s=>s.nodeId===this.stageId)||stages.find(s=>s.level===this.selectedLevel)||stages[0];}
 private scheduleDraftSave(){
  if(this.saveTimer)clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>{void this.flushDraft()},220);
 }
 private async flushDraft():Promise<boolean>{
  if(this.saveTimer)clearTimeout(this.saveTimer);this.saveTimer=undefined;
  const activeStage=this.track?.stages.find(item=>item.nodeId===this.stageId)||this.track?.stages.find(item=>item.level===this.selectedLevel);
  const scenario=v17ScenariosFor(this.language).find(item=>item.nodeId===activeStage?.nodeId),fingerprint=scenario?this.fingerprints[scenario.id]:undefined;
  if(!scenario||!fingerprint)return false;
  const old=this.assessment.drafts.find(d=>d.scenarioId===scenario.id&&d.contentFingerprint===fingerprint);
  const draft=makeV17Draft(scenario,fingerprint,this.draft,Date.now(),old,this.criteriaViewedAt);
  let saved=false;this.saveQueue=this.saveQueue.then(async()=>{await saveV17Draft(this.language,draft);this.assessment=await loadV17Assessment(this.language);saved=true;}).catch(error=>{this.error=error instanceof Error?error.message:'Não foi possível salvar o rascunho.';});
  await this.saveQueue;return saved;
 }
 private async toggleCriteria(){this.showCriteria=!this.showCriteria;if(this.showCriteria&&!this.criteriaViewedAt)this.criteriaViewedAt=Date.now();await this.flushDraft();}
 private async acceptCurrentScenario(scenario:ReturnType<typeof v17ScenariosFor>[number],fingerprint:string){
  const reviewer=currentV17Reviewer();if(!reviewer){this.error='Entre como revisor local autorizado para aceitar esta proposta.';return;}
  if(!this.acceptChecked){this.error='Confirme que leu o cenário e os critérios antes de aceitá-los para prática privada.';return;}
  this.busy=true;this.error='';try{const acceptance=acceptV17Scenario(scenario,fingerprint,reviewer,Date.now());await acceptV17ScenarioLocally(this.language,acceptance);this.assessment=await loadV17Assessment(this.language);this.notice='Proposta aceita para prática privada local. Isso não é revisão externa nem certificação.';this.acceptChecked=false;}catch(error){this.error=error instanceof Error?error.message:'Não foi possível salvar o aceite.';}finally{this.busy=false;}
 }
 private async submitDraft(scenario:ReturnType<typeof v17ScenariosFor>[number],fingerprint:string){
  if(!this.draft.trim()){this.error='Escreva uma resposta antes de enviar para revisão.';return;}
  if(!this.assessment.acceptances.some(a=>a.scenarioId===scenario.id&&a.contentFingerprint===fingerprint)){this.error='Esta proposta ainda não foi aceita para prática privada.';return;}
  this.busy=true;this.error='';try{if(!await this.flushDraft())throw Error(this.error||'O rascunho não foi salvo; a resposta não foi enviada.');const saved=this.assessment.drafts.find(d=>d.scenarioId===scenario.id&&d.contentFingerprint===fingerprint);if(!saved)throw Error('Rascunho não encontrado.');const attempt=await submitV17Draft(this.language,{scenario,fingerprint,draftId:saved.draftId,submittedAt:Date.now()});this.assessment=await loadV17Assessment(this.language);this.draft='';this.criteriaViewedAt=undefined;this.notice='Resposta registrada como incerta e enviada à revisão humana. Nenhuma correção automática foi aplicada.';this.stageId=scenario.nodeId;this.showCriteria=false;void attempt;}catch(error){this.error=error instanceof Error?error.message:'Não foi possível registrar a resposta.';}finally{this.busy=false;}
 }
 private async setupReviewer(event:Event){event.preventDefault();this.authError='';try{if(this.passwordInput!==this.confirmPassword)throw Error('As senhas não coincidem.');this.reviewer=await createFirstV17Reviewer(this.nameInput,this.passwordInput);this.reviewers=localReviewerNames();this.passwordInput='';this.confirmPassword='';this.nameInput='';}catch(error){this.authError=error instanceof Error?error.message:'Não foi possível criar a conta local.';}}
 private async signIn(event:Event){event.preventDefault();this.authError='';try{this.reviewer=await loginV17Reviewer(this.nameInput,this.passwordInput);this.passwordInput='';this.authError='';}catch(error){this.authError=error instanceof Error?error.message:'Não foi possível entrar.';}}
 private signOut(){logoutV17Reviewer();this.reviewer=undefined;this.authError='';}
 private async registerReviewer(){this.authError='';try{await addV17Reviewer(this.addName,this.addPassword);this.reviewers=localReviewerNames();this.addName='';this.addPassword='';this.notice='Revisor local adicionado neste navegador.';}catch(error){this.authError=error instanceof Error?error.message:'Não foi possível cadastrar o revisor.';}}
 private async submitReview(event:Event,attempt:V17AssessmentAttempt){
  event.preventDefault();const form=event.currentTarget as HTMLFormElement,values=new FormData(form),score=Number(values.get('overall')) as Grade;
  const criteria:V17CriterionRating[]=[
   {criterion:'task',score:Number(values.get('task')) as Grade},
   {criterion:'meaning',score:Number(values.get('meaning')) as Grade},
   {criterion:'grammarVocabulary',score:Number(values.get('grammarVocabulary')) as Grade},
   {criterion:'context',score:Number(values.get('context')) as Grade},
  ];
  const rationale=String(values.get('rationale')||''),feedback={whatWorked:String(values.get('whatWorked')||''),priorityIssue:String(values.get('priorityIssue')||''),concreteSuggestion:String(values.get('concreteSuggestion')||'')};this.busy=true;this.authError='';
  try{const reviewer=currentV17Reviewer();if(!reviewer)throw Error('Sua sessão de revisor expirou. Entre novamente.');await recordV17Review(this.language,{attemptId:attempt.attemptId,reviewer,score,criteria,rationale,feedback,now:Date.now()});this.assessment=await loadV17Assessment(this.language);this.notice='Revisão acrescentada ao histórico. A resposta original foi preservada.';form.reset();}
  catch(error){this.authError=error instanceof Error?error.message:'Não foi possível salvar a revisão.';}finally{this.busy=false;}
 }
 private renderReviewerPanel(){
  if(!this.authReady)return html`<section class="learn-v17__reviewer"><p role="status">Verificando acesso local…</p></section>`;
  const pending=this.assessment.attempts.filter(a=>a.reviewStatus==='awaiting_review'||a.reviewStatus==='disputed'||reviewConsensusV17(a.reviews).disputed);
  return html`<section class="learn-v17__reviewer" aria-labelledby="v17-review-title">
   <div class="learn-v17__reviewer-head"><div><p class="learn-v17__eyebrow">ACESSO LOCAL</p><h2 id="v17-review-title">Revisão humana</h2><p>Credenciais só ficam neste navegador. A revisão não é enviada a serviços externos.</p></div>${this.reviewer?html`<button class="button" type="button" @click=${()=>this.signOut()}>Sair · ${this.reviewer.name}</button>`:nothing}</div>
   ${!this.reviewer?this.renderAuthForm():html`<div class="learn-v17__reviewer-tools">
    <div class="learn-v17__accept-form">
     <strong>Revisores neste navegador</strong><span>${this.reviewers.join(' · ')}</span>
     <label><input type="text" minlength="2" maxlength="60" autocomplete="name" .value=${this.addName} @input=${(e:Event)=>this.addName=(e.target as HTMLInputElement).value} placeholder="Nome do novo revisor" aria-label="Nome do novo revisor"></label>
     <label><input type="password" minlength="16" maxlength="256" autocomplete="new-password" .value=${this.addPassword} @input=${(e:Event)=>this.addPassword=(e.target as HTMLInputElement).value} placeholder="Senha (16 caracteres ou mais)" aria-label="Senha do novo revisor"></label>
     <button class="button" type="button" @click=${()=>void this.registerReviewer()}>Adicionar revisor</button>
     <p class="learn-v17__notice">Cadastro local protege o uso casual deste navegador; não substitui identidade institucional nem uma revisão externa independente.</p>
    </div>
    <div class="learn-v17__pending-list"><h3>Respostas para revisar <span>${pending.length}</span></h3>
     ${pending.length?pending.map(attempt=>this.renderReviewCard(attempt)):html`<p>Nenhuma resposta pendente.</p>`}
    </div>
   </div>`}
   ${this.authError?html`<p role="alert" class="learn-v17__error">${this.authError}</p>`:nothing}
  </section>`;
 }
 private renderAuthForm(){
  if(!hasLocalReviewer())return html`<form class="learn-v17__auth-form" @submit=${(e:Event)=>void this.setupReviewer(e)}>
   <p>Crie a primeira credencial de revisor deste navegador. Use uma senha única com 16 ou mais caracteres; ela não é enviada nem exportada.</p>
   <label>Nome do revisor<input required minlength="2" maxlength="60" autocomplete="name" .value=${this.nameInput} @input=${(e:Event)=>this.nameInput=(e.target as HTMLInputElement).value}></label>
   <label>Senha local<input required type="password" minlength="16" maxlength="256" autocomplete="new-password" .value=${this.passwordInput} @input=${(e:Event)=>this.passwordInput=(e.target as HTMLInputElement).value}></label>
   <label>Confirme a senha<input required type="password" minlength="16" maxlength="256" autocomplete="new-password" .value=${this.confirmPassword} @input=${(e:Event)=>this.confirmPassword=(e.target as HTMLInputElement).value}></label>
   <button class="button primary" ?disabled=${this.busy}>Criar acesso local</button>
  </form>`;
  return html`<form class="learn-v17__auth-form" @submit=${(e:Event)=>void this.signIn(e)}>
   <label>Conta local<select required .value=${this.nameInput} @change=${(e:Event)=>this.nameInput=(e.target as HTMLSelectElement).value}><option value="">Selecione</option>${this.reviewers.map(name=>html`<option value=${name}>${name}</option>`)}</select></label>
   <label>Senha<input required type="password" autocomplete="current-password" .value=${this.passwordInput} @input=${(e:Event)=>this.passwordInput=(e.target as HTMLInputElement).value}></label>
   <button class="button primary" ?disabled=${this.busy}>Entrar para revisar</button>
  </form>`;
 }
 private renderReviewCard(attempt:V17AssessmentAttempt){
  const requiresOther=attempt.reviewStatus==='disputed'||reviewConsensusV17(attempt.reviews).disputed;
  return html`<details class="learn-v17__review-card"><summary><span>${attempt.level} · ${competencyNames[attempt.competency]}</span><strong>${requiresOther?'Divergência · requer outro revisor':'Aguardando revisão'}</strong></summary>
   <p>${attempt.prompt}</p><blockquote lang=${attempt.language}>${attempt.response}</blockquote>
   ${attempt.assistanceBeforeSubmission.length?html`<p class="learn-v17__notice">Ajuda consultada antes do envio: ${attempt.assistanceBeforeSubmission.join(', ')}. Não classificar como produção independente.</p>`:html`<p class="learn-v17__notice">Nenhuma ajuda prévia registrada.</p>`}
   ${attempt.reviews.length?html`<ol class="learn-v17__review-history">${attempt.reviews.map(r=>html`<li><strong>${r.reviewerName} · ${r.score}/3</strong><span>${r.rationale}</span></li>`)}</ol>`:nothing}
   <form class="learn-v17__rating-form" @submit=${(e:Event)=>void this.submitReview(e,attempt)}>
    ${(['task','meaning','grammarVocabulary','context'] as const).map(key=>html`<label>${criterionNames[key]}<select name=${key} required><option value="">Selecione</option>${([0,1,2,3] as const).map(score=>html`<option value=${score}>${score} · ${['Não atende','Muito limitado','Parcial','Atende nesta tarefa'][score]}</option>`)}</select></label>`)}
    <label>Resultado global da tarefa<select name="overall" required><option value="">Selecione</option>${([0,1,2,3] as const).map(score=>html`<option value=${score}>${score} · ${['Não atende','Muito limitado','Parcial','Atende nesta tarefa'][score]}</option>`)}</select></label>
    <label>O que funcionou<textarea name="whatWorked" required minlength="8" maxlength="700" rows="2"></textarea></label>
    <label>Questão principal<textarea name="priorityIssue" required minlength="8" maxlength="700" rows="2"></textarea></label>
    <label>Próximo passo concreto<textarea name="concreteSuggestion" required minlength="8" maxlength="700" rows="2"></textarea></label>
    <label>Justificativa específica<textarea name="rationale" required minlength="12" maxlength="1200" rows="3" placeholder="Indique trechos da resposta e explique a avaliação."></textarea></label>
    <p class="learn-v17__notice">Rubrica provisória: 0 = incompatível ou sentido comprometido; 1 = elementos isolados que não cumprem a tarefa; 2 = sentido central parcial ou erro relevante; 3 = tarefa inteligível cumprida, admitindo erros pequenos. A nota é uma avaliação humana desta resposta, não determina nível. Divergências aguardam consenso de revisores distintos.</p>
    <button class="button primary" ?disabled=${this.busy}>Registrar revisão sem apagar o histórico</button>
   </form>
  </details>`;
 }
 render(){
  if(!isLearnAssessmentV17PreviewEnabled())return html`<p role="status">Prévia de avaliação indisponível no site público.</p>`;
  if(this.loading)return html`<p role="status" class="learn-message">Carregando dados locais V17…</p>`;
  if(this.failed||!this.track)return html`<section class="learn-message" role="alert"><h2>Etapas indisponíveis</h2><p>Seu histórico foi preservado. ${this.error}</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></section>`;
  if(!this.progress)return html`<p class="learn-message" role="status">Carregando histórico local para separar estudo e avaliação…</p>`;
  const stages=[...this.track.stages].sort((a,b)=>a.sequence-b.sequence),proposals=v17ScenariosFor(this.language),checkpoints=v17CheckpointsFor(this.language);
  const next=recommendNextStageV17(stages,this.progress.attempts,this.language),totalStudied=stages.filter(s=>studySnapshotV17(s,this.progress!.attempts,this.language).complete).length;
  const active=this.getActive(stages),proposal=proposals.find(p=>p.nodeId===active.nodeId),stageState=studySnapshotV17(active,this.progress.attempts,this.language);
  const level=this.selectedLevel,checkpoint=checkpoints.find(c=>c.level===level),aligned=!!proposal&&isScenarioAlignedV17(active,proposal),fingerprint=proposal?this.fingerprints[proposal.id]:'';
  const accepted=!!proposal&&this.assessment.acceptances.some(a=>a.scenarioId===proposal.id&&a.contentFingerprint===fingerprint),currentDraft=proposal?this.assessment.drafts.find(d=>d.scenarioId===proposal.id&&d.contentFingerprint===fingerprint):undefined;
  const recommendation=proposal?recommendV17(proposal,this.assessment,fingerprint,stageState.answered):undefined;
  const attempt=proposal?[...this.assessment.attempts].filter(a=>a.scenarioId===proposal.id&&a.contentFingerprint===fingerprint).sort((a,b)=>b.submittedAt-a.submittedAt)[0]:undefined;
  const consensus=attempt?reviewConsensusV17(attempt.reviews):undefined;
  const effectiveDispute=!!consensus?.disputed;
  const latestReview=consensus?.consensus===undefined?attempt?.reviews.at(-1):[...attempt.reviews].reverse().find(r=>r.score===consensus.consensus);
  const summary=summarizeV17(this.assessment,proposals,new Map(Object.entries(this.fingerprints)));
  return html`<section class="learn-v17" aria-labelledby="learn-v17-title">
   <header class="learn-v17__head"><div><p class="learn-v17__eyebrow">LEARN · V17 · PRÉVIA INTERNA</p><h1 id="learn-v17-title">Progressão A1–B1</h1><p>Estudo registrado, evidências por tarefa e sugestões reversíveis. Sem notas automáticas ou certificação.</p></div><a class="button" href=${`#/learn/${this.language}`}>Voltar ao Learn</a></header>
   <div class="learn-v17__overview" aria-label="Resumo de acompanhamento">
    <div><span>Etapas com estudo registrado</span><strong>${totalStudied} <small>/ 15</small></strong><p>Atividades distintas respondidas no idioma</p></div>
    <div><span>Competência comprovada</span><strong>Não avaliada</strong><p>Os resultados se referem somente a tarefas observadas</p></div>
    <div><span>Próxima atividade sugerida</span><strong>${next?`${next.level} · ${String(next.sequence).padStart(2,'0')}`:'Revisar'}</strong><p>${next?.existingLessonTitle||'Todas as etapas continuam disponíveis'}</p></div>
   </div>
   <p class="learn-v17__notice">As 15 etapas de cada idioma continuam acessíveis. Estudo registrado não é domínio A1, A2 ou B1.</p>
   <nav class="learn-v17__levels" aria-label="Níveis curriculares">${(['A1','A2','B1'] as const).map(l=>html`<button type="button" class="button" aria-pressed=${l===level} @click=${()=>this.chooseLevel(l)}><strong>${l}</strong><span>${levelNames[l]}</span><small>${stages.filter(s=>s.level===l&&studySnapshotV17(s,this.progress!.attempts,this.language).complete).length}/${stages.filter(s=>s.level===l).length} estudadas</small></button>`)}</nav>
   <div class="learn-v17__layout">
    <aside class="learn-v17__sidebar"><label for="v17-stage-select">Etapa de estudo</label><select id="v17-stage-select" .value=${active.nodeId} @change=${(e:Event)=>this.selectStage((e.target as HTMLSelectElement).value)}>${stages.filter(s=>s.level===level).map(s=>html`<option value=${s.nodeId}>${s.sequence}. ${s.existingLessonTitle}</option>`)}</select>
     <p class="learn-v17__sidebar-muted">Dados separados por idioma: ${this.language==='ru'?'Russo':'Inglês'}.</p><h3>Evidências por competência</h3><ul class="learn-v17__competencies">${v17Competencies.map(c=>{const rows=summary.filter(r=>r.competency===c.id),counts=[['needs_practice','para praticar','para praticar'],['partially_supported','parcial','parciais'],['supported_for_observed_task','observada nesta tarefa','observadas nesta tarefa'],['awaiting_review','aguardando revisão','aguardando revisão'],['uncertain','incerta','incertas']] as const,labels=counts.filter(([status])=>rows.some(r=>r.status===status)).map(([status,singular,plural])=>{const count=rows.filter(r=>r.status===status).length;return `${count} ${count===1?singular:plural}`});const assisted=rows.filter(r=>r.assisted).length;if(assisted)labels.push(`${assisted} com ajuda`);return html`<li><span>${competencyNames[c.id]}</span><small>${labels.length?labels.join(' · '):'Não avaliada'}</small></li>`})}</ul>
    </aside>
    <div class="learn-v17__content">
     <article class="learn-v17__stage" aria-labelledby="v17-stage-title"><div class="learn-v17__meta"><span>${active.level} · ETAPA ${String(active.sequence).padStart(2,'0')}</span><span>${stageState.studyState==='activities_answered'?'Estudo registrado':stageState.studyState==='in_progress'?'Em andamento':'Não iniciada'}</span></div><h2 id="v17-stage-title">${active.existingLessonTitle}</h2><p class="learn-v17__target">${active.canDoTarget}</p>
      <div class="learn-v17__progress"><div role="progressbar" aria-label="Atividades distintas respondidas" aria-valuemin="0" aria-valuemax=${stageState.total} aria-valuenow=${stageState.answered}><span style=${`width:${stageState.total?stageState.answered/stageState.total*100:0}%`}></span></div><p>${stageState.answered}/${stageState.total} atividades distintas respondidas · Avaliação de nível indisponível</p></div>
      <div class="learn-v17__practice"><a class="button" href=${`#/learn/${this.language}/grammar`}>Praticar gramática</a><a class="button" href=${`#/learn/${this.language}/reading`}>Praticar leitura</a></div>
     </article>
     ${aligned&&proposal?html`<section class="learn-v17__scenario" aria-labelledby="v17-scenario-title"><p class="learn-v17__eyebrow">CENÁRIO EDITORIAL · PRÁTICA LOCAL</p><h2 id="v17-scenario-title">Aplicar em uma situação nova</h2><p>${proposal.independentScenarioPt}</p>
      <p class="learn-v17__notice">Responda ${this.language==='ru'?'em russo, usando cirílico':'em inglês'}. A proposta requer aceite editorial local; respostas abertas ficam incertas até revisão humana.</p>
      <label>Resposta para revisão humana<textarea rows="5" maxlength="2300" autocomplete="off" lang=${this.language} .value=${this.draft} @input=${(e:Event)=>{this.draft=(e.target as HTMLTextAreaElement).value;this.error='';this.scheduleDraftSave()}} @blur=${()=>void this.flushDraft()} placeholder="Escreva sua resposta…"></textarea></label>
      <button type="button" class="button" aria-expanded=${this.showCriteria} @click=${()=>void this.toggleCriteria()}>${this.showCriteria?'Ocultar critérios':'Consultar critérios sugeridos'}</button>
      ${this.showCriteria?html`<ul class="learn-v17__criteria">${proposal.essentialCriteriaPt.map(c=>html`<li>${c}</li>`)}</ul>`:nothing}
      ${recommendation?html`<div class="learn-v17__recommendation" role="status"><strong>Recomendação para esta tarefa</strong><p>${recommendation.message}</p><small>Base: ${recommendation.basis==='reviewed'?'revisão humana desta proposta':recommendation.basis==='pending'?'resposta aguardando revisão':recommendation.basis==='legacy_study'?'estudo legado, sem alegação de domínio':'evidência ainda indisponível'}</small></div>`:nothing}
      ${!accepted?html`<div class="learn-v17__accept"><p>Rascunho não pontuado. Um revisor autenticado deve ler e aceitar esta proposta para uso privado. Isso não substitui revisão independente nem piloto.</p>${this.reviewer?html`<label class="learn-v17__check"><input type="checkbox" .checked=${this.acceptChecked} @change=${(e:Event)=>this.acceptChecked=(e.target as HTMLInputElement).checked}>Li o cenário e aceito seu uso em prática formativa privada.</label><button class="button" ?disabled=${this.busy} @click=${()=>void this.acceptCurrentScenario(proposal,fingerprint)}>Aceitar para prática local</button>`:html`<p>Entre em “Revisão humana” abaixo para habilitar o aceite local.</p>`}</div>`:html`<div class="learn-v17__accepted"><strong>Aceita para prática privada local</strong><p>Este aceite não valida o material externamente nem habilita publicação.</p><button class="button primary" ?disabled=${this.busy||!this.draft.trim()||attempt?.reviewStatus==='awaiting_review'||attempt?.reviewStatus==='disputed'||effectiveDispute} @click=${()=>void this.submitDraft(proposal,fingerprint)}>${attempt?.reviewStatus==='awaiting_review'||attempt?.reviewStatus==='disputed'||effectiveDispute?'Revisão pendente':'Enviar resposta para revisão'}</button></div>`}
      ${currentDraft?html`<p class="learn-v17__saved" role="status">Rascunho salvo neste navegador · ${new Date(currentDraft.updatedAt).toLocaleString()}</p>`:nothing}
      ${attempt?html`<div class="learn-v17__attempt-state" role="status"><strong>${outcomeNames[attempt.reviewStatus==='reviewed'&&!effectiveDispute?attempt.outcome:attempt.reviewStatus==='disputed'||effectiveDispute?'uncertain':'awaiting_review']}</strong><span>${attempt.reviewStatus==='reviewed'&&!effectiveDispute?'Resultado limitado a esta tarefa; sem inferência de nível.':attempt.reviewStatus==='disputed'||effectiveDispute?'Há divergência entre revisores; permanece incerta.':'A resposta original foi preservada e aguarda revisão humana.'}</span>${attempt.reviewStatus==='reviewed'&&!effectiveDispute&&latestReview?html`<dl class="learn-v17__learner-feedback"><div><dt>O que funcionou</dt><dd>${latestReview.whatWorked}</dd></div><div><dt>Questão principal</dt><dd>${latestReview.priorityIssue}</dd></div><div><dt>Próximo passo</dt><dd>${latestReview.concreteSuggestion}</dd></div><div><dt>Revisor</dt><dd>${latestReview.reviewerName} · rubrica provisória</dd></div></dl>`:nothing}</div>`:nothing}
      ${this.error?html`<p role="alert" class="learn-v17__error">${this.error}</p>`:nothing}${this.notice?html`<p role="status" class="learn-v17__saved">${this.notice}</p>`:nothing}
     </section>`:html`<p role="alert" class="learn-message">A proposta desta etapa não corresponde ao manifesto curricular. Nenhuma avaliação foi habilitada.</p>`}
     ${checkpoint?html`<section class="learn-v17__checkpoint" aria-labelledby="v17-checkpoint-title"><p class="learn-v17__eyebrow">CHECKPOINT ${level} · RASCUNHO</p><h2 id="v17-checkpoint-title">O que observar ao final do nível</h2><p>${checkpoint.objectivePt}</p><div class="learn-v17__checkpoint-list">${checkpoint.tasks.map(task=>html`<div><strong>${competencyNames[task.kind]}</strong><p>${task.promptPt}</p><small>Não avaliado</small></div>`)}</div><p class="learn-v17__notice">Listening sem áudio aprovado, produção oral e interação permanecem não avaliados. Checkpoints não bloqueiam módulos.</p></section>`:nothing}
    </div>
   </div>
   ${this.renderReviewerPanel()}
   <p class="learn-v17__footer">Prévia restrita a localhost. Rubrica e conteúdo são provisórios; nenhuma nota automática, proficiência CEFR ou certificação é atribuída. Histórico e respostas permanecem no armazenamento deste navegador e seguem nos backups locais v3.</p>
  </section>`;
 }
}
