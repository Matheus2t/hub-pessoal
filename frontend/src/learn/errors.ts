import {html} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Curriculum,Exercise} from './content';
import type {Backup,Language} from './model';
import {difficultTopics,errorItems,findExercise} from './recovery';
import './session';
@customElement('learn-errors')
export class LearnErrors extends LightElement {
 @property() language:Language='en';@property({type:Boolean}) targeted=false;@property({attribute:false}) catalog!:Curriculum;@property({attribute:false}) progress!:Backup;
 @state() private skill='';@state() private topic='';@state() private history='all';@state() private questions:Exercise[]=[];
 render(){if(this.questions.length)return html`<button class="button" @click=${()=>this.questions=[]}>Voltar ao caderno</button><learn-session .language=${this.language} mode="recovery" .exercises=${this.questions} .catalog=${this.catalog}></learn-session>`;
  const groups=errorItems(this.language,this.progress.attempts),topics=difficultTopics(this.language,this.progress.attempts);
  const rows=groups.filter(g=>(!this.skill||g.latest.skill===this.skill)&&(!this.topic||g.latest.topic===this.topic)&&(this.history!=='pending'||!g.resolved)&&(this.history!=='week'||g.errors[0].at>=Date.now()-7*86400000)&&(!this.targeted||topics.some(t=>t.topic===g.latest.topic)));
  const exercises=[...new Map(rows.filter(g=>!g.resolved).map(g=>findExercise(this.catalog,g.latest.itemId)).filter((e):e is Exercise=>!!e).map(e=>[e.id,e])).values()].slice(0,20);
  return html`<h2>${this.targeted?'Treino direcionado':'Caderno de erros'}</h2>${this.targeted?html`<p>Seleção pelos últimos 20 registros de cada assunto: pelo menos 3 tentativas e 2 erros.</p>${topics.length?html`<ul>${topics.map(t=>html`<li>${t.topic}: ${t.errors} erros em ${t.total} tentativas recentes</li>`)}</ul>`:html`<p>Sem dados suficientes para priorizar assuntos.</p>`}`:html`<p>O histórico permanece disponível mesmo após uma resposta correta.</p>`}
  <div class="learn-filters"><label>Modalidade<select @change=${(e:Event)=>this.skill=(e.target as HTMLSelectElement).value}><option value="">Todas</option>${[...new Set(groups.map(g=>g.latest.skill))].map(s=>html`<option>${s}</option>`)}</select></label><label>Assunto<select @change=${(e:Event)=>this.topic=(e.target as HTMLSelectElement).value}><option value="">Todos</option>${[...new Set(groups.map(g=>g.latest.topic))].map(t=>html`<option>${t}</option>`)}</select></label><label>Histórico<select @change=${(e:Event)=>this.history=(e.target as HTMLSelectElement).value}><option value="all">Todos os erros</option><option value="pending">Ainda para revisar</option><option value="week">Erros nos últimos 7 dias</option></select></label></div>
  <button class="button primary" ?disabled=${!exercises.length} @click=${()=>this.questions=exercises}>Revisar meus erros</button>${!rows.length?html`<p class="learn-empty">Nenhum erro neste filtro.</p>`:html`<div class="learn-word-list">${rows.map(g=>{const a=g.errors[0],e=findExercise(this.catalog,a.itemId);return html`<article class="learn-word"><h3>${e?.prompt||a.itemId}</h3><p>${a.skill} · ${a.topic} · ${new Date(a.at).toLocaleString('pt-BR')}</p><p>Sua resposta: ${a.answer||'Sem resposta'}</p><p>Esperado: ${a.expected}</p><p>${e?.explanation||'Conteúdo original indisponível. Seu registro foi preservado.'}</p><p>${g.errors.length} erros · ${g.resolved?'Corrigido posteriormente':'Para revisar'}</p><details><summary>Histórico deste item</summary><ul>${g.errors.map(r=>html`<li>${new Date(r.at).toLocaleString('pt-BR')} — ${r.answer} → ${r.expected}</li>`)}</ul></details></article>`})}</div>`}`;
 }
}
