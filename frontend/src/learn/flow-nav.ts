import {html,nothing} from 'lit';
import type {Language} from './model';
import {isLearnIntegrationPreviewEnabled} from './pilot-preview';

export type LearnFlowStep='integration'|'diagnostic'|'pilot'|'reviews'|'daily'|'dashboard';
const steps:readonly {id:LearnFlowStep;label:string;path:(language:Language)=>string}[]=[
 {id:'integration',label:'Visão integrada',path:language=>`#/learn/${language}/integration`},
 {id:'diagnostic',label:'Diagnóstico',path:language=>`#/learn/${language}/diagnostic`},
 {id:'pilot',label:'Aula-piloto',path:language=>`#/learn/${language}/${language==='en'?'pilot-c1':'pilot-c2'}`},
 {id:'reviews',label:'Revisões',path:language=>`#/learn/${language}/reviews`},
 {id:'daily',label:'Plano diário',path:language=>`#/learn/${language}/daily`},
 {id:'dashboard',label:'Acompanhamento',path:language=>`#/learn/${language}/dashboard`},
];

/** A compact local-only route map; legacy Learn navigation stays unchanged. */
export function renderLearnFlowNav(language:Language,current:LearnFlowStep){
 if(!isLearnIntegrationPreviewEnabled())return nothing;
 return html`<nav class="learn-flow-nav" aria-label="Percurso integrado">${steps.map(step=>html`<a href=${step.path(language)} aria-current=${step.id===current?'page':nothing}>${step.label}</a>`)}</nav>`;
}
