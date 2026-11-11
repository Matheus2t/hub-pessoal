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
import './pilot-page';
import {isLearnC1PreviewEnabled} from './pilot-preview';
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
  private previousActivity='';
  protected updated(changes:PropertyValues){const activityChanged=changes.has('activity');if(changes.has('language')||changes.has('invalid')||activityChanged&&(this.activity==='pilot-c1'||this.previousActivity==='pilot-c1'))void this.load();if(activityChanged)this.previousActivity=this.activity}
  disconnectedCallback(){this.generation++;super.disconnectedCallback()}
  private async load(){
    const generation=++this.generation;
    this.data=undefined;this.storageError=false;this.contentError=false;this.loading=true;
    if(this.invalid){this.loading=false;return}
    if(this.activity==='pilot-c1'&&isLearnC1PreviewEnabled()){this.catalog=undefined;this.loading=false;return;}
    const language=this.language as Language;
    const [progress,content]=await Promise.allSettled([snapshot(),language?loadCurriculum(language):Promise.resolve()]);
    if(generation!==this.generation||!this.isConnected)return;
    if(progress.status==='fulfilled')this.data=progress.value;else this.storageError=true;
    this.catalog=content.status==='fulfilled'?(content.value||undefined):undefined;this.contentError=content.status==='rejected';this.loading=false;
  }
  private async refreshProgress(){const generation=this.generation;try{const data=await snapshot();if(generation===this.generation&&this.isConnected)this.data=data}catch{if(generation===this.generation&&this.isConnected)this.storageError=true}}
  render(){
    if(this.invalid)return html`<section class="learn-message"><h1>Página do Learn não encontrada</h1><p>Escolha Inglês ou Russo para continuar.</p><a class="button" href="#/learn">Selecionar idioma</a></section>`;
    if(this.activity==='pilot-c1')return isLearnC1PreviewEnabled()?html`<article class="learn-page learn-page--activity learn-page--pilot"><learn-c1-pilot></learn-c1-pilot></article>`:html`<section class="learn-message" role="status"><h1>Prévia indisponível</h1><p>Esta aula só abre em uma prévia controlada do Learn.</p><a class="button" href="#/learn/en">Voltar ao Inglês</a></section>`;
    const language=this.language as Language,label=labels[language];
    return html`<article class=${`learn-page ${label?"learn-page--language":"learn-page--index"} ${this.activity?"learn-page--activity":"learn-page--hub"}`}>
      ${label?html`<header class="learn-hero">
        <div class="learn-hero__copy">
          <div class="learn-hero__topline"><span class="learn-hero__brand">2T / LEARN</span><span class="learn-hero__category">${label?"AMBIENTE DE ESTUDO":"IDIOMAS"}</span></div>
          <h1 class="learn-hero__title">${label?label.name:"Learn"}</h1>
          <p class="learn-hero__description">${label?html`<span lang=${language}>${label.native}</span> · Seu ambiente de estudo`:"Inglês e russo. Escolha seu idioma de estudo."}</p>
          ${label?html`<a class="learn-hero__switch" href="#/learn">Trocar idioma <span aria-hidden="true">↗</span></a>`:nothing}
        </div>
        <div class="learn-hero__art" aria-hidden="true"><span class="learn-hero__art-label">LANGUAGE / STUDY</span><span class="learn-hero__art-symbol">${label?(language==="en"?"EN":"RU"):"2T"}</span><span class="learn-hero__art-foot">ENGLISH · РУССКИЙ</span></div>
      </header>`:nothing}
      ${label&&language==='en'&&this.activity===''&&isLearnC1PreviewEnabled()?html`<nav class="learn-c1-preview-link" aria-label="Prévia interna"><a class="button" href="#/learn/en/pilot-c1">Aula-piloto de Inglês <span aria-hidden="true">↗</span></a></nav>`:nothing}
      ${this.loading?html`<p role="status" class="learn-message">Carregando progresso local…</p>`:nothing}
      ${this.storageError?html`<div class="learn-message" role="status"><h2>Progresso local indisponível</h2><p>O navegador não permitiu acessar os dados. Nenhum progresso foi apagado. Verifique as permissões ou feche outras abas do Learn.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></div>`:nothing}
      ${!label?html`<section class="learn-language-section" aria-labelledby="learn-select-title">
        <div class="learn-section-intro"><div><span class="learn-section-intro__index">01 / IDIOMAS</span><h1 id="learn-select-title">Escolha o idioma</h1></div><span class="learn-section-intro__aside">02 opções disponíveis</span></div>
        <div class="learn-languages" aria-label="Selecionar idioma">
          ${(["en","ru"] as Language[]).map((l,i)=>{const name=labels[l],p=this.data?summarize(l,this.data.attempts,this.data.cards):undefined;const plan=this.data?currentPlan(this.data,l):undefined;return html`<a class="learn-language" href=${`#/learn/${l}`}>
            <span class="learn-language-code" aria-hidden="true">${String(i+1).padStart(2,"0")} / ${l.toUpperCase()}</span>
            <div class="learn-language__identity"><span class="learn-language__glyph" aria-hidden="true">${l==="en"?"A":"Я"}</span><h2>${name.name}</h2><p lang=${l}>${name.native}</p></div>
            <div class="learn-language-summary">
              <div class="learn-language-detail">${this.loading?"Carregando progresso…":!p?"Progresso indisponível":p.attempts||this.data?.cards.some(c=>c.language===l)?`${p.studied} palavras estudadas · ${p.due} revisões pendentes`:"Sem histórico de estudo"}</div>
              ${p?html`<p>${p.attempts} atividades realizadas${p.history.length?` · Última: ${new Date(Math.max(...p.history.map(a=>a.at))).toLocaleDateString("pt-BR")}`:""}</p><p>${plan?`Plano diário: ${planAttempts(this.data!,plan).length}/${plan.goal} respostas`:"Plano diário ainda não configurado"}</p>`:nothing}
            </div>
            <span class="learn-language-access">Selecionar idioma <span aria-hidden="true">↗</span></span>
          </a>`})}
        </div>
      </section>`:html`
        ${this.data&&!this.activity?html`<learn-progress .progress=${summarize(language,this.data.attempts,this.data.cards)}></learn-progress>`:nothing}
        ${this.contentError?html`<div class="learn-message" role="status"><h2>Não foi possível carregar o catálogo</h2><p>Seu histórico local foi preservado.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></div>`:nothing}
        ${this.activity?html`<nav class="learn-internal"><a href=${`#/learn/${language}`}>Voltar às áreas de ${label.name}</a></nav>${this.catalog&&this.data?keyed(`${language}:${this.activity}`,html`${['reading','grammar','test','errors','targeted','daily','dashboard','backup','path'].includes(this.activity)?html`<learn-advanced .language=${language} .mode=${this.activity} .catalog=${this.catalog} .progress=${this.data} @progress-saved=${()=>this.refreshProgress()}></learn-advanced>`:html`<learn-activity .language=${language} .mode=${this.activity} .catalog=${this.catalog} .progress=${this.data} @progress-saved=${async()=>{const generation=this.generation;try{const data=await snapshot();if(generation===this.generation&&this.isConnected)this.data=data}catch{this.storageError=true}}}></learn-activity>`}`):nothing}`:html`<section class="learn-workspace" aria-label="Estudos e organização"><aside class="learn-workspace__rail"><div class="learn-section-intro"><div><span class="learn-section-intro__index">01 / ORGANIZAÇÃO</span><h2>Ferramentas</h2></div></div><nav class="learn-grade learn-hub-nav" aria-label="Acompanhamento"><a class="button" href=${`#/learn/${language}/path`}>Trilha de aprendizado</a><a class="button" href=${`#/learn/${language}/daily`}>Plano diário</a><a class="button" href=${`#/learn/${language}/dashboard`}>Acompanhamento</a><a class="button" href=${`#/learn/${language}/backup`}>Backup</a><a class="button" href=${`#/learn/${language}/errors`}>Caderno de erros</a><a class="button" href=${`#/learn/${language}/targeted`}>Treino direcionado</a></nav></aside><section class="learn-workspace__content" aria-labelledby="learn-areas-title"><div class="learn-section-intro"><div><span class="learn-section-intro__index">02 / PRÁTICA</span><h2 id="learn-areas-title">Áreas de estudo</h2></div><span class="learn-section-intro__aside">08 modalidades</span></div><div class="learn-areas">${studyAreas.map(([heading,description],index)=>{const modes=['vocabulary','flashcards','listening','dictation','writing','reading','grammar','test'];return index<8&&this.catalog?html`<a class="learn-area-link" href=${`#/learn/${language}/${modes[index]}`}><span class="learn-area-link__index">${String(index+1).padStart(2,"0")} / 08</span><div class="learn-area-link__body"><h3>${heading}</h3><p>${description}</p></div><span class="learn-area-link__action">Abrir modalidade <span aria-hidden="true">↗</span></span></a>`:html`<learn-area-card .heading=${heading} .description=${description}></learn-area-card>`})}</div></section></section>`}

      `}
      ${!label?html`<nav class="learn-grade learn-continue-links" aria-label="Continuar estudando"><a class="button" href="#/learn/en/daily">Continuar Inglês</a><a class="button" href="#/learn/ru/daily">Continuar Russo</a></nav>`:nothing}<p class="learn-privacy">O progresso fica neste navegador e pode ser perdido se o armazenamento for apagado. Não há sincronização entre dispositivos.</p>
    </article>`;
  }
}
