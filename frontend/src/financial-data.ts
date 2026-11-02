export interface Evidence { value: number; account: string; label: string; statement: string; raw: string; scale: string; start?: string; end: string }
export interface Period { kind: 'annual'|'quarter'|'ytd'|'ttm'; start: string; end: string; values: Record<string, number|null>; evidence: Record<string,Evidence>; document: {version:number; received:string; id:string; url:string; dataset:string; scope:string; reference:string}; ttm?: { annual:Period['document']; current:Period['document']; comparative:Period['document']; metrics:Record<string,{account:string;statement:string;annual:number;current:number;comparative:number}> } }
export interface FinancialData { issuer: {symbol:string;cnpj:string;cvm:number;name:string;bank:boolean}; periods:Period[]; limitations:string[] }
export interface Manifest { processed_at:string; companies:Record<string,{path:string;cnpj:string;name:string}> }
export const fields: Record<string,[string,string,string]> = {
 revenue:['Receita líquida','BRL','DRE 3.01; indisponível para bancos.'], costs:['Custos','BRL','DRE 3.02; sinal informado pela CVM.'], gross_profit:['Resultado bruto','BRL','DRE 3.03.'], operating_profit:['Resultado operacional','BRL','DRE 3.05 antes de resultado financeiro e tributos; não é EBITDA.'], financial_result:['Resultado financeiro','BRL','DRE 3.06; indisponível para bancos.'], profit:['Lucro líquido consolidado','BRL','DRE 3.11; bancos 3.09. Inclui participações não controladoras.'], assets:['Ativo total','BRL','BPA 1; saldo na data.'], liabilities:['Passivos exigíveis','BRL','Ativo total menos patrimônio líquido. Não inclui o PL.'], equity:['Patrimônio líquido','BRL','BPP 2.03; bancos 2.08, consolidado com não controladores.'], cash:['Caixa e equivalentes','BRL','BPA 1.01.01; bancos 1.01.'], loans:['Empréstimos e financiamentos','BRL','BPP 2.01.04 + 2.02.01, apenas contas explicitamente identificadas. Não representa toda dívida financeira.'], net_debt:['Dívida líquida','BRL','Indisponível: escopo de dívida, arrendamentos e disponibilidades não validado integralmente.'], operating_cash:['Caixa operacional','BRL','DFC indireto 6.01, fluxo do período indicado.'], investing_cash:['Caixa de investimento','BRL','DFC indireto 6.02.'], financing_cash:['Caixa de financiamento','BRL','DFC indireto 6.03.'], net_margin:['Margem líquida','%','Lucro consolidado / receita × 100. Receita deve ser positiva. Não aplicável a bancos.'], operating_margin:['Margem operacional','%','Resultado operacional / receita × 100. Não aplicável a bancos.'], roe:['ROE','%','Lucro anual / média do PL inicial e final do mesmo documento × 100. Inclui não controladores. Sem anualização trimestral.'], roa:['ROA','%','Lucro anual / média do ativo inicial e final do mesmo documento × 100. Sem anualização trimestral.'], loans_equity:['Empréstimos / PL','%','Empréstimos e financiamentos / PL positivo × 100. Não é passivo total / PL; não aplicável a bancos.'], revenue_growth:['Crescimento da receita','%','Variação anual contra comparativo no mesmo documento. Base positiva; não aplicável a bancos.'], profit_growth:['Crescimento do lucro','%','Variação anual contra comparativo no mesmo documento, somente se base positiva.'], equity_growth:['Evolução do PL','%','Variação anual contra saldo comparativo no mesmo documento, somente se base positiva.'],
};
export const formatFinancial = (value:number|null|undefined,unit='BRL') => value == null ? 'Não disponível' : unit === '%' ? `${value.toLocaleString('pt-BR',{maximumFractionDigits:2})}%` : `R$ ${value.toLocaleString('pt-BR',{notation:'compact',maximumFractionDigits:2})}`;
export async function manifest(signal?:AbortSignal):Promise<Manifest> { const r=await fetch('/financials/manifest.json',{signal}); if(!r.ok)throw new Error('Não foi possível carregar os dados CVM.'); return r.json(); }
export async function loadFinancial(m:Manifest,symbol:string,signal?:AbortSignal):Promise<FinancialData|null> { const company=m.companies[symbol]; if(!company)return null; const r=await fetch(`/financials/${company.path}`,{signal});if(!r.ok)throw new Error('Não foi possível carregar os dados da empresa.'); return r.json(); }


