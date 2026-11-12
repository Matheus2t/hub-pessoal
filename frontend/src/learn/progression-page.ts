import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import type { Curriculum, Exercise } from './content';
import type { Backup, Language, Skill } from './model';
import { progressionSummary, type ProgressionManifest, type ProgressionStage } from './progression';
import './session';

@customElement('learn-progression')
export class LearnProgression extends LightElement {
  @property() language: Language = 'en';
  @property({ attribute: false }) catalog!: Curriculum;
  @property({ attribute: false }) progress!: Backup;
  @state() private manifest?: ProgressionManifest;
  @state() private loading = true;
  @state() private loadError = false;
  @state() private questions: Exercise[] = [];
  @state() private activeStage?: ProgressionStage;
  private generation = 0;

  connectedCallback() { super.connectedCallback(); void this.load(); }
  disconnectedCallback() { this.generation++; super.disconnectedCallback(); }
  protected updated(changes: PropertyValues) { if (changes.has('language') && this.isConnected) void this.load(); }

  private async load() {
    const generation = ++this.generation;
    this.loading = true; this.loadError = false;
    try {
      const response = await fetch('/learn/progression-v12.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Progressão indisponível.');
      const manifest = await response.json() as ProgressionManifest;
      if (manifest.schemaVersion !== 1 || manifest.publicRelease !== false || manifest.cefrCertified !== false || manifest.languageTracks?.en?.stages.length !== 15 || manifest.languageTracks?.ru?.stages.length !== 15) throw new Error('Contrato inválido.');
      if (generation === this.generation && this.isConnected) this.manifest = manifest;
    } catch {
      if (generation === this.generation && this.isConnected) this.loadError = true;
    } finally {
      if (generation === this.generation && this.isConnected) this.loading = false;
    }
  }

  private start(stage: ProgressionStage, skill: 'grammar' | 'reading') {
    const ids = skill === 'grammar' ? stage.grammarQuestionIds : stage.readingQuestionIds;
    const answered = new Set(this.progress.attempts.filter(attempt => attempt.language === this.language).map(attempt => attempt.itemId));
    const remaining = ids.filter(id => !answered.has(id));
    const selected = remaining.length ? remaining : ids;
    this.questions = selected.map(id => this.catalog.exercises.find(exercise => exercise.id === id)).filter((exercise): exercise is Exercise => !!exercise);
    this.activeStage = stage;
  }

  private returnToTrack() { this.questions = []; this.activeStage = undefined; }

