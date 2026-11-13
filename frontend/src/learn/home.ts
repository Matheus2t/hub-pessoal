import {html,nothing} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {studyAreas} from './area-card';
import type {Curriculum} from './content';
import type {Backup,Language} from './model';
import {summarize} from './engine';
import {currentPlan,planAttempts} from './planning';
import {isLearnProgressionPreviewEnabled,isLearnReadingV16PreviewEnabled} from './pilot-preview';

const modes = ['vocabulary','flashcards','listening','dictation','writing','reading','grammar','test'] as const;
const descriptions = [
  'Palavras por tema','Revisão de palavras','Ouvir e responder','Ouvir e escrever',
  'Formar frases','Textos e perguntas','Regras e exercícios','Questões do curso',
] as const;
const levels = [
  {code:'A1',focus:'Fundamentos'},
  {code:'A2',focus:'Cotidiano'},
  {code:'B1',focus:'Contexto'},
] as const;
const tools = [
  {route:'daily',name:'Plano diário'},
  {route:'dashboard',name:'Acompanhamento'},
  {route:'errors',name:'Caderno de erros'},
  {route:'targeted',name:'Treino direcionado'},
  {route:'backup',name:'Backup'},
] as const;

/**
 * V20.1 — a direct study menu, not a second landing page.
 * The current public catalog is the only source of actionable exercises.
 * Draft content remains gated by the existing local-preview mechanism.
 */
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
    return html`
      <section class="learn-study" aria-labelledby="learn-study-title">
        <div class="learn-study__heading">
          <h2 id="learn-study-title">O que estudar</h2>
          <a href=${`#/learn/${lang}/path`}>Ver trilha <span aria-hidden="true">↗</span></a>
        </div>
        <div class="learn-study__grid">
          ${studyAreas.map(([heading,description],index)=>this.catalog?html`
            <a class="learn-study__tile" href=${`#/learn/${lang}/${modes[index]}`} aria-label=${`${heading}: ${descriptions[index]}`}>
              <strong>${heading}</strong>
              <span>${descriptions[index]}</span>
              <span class="learn-study__arrow" aria-hidden="true">↗</span>
            </a>`:html`<learn-area-card .heading=${heading} .description=${description}></learn-area-card>`)}
        </div>
      </section>

      <section class="learn-summary" aria-label="Resumo do estudo">
        <dl>
          <div><dt>Respostas</dt><dd>${stats?stats.attempts:'—'}</dd></div>
          <div><dt>Revisões pendentes</dt><dd>${stats?stats.due:'—'}</dd></div>
          <div><dt>Palavras estudadas</dt><dd>${stats?stats.studied:'—'}</dd></div>
        </dl>
        <a href=${`#/learn/${lang}/daily`}>Plano diário${plan?` · ${planCount}/${plan.goal}`:''} <span aria-hidden="true">↗</span></a>
      </section>

      <section class="learn-course" aria-labelledby="learn-course-title">
        <div class="learn-course__top">
          <h2 id="learn-course-title">Níveis de estudo</h2>
          ${isLearnProgressionPreviewEnabled()?html`<a href=${`#/learn/${lang}/progression`}>Prévia da progressão <span aria-hidden="true">↗</span></a>`:nothing}
          <a href=${`#/learn/${lang}/bridges`}>Atividades-ponte <span aria-hidden="true">↗</span></a>
          ${isLearnReadingV16PreviewEnabled()?html`<a href=${`#/learn/${lang}/reading-b1`}>Leitura B1 V16 <span aria-hidden="true">↗</span></a>`:nothing}
        </div>
        <div class="learn-course__levels" aria-label="Referências curriculares A1 a B1">
          ${levels.map(level=>html`<span class="learn-course__level"><strong>${level.code}</strong><span>${level.focus}</span></span>`)}
        </div>
      </section>

      <details class="learn-more">
        <summary>Mais ferramentas <span class="learn-more__chevron" aria-hidden="true"></span></summary>
        <nav aria-label="Ferramentas adicionais de estudo">
          ${tools.map(tool=>html`<a href=${`#/learn/${lang}/${tool.route}`}>${tool.name} <span aria-hidden="true">↗</span></a>`)}
        </nav>
      </details>
    `;
  }
}
