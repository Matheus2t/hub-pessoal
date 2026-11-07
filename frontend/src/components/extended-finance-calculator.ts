import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement, money, parseBrazilian } from '../ui';
import {
  calculateClt, cltRates, compareHousing, simulateAmortization, simulateRetirement,
  type CltRegime, type ExtraMode, type FinancePoint, type LoanSystem,
} from '../extended-finance';
import './form-field';
import './panel-workspace';

type Kind = 'retirement' | 'housing' | 'amortization' | 'clt';
type Field = { key: string; label: string; unit: string; value: string; min: number; max: number; integer?: boolean; advanced?: boolean; hint?: string };
const field = (key: string, label: string, unit: string, value: string, max: number, advanced = false, integer = false, min = 0, hint = ''): Field =>
  ({ key, label, unit, value, min, max, integer, advanced, hint });
const configurations: Record<Kind, { title: string; button: string; note: string; fields: Field[] }> = {
  retirement: {
    title: 'Aposentadoria', button: 'Projetar aposentadoria',
    note: 'Planejamento de patrimônio próprio, não cálculo de benefício do INSS. Aportes mensais constantes em valores nominais, ao fim de cada mês.',
    fields: [
      field('currentAge','Idade atual','anos','30',99,false,true,18),
      field('retirementAge','Idade de aposentadoria','anos','65',100,false,true,19),
      field('currentAssets','Patrimônio já investido','R$','25.000,00',1e10),
      field('monthlyContribution','Aporte mensal','R$','1.000,00',1e8),
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
    title: 'Amortização antecipada', button: 'Simular amortização',
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
    note: 'Visão de custo para o empregador. O salário de férias integra os 12 salários; só o adicional de 1/3 é somado novamente. Encargos patronais ajustáveis.',
    fields: [
      field('salary','Salário bruto mensal','R$','3.500,00',1e8,false,false,0.01),
      field('benefits','Benefícios mensais','R$','600,00',1e8),
      field('transport','Vale-transporte — custo da empresa','R$','200,00',1e8),
      field('otherMonthly','Outros custos mensais não salariais','R$','0',1e8),
      field('inssEmployer','INSS patronal','%','20',100,true),
      field('rat','RAT/FAP efetivo','%','2',100,true),
      field('thirdParties','Terceiros/outras entidades','%','5,8',100,true),
      field('fgts','FGTS','%','8',100,true),
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
  @state() private system: LoanSystem = 'price';
  @state() private mode: ExtraMode = 'term';
  @state() private regime: CltRegime = 'general';
  connectedCallback() { super.connectedCallback(); this.classList.add('workspace-v2', 'calculator-workspace', 'extended-calculator'); }
  protected willUpdate(changes: Map<PropertyKey, unknown>) {
    if (changes.has('kind') || !Object.keys(this.values).length) {
      this.values = Object.fromEntries(configurations[this.kind].fields.map(f => [f.key, f.value]));
      this.output = null; this.errors = {}; this.error = ''; this.stale = false; this.tablePage = 0;
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
      const n = parseBrazilian(this.values[f.key] ?? '');
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
      await this.updateComplete;
      this.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    try {
      switch (this.kind) {
        case 'retirement': this.output = { kind: 'retirement', data: simulateRetirement(data as unknown as Parameters<typeof simulateRetirement>[0]) }; break;
        case 'housing': this.output = { kind: 'housing', data: compareHousing({ ...data, system: this.system } as Parameters<typeof compareHousing>[0]) }; break;
        case 'amortization': this.output = { kind: 'amortization', data: simulateAmortization({ ...data, system: this.system, mode: this.mode } as Parameters<typeof simulateAmortization>[0]) }; break;
        case 'clt': this.output = { kind: 'clt', data: calculateClt(data as unknown as Parameters<typeof calculateClt>[0]) }; break;
      }
      this.stale = false;
      this.tablePage = 0;
    } catch (e) { this.error = e instanceof Error ? e.message : 'Não foi possível calcular com esses parâmetros.'; }
  }
  private renderField(f: Field) {
    return html`<form-field .name=${f.key} .label=${f.label} .unit=${f.unit} .value=${this.values[f.key] || ''} .integer=${!!f.integer} .hint=${f.hint || ''} .error=${this.errors[f.key] || ''}></form-field>`;
  }
  private summary(): Summary[] {
    const out = this.output;
    if (!out) return [];
    switch (out.kind) {
      case 'retirement': return [
        { label: 'Patrimônio projetado', amount: out.data.finalAssets },
        { label: 'Meta de patrimônio', amount: out.data.targetAssets },
        { label: 'Aporte mensal necessário', amount: out.data.requiredMonthlyContribution, detail: 'Para alcançar a meta, desde hoje' },
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
        { label: 'Custo médio mensal', amount: out.data.averageMonthlyCost },
        { label: 'Custo anual estimado', amount: out.data.annualCost },
        { label: 'Além do salário por mês', amount: out.data.additionalMonthlyCost },
      ];
    }
  }
  private chartData(): { points: FinancePoint[]; a: string; b: string } | null {
    const out = this.output;
    if (!out) return null;
    if (out.kind === 'retirement') return { points: out.data.points, a: 'Patrimônio', b: 'Capital investido' };
    if (out.kind === 'housing') return { points: out.data.points, a: 'Comprar', b: 'Alugar' };
    if (out.kind === 'amortization') return { points: out.data.points, a: 'Sem amortização extra', b: 'Com amortização extra' };
    return null;
  }
  private renderChart(points: FinancePoint[], a: string, b: string) {
    const left = 55, top = 18, width = 700, height = 190;
    const max = Math.max(1, ...points.flatMap(p => [p.first, p.second])) * 1.05;
    const lastPeriod = points.at(-1)?.period ?? 1;
    const firstPeriod = points[0]?.period ?? 0;
    const coord = (value: number, period: number) => `${left + (period - firstPeriod) / Math.max(1, lastPeriod - firstPeriod) * width},${top + height - Math.max(0, value) / max * height}`;
    const trace = (key: 'first' | 'second') => points.map(p => coord(p[key], p.period)).join(' ');
    return html`<div class="extended-chart"><div class="extended-chart-legend"><span class="extended-legend-first">${a}</span><span class="extended-legend-second">${b}</span></div>
      <svg viewBox="0 0 790 250" role="img" aria-label=${`Gráfico de evolução: ${a} versus ${b}`} preserveAspectRatio="xMidYMid meet">
        <title>Evolução comparativa dos cenários</title>
        ${[0, 0.5, 1].map(y => html`<line class="extended-gridline" x1=${left} x2=${left + width} y1=${top + height * y} y2=${top + height * y}></line>`)}
        <polyline class="extended-line-first" points=${trace('first')}></polyline>
        <polyline class="extended-line-second" points=${trace('second')}></polyline>
        <text x=${left} y="236">${firstPeriod}</text><text x=${left + width} y="236" text-anchor="end">${lastPeriod}</text>
      </svg>
      <p class="extended-chart-caption">${this.kind === 'amortization' ? 'Eixo horizontal: meses.' : this.kind === 'retirement' ? 'Eixo horizontal: idade.' : 'Eixo horizontal: anos.'}</p>
    </div>`;
  }
  private tableData(): { heads: string[]; rows: string[][]; title: string } {
    const out = this.output;
    if (!out) return { heads: [], rows: [], title: '' };
    if (out.kind === 'retirement') return {
      title: 'Evolução anual', heads: ['Idade','Patrimônio','Total aplicado'],
      rows: out.data.points.map(p => [String(p.period), money(p.first), money(p.second)]),
    };
    if (out.kind === 'housing') return {
      title: 'Comparação anual', heads: ['Ano','Comprar: patrimônio','Alugar: patrimônio','Saldo devedor','Aluguel mensal'],
      rows: out.data.rows.map(r => [String(r.year),money(r.buyWealth),money(r.rentWealth),money(r.loanBalance),money(r.rentMonthly)]),
    };
    if (out.kind === 'amortization') return {
      title: 'Parcelas com amortização extra', heads: ['Mês','Parcela total','Juros','Amortização normal','Extra','Saldo'],
      rows: out.data.accelerated.rows.map(r => [String(r.month),money(r.payment),money(r.interest),money(r.amortization),money(r.extra),money(r.balance)]),
    };
    return {
      title: 'Composição do custo anual', heads: ['Componente','Valor anual'],
      rows: out.data.parts.map(p => [p.label,money(p.amount)]),
    };
  }
  private details() {
    const out = this.output;
    if (!out) return nothing;
    if (out.kind === 'retirement') return html`<p class="extended-detail">Renda desejada na data futura: <strong>${money(out.data.futureMonthlyIncome)}/mês</strong>. Capacidade estimada de retirada em reais de hoje: <strong>${money(out.data.projectedMonthlyIncomeToday)}/mês</strong>. Diferença para a meta: <strong>${money(out.data.gap)}</strong>.</p>`;
    if (out.kind === 'housing') return html`<p class="extended-detail">Entrada e custos iniciais: <strong>${money(out.data.initialCash)}</strong>. Valor financiado: <strong>${money(out.data.financed)}</strong>. Primeira prestação estimada: <strong>${money(out.data.firstPayment)}</strong>.</p>`;
    if (out.kind === 'amortization') return html`<p class="extended-detail">Sem extras: <strong>${money(out.data.baseline.totalInterest)}</strong> em juros e ${out.data.baseline.rows.length} parcelas. Com extras: <strong>${money(out.data.accelerated.totalInterest)}</strong> em juros e ${out.data.accelerated.rows.length} parcelas.</p>`;
    return html`<p class="extended-detail">Custo equivalente a <strong>${out.data.multiplier.toLocaleString('pt-BR',{maximumFractionDigits:2})}×</strong> o salário bruto mensal. INSS e IRRF descontados do empregado não são somados como despesa patronal adicional.</p>`;
  }
  render() {
    const config = configurations[this.kind];
    const chart = this.chartData();
    const table = this.tableData();
    const rows = table.rows.slice(this.tablePage * 12, this.tablePage * 12 + 12);
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
            <div class="form-grid finance-extended-fields">${config.fields.filter(f => !f.advanced).map(f => this.renderField(f))}</div>
            ${config.fields.some(f => f.advanced) ? html`<details class="extended-advanced" ?open=${Object.keys(this.errors).some(k => config.fields.find(f => f.key === k)?.advanced)}>
              <summary>Parâmetros avançados</summary>
              <div class="form-grid finance-extended-fields">${config.fields.filter(f => f.advanced).map(f => this.renderField(f))}</div>
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
            <h2>${table.title}</h2><div class="table-scroll" role="region" tabindex="0" aria-label=${table.title}><table><thead><tr>${table.heads.map(h => html`<th scope="col">${h}</th>`)}</tr></thead>
              <tbody>${rows.map(row => html`<tr>${row.map(cell => html`<td>${cell}</td>`)}</tr>`)}</tbody></table></div>
            ${table.rows.length > 12 ? html`<div class="table-pagination"><button type="button" class="button secondary" ?disabled=${this.tablePage === 0} @click=${() => this.tablePage--}>Anterior</button>
            <span>Página ${this.tablePage + 1} de ${Math.ceil(table.rows.length / 12)}</span><button type="button" class="button secondary" ?disabled=${(this.tablePage + 1) * 12 >= table.rows.length} @click=${() => this.tablePage++}>Próxima</button></div>` : nothing}
          </div>` : nothing}
          ${this.output ? html`<p class="extended-disclosure">${this.kind === 'retirement' ? 'Projeção sem impostos, taxas e volatilidade; taxa de retirada é hipótese, não garantia de renda.' : this.kind === 'housing' ? 'Não considera corretagem de venda, imposto sobre ganho de capital, custos comuns a aluguel e compra ou mudanças de juros. Rendimento dos investimentos bruto de tributos.' : this.kind === 'amortization' ? 'Não inclui seguros, correção por TR/IPCA, tarifas, CET, multas ou mudanças contratuais. Confirme as regras da instituição.' : 'Estimativa sem custos de rescisão, adicionais por categoria, horas extras e convenções coletivas. Benefícios são tratados como não salariais; ajuste o cenário conforme sua empresa.'}</p>` : nothing}
        </section>
      </panel-workspace>`;
  }
}
