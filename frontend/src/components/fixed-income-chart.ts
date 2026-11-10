import {html,svg,nothing} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {LightElement,money} from '../ui';

export interface FixedChartSeries { name:string; points:{date:string;value:number}[] }
type Period='1A'|'3A'|'5A'|'10A'|'Tudo';
const periods:{label:Period;years:number}[]=[
  {label:'1A',years:1},{label:'3A',years:3},{label:'5A',years:5},
  {label:'10A',years:10},{label:'Tudo',years:0}
];
const patterns=['','7 5','3 5','12 4 2 4'];
const shortMoney=(value:number)=>'R$ '+new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(value);
const printDate=(date:string)=>date.split('-').reverse().join('/');

@customElement('fixed-income-chart')
export class FixedIncomeChart extends LightElement {
  private static sequence=0;
  private readonly gradientId=\`rf-chart-gradient-\${FixedIncomeChart.sequence++}\`;
  @property({attribute:false}) series:FixedChartSeries[]=[];
  @property() label='Evolução patrimonial';
  @state() private selectedDate='';
  @state() private period:Period='Tudo';
  @state() private width=680;
  private resize?:ResizeObserver;

  connectedCallback(){
    super.connectedCallback();
    if(typeof ResizeObserver!=='undefined'){
      this.resize=new ResizeObserver(entries=>{
        const next=Math.max(236,Math.round(entries[0].contentRect.width)-40);
        if(Math.abs(this.width-next)>1)this.width=next;
      });
      this.resize.observe(this);
    }
  }
  disconnectedCallback(){this.resize?.disconnect();super.disconnectedCallback();}

  private movePointer(event:PointerEvent,dates:string[],left:number,plotWidth:number){
    const bounds=(event.currentTarget as SVGSVGElement).getBoundingClientRect();
    if(!bounds.width||!dates.length)return;
    const position=Math.max(0,Math.min(1,((event.clientX-bounds.left)/bounds.width*this.width-left)/plotWidth));
    const time=Date.parse(dates[0])+position*(Date.parse(dates[dates.length-1])-Date.parse(dates[0]));
    let first=0,last=dates.length-1;
    while(first<last){
      const middle=Math.floor((first+last)/2);
      if(Date.parse(dates[middle])<time)first=middle+1;
      else last=middle;
    }
    const closest=first>0&&Math.abs(Date.parse(dates[first-1])-time)<Math.abs(Date.parse(dates[first])-time)?first-1:first;
    if(this.selectedDate!==dates[closest])this.selectedDate=dates[closest];
  }

  render(){
    const allDates=[...new Set(this.series.flatMap(s=>s.points.map(p=>p.date)))].sort();
    if(!allDates.length)return nothing;
    const lastTime=Date.parse(allDates[allDates.length-1]);
    const firstTime=Date.parse(allDates[0]);
    const years=periods.find(p=>p.label===this.period)?.years??0;
    const cutoff=years?new Date(lastTime):undefined;
    if(cutoff)cutoff.setUTCFullYear(cutoff.getUTCFullYear()-years);
    const dates=allDates.filter(d=>!cutoff||Date.parse(d)>=cutoff.getTime());
    const firstVisible=Date.parse(dates[0]);
    const lastVisible=Date.parse(dates[dates.length-1]);
    const lines=this.series.map(s=>({...s,points:s.points.filter(p=>Date.parse(p.date)>=firstVisible)}));
    const values=lines.flatMap(s=>s.points.map(p=>p.value));
    const minimum=Math.min(...values),maximum=Math.max(...values);
    const spread=Math.max(maximum-minimum,Math.abs(maximum)*.015,1);
    const low=minimum-spread*.14,high=maximum+spread*.14,range=high-low;
    const plotLeft=18,plotRight=this.width-75,plotWidth=plotRight-plotLeft;
    const top=16,bottom=207,plotHeight=bottom-top;
    const x=(d:string)=>plotLeft+(Date.parse(d)-firstVisible)/(lastVisible-firstVisible||1)*plotWidth;
    const y=(v:number)=>bottom-(v-low)/range*plotHeight;
    const path=(points:{date:string;value:number}[])=>points.map((p,i)=>\`\${i?'L':'M'}\${x(p.date).toFixed(2)},\${y(p.value).toFixed(2)}\`).join(' ');
    const highlighted=this.series[0]?.name==='Capital inicial'?this.series.length-1:0;
    const currentIndex=Math.max(0,dates.indexOf(this.selectedDate));
    const index=this.selectedDate&&dates.includes(this.selectedDate)?currentIndex:dates.length-1;
    const date=dates[index],current=lines[highlighted]?.points.find(p=>p.date===date);
    const ticks=Array.from({length:5},(_,i)=>low+range*i/4);
    const xIndexes=dates.length<=2?[0,dates.length-1]:[0,Math.floor((dates.length-1)/2),dates.length-1];
    const axisDates=[...new Set(xIndexes)].map(i=>dates[i]);
    const spanYears=(lastTime-firstTime)/(365.2425*86400000);

    return html\`<figure class="rf-chart rf-chart-terminal">
      <figcaption class="rf-chart-head">
        <div class="rf-chart-title"><span>PROJEÇÃO DE PATRIMÔNIO</span><strong>\${this.label}</strong></div>
        <div class="rf-chart-periods" role="group" aria-label="Período exibido">
          \${periods.map(item=>html\`<button type="button" class=\${this.period===item.label?'active':''}
            aria-pressed=\${this.period===item.label}
            ?disabled=\${item.years>0&&spanYears<=item.years}
            @click=\${()=>{this.period=item.label;this.selectedDate=''}}>\${item.label}</button>\`)}
        </div>
      </figcaption>
      <div class="rf-chart-surface">
        <div class="rf-chart-readout">
          <div><span>VALOR PROJETADO NA DATA</span><strong>\${current?money(current.value):'Sem ponto nesta data'}</strong></div>
          <time datetime=\${date}>\${printDate(date)}</time>
        </div>
        <svg viewBox=\${\`0 0 \${this.width} 242\`} role="img"
          aria-label=\${\`\${this.label}. Valores projetados; use o seletor de data abaixo para leitura acessível.\`}
          @pointermove=\${(event:PointerEvent)=>this.movePointer(event,dates,plotLeft,plotWidth)}
          @pointerdown=\${(event:PointerEvent)=>this.movePointer(event,dates,plotLeft,plotWidth)}>
          <defs><linearGradient id=\${this.gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style=\${\`stop-color:var(--rf-graph-tone-\${(highlighted%4)+1})\`} stop-opacity=".22"/>
            <stop offset="100%" style=\${\`stop-color:var(--rf-graph-tone-\${(highlighted%4)+1})\`} stop-opacity="0"/>
          </linearGradient></defs>
          \${ticks.map(value=>svg\`<line x1=\${plotLeft} x2=\${plotRight} y1=\${y(value)} y2=\${y(value)} class="rf-chart-grid"/>
            <text class="rf-chart-axis-label" x=\${this.width-7} y=\${y(value)+4} text-anchor="end">\${shortMoney(value)}</text>\`)}
          \${axisDates.map((d,i)=>svg\`<text class="rf-chart-axis-label" x=\${x(d)} y="234" text-anchor=\${i===0?'start':i===axisDates.length-1?'end':'middle'}>\${d.slice(5,7)}/\${d.slice(2,4)}</text>\`)}
          \${lines.map((line,i)=>line.points.length>1&&i===highlighted?svg\`<path class="rf-chart-area" d=\${\`\${path(line.points)} L\${x(line.points[line.points.length-1].date)},\${bottom} L\${x(line.points[0].date)},\${bottom} Z\`} fill=\${\`url(#\${this.gradientId})\`}/>\`:nothing)}
          \${lines.map((line,i)=>line.points.length?svg\`<path d=\${path(line.points)}
            class="rf-chart-line \${i===highlighted?'rf-chart-line--primary':''}"
            style=\${\`--rf-series:var(--rf-graph-tone-\${(i%4)+1})\`}
            stroke-width=\${i===highlighted?2.8:1.75}
            stroke-dasharray=\${i===highlighted?'none':patterns[i%4]||'none'} fill="none"/>\`:nothing)}
          <line class="rf-chart-cursor" x1=\${x(date)} x2=\${x(date)} y1=\${top} y2=\${bottom}/>
          \${lines.map((line,i)=>{const point=line.points.find(p=>p.date===date);return point?svg\`<circle cx=\${x(date)} cy=\${y(point.value)} r=\${i===highlighted?5:3.5}
            class="rf-chart-point" style=\${\`--rf-series:var(--rf-graph-tone-\${(i%4)+1})\`}/>\`:nothing})}
        </svg>
      </div>
      <label class="rf-chart-slider">Data no gráfico: <strong>\${printDate(date)}</strong>
        <input type="range" min="0" max=\${dates.length-1} step="1" aria-label="Data no gráfico"
          .value=\${String(index)}
          @input=\${(event:Event)=>{this.selectedDate=dates[Number((event.target as HTMLInputElement).value)]}} />
      </label>
      <ul class="rf-chart-legend">
        \${this.series.map((line,i)=>{const point=lines[i].points.find(p=>p.date===date);
          return html\`<li><span class="rf-line-sample" style=\${\`--rf-series:var(--rf-graph-tone-\${(i%4)+1});border-top-style:\${i===highlighted?'solid':'dashed'}\`}></span>
          <span>\${line.name}</span><strong>\${point?money(point.value):'Sem ponto nesta data'}</strong></li>\`})}
      </ul>
    </figure>\`;
  }
}
