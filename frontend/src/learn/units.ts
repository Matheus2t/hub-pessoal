import {html,nothing} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Curriculum,Exercise,Reading,Lesson} from './content';
import type {Backup,Language} from './model';
import './session';
@customElement('learn-units')
export class LearnUnits extends LightElement {
 @property() language:Language='en';@property() mode='reading';@property({attribute:false}) catalog!:Curriculum;@property({attribute:false}) progress!:Backup;
 @state() private selected?:Reading|Lesson;@state() private questions:Exercise[]=[];
 render(){const unit=this.selected,units=this.mode==='reading'?this.catalog.readings||[]:this.catalog.lessons||[];
  if(!unit)return html`<h2>${this.mode==='reading'?'Leituras':'Gramática'}</h2><div class="learn-areas">${units.map(u=>{const answered=new Set(this.progress.attempts.filter(a=>a.language===this.language&&u.questionIds.includes(a.itemId)).map(a=>a.itemId)).size;return html`<button class="learn-unit-choice" @click=${()=>{this.selected=u;this.questions=[]}}><strong>${u.title}</strong><span>${u.level} · ${u.topic}</span><small>${answered}/${u.questionIds.length} questões respondidas</small></button>`})}</div>`;
  return html`<button class="button" @click=${()=>{this.selected=undefined;this.questions=[]}}>Voltar à lista</button><article class="learn-prose"><h2>${unit.title}</h2><p class="learn-muted">${unit.level} · ${unit.topic}</p>${'text'in unit?html`<p lang=${this.language}>${unit.text}</p><details><summary>Tradução de apoio</summary><p>${unit.translation}</p></details><h3>Vocabulário</h3><ul>${unit.vocabulary.map(id=>{const w=this.catalog.words.find(w=>w.id===id)!;return html`<li><span lang=${this.language}>${w.word}</span> — ${w.translation}</li>`})}</ul>`:html`<p><strong>Objetivo:</strong> ${unit.objective}</p><p>${unit.explanation}</p><h3>Exemplos</h3>${unit.examples.map(e=>html`<p><span lang=${this.language}>${e.text}</span><br>${e.translation}</p>`)}<p><strong>Erros comuns:</strong> ${unit.commonErrors}</p>`}</article>
  ${this.questions.length?html`<learn-session .language=${this.language} .mode=${this.mode} .exercises=${this.questions} .catalog=${this.catalog}></learn-session>`:html`<button class="button primary" @click=${()=>this.questions=unit.questionIds.map(id=>this.catalog.exercises.find(e=>e.id===id)!)}>Responder questões</button>`}`;
 }
}