/**
 * Indicative trailing twelve months, not an independently audited restatement.
 * Source: preceding full-year DFP + current YTD ITR - same-period prior-year ITR.
 * Only statement-of-flows accounts with matching CVM codes, scope, periods,
 * original scales, and preserved documentary evidence are eligible.
 * The separate filings may contain accounting reclassifications not detectable
 * from a normalized snapshot; show the limitation and links in the UI.
 */
export function indicativeTtm(periods: Period[]): Period[] {
  const flowKeys = [
    'revenue','costs','gross_profit','operating_profit','financial_result','profit',
    'operating_cash','investing_cash','financing_cash'
  ];
  const results: Period[] = [];
  for (const current of periods) {
    const y = Number(current.end.slice(0,4));
    const suffix = current.end.slice(4);
    const first = String(y) + '-01-01';
    const comparable = current.kind === 'ytd' && (suffix === '-06-30' || suffix === '-09-30')
      || current.kind === 'quarter' && suffix === '-03-31';
    if (!comparable || current.start !== first || !Number.isInteger(y)) continue;
    const previousYear = String(y - 1);
    const comparative = periods.find(p => p.start === previousYear + '-01-01'
      && p.end === previousYear + suffix && (suffix === '-03-31' ? p.kind === 'quarter' : p.kind === 'ytd'));
    const annual = periods.find(p => p.kind === 'annual'
      && p.start === previousYear + '-01-01' && p.end === previousYear + '-12-31');
    if (!comparative || !annual) continue;
    const docs = [annual, current, comparative];
    if (!docs.every(p => p.document.id && p.document.url && p.document.scope === annual.document.scope)) continue;
    if (!annual.document.dataset.includes('/DFP/') ||
      !current.document.dataset.includes('/ITR/') ||
      !comparative.document.dataset.includes('/ITR/')) continue;
    const values: Record<string,number|null> = {};
    const evidence: NonNullable<Period['ttm']>['metrics'] = {};
    for (const key of flowKeys) {
      const rows = docs.map(p => ({p, e:p.evidence[key], value:p.values[key]}));
      if (rows.some(({p,e,value}) => !e || value == null || !Number.isSafeInteger(value)
        || e.value !== value || e.start !== p.start || e.end !== p.end
        || !['DRE','DFC_MI'].includes(e.statement))) continue;
      const origin = rows[0].e;
      if (rows.some(({e}) => e.account !== origin.account
        || e.statement !== origin.statement || e.scale !== origin.scale)) continue;
      const [a,c,b] = rows.map(({value}) => value as number);
      const amount = a + c - b;
      if (!Number.isSafeInteger(amount)) continue;
      values[key] = amount;
      evidence[key] = {account:origin.account,statement:origin.statement,
        annual:a,current:c,comparative:b};
    }
    if (!Object.keys(evidence).length) continue;
    if (values.revenue != null && values.revenue > 0) {
      if (values.profit != null) values.net_margin = values.profit / values.revenue * 100;
      if (values.operating_profit != null) values.operating_margin = values.operating_profit / values.revenue * 100;
    }
    const opening = new Date(Date.parse(comparative.end + 'T00:00:00Z') + 86400000).toISOString().slice(0,10);
    results.push({kind:'ttm',start:opening,end:current.end,values,evidence:{},
      document:current.document,ttm:{annual:annual.document,current:current.document,
        comparative:comparative.document,metrics:evidence}});
  }
  return results.sort((a,b) => a.end.localeCompare(b.end));
}
