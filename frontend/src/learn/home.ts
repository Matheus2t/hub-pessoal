import {html,nothing} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {studyAreas} from './area-card';
import type {Curriculum} from './content';
import type {Backup,Language} from './model';
import {summarize} from './engine';
import {currentPlan,planAttempts} from './planning';
import {isLearnProgressionPreviewEnabled} from './pilot-preview';

const modes = ['vocabulary','flashcards','listening','dictation','writing','reading','grammar','test'] as const;
const notes = ['Consultar e ampliar repertório','Revisão espaçada','Escuta e compreensão','Escrita a partir do áudio','Produção de frases','Leitura em contexto','Estruturas do idioma','Conferir o aprendizado'] as const;
const levels = [
  {level:'A1',name:'Fundamentos',description:'Primeiros textos, estruturas e vocabulário.',count:4},
  {level:'A2',name:'Uso cotidiano',description:'Rotinas, mensagens, situações e decisões simples.',count:6},
  {level:'B1',name:'Compreensão em contexto',description:'Explicações, escolhas, leitura e conexões de ideias.',count:5},
] as const;
const tools = [
  {route:'path',name:'Trilha de aprendizado',note:'Organizar os assuntos'},
  {route:'daily',name:'Plano diário',note:'Definir a sessão'},
  {route:'dashboard',name:'Acompanhamento',note:'Consultar seu histórico'},
  {route:'errors',name:'Caderno de erros',note:'Revisar dificuldades'},
  {route:'targeted',name:'Treino direcionado',note:'Praticar pontos específicos'},
  {route:'backup',name:'Backup',note:'Guardar seu progresso'},
] as const;

/** Study-first navigation for the existing public catalog; never exposes editorial drafts. */
@customElement('learn-home')
export class LearnHome extends LightElement {
  @property() language:Language='en';
  @property({attribute:false}) catalog?:Curriculum;
  @property({attribute:false}) progress?:Backup;

  render(){
    const lang=this.language;
    const stats=this.progress?summarize(lang,this.progress.attempts,this.progress.cards):undefined;
    const plan=this.progress?currentPlan(this.progress,lang):undefined;
    const planCount=plan&&this.progress?planAttempts(this.progress,plan).length:0;
    const progressionPreview=isLearnProgressionPreviewEnabled();
    return html`
      <section class="learn-curriculum" aria-labelledby="learn-curriculum-title">
        <div class="learn-curriculum__main">
          <p class="learn-kicker">ESTUDO / ${lang.toUpperCase()} · A1—B1</p>
          <h2 id="learn-curriculum-title">Organize o estudo. Depois, pratique.</h2>
          <p class="learn-curriculum__desc">Uma trilha para consultar o conteúdo e sessões curtas para praticar cada habilidade.</p>
          <div class="learn-curriculum__actions">
            <a class="button primary" href=${`#/learn/${lang}/path`}>Explorar trilha <span aria-hidden="true">↗</span></a>
            <a class="button" href=${`#/learn/${lang}/daily`}>Plano de hoje</a>
            ${progressionPreview?html`<a class="learn-curriculum__preview" href=${`#/learn/${lang}/progression`}>Abrir progressão A1–B1 (prévia local)</a>`:nothing}
          </div>
        </div>
        <aside class="learn-curriculum__metrics" aria-label="Resumo do estudo">
          <span class="learn-kicker">SEU ESTUDO</span>
          <dl>
            <div><dt>Respostas registradas</dt><dd>${stats?stats.attempts:'—'}</dd></div>
            <div><dt>Revisões pendentes</dt><dd>${stats?stats.due:'—'}</dd></div>
          </dl>
          <p>${plan?`Plano diário: ${planCount}/${plan.goal} respostas`:'Plano diário ainda não configurado'}</p>
        </aside>
      </section>

      <section class="learn-level-map" aria-labelledby="learn-level-map-title">
        <div class="learn-section-heading">
          <div><p class="learn-kicker">01 / CAMINHO</p><h2 id="learn-level-map-title">Do básico à interpretação</h2></div>
          <span>Etapas sugeridas · acesso livre ao conteúdo</span>
        </div>
        <div class="learn-level-map__grid">
          ${levels.map((item,i)=>html`<a class="learn-level-card" href=${`#/learn/${lang}/path`} aria-label=${`Ver trilha de ${item.level}, ${item.name}`}>
            <div class="learn-level-card__top"><span>${item.level}</span><span>${String(i+1).padStart(2,'0')} / 03</span></div>
            <h3>${item.name}</h3><p>${item.description}</p>
            <div class="learn-level-card__footer"><span>${item.count} etapas previstas na progressão</span><span aria-hidden="true">↗</span></div>
          </a>`)}
        </div>
        <p class="learn-level-map__note">A1–B1 organiza objetivos de estudo. Atividades respondidas não significam certificação ou domínio do nível.</p>
      </section>

      <section class="learn-workspace" aria-label="Estudos e organização">
        <aside class="learn-workspace__rail" aria-labelledby="learn-tools-title">
          <div class="learn-section-heading"><div><p class="learn-kicker">02 / ORGANIZAÇÃO</p><h2 id="learn-tools-title">Seu espaço</h2></div></div>
          <nav class="learn-hub-nav" aria-label="Organização do estudo">${tools.map(item=>html`
            <a class="button" href=${`#/learn/${lang}/${item.route}`}><strong>${item.name}</strong><small>${item.note}</small></a>
          `)}</nav>
          <p class="learn-workspace__footnote">Seu histórico permanece salvo neste navegador. Use Backup para guardar uma cópia.</p>
        </aside>
        <section class="learn-workspace__content" aria-labelledby="learn-areas-title">
          <div class="learn-section-heading">
            <div><p class="learn-kicker">03 / MODALIDADES</p><h2 id="learn-areas-title">Escolha como praticar</h2></div>
            <span>08 modalidades</span>
          </div>
          <div class="learn-areas">${studyAreas.map(([heading,description],index)=>this.catalog?html`
            <a class="learn-area-link" href=${`#/learn/${lang}/${modes[index]}`}>
              <span class="learn-area-link__index">${String(index+1).padStart(2,'0')} / 08</span>
              <div class="learn-area-link__body"><span class="learn-area-link__category">${notes[index]}</span><h3>${heading}</h3><p>${description}</p></div>
              <span class="learn-area-link__action">Abrir atividade <span aria-hidden="true">↗</span></span>
            </a>`:html`<learn-area-card .heading=${heading} .description=${description}></learn-area-card>`)}</div>
          <p class="learn-workspace__availability">Listening e ditado existentes continuam disponíveis para prática conforme o conteúdo e o áudio presente. Novos roteiros sem gravação aprovada não aparecem nesta área.</p>
        </section>
      </section>
    `;
  }
}
