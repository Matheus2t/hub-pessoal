import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement, money, parseBrazilian } from '../ui';
import {
  calculateClt, cltRates, compareHousing, simulateAmortization, simulateRetirement,
  type CltRegime, type ExtraMode, type FinancePoint, type LoanSystem,
} from '../extended-finance';
import './form-field';
import './panel-workspace';
import './year-navigation';

type Kind = 'retirement' | 'housing' | 'amortization' | 'clt';
type Field = { key: string; label: string; unit: string; value: string; min: number; max: number; integer?: boolean; advanced?: boolean; hint?: string };
const field = (key: string, label: string, unit: string, value: string, max: number, advanced = false, integer = false, min = 0, hint = ''): Field =>
  ({ key, label, unit, value, min, max, integer, advanced, hint });
/** Interpret formatted Brazilian thousands in monetary fields. */
const parseFinanceField = (value: string, unit: string): number => {
  const raw = value.trim().replace(/R\$|\s/g, '');
  if (unit === 'R$' && /^-?\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, ''));
  return parseBrazilian(value);
};
const configurations: Record<Kind, { title: string; button: string; note: string; fields: Field[] }> = {
  retirement: {
    title: 'Aposentadoria', button: 'Projetar aposentadoria',
    note: 'Planejamento de patrimônio próprio, não cálculo de benefício do INSS. Aportes mensais constantes em valores nominais, ao fim de cada mês.',
    fields: [
      field('currentAge','Idade atual','anos','30',99,false,true,18),
      field('retirementAge','Idade de aposentadoria','anos','65',100,false,true,19),
      field('currentAssets','Patrimônio já investido','R$','25.000,00',1e10),
      field('monthlyContribution','Aporte mensal que pretendo investir','R$','1.000,00',1e8,true),
      field('desiredIncome','Renda mensal desejada, de hoje','R$','5.000,00',1e8),
      field('annualReturn','Rentabilidade efetiva anual','% a.a.','8',40,true),
      field('inflation','Inflação anual estimada','% a.a.','4',30,true),
      field('withdrawalRate','Taxa anual de retirada','% a.a.','4',20,true,false,0.01),
    ]
  },
  housing: {
    title: 'Aluguel x Financiamento', button: 'Comparar cenários',
    note: 'Comparação de patrimônio líquido com o mesmo orçamento: a diferença do custo mensal de moradia é investida pelo cenário mais econômico.',
    fields: [
      field('propertyPrice','Preço do imóvel','R$','400.000,00',1e10,false,false,0.01),
      field('downPercent','Entrada','%','20',100),
      field('rent','Aluguel mensal inicial','R$','2.000,00',1e8),
      field('mortgageRate','Juros efetivos anuais do financiamento','% a.a.','11',100),
      field('mortgageYears','Prazo do financiamento','anos','30',50,false,true,1),
      field('horizonYears','Horizonte da comparação','anos','20',50,false,true,1),
      field('closingPercent','ITBI, escritura e custos iniciais','% do imóvel','4',20,true),
      field('rentGrowth','Reajuste anual do aluguel','% a.a.','4',30,true),
      field('propertyGrowth','Valorização anual do imóvel','% a.a.','4',30,true),
      field('investmentReturn','Rendimento efetivo anual investido','% a.a.','8',40,true),
      field('ownerMonthlyCosts','Custo extra mensal do proprietário','R$','300,00',1e8,true),
    ]
  },
  amortization: {
    title: 'Calculadora de amortização', button: 'Simular amortização',
    note: 'Simulação pós-fixação de uma taxa constante. Amortizações extras são aplicadas após a parcela do mês, sem multas nem tarifas.',
    fields: [
      field('principal','Saldo devedor inicial','R$','250.000,00',1e10,false,false,0.01),
      field('annualRate','Taxa efetiva anual','% a.a.','11',100),
      field('months','Parcelas restantes','meses','240',600,false,true,1),
      field('extraLump','Amortização única','R$','20.000,00',1e10),
      field('extraMonth','Mês da amortização única','mês','12',600,false,true,1),
      field('extraMonthly','Amortização extra mensal','R$','0',1e8),
    ]
  },
  clt: {
    title: 'Custo de funcionário CLT', button: 'Calcular custo CLT',
    note: 'Provisão contábil média por mês: 13º e adicional de férias são distribuídos em 12 meses. O desembolso real varia conforme o calendário e as regras da categoria.',
    fields: [
      field('salary','Salário bruto mensal por funcionário','R$','3.500,00',1e8,false,false,0.01),
      field('employees','Quantidade de funcionários','pessoas','1',10000,false,true,1),
      field('projectionYears','Anos de projeção','anos','5',30,false,true,1),
      field('benefits','Benefícios mensais','R$','600,00',1e8),
      field('transport','Vale-transporte — custo da empresa','R$','200,00',1e8),
      field('otherMonthly','Outros custos mensais não salariais','R$','0',1e8),
      field('inssEmployer','INSS patronal','%','20',100,true),
      field('rat','RAT/FAP efetivo','%','2',100,true),
      field('thirdParties','Terceiros/outras entidades','%','5,8',100,true),
      field('fgts','FGTS','%','8',100,true),
      field('salaryGrowth','Aumento salarial anual estimado','% a.a.','0',30,true),
      field('benefitsGrowth','Reajuste anual de benefícios/custos','% a.a.','0',30,true),
      field('contingencyPercent','Reserva gerencial opcional sobre folha','%','0',30,true),
    ]
  },
};
type Output =
  | { kind: 'retirement'; data: ReturnType<typeof simulateRetirement> }
  | { kind: 'housing'; data: ReturnType<typeof compareHousing> }
  | { kind: 'amortization'; data: ReturnType<typeof simulateAmortization> }
  | { kind: 'clt'; data: ReturnType<typeof calculateClt> };
