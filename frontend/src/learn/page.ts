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
import './area-card';
import './home';
import './pilot-page';
import './diagnostic-page';
import './delayed-review-page';
import './integration-page';
import './v19-local-preview';
import './bridge-v11';
import {isLearnDelayedReviewPreviewEnabled,isLearnDiagnosticPreviewEnabled,isLearnIntegrationPreviewEnabled,isLearnPilotPreviewEnabled,isLearnProgressionPreviewEnabled,isLearnV19AudioPreviewEnabled} from './pilot-preview';
import {renderLearnFlowNav} from './flow-nav';
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
  protected updated(changes:PropertyValues){const activityChanged=changes.has('activity'),c5Activities=['integration','daily','dashboard'];const entersC5=this.isIntegrationPreviewEnabled()&&c5Activities.includes(this.activity),leavesC5=this.isIntegrationPreviewEnabled()&&c5Activities.includes(this.previousActivity);if(changes.has('language')||changes.has('invalid')||activityChanged&&(this.activity.startsWith('pilot-')||this.previousActivity.startsWith('pilot-')||this.activity==='diagnostic'||this.previousActivity==='diagnostic'||this.activity==='reviews'||this.previousActivity==='reviews'||this.activity==='progression'||this.previousActivity==='progression'||entersC5||leavesC5))void this.load();if(activityChanged)this.previousActivity=this.activity}
  disconnectedCallback(){this.generation++;super.disconnectedCallback()}
  private async load(){
    const generation=++this.generation;
    this.data=undefined;this.storageError=false;this.contentError=false;this.loading=true;
    if(this.invalid){this.loading=false;return}
    if(this.activity==='diagnostic'&&this.isDiagnosticPreviewEnabled()){this.catalog=undefined;this.loading=false;return;}
    if((this.activity==='pilot-c1'||this.activity==='pilot-c2')&&this.isPilotPreviewEnabled()){this.catalog=undefined;this.loading=false;return;}
    if(this.activity==='reviews'&&this.isDelayedReviewPreviewEnabled()){this.catalog=undefined;this.loading=false;return;}
    const language=this.language as Language;
    const [progress,content]=await Promise.allSettled([snapshot(),language?loadCurriculum(language):Promise.resolve()]);
    if(generation!==this.generation||!this.isConnected)return;
    if(progress.status==='fulfilled')this.data=progress.value;else this.storageError=true;
    this.catalog=content.status==='fulfilled'?(content.value||undefined):undefined;this.contentError=content.status==='rejected';this.loading=false;
  }
  private isPilotPreviewEnabled():boolean{return this.activity==='pilot-c1'?this.language==='en'&&isLearnPilotPreviewEnabled('c1'):this.activity==='pilot-c2'?this.language==='ru'&&isLearnPilotPreviewEnabled('c2'):false;}
  private isDiagnosticPreviewEnabled():boolean{return (this.language==='en'||this.language==='ru')&&isLearnDiagnosticPreviewEnabled(this.language as Language);}
  private isDelayedReviewPreviewEnabled():boolean{return (this.language==='en'||this.language==='ru')&&isLearnDelayedReviewPreviewEnabled();}
  private isIntegrationPreviewEnabled():boolean{return (this.language==='en'||this.language==='ru')&&isLearnIntegrationPreviewEnabled();}
  private pilotId(){return this.language==='ru'?'ru-pilot-directions-01':'en-pilot-introductions-01';}
  private async refreshProgress(){const generation=this.generation;try{const data=await snapshot();if(generation===this.generation&&this.isConnected)this.data=data}catch{if(generation===this.generation&&this.isConnected)this.storageError=true}}
  render(){
    if(this.invalid)return html`<section class="learn-message"><h1>Página do Learn não encontrada</h1><p>Escolha Inglês ou Russo para continuar.</p><a class="button" href="#/learn">Selecionar idioma</a></section>`;
    if(this.activity==='pilot-c1'||this.activity==='pilot-c2')return this.isPilotPreviewEnabled()?html`<article class="learn-page learn-page--activity learn-page--pilot"><learn-pilot-player .language=${this.language as Language} .pilotId=${this.pilotId()}></learn-pilot-player></article>`:html`<section class="learn-message" role="status"><h1>Prévia indisponível</h1><p>Esta aula só abre em uma prévia controlada do Learn.</p><a class="button" href=${`#/learn/${this.language==='ru'?'ru':'en'}`}>Voltar ao ${this.language==='ru'?'Russo':'Inglês'}</a></section>`;
    if(this.activity==='diagnostic')return this.isDiagnosticPreviewEnabled()?html`<article class="learn-page learn-page--activity learn-page--diagnostic"><learn-diagnostic-player .language=${this.language as Language}></learn-diagnostic-player></article>`:html`<section class="learn-message" role="status"><h1>Prévia indisponível</h1><p>O diagnóstico só abre em localhost com a flag de prévia específica.</p><a class="button" href=${`#/learn/${this.language==='ru'?'ru':'en'}`}>Voltar ao ${this.language==='ru'?'Russo':'Inglês'}</a></section>`;
    if(this.activity==='reviews')return this.isDelayedReviewPreviewEnabled()?html`<article class="learn-page learn-page--activity learn-page--delayed"><learn-delayed-review .language=${this.language as Language}></learn-delayed-review></article>`:html`<section class="learn-message" role="status"><h1>Prévia indisponível</h1><p>As revisões só abrem em localhost com a flag de prévia C4.</p><a class="button" href=${`#/learn/${this.language==='ru'?'ru':'en'}`}>Voltar ao ${this.language==='ru'?'Russo':'Inglês'}</a></section>`;
    if(this.activity==='integration')return this.isIntegrationPreviewEnabled()&&this.data?html`<article class="learn-page learn-page--activity learn-page--integration"><learn-integration-hub .language=${this.language as Language} .progress=${this.data}></learn-integration-hub></article>`:html`<section class="learn-message" role="status"><h1>Prévia indisponível</h1><p>O percurso integrado só abre em localhost com a flag específica C5.</p><a class="button" href=${`#/learn/${this.language==='ru'?'ru':'en'}`}>Voltar ao ${this.language==='ru'?'Russo':'Inglês'}</a></section>`;
    if(this.activity==='bridges')return html`<article class="learn-page learn-page--activity learn-page--bridge-v11"><learn-bridge-v11 .language=${this.language as Language}></learn-bridge-v11></article>`;
    if(this.activity==='audio-v19')return (this.language==='en'||this.language==='ru')&&isLearnV19AudioPreviewEnabled()
      ?html`<article class="learn-page learn-page--activity learn-page--v19-preview"><learn-v19-local-preview .language=${this.language as Language}></learn-v19-local-preview></article>`
      :html`<section class="learn-message" role="status"><h1>Prévia indisponível</h1><p>Os novos áudios V19 só podem ser usados em uma sessão local autorizada. Não estão publicados.</p><a class="button" href="#/learn">Voltar ao Learn</a></section>`;
    if(this.activity==='progression'&&!isLearnProgressionPreviewEnabled())return html`<section class="learn-message" role="status"><h1>Prévia indisponível</h1><p>A progressão V12 continua restrita a localhost/loopback enquanto o mapeamento pedagógico não tiver liberação pública.</p><a class="button" href=${`#/learn/${this.language==='ru'?'ru':'en'}`}>Voltar ao ${this.language==='ru'?'Russo':'Inglês'}</a></section>`;
    if(this.activity==='dashboard'&&this.isIntegrationPreviewEnabled())return !this.data||!this.catalog?html`<article class="learn-page learn-page--activity"><p role="status" class="learn-message">${this.loading?'Carregando acompanhamento local…':'O catálogo não está disponível. Seu histórico foi preservado.'}</p></article>`:html`<article class="learn-page learn-page--activity"><nav class="learn-internal"><a href=${`#/learn/${this.language}`}>Voltar às áreas de ${this.language==='ru'?'Russo':'Inglês'}</a><a href=${`#/learn/${this.language}/integration`}>Percurso integrado</a></nav>${renderLearnFlowNav(this.language as Language,'dashboard')}<learn-integration-evidence .language=${this.language as Language} .progress=${this.data}></learn-integration-evidence><learn-advanced mode="dashboard" .language=${this.language as Language} .catalog=${this.catalog} .progress=${this.data}></learn-advanced></article>`;
    const language=this.language as Language,label=labels[language];
    return html`<article class=${`learn-page ${label?"learn-page--language":"learn-page--index"} ${this.activity?"learn-page--activity":"learn-page--hub"}`}>
      ${label?html`<header class="learn-hero learn-hero--minimal">
        <div class="learn-hero__copy">
          <span class="learn-hero__topline">LEARN / ${language.toUpperCase()}</span>
          <div class="learn-hero__identity">
            <h1 class="learn-hero__title">${label.name}</h1>
            <span class="learn-hero__native" lang=${language}>${label.native}</span>
          </div>
        </div>
        <a class="learn-hero__switch" href="#/learn">Trocar idioma <span aria-hidden="true">↗</span></a>
      </header>`:nothing}
      ${label&&language==='en'&&this.activity===''&&isLearnPilotPreviewEnabled('c1')?html`<nav class="learn-c1-preview-link" aria-label="Prévia interna"><a class="button" href="#/learn/en/pilot-c1">Aula-piloto de Inglês <span aria-hidden="true">↗</span></a></nav>`:nothing}
      ${label&&language==='ru'&&this.activity===''&&isLearnPilotPreviewEnabled('c2')?html`<nav class="learn-c1-preview-link" aria-label="Prévia interna"><a class="button" href="#/learn/ru/pilot-c2">Aula-piloto de Russo <span aria-hidden="true">↗</span></a></nav>`:nothing}
      ${label&&this.activity===''&&(language==='en'||language==='ru')&&isLearnDiagnosticPreviewEnabled(language as Language)?html`<nav class="learn-c1-preview-link" aria-label="Prévia interna"><a class="button" href=${`#/learn/${language}/diagnostic`}>Diagnóstico inicial <span aria-hidden="true">↗</span></a></nav>`:nothing}
        ${label&&this.activity===''&&(language==='en'||language==='ru')&&isLearnDelayedReviewPreviewEnabled()?html`<nav class="learn-c1-preview-link" aria-label="Prévia interna"><a class="button" href=${`#/learn/${language}/reviews`}>Revisões D+2 e D+7 <span aria-hidden="true">↗</span></a></nav>`:nothing}
        ${label&&this.activity===''&&(language==='en'||language==='ru')&&isLearnProgressionPreviewEnabled()?html`<nav class="learn-c1-preview-link" aria-label="Prévia interna"><a class="button" href=${`#/learn/${language}/progression`}>Progressão guiada A1–B1 <span aria-hidden="true">↗</span></a></nav>`:nothing}
      ${label&&this.activity===''&&this.isIntegrationPreviewEnabled()?html`<nav class="learn-c1-preview-link" aria-label="Prévia interna"><a class="button" href=${`#/learn/${language}/integration`}>Percurso integrado <span aria-hidden="true">↗</span></a></nav>`:nothing}
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
        
        ${this.contentError?html`<div class="learn-message" role="status"><h2>Não foi possível carregar o catálogo</h2><p>Seu histórico local foi preservado.</p><button class="button" @click=${()=>this.load()}>Tentar novamente</button></div>`:nothing}
        ${this.activity?html`<nav class="learn-internal learn-internal--workspace" aria-label="Navegação do Learn"><a href=${`#/learn/${language}`}>← Áreas de ${label.name}</a><div class="learn-internal__links"><a href=${`#/learn/${language}/path`}>Trilha</a><a href=${`#/learn/${language}/daily`}>Plano diário</a><a href=${`#/learn/${language}/dashboard`}>Histórico</a></div></nav>${this.activity==='daily'&&this.isIntegrationPreviewEnabled()?renderLearnFlowNav(language,'daily'):nothing}${this.catalog&&this.data?keyed(`${language}:${this.activity}`,html`${['reading','grammar','test','errors','targeted','daily','dashboard','backup','path','progression'].includes(this.activity)?html`<learn-advanced .language=${language} .mode=${this.activity} .catalog=${this.catalog} .progress=${this.data} @progress-saved=${()=>this.refreshProgress()}></learn-advanced>`:html`<learn-activity .language=${language} .mode=${this.activity} .catalog=${this.catalog} .progress=${this.data} @progress-saved=${async()=>{const generation=this.generation;try{const data=await snapshot();if(generation===this.generation&&this.isConnected)this.data=data}catch{this.storageError=true}}}></learn-activity>`}`):nothing}`:html`<learn-home .language=${language} .catalog=${this.catalog} .progress=${this.data}></learn-home>`}

      `}
      ${!label?html`<nav class="learn-grade learn-continue-links" aria-label="Continuar estudando"><a class="button" href="#/learn/en/daily">Continuar Inglês</a><a class="button" href="#/learn/ru/daily">Continuar Russo</a></nav>`:nothing}${this.activity||!label?html`<p class="learn-privacy">O progresso fica neste navegador e pode ser perdido se o armazenamento for apagado. Não há sincronização entre dispositivos.</p>`:nothing}
    </article>`;
  }
}
