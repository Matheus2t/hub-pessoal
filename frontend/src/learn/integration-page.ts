import {html,nothing} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Backup,Language} from './model';
import {summarizeLearnIntegration} from './integration';

const languageName={en:'Inglês',ru:'Russo'} as const;
@customElement('learn-integration-hub')
export class LearnIntegrationHub extends LightElement {
 @property() language:Language='en';
 @property({attribute:false}) progress!:Backup;
 render(){
  const s=summarizeLearnIntegration(this.progress,this.language),lang=this.language;
  const nav=[
   {label:'Diagnóstico',href:`#/learn/${lang}/diagnostic`,detail:s.diagnostic.status==='inProgress'?'Em andamento':s.diagnostic.status==='completed'?'Concluído':s.diagnostic.status==='skipped'?'Pulado':'Opcional'},
   {label:'Aula-piloto',href:`#/learn/${lang}/${lang==='en'?'pilot-c1':'pilot-c2'}`,detail:`${s.pilot.completedTasks}/${s.pilot.totalTasks} tarefas`},
   {label:'Revisões D+2 / D+7',href:`#/learn/${lang}/reviews`,detail:s.reviews.some(r=>r.status==='due'||r.status==='notAssessed')?'Pendente':s.pilot.completedAt?'Agendadas':'Após a aula'},
   {label:'Plano diário',href:`#/learn/${lang}/daily`,detail:s.legacyPlan?`${s.legacyPlan.completed}/${s.legacyPlan.goal} respostas`:'Planejamento legado'},
   {label:'Acompanhamento',href:`#/learn/${lang}/dashboard`,detail:`${s.evidence.evaluated} avaliadas`},
  ];
  return html`<section class="learn-integration" aria-labelledby="learn-integration-title">
   <header class="learn-integration__header"><a class="learn-internal" href=${`#/learn/${lang}`}>Voltar às áreas de ${languageName[lang]}</a><span class="learn-section-intro__index">PERCURSO INTEGRADO / PRÉVIA LOCAL</span><h1 id="learn-integration-title">${languageName[lang]}</h1><p>Diagnóstico, aulas, revisões e acompanhamento no mesmo percurso.</p></header>
   <nav class="learn-integration__nav" aria-label="Etapas de aprendizagem">${nav.map(item=>html`<a class="learn-integration__nav-item" href=${item.href}><span>${item.label}</span><small>${item.detail}</small><span aria-hidden="true">↗</span></a>`)}</nav>
   ${s.resumable.length?html`<section class="learn-integration__section" aria-labelledby="learn-resume-title"><div class="learn-section-intro"><div><span class="learn-section-intro__index">CONTINUIDADE</span><h2 id="learn-resume-title">Retomar</h2></div></div><ul class="learn-integration__list">${s.resumable.map(item=>html`<li><div><strong>${item.title}</strong><p>${item.reason}</p></div><a class="button" href=${item.href}>Continuar</a></li>`)}</ul></section>`:nothing}
   <section class="learn-integration__section" aria-labelledby="learn-next-title"><div class="learn-section-intro"><div><span class="learn-section-intro__index">SUGESTÕES</span><h2 id="learn-next-title">Próximas atividades</h2></div></div><ul class="learn-integration__list">${s.suggestions.map(item=>html`<li><div><strong>${item.title}</strong><p>${item.reason}</p></div><a class="button" href=${item.href}>Abrir</a></li>`)}</ul></section>
   <section class="learn-integration__section learn-integration__evidence" aria-labelledby="learn-evidence-title"><div class="learn-section-intro"><div><span class="learn-section-intro__index">EVIDÊNCIAS</span><h2 id="learn-evidence-title">Resumo observado</h2></div></div><dl><div><dt>Resultados avaliados</dt><dd>${s.evidence.evaluated}</dd></div><div><dt>Incerto / pendente</dt><dd>${s.evidence.uncertain}</dd></div><div><dt>Não avaliado</dt><dd>${s.evidence.notAssessed}</dd></div><div><dt>Requer revisão</dt><dd>${s.evidence.pendingReview}</dd></div><div><dt>Resultados para praticar</dt><dd>${s.evidence.difficulties}</dd></div></dl><p class="learn-muted">As evidências descrevem estas tarefas. Não estimam fluência nem nível CEFR.</p></section>
   <p class="learn-privacy">Prévia restrita a localhost/loopback. Os dados permanecem separados por idioma neste navegador.</p>
  </section>`;
 }
}

@customElement('learn-integration-evidence')
export class LearnIntegrationEvidence extends LightElement {
 @property() language:Language='en';
 @property({attribute:false}) progress!:Backup;
 render(){
  const evidence=summarizeLearnIntegration(this.progress,this.language).evidence;
  const labels:Record<string,string>={'written-comprehension':'Compreensão escrita','contextual-recognition':'Reconhecimento contextual','written-production':'Produção escrita','written-transfer':'Transferência escrita','listening-comprehension':'Compreensão auditiva'};
  return html`<section class="learn-c5-panel learn-c5-evidence" aria-labelledby="learn-c5-evidence-title"><div class="learn-section-intro"><div><span class="learn-section-intro__index">PRÉVIA LOCAL C5</span><h3 id="learn-c5-evidence-title">Evidências das aulas e revisões</h3></div><a class="button" href=${`#/learn/${this.language}/integration`}>Visão integrada</a></div><dl><div><dt>Avaliadas</dt><dd>${evidence.evaluated}</dd></div><div><dt>Incertas</dt><dd>${evidence.uncertain}</dd></div><div><dt>Não avaliadas</dt><dd>${evidence.notAssessed}</dd></div><div><dt>Pendentes de revisão</dt><dd>${evidence.pendingReview}</dd></div><div><dt>Para praticar</dt><dd>${evidence.difficulties}</dd></div></dl>${evidence.competencies.length?html`<ul>${evidence.competencies.map(item=>html`<li><strong>${labels[item.id]||item.id}</strong><span>${item.supported+item.partiallySupported+item.notSupported} avaliadas · ${item.uncertain} incertas · ${item.notAssessed} não avaliadas</span></li>`)}</ul>`:html`<p class="learn-muted">Ainda não há competências de aula registradas.</p>`}<p class="learn-muted">Respostas abertas sem revisão confiável permanecem incertas. Estas evidências não estimam fluência nem nível CEFR.</p></section>`;
 }
}
