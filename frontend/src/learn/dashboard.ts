import {html,nothing} from 'lit';import {customElement,property,state} from 'lit/decorators.js';
import {LightElement} from '../ui';import type {Backup,Language} from './model';import {summarize,localDay} from './engine';import './progress';
export function calendarDays(now:number,n:number){const d=new Date(now);d.setHours(12,0,0,0);return Array.from({length:n},(_,i)=>{const day=new Date(d);day.setDate(day.getDate()-(n-1-i));return localDay(+day)})}
type Point={label:string;value:number};
@customElement('learn-dashboard')
export class LearnDashboard extends LightElement {
 @property() language:Language='en';@property({attribute:false}) progress!:Backup;
 @state() private skill='';@state() private from='';@state() private until='';@state() private page=0;
 private chart(title:string,rows:Point[],unit=''){const max=Math.max(1,...rows.map(r=>r.value));return html`<figure class="learn-chart"><figcaption>${title}</figcaption><ul class="learn-bars">${rows.map(r=>html`<li><div><span>${r.label}</span><strong>${Number(r.value.toFixed(1))}${unit}</strong></div><div class="learn-bar-track" aria-hidden="true"><span style=${`width:${Math.max(0,r.value/max*100)}%`}></span></div></li>`)}</ul><details><summary>Consultar dados: ${title}</summary><table><thead><tr><th>Período ou modalidade</th><th>Valor ${unit}</th></tr></thead><tbody>${rows.map(r=>html`<tr><th scope="row">${r.label}</th><td>${r.value}</td></tr>`)}</tbody></table></details></figure>`}

 render(){const p=summarize(this.language,this.progress.attempts,this.progress.cards),history=p.history,days=calendarDays(Date.now(),30),byDay=days.map(day=>({day,rows:history.filter(a=>localDay(a.at)===day)})),skills=[...new Set(history.map(a=>a.skill))];
 const filtered=history.filter(a=>(!this.skill||a.skill===this.skill)&&(!this.from||localDay(a.at)>=this.from)&&(!this.until||localDay(a.at)<=this.until)).sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
 return html`<h2>Acompanhamento</h2><learn-progress .progress=${p}></learn-progress><div class="learn-grade"><p>${p.attempts} tentativas</p><p>${p.correct} acertos</p><p>${p.days} dias estudados</p></div>${!history.length?html`<p class="learn-empty">Ainda não há respostas registradas. Os gráficos aparecem após estudar.</p>`:html`<div class="learn-chart-grid">
 ${this.chart('Atividade — últimos 7 dias',byDay.slice(-7).map(d=>({label:d.day.slice(5),value:d.rows.length})))}
 ${this.chart('Atividade — últimos 30 dias',byDay.map(d=>({label:d.day.slice(5),value:d.rows.length})))}
 ${this.chart('Acertos e erros por modalidade',skills.flatMap(s=>{const rows=history.filter(a=>a.skill===s);return [{label:`${s} · acertos`,value:rows.filter(a=>a.correct).length},{label:`${s} · erros`,value:rows.filter(a=>!a.correct).length}]}))}
 ${this.chart('Evolução de acertos — dias praticados',byDay.filter(d=>d.rows.length).map(d=>({label:d.day.slice(5),value:Math.round(d.rows.filter(a=>a.correct).length/d.rows.length*100)})),'%')}
 ${this.chart('Tempo por modalidade',skills.map(s=>({label:s,value:history.filter(a=>a.skill===s).reduce((n,a)=>n+a.seconds,0)})),'s')}
 ${this.chart('Revisões pendentes',[{label:'Vencidas agora',value:p.due},{label:'Agendadas',value:this.progress.cards.filter(c=>c.language===this.language&&c.due>Date.now()).length}])}
 </div><h3>Assuntos com mais erros</h3><ul>${p.topics.filter(t=>t.errors).slice(0,10).map(t=>html`<li>${t.topic}: ${t.errors} erros em ${t.total} tentativas</li>`)}</ul>`}
 <h3>Histórico de estudo</h3><div class="learn-filters"><label>Desde<input type="date" .value=${this.from} @input=${(e:Event)=>{this.from=(e.target as HTMLInputElement).value;this.page=0}}></label><label>Até<input type="date" .value=${this.until} @input=${(e:Event)=>{this.until=(e.target as HTMLInputElement).value;this.page=0}}></label><label>Modalidade<select @change=${(e:Event)=>{this.skill=(e.target as HTMLSelectElement).value;this.page=0}}><option value="">Todas</option>${skills.map(s=>html`<option>${s}</option>`)}</select></label></div>
 ${filtered.length?html`<div class="learn-table-wrap"><table><caption>${filtered.length} registros neste filtro</caption><thead><tr><th>Data</th><th>Modalidade</th><th>Assunto</th><th>Resultado</th><th>Tempo</th></tr></thead><tbody>${filtered.slice(this.page*20,(this.page+1)*20).map(a=>html`<tr><td>${new Date(a.at).toLocaleString('pt-BR')}</td><td>${a.skill}</td><td>${a.topic}</td><td>${a.correct?'Correta':'Revisar'}</td><td>${a.seconds} s</td></tr>`)}</tbody></table></div><div class="learn-pagination"><button class="button" ?disabled=${!this.page} @click=${()=>this.page--}>Anterior</button><span>Página ${this.page+1}</span><button class="button" ?disabled=${(this.page+1)*20>=filtered.length} @click=${()=>this.page++}>Próxima página</button></div>`:html`<p>Nenhum registro neste filtro.</p>`}`;
 }
}
