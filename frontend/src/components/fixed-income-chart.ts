import {html,svg,nothing} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement,money} from '../ui';
export interface FixedChartSeries { name:string; points:{date:string;value:number}[] }
const patterns=['','8 5','2 4','12 4 2 4'];
@customElement('fixed-income-chart')
export class FixedIncomeChart extends LightElement {
  @property({attribute:false}) series:FixedChartSeries[]=[];
  @property() label='Evolução patrimonial';
  @state() private selected=-1;
  @state() private width=720;
  private resize?:ResizeObserver;
  connectedCallback(){super.connectedCallback();this.resize=new ResizeObserver(entries=>{this.width=Math.max(280,Math.round(entries[0].contentRect.width))});this.resize.observe(this);}
  disconnectedCallback(){this.resize?.disconnect();super.disconnectedCallback();}
  render() {
    if(!this.series.length)return nothing;
    const dates=[...new Set(this.series.flatMap(s=>s.points.map(p=>p.date)))].sort();
    const values=this.series.flatMap(s=>s.points.map(p=>p.value));
    const low=Math.min(0,...values),high=Math.max(1,...values),range=high-low||1;
    const minDate=Date.parse(dates[0]),maxDate=Date.parse(dates.at(-1)!),period=maxDate-minDate||1;
    const right=this.width-18,plotWidth=right-92;
    const x=(date:string)=>92+(Date.parse(date)-minDate)/period*plotWidth;
    const y=(value:number)=>220-(value-low)/range*198;
    const index=this.selected<0?dates.length-1:Math.min(this.selected,dates.length-1),date=dates[index];
    return html`<figure class="rf-chart"><figcaption>${this.label}</figcaption><svg viewBox=${`0 0 ${this.width} 260`} role="img" aria-label=${`${this.label}. Valores detalhados no seletor de data e na tabela.`} @pointermove=${(e:PointerEvent)=>{const box=(e.currentTarget as SVGElement).getBoundingClientRect();const time=minDate+Math.max(0,Math.min(1,((e.clientX-box.left)/box.width*this.width-92)/plotWidth))*period;this.selected=dates.reduce((best,d,i)=>Math.abs(Date.parse(d)-time)<Math.abs(Date.parse(dates[best])-time)?i:best,0)}}>
      ${[0,.5,1].map(t=>svg`<line x1="92" x2=${right} y1=${y(low+range*t)} y2=${y(low+range*t)} class="rf-chart-grid"/><text x="82" y=${y(low+range*t)+4} text-anchor="end">R$ ${new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(low+range*t)}</text>`)}
      ${this.series.map((s,i)=>svg`<path d=${s.points.map((p,j)=>`${j?'L':'M'}${x(p.date).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ')} fill="none" class="rf-chart-line" style=${`--rf-series:var(--rf-series-${i+1})`} stroke-width=${i===0?2.5:2} stroke-dasharray=${patterns[i%4]}/>`)}
      <line x1=${x(date)} x2=${x(date)} y1="22" y2="220" class="rf-chart-cursor"/>
      <text x="92" y="246">${dates[0].split('-').reverse().join('/')}</text><text x=${right} y="246" text-anchor="end">${dates.at(-1)!.split('-').reverse().join('/')}</text>
      </svg><label class="rf-chart-slider">Data no gráfico: ${date.split('-').reverse().join('/')}<input type="range" min="0" max=${dates.length-1} .value=${String(index)} @input=${(e:Event)=>this.selected=Number((e.target as HTMLInputElement).value)} /></label><ul class="rf-chart-legend">${this.series.map((s,i)=>{const point=s.points.find(p=>p.date===date);return html`<li><span class="rf-line-sample" style=${`--rf-series:var(--rf-series-${i+1});border-top-style:${i?'dashed':'solid'}`}></span><span>${s.name}</span><strong>${point?money(point.value):'Sem ponto nesta data'}</strong></li>`})}</ul></figure>`;
  }
}
