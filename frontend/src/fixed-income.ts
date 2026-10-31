/** Pure projections for Brazilian resident individuals. Rules reviewed 2026-10-31.
 * No prices, rate feeds, settlement calendar or early-sale pricing are used.
 * See docs/fixed-income.md for conventions and official sources.
 */
export type Product = 'cdb' | 'lci' | 'lca' | 'selic' | 'ipca';
export const productNames: Record<Product, string> = {cdb:'CDB',lci:'LCI',lca:'LCA',selic:'Tesouro Selic',ipca:'Tesouro IPCA+'};
export interface Investment {
  product: Product; amount: number; start: string; maturity: string;
  indexation: 'cdi' | 'fixed'; cdi: number; percentage: number; fixed: number;
  selic: number; spread: number; inflation: number; real: number;
  custody: number; fee: number; otherSelic: number;
  liquidity: 'daily' | 'maturity'; grace: number;
}
export interface ProjectionPoint {
  date: string; days: number; gross: number; profit: number; iof: number; ir: number;
  irRate: number; custody: number; fee: number; costs: number; net: number;
  netProfit: number; netReturn: number; annualized: number | null;
  purchasingPower: number; realReturn: number; redeemable: boolean; status: string;
}
export interface Projection {
  input: Investment; final: ProjectionPoint; series: ProjectionPoint[];
  horizon: string; comparable: boolean; maturedBefore: boolean;
}
const DAY=86400000;
export const roundMoney=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function dateValue(value:string):number {
  const n=Date.parse(`${value}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value) throw Error('Informe uma data válida.');
  return n;
}
export const isoDate=(value:number)=>new Date(value).toISOString().slice(0,10);
export const daysBetween=(a:string,b:string)=>(dateValue(b)-dateValue(a))/DAY;
export function addMonths(value:string,months:number):string {
  const d=new Date(dateValue(value));const day=d.getUTCDate();
  d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);
}
export function irRate(days:number):number {return days<=180?.225:days<=360?.20:days<=720?.175:.15;}
// Decreto 6.306/2007, annex: day 1 through day 30. Never interpolate.
export const IOF=[96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3,0] as const;
export const iofRate=(days:number)=>days>=1&&days<30?IOF[days-1]/100:0;
export const annualToDaily=(percent:number,basis=252)=>Math.expm1(Math.log1p(percent/100)/basis);
export const ipcaNominal=(inflation:number,real:number)=>(1+inflation/100)*(1+real/100)-1;
export const annualize=(ratio:number,days:number)=>days>0&&ratio>0?Math.expm1(Math.log(ratio)*365/days):null;
export const isTreasury=(p:Product)=>p==='selic'||p==='ipca';
export function firstRedemption(input:Investment):string {
  const contractual=isoDate(dateValue(input.start)+input.grace*DAY);
  return input.product==='lci'||input.product==='lca' ? [contractual,addMonths(input.start,6)].sort().at(-1)! : contractual;
}
export function validateInvestment(i:Investment,horizon=i.maturity):void {
  if(!Object.hasOwn(productNames,i.product))throw Error('Selecione um investimento.');
  if(!Number.isFinite(i.amount)||i.amount<=0||i.amount>1e12)throw Error('Informe um valor entre R$ 0,01 e R$ 1 trilhão.');
  if(i.amount<.01)throw Error('O valor mínimo é R$ 0,01.');
  for(const key of ['cdi','percentage','fixed','selic','spread','inflation','real','custody','fee','otherSelic','grace'] as const)if(!Number.isFinite(i[key]))throw Error('Preencha as taxas e condições do investimento.');
  if(!['daily','maturity'].includes(i.liquidity)||!['cdi','fixed'].includes(i.indexation))throw Error('Condições do investimento inválidas.');
  for(const rate of [i.cdi,i.fixed,i.selic,i.spread,i.inflation,i.real])if(rate<=-100||rate>1000)throw Error('As taxas anuais devem ser maiores que −100% e de até 1.000%.');
  if(i.percentage<0||i.percentage>1000||i.custody<0||i.custody>100||i.fee<0||i.fee>100||i.otherSelic<0||i.otherSelic>1e12)throw Error('Revise percentuais, custos e outros títulos.');
  const duration=daysBetween(i.start,i.maturity),held=daysBetween(i.start,horizon);
  if(duration<1||held<1||i.maturity>addMonths(i.start,600)||horizon>addMonths(i.start,600))throw Error('Use um prazo de pelo menos 1 dia e de até 600 meses.');
  if(!Number.isInteger(i.grace)||i.grace<0||i.grace>duration)throw Error('A carência deve estar entre zero e o prazo até o vencimento.');
  if(i.product==='lci'||i.product==='lca') {
    if(i.start<'2025-05-23')throw Error('Para LCI e LCA, esta V1 simula aplicações a partir de 23/05/2025, com a regra de seis meses.');
    if(i.maturity<addMonths(i.start,6))throw Error('LCI e LCA exigem vencimento mínimo de seis meses, sem indexação a preços.');
  }
}
/** Constant daily growth. Approximate DU = calendar days * 252 / 365 (no holidays). */
function logDailyGrowth(i:Investment):number {
  if(i.product==='cdb'||((i.product==='lci'||i.product==='lca')&&i.indexation==='cdi')) {
    const daily=annualToDaily(i.cdi)*i.percentage/100;
    if(daily<=-1)throw Error('As taxas informadas geram um fator diário inválido.');
    return Math.log1p(daily)*252/365;
  }
  if(i.product==='selic')return (Math.log1p(i.selic/100)+Math.log1p(i.spread/100))/365;
  if(i.product==='ipca')return (Math.log1p(i.inflation/100)+Math.log1p(i.real/100))/365;
  return Math.log1p(i.fixed/100)/365;
}
export function project(i:Investment,horizon=i.maturity):Projection {
  validateInvestment(i,horizon);
  const end=horizon<i.maturity?horizon:i.maturity;
  const total=daysBetween(i.start,end),logGrowth=logDailyGrowth(i);
  const first=firstRedemption(i),exempt=i.product==='lci'||i.product==='lca';
  let custody=0,fee=0;
  const point=(day:number):ProjectionPoint=>{
    const date=isoDate(dateValue(i.start)+day*DAY),gross=i.amount*Math.exp(logGrowth*day);
    if(!Number.isFinite(gross)||gross>Number.MAX_SAFE_INTEGER/100)throw Error('A projeção excede o limite numérico. Reduza valor, taxa ou prazo.');
    const profit=gross-i.amount,positive=Math.max(0,profit);
    const redeemable=day>0&&date>=first&&(i.liquidity==='daily'||date===i.maturity)&&!(i.product==='ipca'&&date<i.maturity);
    const iof=exempt||!redeemable?0:positive*iofRate(day);
    const rate=exempt||day===0?0:irRate(day),ir=Math.max(0,positive-iof)*rate;
    const costs=custody+fee,net=gross-iof-ir-costs;
    const purchasingPower=net/Math.pow(1+i.inflation/100,day/365);
    const status=day===0?'Aplicação':i.product==='ipca'&&date<i.maturity?'Curva; venda não estimada':redeemable?'Resgate contratual permitido':'Indisponível para resgate';
    return {date,days:day,gross,profit,iof,ir,irRate:rate,custody,fee,costs,net,netProfit:net-i.amount,netReturn:net/i.amount-1,annualized:annualize(net/i.amount,day),purchasingPower,realReturn:purchasingPower/i.amount-1,redeemable,status};
  };
  const dates=new Set<string>([end]);
  for(let m=1;m<=600;m++){const date=addMonths(i.start,m);if(date>=end)break;dates.add(date);}
  const series=[point(0)];
  for(let day=1;day<=total;day++) {
    const gross=i.amount*Math.exp(logGrowth*day);
    if(isTreasury(i.product)) {
      const base=i.product==='selic'?Math.max(0,gross-Math.max(0,10000-i.otherSelic)):gross;
      custody+=base*i.custody/100/365;fee+=gross*i.fee/100/365;
    }
    if(dates.has(isoDate(dateValue(i.start)+day*DAY)))series.push(point(day));
  }
  const final=series.at(-1)!;
  const maturedBefore=i.maturity<horizon;
  return {input:{...i},final,series,horizon,comparable:!maturedBefore&&final.redeemable,maturedBefore};
}
export function compareInvestments(inputs:Investment[],horizon:string):Projection[] {
  if(inputs.length<2||inputs.length>4)throw Error('Compare de dois a quatro investimentos.');
  if(inputs.some(i=>i.amount!==inputs[0].amount||i.start!==inputs[0].start))throw Error('Use o mesmo valor e a mesma data inicial em todos os cenários.');
  return inputs.map(input=>project(input,horizon));
}
