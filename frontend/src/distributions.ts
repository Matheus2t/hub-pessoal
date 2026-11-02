export interface Distribution {
 id:string;issuer:string;cvm:number;cnpj:string;symbol:string;class_name:string;kind:'dividend'|'jcp';amount:string;amount_basis:'class_total'|'per_share';gross_per_share:string|null;currency:string;payment_date:string|null;record_date:string|null;ex_date:string|null;declared_date:string|null;status:'reported'|'scheduled'|'paid'|'cancelled';source:{url:string;document:string;dataset:string;sha256:string};
}
export const distributionKind=(kind:string)=>kind==='jcp'?'JCP':'Dividendos';
export function manualYield(proceeds:number,price:number){if(!Number.isFinite(proceeds)||proceeds<0||!Number.isFinite(price)||price<=0)throw Error('Informe proventos não negativos e preço maior que zero.');return proceeds/price*100}
export function selectDistributions(events:Distribution[],symbol='',kind='',year='',status='',dateKey:'payment_date'|'record_date'|'ex_date'='payment_date',from='',to=''){
 return events.filter(e=>(!symbol||e.symbol===symbol)&&(!kind||e.kind===kind)&&(!status||e.status===status)&&(!year||e[dateKey]?.startsWith(year))&&(!from||!!e[dateKey]&&e[dateKey]!>=from)&&(!to||!!e[dateKey]&&e[dateKey]!<=to));
}
