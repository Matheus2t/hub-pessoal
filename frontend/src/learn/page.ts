import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {keyed} from 'lit/directives/keyed.js';
import './activity';
import './advanced';
import type {Curriculum} from './content';
import {snapshot} from './storage';
import {summarize} from './engine';
import {currentPlan,planAttempts} from './planning';
import {loadCurriculum} from './catalog-loader';
import type {Backup,Language} from './model';
import './progress';
import {studyAreas} from './area-card';
const labels={en:{name:'Inglês',native:'English'},ru:{name:'Russo',native:'Русский'}};
@customElement('learn-page')
export class LearnPage extends LightElement {
  @property() language='';@property() activity='';
  @state() private catalog?:Curriculum;@property({type:Boolean}) invalid=false;
  @state() private data?:Backup;
  @state() private loading=true;
  @state() private storageError=false;
  @state() private contentError=false;
  private generation=0;
  protected updated(changes:PropertyValues){if(changes.has('language')||changes.has('invalid'))void this.load()}
  disconnectedCallback(){this.generation++;super.disconnectedCallback()}
  private async load(){
    const generation=++this.generation;
    this.data=undefined;this.storageError=false;this.contentError=false;this.loading=true;
    if(this.invalid){this.loading=false;return}
    const language=this.language as Language;
    const [progress,content]=await Promise.allSettled([snapshot(),language?loadCurriculum(language):Promise.resolve()]);
    if(generation!==this.generation||!this.isConnected)return;
    if(progress.status==='fulfilled')this.data=progress.value;else this.storageError=true;
    this.catalog=content.status==='fulfilled'?(content.value||undefined):undefined;this.contentError=content.status==='rejected';this.loading=false;
  }
  private async refreshProgress(){const generation=this.generation;try{const data=await snapshot();if(generation===this.generation&&this.isConnected)this.data=data}catch{if(generation===this.generation&&this.isConnected)this.storageError=true}}
  render(){
    if(this.invalid)return html`<section class="learn-message"><h1>Página do Learn não encontrada</h1><p>Escolha Inglês ou Russo para continuar.</p><a class="button" href="#/learn">Selecionar idioma</a></section>`;
    const language=this.language as Language,label=labels[language];
    return html`<article class="learn-page"><header class="learn-heading"><div><p class="learn-eyebrow">2T Learn</p><h1>${label?label.name:'Idiomas'}</h1><p>${label?html`<span lang=${language}>${label.native}</span> · Seu ambiente de estudo`:'Inglês e russo. Escolha seu idioma de estudo.'}</p></div>${label?html`<a class="button button-ghost" href="#/learn">Trocar idioma</a>`:nothing}</header>
      ${this.loading?html`<p role="status" class="learn-message">Carregando progresso local…</p>`:nothing}
      ${this.storageError?html`<div class="learn-message" role="status"><h2>Progresso local indisponível</h2><p>O navegador não permitiu acessar os dados. Nenhum progresso foi apagado. Verifique as permissões ou feche outras abas do Learn.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></div>`:nothing}
      ${!label?html`<section class="learn-languages" aria-label="Selecionar idioma">${(['en','ru'] as Language[]).map(l=>{const name=labels[l],p=this.data?summarize(l,this.data.attempts,this.data.cards):undefined;return html`<a class="learn-language" href=${`#/learn/${l}`}><span class="learn-language-code" aria-hidden="true">${l.toUpperCase()}</span><h2>${name.name}</h2><p lang=${l}>${name.native}</p><div class="learn-language-summary"><div class="learn-language-detail">${this.loading?'Carregando progresso…':!p?'Progresso indisponível':p.attempts||this.data?.cards.some(c=>c.language===l)?`${p.studied} palavras estudadas · ${p.due} revisões pendentes`:'Sem histórico de estudo'}</div>${p?html`<p>${p.attempts} atividades realizadas${p.history.length?` · Última: ${new Date(Math.max(...p.history.map(a=>a.at))).toLocaleDateString('pt-BR')}`:''}</p>${this.data&&currentPlan(this.data,l)?html`<p>Plano diário: ${planAttempts(this.data,currentPlan(this.data,l)!).length}/${currentPlan(this.data,l)!.goal} respostas</p>`:html`<p>Plano diário ainda não configurado</p>`}`:nothing}</div><span class="learn-language-access">Selecionar idioma <span aria-hidden="true">↗</span></span></a>`})}</section>`:html`
        ${this.data&&!this.activity?html`<learn-progress .progress=${summarize(language,this.data.attempts,this.data.cards)}></learn-progress>`:nothing}
        ${this.contentError?html`<div class="learn-message" role="status"><h2>Não foi possível carregar o catálogo</h2><p>Seu histórico local foi preservado.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></div>`:nothing}
        ${this.activity?html`<nav class="learn-internal"><a href=${`#/learn/${language}`}>Voltar às áreas de ${label.name}</a></nav>${this.catalog&&this.data?keyed(`${language}:${this.activity}`,html`${['reading','grammar','test','errors','targeted','daily','dashboard','backup','path'].includes(this.activity)?html`<learn-advanced .language=${language} .mode=${this.activity} .catalog=${this.catalog} .progress=${this.data} @progress-saved=${()=>this.refreshProgress()}></learn-advanced>`:html`<learn-activity .language=${language} .mode=${this.activity} .catalog=${this.catalog} .progress=${this.data} @progress-saved=${async()=>{const generation=this.generation;try{const data=await snapshot();if(generation===this.generation&&this.isConnected)this.data=data}catch{this.storageError=true}}}></learn-activity>`}`):nothing}`:html`<nav class="learn-grade learn-hub-nav" aria-label="Acompanhamento"><a class="button" href=${`#/learn/${language}/path`}>Trilha de aprendizado</a><a class="button" href=${`#/learn/${language}/daily`}>Plano diário</a><a class="button" href=${`#/learn/${language}/dashboard`}>Acompanhamento</a><a class="button" href=${`#/learn/${language}/backup`}>Backup</a><a class="button" href=${`#/learn/${language}/errors`}>Caderno de erros</a><a class="button" href=${`#/learn/${language}/targeted`}>Treino direcionado</a></nav><section aria-labelledby="learn-areas-title"><h2 id="learn-areas-title" class="learn-section-title">Áreas de estudo</h2><div class="learn-areas">${studyAreas.map(([heading,description],index)=>{const modes=['vocabulary','flashcards','listening','dictation','writing','reading','grammar','test'];return index<8&&this.catalog?html`<a class="learn-area-link" href=${`#/learn/${language}/${modes[index]}`}><h3>${heading}</h3><p>${description}</p><span>Abrir ↗</span></a>`:html`<learn-area-card .heading=${heading} .description=${description}></learn-area-card>`})}</div></section>`}

      `}
      ${!label?html`<nav class="learn-grade" aria-label="Continuar estudando"><a class="button" href="#/learn/en/daily">Continuar Inglês</a><a class="button" href="#/learn/ru/daily">Continuar Russo</a></nav>`:nothing}<p class="learn-privacy">O progresso fica neste navegador e pode ser perdido se o armazenamento for apagado. Não há sincronização entre dispositivos.</p>
    </article>`;
  }
}
