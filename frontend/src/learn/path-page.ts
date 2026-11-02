import {html,nothing} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Backup,Language} from './model';
import type {Curriculum,Exercise} from './content';
import {learningPath} from './path';
import {selectPractice} from './selection';
import './session';
import {learnActivities} from '../catalog';
@customElement('learn-path')
export class LearnPath extends LightElement {
 @property() language:Language='en';@property({attribute:false}) catalog!:Curriculum;@property({attribute:false}) progress!:Backup;
 @state() private questions:Exercise[]=[];
 render(){const units=learningPath(this.catalog,this.progress,this.language),next=units.find(u=>u.mastered<u.total);
  return html`<h2>Trilha de aprendizado</h2><p class="learn-privacy">Domínio: ao menos três acertos recentes em dois dias diferentes, com a última resposta correta. A trilha não bloqueia o estudo livre.</p>${next?html`<p>Próxima unidade recomendada: ${next.level} · ${next.topic}</p>`:nothing}
   ${this.questions.length?html`<button class="button" @click=${()=>this.questions=[]}>Voltar à trilha</button><learn-session .language=${this.language} .mode=${this.questions[0].skill} .catalog=${this.catalog} .exercises=${this.questions}></learn-session>`:html`<div class="learn-path-levels">${[...new Set(units.map(u=>u.level))].map(level=>{const group=units.filter(u=>u.level===level);return html`<details class="learn-path-level" .open=${level===(next?.level||'A1')}><summary>${level} · ${group.length} unidades</summary><div class="learn-path-units">${group.map(u=>html`<article class="learn-word"><h3>${u.level} · ${u.topic}</h3><p>${u.objectives.map(skill=>learnActivities[skill]).join(' · ')}</p><p>${u.coverage}/${u.total} atividades praticadas · ${u.mastered}/${u.total} consolidadas</p><div class="learn-grade"><button class="button" @click=${()=>{this.questions=selectPractice(u.exercises.filter(e=>e.skill===(u.exercises.find(q=>!['listening','dictation'].includes(q.skill))||u.exercises[0]).skill),this.progress,this.language,'mixed',10)}}>Estudar unidade</button><details class="learn-path-steps"><summary>Atividades</summary>${u.objectives.map(skill=>html`<button class="button" @click=${()=>this.questions=selectPractice(u.exercises.filter(e=>e.skill===skill),this.progress,this.language,'mixed',10)}>${learnActivities[skill]}</button>`)}</details><button class="button" @click=${()=>{this.questions=selectPractice(u.exercises.filter(e=>e.skill===(u.exercises.find(q=>!['listening','dictation'].includes(q.skill))||u.exercises[0]).skill),this.progress,this.language,'review',10)}}>Revisar unidade</button></div></article>`)}</div></details>`})}</div>`}`;
 }
}
