import {html,nothing,type PropertyValues} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {snapshot} from './storage';
import {summarize} from './engine';
import {loadCurriculum} from './catalog-loader';
import type {Backup,Language} from './model';
import './progress';
import {studyAreas} from './area-card';
const labels={en:{name:'Inglês',native:'English'},ru:{name:'Russo',native:'Русский'}};
@customElement('learn-page')
export class LearnPage extends LightElement {
  @property() language='';@property({type:Boolean}) invalid=false;
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
    this.contentError=content.status==='rejected';this.loading=false;
  }
  render(){
    if(this.invalid)return html`<section class="learn-message"><h1>Página do Learn não encontrada</h1><p>Escolha Inglês ou Russo para continuar.</p><a class="button" href="#/learn">Selecionar idioma</a></section>`;
    const language=this.language as Language,label=labels[language];
    return html`<article class="learn-page"><header class="learn-heading"><div><p class="learn-eyebrow">2T Learn</p><h1>${label?label.name:'Idiomas'}</h1><p>${label?html`<span lang=${language}>${label.native}</span> · Seu ambiente de estudo`:'Inglês e russo. Escolha seu idioma de estudo.'}</p></div>${label?html`<a class="button button-ghost" href="#/learn">Trocar idioma</a>`:nothing}</header>
      ${this.loading?html`<p role="status" class="learn-message">Carregando progresso local…</p>`:nothing}
      ${this.storageError?html`<div class="learn-message" role="status"><h2>Progresso local indisponível</h2><p>O navegador não permitiu acessar os dados. Nenhum progresso foi apagado. Verifique as permissões ou feche outras abas do Learn.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></div>`:nothing}
      ${!label?html`<section class="learn-languages" aria-label="Selecionar idioma">${(['en','ru'] as Language[]).map(l=>{const name=labels[l],p=this.data?summarize(l,this.data.attempts,this.data.cards):undefined;return html`<a class="learn-language" href=${`#/learn/${l}`}><span class="learn-language-code" aria-hidden="true">${l.toUpperCase()}</span><h2>${name.name}</h2><p lang=${l}>${name.native}</p><div class="learn-language-detail">${this.loading?'Carregando progresso…':!p?'Progresso indisponível':p.attempts||this.data?.cards.some(c=>c.language===l)?`${p.studied} palavras estudadas · ${p.due} revisões pendentes`:'Sem histórico de estudo'}</div><span class="learn-language-access">Selecionar idioma <span aria-hidden="true">↗</span></span></a>`})}</section>`:html`
        ${this.data?html`<learn-progress .progress=${summarize(language,this.data.attempts,this.data.cards)}></learn-progress>`:nothing}
        ${this.contentError?html`<div class="learn-message" role="status"><h2>Não foi possível carregar o catálogo</h2><p>Seu histórico local foi preservado.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></div>`:!this.loading?html`<div class="learn-empty"><h2>Conteúdo em preparação</h2><p>As atividades de ${label.name.toLowerCase()} ainda não estão disponíveis. Seu histórico local, se houver, permanece salvo.</p></div>`:nothing}
        <section aria-labelledby="learn-areas-title"><h2 id="learn-areas-title" class="learn-section-title">Áreas de estudo</h2><div class="learn-areas">${studyAreas.map(([heading,description])=>html`<learn-area-card .heading=${heading} .description=${description}></learn-area-card>`)}</div></section>
      `}
      <p class="learn-privacy">O progresso fica neste navegador e pode ser perdido se o armazenamento for apagado. Não há sincronização entre dispositivos.</p>
    </article>`;
  }
}