type Summary = { label: string; amount: number; unit?: string; detail?: string };

@customElement('extended-finance-calculator')
export class ExtendedFinanceCalculator extends LightElement {
  @property() kind: Kind = 'retirement';
  @state() private values: Record<string, string> = {};
  @state() private errors: Record<string, string> = {};
  @state() private output: Output | null = null;
  @state() private error = '';
  @state() private stale = false;
  @state() private tablePage = 0;
  @state() private chartIndex = -1;
  @state() private graphWidth = 790;
  private chartResize?: ResizeObserver;
  private observedChart?: HTMLElement;
  @state() private advancedOpen = false;
  @state() private system: LoanSystem = 'price';
  @state() private mode: ExtraMode = 'term';
  @state() private regime: CltRegime = 'general';
  @state() private retirementMode: 'goal' | 'contribution' = 'goal';
  connectedCallback() { super.connectedCallback(); this.classList.add('workspace-v2', 'calculator-workspace', 'extended-calculator'); }
  protected updated() {
    const chart = this.querySelector<HTMLElement>('.extended-chart-terminal') ?? undefined;
    if (chart !== this.observedChart) {
      this.chartResize?.disconnect();
      this.observedChart = chart;
      if (chart && typeof ResizeObserver !== 'undefined') {
        this.chartResize = new ResizeObserver(entries => {
          const next = Math.max(240, Math.round(entries[0].contentRect.width));
          if (Math.abs(next - this.graphWidth) > 1) this.graphWidth = next;
        });
        this.chartResize.observe(chart);
      }
    }
  }
  disconnectedCallback() {
    this.chartResize?.disconnect();
    this.observedChart = undefined;
    super.disconnectedCallback();
  }
  protected willUpdate(changes: Map<PropertyKey, unknown>) {
    if (changes.has('kind') || !Object.keys(this.values).length) {
      this.values = Object.fromEntries(configurations[this.kind].fields.map(f => [f.key, f.value]));
      this.output = null; this.errors = {}; this.error = ''; this.stale = false; this.tablePage = 0; this.chartIndex = -1; this.advancedOpen = false; this.retirementMode = 'goal';
    }
  }
  private change(event: CustomEvent<{ name: string; value: string }>) {
    this.values = { ...this.values, [event.detail.name]: event.detail.value };
    this.errors = { ...this.errors, [event.detail.name]: '' };
    this.stale = !!this.output;
    this.error = '';
  }
  private selectSystem(event: Event) { this.system = (event.target as HTMLSelectElement).value as LoanSystem; this.stale = !!this.output; }
  private selectMode(event: Event) { this.mode = (event.target as HTMLSelectElement).value as ExtraMode; this.stale = !!this.output; }
  private selectRegime(event: Event) {
    this.regime = (event.target as HTMLSelectElement).value as CltRegime;
    this.values = { ...this.values, ...Object.fromEntries(Object.entries(cltRates[this.regime]).map(([key, value]) => [key, String(value).replace('.', ',')])) };
    this.stale = !!this.output;
  }
  private async calculate(event: Event) {
    event.preventDefault();
    const entries = configurations[this.kind].fields;
    const data: Record<string, number> = {};
    const errors: Record<string, string> = {};
    for (const f of entries) {
      const n = this.kind === 'retirement' && f.key === 'monthlyContribution' && this.retirementMode === 'goal'
        ? 0 : parseFinanceField(this.values[f.key] ?? '', f.unit);
      data[f.key] = n;
      if (!Number.isFinite(n) || n < f.min || n > f.max || (f.integer && !Number.isInteger(n))) {
        errors[f.key] = f.integer ? `Informe um inteiro entre ${f.min} e ${f.max}.` : `Informe um valor entre ${f.min} e ${f.max}.`;
      }
    }
    if (this.kind === 'retirement' && data.retirementAge <= data.currentAge) errors.retirementAge = 'Precisa ser maior que a idade atual.';
    if (this.kind === 'amortization' && data.extraLump > 0 && data.extraMonth > data.months) errors.extraMonth = 'O mês deve estar dentro do prazo restante.';
    this.errors = errors;
    this.error = '';
    if (Object.keys(errors).length) {
      if (configurations[this.kind].fields.some(f => f.advanced && errors[f.key])) this.advancedOpen = true;
      await this.updateComplete;
      this.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    try {
      switch (this.kind) {
        case 'retirement': this.output = { kind: 'retirement', data: simulateRetirement({ ...data, mode: this.retirementMode } as unknown as Parameters<typeof simulateRetirement>[0]) }; break;
        case 'housing': this.output = { kind: 'housing', data: compareHousing({ ...data, system: this.system } as Parameters<typeof compareHousing>[0]) }; break;
        case 'amortization': this.output = { kind: 'amortization', data: simulateAmortization({ ...data, system: this.system, mode: this.mode } as Parameters<typeof simulateAmortization>[0]) }; break;
        case 'clt': this.output = { kind: 'clt', data: calculateClt(data as unknown as Parameters<typeof calculateClt>[0]) }; break;
      }
      this.stale = false;
      this.tablePage = 0;
      this.chartIndex = -1;
    } catch (e) { this.error = e instanceof Error ? e.message : 'Não foi possível calcular com esses parâmetros.'; }
  }
  private renderField(f: Field) {
    return html`<form-field .name=${f.key} .idPrefix=${'extended-' + this.kind} .label=${f.label} .unit=${f.unit} .value=${this.values[f.key] || ''} .integer=${!!f.integer} .hint=${f.hint || ''} .error=${this.errors[f.key] || ''}></form-field>`;
  }

  private goalPreview(): ReturnType<typeof simulateRetirement> | null {
    if (this.kind !== 'retirement' || this.retirementMode !== 'goal') return null;
    try {
      const input = Object.fromEntries(configurations.retirement.fields.map(f => [
        f.key, f.key === 'monthlyContribution' ? 0 : parseFinanceField(this.values[f.key] ?? '', f.unit)
      ])) as Record<string, number>;
      if (!Number.isInteger(input.currentAge) || !Number.isInteger(input.retirementAge)) return null;
      return simulateRetirement({ ...input, mode: 'goal' } as unknown as Parameters<typeof simulateRetirement>[0]);
    } catch { return null; }
  }
  private changeRetirementMode(mode: 'goal' | 'contribution') {
    this.retirementMode = mode;
    this.stale = !!this.output;
    this.error = '';
  }

  private summary(): Summary[] {
    const out = this.output;
    if (!out) return [];
    switch (out.kind) {
      case 'retirement': return out.data.mode === 'goal' ? [
        { label: 'Aporte mensal necessário', amount: out.data.usedMonthlyContribution },
        { label: 'Patrimônio ao se aposentar', amount: out.data.finalAssets },
        { label: 'Meta de patrimônio', amount: out.data.targetAssets },
      ] : [
        { label: 'Patrimônio projetado', amount: out.data.finalAssets },
        { label: 'Renda mensal estimada em reais de hoje', amount: out.data.projectedMonthlyIncomeToday },
        { label: 'Aporte necessário para sua meta', amount: out.data.requiredMonthlyContribution },
      ];
      case 'housing': return [
        { label: 'Patrimônio ao comprar', amount: out.data.buyWealth },
        { label: 'Patrimônio ao alugar', amount: out.data.rentWealth },
        { label: 'Vantagem de comprar', amount: out.data.difference, detail: out.data.difference >= 0 ? 'Compra supera aluguel' : 'Aluguel supera compra' },
      ];
      case 'amortization': return [
        { label: 'Juros economizados', amount: out.data.interestSaved },
        { label: 'Prazo reduzido', amount: out.data.monthsSaved, unit: 'meses' },
        { label: 'Novo total a pagar', amount: out.data.accelerated.totalPaid },
      ];
      case 'clt': return [
        { label: out.data.employees === 1 ? 'Custo médio mensal' : 'Custo mensal da equipe', amount: out.data.teamMonthlyCost },
        { label: out.data.employees === 1 ? 'Custo anual estimado' : 'Custo anual da equipe', amount: out.data.teamAnnualCost },
        { label: 'Custo total no horizonte', amount: out.data.totalProjectedCost },
      ];
    }
  }
  private chartData(): { points: FinancePoint[]; a: string; b: string } | null {
    const out = this.output;
    if (!out) return null;
    if (out.kind === 'retirement') return { points: out.data.points, a: 'Patrimônio', b: 'Capital investido' };
    if (out.kind === 'housing') return { points: out.data.points, a: 'Comprar', b: 'Alugar' };
    if (out.kind === 'amortization') return { points: out.data.points, a: 'Sem amortização extra', b: 'Com amortização extra' };
    if (out.kind === 'clt') {
      const points = [
        { period: 0, first: out.data.teamAnnualCost, second: out.data.annualRows[0].salary * 12 * out.data.employees },
        ...out.data.annualRows.map(r => ({period:r.year, first:r.annualCost, second:r.salary * 12 * out.data.employees}))
      ];
      return { points, a:'Custo anual total', b:'Salários anuais (12 meses)' };
    }
    return null;
  }
  private renderChart(points: FinancePoint[], a: string, b: string) {
    if (!points.length) return nothing;
    const left = 17, top = 18, canvasWidth = this.graphWidth, width = Math.max(140, canvasWidth - 90), height = 188;
    const values = points.flatMap(point => [point.first, point.second]);
    const minimum = Math.min(0, ...values), maximum = Math.max(1, ...values);
    const gap = Math.max(1, maximum - minimum) * .1;
    const low = minimum - gap, high = maximum + gap, range = high - low;
    const lastPeriod = points.at(-1)!.period, firstPeriod = points[0].period;
    const px = (period: number) => left + (period-firstPeriod) / Math.max(1, lastPeriod-firstPeriod) * width;
    const py = (value: number) => top + (high-value) / range * height;
    const trace = (key: 'first' | 'second') => points.map(p => `${px(p.period).toFixed(2)},${py(p[key]).toFixed(2)}`).join(' ');
    const index = this.chartIndex < 0 ? points.length-1 : Math.min(this.chartIndex, points.length-1);
    const selected = points[index], cursorX = px(selected.period);
    const axis = this.kind === 'amortization' ? 'Mês' : this.kind === 'retirement' ? 'Idade' : 'Ano';
    const compact = (n: number) => 'R$ '+new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(n);
    const inspect = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && event.type === 'pointermove') return;
      const graphic = event.currentTarget as SVGSVGElement, matrix = graphic.getScreenCTM();
      if (!matrix) return;
      const pt = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      const fraction = Math.max(0,Math.min(1,(pt.x-left)/width));
      const period = firstPeriod + fraction*(lastPeriod-firstPeriod);
      let closest = 0;
      for(let i=1;i<points.length;i++)
        if(Math.abs(points[i].period-period)<Math.abs(points[closest].period-period))closest=i;
      if (closest !== this.chartIndex) this.chartIndex = closest;
    };
    return html`<div class="extended-chart extended-chart-terminal">
      <div class="extended-chart-top">
        <div class="extended-chart-current"><span>${axis.toUpperCase()} ${selected.period} · COMPARAÇÃO</span>
          <strong>${money(selected.first)}</strong><small>${a}</small></div>
        <div class="extended-chart-secondary"><span>${b}</span><strong>${money(selected.second)}</strong></div>
      </div>
      <svg viewBox=${`0 0 ${canvasWidth} 252`} role="img" aria-label=${`Gráfico de evolução: ${a} versus ${b}`}
           preserveAspectRatio="xMidYMid meet" @pointermove=${inspect} @pointerdown=${inspect}>
        <title>Evolução comparativa dos cenários</title>
        <rect x=${left} y=${top} width=${width} height=${height} fill="transparent" style="pointer-events:all"></rect>
        ${Array.from({length:5},(_,i)=>low+(range*i)/4).map(value=>html`
          <line class="extended-gridline" x1=${left} x2=${left+width} y1=${py(value)} y2=${py(value)}></line>
          <text class="extended-chart-axis" x=${canvasWidth-10} y=${py(value)+4} text-anchor="end">${compact(value)}</text>`)}
        <polygon class="extended-area" points=${`${trace('first')} ${px(lastPeriod)},${top+height} ${px(firstPeriod)},${top+height}`}></polygon>
        <polyline class="extended-line-second" points=${trace('second')}></polyline>
        <polyline class="extended-line-first" points=${trace('first')}></polyline>
        <line class="extended-chart-cursor" x1=${cursorX} x2=${cursorX} y1=${top} y2=${top+height}></line>
        <circle class="extended-chart-point" cx=${cursorX} cy=${py(selected.first)} r="5"></circle>
        <circle class="extended-chart-point second" cx=${cursorX} cy=${py(selected.second)} r="4"></circle>
        <text class="extended-chart-axis" x=${left} y="239">${axis} ${firstPeriod}</text>
        <text class="extended-chart-axis" x=${left+width} y="239" text-anchor="end">${axis} ${lastPeriod}</text>
      </svg>
      <div class="extended-chart-legend"><span class="extended-legend-first">${a}</span><span class="extended-legend-second">${b}</span></div>
      <label class="extended-chart-scrub">Explorar ${this.kind === 'amortization' ? 'mês' : this.kind === 'retirement' ? 'idade' : 'ano'} a ${this.kind === 'amortization' ? 'mês' : this.kind === 'retirement' ? 'idade' : 'ano'}
        <input type="range" min="0" max=${points.length-1} step="1" .value=${String(index)}
          aria-label="Período exibido no gráfico"
          @input=${(event: Event)=>{this.chartIndex=Number((event.target as HTMLInputElement).value)}} />
      </label>
    </div>`;
  }
  private tableData(): { heads: string[]; rows: string[][]; title: string } {
    const out = this.output;
    if (!out) return { heads: [], rows: [], title: '' };
    if (out.kind === 'retirement') return {
      title: 'Evolução mês a mês', heads: ['Mês','Idade','Aporte','Juros no mês','Total investido','Patrimônio'],
      rows: out.data.monthlyRows.map(r => [String(r.month), r.age.toLocaleString('pt-BR',{maximumFractionDigits:2}), money(r.deposit), money(r.interest), money(r.invested), money(r.balance)]),
    };
    if (out.kind === 'housing') return {
      title: 'Comparação mensal', heads: ['Mês','Comprar: patrimônio','Alugar: patrimônio','Prestação','Aluguel','Saldo devedor'],
      rows: out.data.monthlyRows.map(r => [String(r.month),money(r.buyWealth),money(r.rentWealth),money(r.payment),money(r.rentMonthly),money(r.loanBalance)]),
    };
    if (out.kind === 'amortization') return {
      title: 'Antes e depois da amortização', heads: ['Mês','Parcela original','Parcela com extra','Juros com extra','Extra aplicado','Saldo original','Saldo com extra'],
      rows: out.data.accelerated.rows.map((r,i) => [
        String(r.month),money(out.data.baseline.rows[i]?.payment ?? 0),money(r.payment),
        money(r.interest),money(r.extra),money(out.data.baseline.rows[i]?.balance ?? 0),money(r.balance)
      ]),
    };
    return {
      title: 'Provisões e custos mensais da equipe',
      heads: ['Mês','Salários','13º + férias','FGTS + encargos','Benefícios','Outros + reserva','Total do mês','Acumulado'],
      rows: out.data.monthlyRows.map(r => [
        String(r.month), money(r.salary), money(r.thirteenth+r.vacationBonus),
        money(r.fgts+r.employerCharges), money(r.benefits),
        money(r.other+r.contingency), money(r.total),money(r.cumulative)
      ]),
    };
  }
  private details() {
    const out = this.output;
    if (!out) return nothing;
    if (out.kind === 'retirement') return html`<p class="extended-detail">Renda desejada em valores de hoje: <strong>${money(out.data.requestedIncomeToday)}/mês</strong>. Renda necessária na data futura, corrigida pela inflação: <strong>${money(out.data.futureMonthlyIncome)}/mês</strong>. Capacidade projetada em valores de hoje: <strong>${money(out.data.projectedMonthlyIncomeToday)}/mês</strong>. ${out.data.gap > 0 ? html`Faltariam <strong>${money(out.data.gap)}</strong> para a meta.` : html`Meta de patrimônio atingida ou superada sob as premissas informadas.`}</p>`;
    if (out.kind === 'housing') return html`<p class="extended-detail">Entrada e custos iniciais: <strong>${money(out.data.initialCash)}</strong>. Valor financiado: <strong>${money(out.data.financed)}</strong>. Primeira prestação estimada: <strong>${money(out.data.firstPayment)}</strong>.</p>`;
    if (out.kind === 'amortization') return html`<p class="extended-detail">Sem extras: <strong>${money(out.data.baseline.totalInterest)}</strong> em juros e ${out.data.baseline.rows.length} parcelas. Com extras: <strong>${money(out.data.accelerated.totalInterest)}</strong> em juros e ${out.data.accelerated.rows.length} parcelas.</p>`;
    return html`<div class="extended-detail"><p>Equipe de <strong>${out.data.employees} ${out.data.employees===1?'pessoa':'pessoas'}</strong> · Custo equivalente a <strong>${out.data.multiplier.toLocaleString('pt-BR',{maximumFractionDigits:2})}×</strong> o salário mensal por funcionário. Custo por pessoa: <strong>${money(out.data.averageMonthlyCost)}/mês</strong>.</p>
      <details class="extended-cost-breakdown"><summary>Ver composição do custo do primeiro ano por funcionário</summary>
        <div class="table-scroll" role="region" tabindex="0" aria-label="Composição anual dos custos CLT">
          <table><thead><tr><th scope="col">Componente</th><th scope="col">Valor anual</th></tr></thead>
          <tbody>${out.data.parts.map(p=>html`<tr><th scope="row">${p.label}</th><td>${money(p.amount)}</td></tr>`)}</tbody></table>
        </div>
      </details>
      <p>INSS e IRRF retidos do trabalhador não são novos custos patronais. FGTS, CPP e terceiros dependem do enquadramento; a reserva gerencial é opcional.</p></div>`;
  }
  render() {
    const config = configurations[this.kind];
    const chart = this.chartData();
    const table = this.tableData();
    const rows = table.rows.slice(this.tablePage * 12, this.tablePage * 12 + 12);
    const goal = this.goalPreview();
    return html`<div class="ws-page-heading"><h1>${config.title}</h1></div>
      <panel-workspace fixed-layout .area=${`calculator-${this.kind}`} .panels=${[
        { id:'form', title:'Simulação', required:true, essential:true, size:'small', resizable:false, role:'form' },
        { id:'empty', title:'Resultados', required:true, available:!this.output, size:'medium', resizable:false },
        { id:'summary', title:'Resumo', essential:true, available:!!this.output, size:'medium' },
        { id:'chart', title:'Evolução', essential:true, available:!!chart, size:'medium' },
        { id:'table', title:table.title, available:!!this.output, size:'large' },
      ]}>
        <section slot="form" class="workspace-panel simulation-panel">
          <div class="panel-heading"><h2>Simulação</h2></div>
          <form novalidate @field-input=${this.change} @submit=${this.calculate}>
            ${this.kind === 'retirement' ? html`<div class="retirement-intent" role="group" aria-label="Como planejar a aposentadoria">
              <button type="button" class="retirement-mode-button" aria-pressed=${this.retirementMode==='goal'} @click=${()=>this.changeRetirementMode('goal')}>Quero receber uma renda</button>
              <button type="button" class="retirement-mode-button" aria-pressed=${this.retirementMode==='contribution'} @click=${()=>this.changeRetirementMode('contribution')}>Quero testar um aporte</button>
            </div>
            ${goal ? html`<div class="retirement-goal-preview" aria-live="polite"><span>APORTE MENSAL PARA SUA RENDA DESEJADA</span>
              <strong>${money(goal.requiredMonthlyContribution)}<small>/mês</small></strong>
              <p>Meta de ${money(goal.targetAssets)} aos ${this.values.retirementAge} anos, com o patrimônio e as taxas informadas.</p></div>` : nothing}` : nothing}
            ${this.kind === 'clt' ? html`<label class="extended-select">Regime tributário
              <select .value=${this.regime} @change=${this.selectRegime}>
                <option value="general">Regime geral / lucro presumido ou real</option>
                <option value="simples">Simples Nacional — outros anexos</option>
                <option value="annex4">Simples Nacional — Anexo IV</option>
              </select></label>` : nothing}
            ${this.kind === 'housing' || this.kind === 'amortization' ? html`<div class="extended-select-grid">
              <label class="extended-select">Sistema de amortização
                <select .value=${this.system} @change=${this.selectSystem}><option value="price">PRICE</option><option value="sac">SAC</option></select>
              </label>
              ${this.kind === 'amortization' ? html`<label class="extended-select">Aplicar extra para
                <select .value=${this.mode} @change=${this.selectMode}><option value="term">Reduzir prazo</option><option value="payment">Reduzir parcelas</option></select>
              </label>` : nothing}
            </div>` : nothing}
            <div class="form-grid finance-extended-fields">${config.fields.filter(f =>
              !f.advanced || (this.kind==='retirement' && f.key==='monthlyContribution' && this.retirementMode==='contribution')
            ).map(f => this.renderField(f))}</div>
            ${config.fields.some(f => f.advanced) ? html`<details class="extended-advanced" ?open=${this.advancedOpen || Object.keys(this.errors).some(k => config.fields.find(f => f.key === k)?.advanced)} @toggle=${(e: Event) => { this.advancedOpen = (e.currentTarget as HTMLDetailsElement).open; }}>
              <summary>Parâmetros avançados</summary>
              <div class="form-grid finance-extended-fields">${config.fields.filter(f => f.advanced &&
                !(this.kind==='retirement' && f.key==='monthlyContribution')
              ).map(f => this.renderField(f))}</div>
            </details>` : nothing}
            <p class="form-note extended-note">${config.note}</p>
            <div class="form-bottom"><button type="submit" class="button primary">${config.button}</button></div>
            ${this.error ? html`<p class="message error" role="alert">${this.error}</p>` : nothing}
          </form>
        </section>
        <section slot="empty" class="workspace-panel calculator-empty" aria-live="polite"><div><h2>Resultados</h2><p>Preencha os campos e simule.</p></div></section>
        <section slot="summary" class="workspace-panel" aria-live="polite">
          ${this.output ? html`<div class="section-heading result-heading"><h2>Resultados</h2><span class="result-status ${this.stale ? 'stale':''}">${this.stale ? 'Parâmetros alterados. Simule novamente.' : 'Simulação concluída'}</span></div>
            <div class="metrics-grid">${this.summary().map((m,i) => html`<article class="metric-card ${i === 0 ? 'accent':''}"><div class="metric-label">${m.label}</div><strong>${m.unit === 'meses' ? `${m.amount} meses` : money(m.amount)}</strong>${m.detail ? html`<p>${m.detail}</p>` : nothing}</article>`)}</div>
            ${this.details()}` : nothing}
        </section>
        <section slot="chart" class="workspace-panel">${chart ? this.renderChart(chart.points, chart.a, chart.b) : nothing}</section>
        <section slot="table" class="workspace-panel">
          ${this.output ? html`<div class="extended-table">
            <div class="extended-table-top"><div><span class="extended-table-kicker">DEMONSTRATIVO</span><h2>${table.title}</h2></div>
              <span class="extended-table-count">${table.rows.length} meses</span></div>
            <year-navigation .year=${this.tablePage + 1} .years=${Math.ceil(table.rows.length / 12)}
              .range=${`Meses ${this.tablePage * 12 + 1}–${Math.min((this.tablePage + 1) * 12,table.rows.length)}`}
              @year-change=${(event:CustomEvent<number>)=>this.tablePage=event.detail-1}></year-navigation>
            <div class="table-scroll" role="region" tabindex="0" aria-label=${table.title}><table><thead><tr>${table.heads.map(h => html`<th scope="col">${h}</th>`)}</tr></thead>
              <tbody>${rows.map((row,i) => html`<tr><th scope="row">${row[0]}</th>${row.slice(1).map(cell => html`<td>${cell}</td>`)}</tr>`)}</tbody></table></div>
          </div>` : nothing}
          ${this.output ? html`<p class="extended-disclosure">${this.kind === 'retirement' ? 'Projeção sem impostos, taxas e volatilidade; taxa de retirada é hipótese, não garantia de renda.' : this.kind === 'housing' ? 'Não considera corretagem de venda, imposto sobre ganho de capital, custos comuns a aluguel e compra ou mudanças de juros. Rendimento dos investimentos bruto de tributos.' : this.kind === 'amortization' ? 'Não inclui seguros, correção por TR/IPCA, tarifas, CET, multas ou mudanças contratuais. Confirme as regras da instituição.' : 'Estimativa sem custos de rescisão, adicionais por categoria, horas extras e convenções coletivas. Benefícios são tratados como não salariais; ajuste o cenário conforme sua empresa.'}</p>` : nothing}
        </section>
      </panel-workspace>`;
  }
}