  render() {
    if (this.loading) return html`<p class="learn-message" role="status">Carregando progressão…</p>`;
    if (this.loadError || !this.manifest) return html`<section class="learn-message" role="alert"><h2>Progressão indisponível</h2><p>O catálogo e seu histórico continuam preservados.</p><button class="button" @click=${() => this.load()}>Tentar novamente</button></section>`;
    const track = this.manifest.languageTracks[this.language];
    const summary = progressionSummary(track, this.progress, this.language);
    if (this.activeStage && this.questions.length) return html`<button class="button" @click=${this.returnToTrack}>Voltar à progressão</button><p class="learn-muted">${this.activeStage.level} · Etapa ${this.activeStage.sequence} · ${this.activeStage.existingLessonTitle}</p><learn-session .language=${this.language} .mode=${this.questions[0].skill as Skill} .catalog=${this.catalog} .exercises=${this.questions}></learn-session>`;

    return html`<header class="learn-progression-head">
      <div><p class="learn-progression-kicker">${this.language === 'en' ? 'INGLÊS' : 'РУССКИЙ'} · ESTUDO GUIADO</p><h2>Progressão de estudo</h2></div>
      <div class="learn-progression-count"><strong>${summary.completed}/15</strong><span>etapas com atividades respondidas</span></div>
    </header>
    <p class="learn-progression-note">A sequência é uma recomendação. Todas as etapas e o conteúdo legado permanecem disponíveis. Respostas registradas indicam estudo, não domínio nem certificação CEFR.</p>
    ${summary.next ? html`<section class="learn-progression-next" aria-label="Próxima etapa sugerida"><span>PRÓXIMA SUGERIDA</span><strong>${summary.next.level} · ${summary.next.sequence}. ${summary.next.existingLessonTitle}</strong><p>${summary.next.canDoTarget}</p></section>` : html`<p class="learn-message" role="status">As atividades mapeadas para estas etapas já foram respondidas. Você pode revisá-las quando quiser.</p>`}
    <div class="learn-progression-levels">${(['A1', 'A2', 'B1'] as const).map(level => {
      const stages = summary.stages.filter(stage => stage.level === level);
      const guide = track.stageGuides[level];
      return html`<details class="learn-progression-level" .open=${level === (summary.next?.level || 'A1')}><summary><span>${level}</span><small>${guide.label} · ${stages.filter(stage => summary.progress.get(stage.nodeId)!.complete).length}/${stages.length} etapas respondidas</small></summary><p>${guide.exit}</p><div class="learn-progression-stages">${stages.map(stage => {
        const state = summary.progress.get(stage.nodeId)!;
        const isNext = summary.next?.nodeId === stage.nodeId;
        const lesson = this.catalog.lessons?.find(item => item.id === stage.existingLessonId);
        const reading = this.catalog.readings?.find(item => item.id === stage.pairedReadingId);
        const prerequisite = stage.prerequisiteNodeIds.map(id => summary.stages.find(item => item.nodeId === id)).filter((item): item is ProgressionStage => !!item);
        const status = state.complete ? 'Estudo registrado' : state.inProgress ? 'Em andamento' : isNext ? 'Próxima sugerida' : 'Disponível para estudo';
        return html`<article class="learn-progression-stage" aria-labelledby=${`${stage.nodeId}-title`}>
          <div class="learn-progression-stage__top"><span>${stage.level} · ETAPA ${String(stage.sequence).padStart(2, '0')}</span><strong>${status}</strong></div>
          <h3 id=${`${stage.nodeId}-title`}>${stage.existingLessonTitle}</h3>
          <p>${stage.existingObjective}</p>
          <p class="learn-progression-target"><strong>Você vai praticar</strong> ${stage.canDoTarget}</p>
          ${prerequisite.length ? html`<p class="learn-progression-prerequisite">Sequência sugerida após: ${prerequisite.map(item => `${item.level} · ${item.existingLessonTitle}`).join(', ')}. Esta etapa continua disponível.</p>` : nothing}
          <div class="learn-progression-contents"><span>Gramática: ${lesson?.title || stage.existingLessonTitle}</span><span>Leitura: ${reading?.title || stage.pairedReadingId}</span></div>
          <p class="learn-progression-progress">${state.answered}/${state.total} atividades respondidas</p>
          <div class="learn-progression-actions"><button class="button" @click=${() => this.start(stage, 'grammar')}>${this.actionLabel(stage, 'grammar', state.answered > 0)}</button><button class="button" @click=${() => this.start(stage, 'reading')}>${this.actionLabel(stage, 'reading', state.answered > 0)}</button><a href=${`#/learn/${this.language}/grammar`}>Conteúdo</a><a href=${`#/learn/${this.language}/reading`}>Leitura</a></div>
          <details class="learn-progression-details"><summary>Verificação sugerida</summary><p>${stage.checkpointDraft}</p><p class="learn-muted">Sugestão de prática; não é uma avaliação de nível.</p></details>
          <p class="learn-progression-caveat">${stage.linkingCaveat}</p>
        </article>`;
      })}</div></details>`;
    })}</div>
    <aside class="learn-progression-bridges"><strong>Atividades-ponte V11 indisponíveis</strong><p>As 24 propostas aguardam validação docente independente. Roteiros escritos não são áudio e não entram na contagem de progresso.</p></aside>`;
  }

  private actionLabel(stage: ProgressionStage, skill: 'grammar' | 'reading', answeredAny: boolean) {
    const ids = skill === 'grammar' ? stage.grammarQuestionIds : stage.readingQuestionIds;
    const done = ids.every(id => this.progress.attempts.some(attempt => attempt.language === this.language && attempt.itemId === id));
    const name = skill === 'grammar' ? 'Gramática' : 'Leitura';
    return done ? `Revisar ${name}` : answeredAny ? `Continuar ${name}` : `Praticar ${name}`;
  }
}
