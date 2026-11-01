import {html,nothing} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {summarize} from './engine';
export type Progress=ReturnType<typeof summarize>;
@customElement('learn-progress')
export class LearnProgress extends LightElement {
  @property({attribute:false}) progress?:Progress;
  render(){const p=this.progress;if(!p)return nothing;
    return html`<section aria-label="Progresso do idioma" class="learn-progress"><header><h2>Seu progresso</h2><span>Nível ainda não avaliado</span></header>
    <dl>${[['Palavras estudadas',p.studied],['Palavras dominadas',p.mastered],['Revisões pendentes',p.due],['Acertos',p.accuracy===null?'Sem respostas':`${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(p.accuracy*100)}%`],['Dias consecutivos',p.streak],['Tempo registrado',`${Math.floor(p.seconds/60)} min ${Math.round(p.seconds%60)} s`]].map(([label,value])=>html`<div><dt>${label}</dt><dd class=${value==='Sem respostas'?'learn-metric-empty':''}>${value}</dd></div>`)}</dl></section>`;
  }
}
