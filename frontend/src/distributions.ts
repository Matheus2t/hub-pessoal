export interface Distribution {
 id:string;issuer:string;cvm:number;cnpj:string;symbol:string;class_name:string;kind:'dividend'|'jcp';amount:string;amount_basis:'class_total'|'per_share';gross_per_share:string|null;currency:string;payment_date:string|null;record_date:string|null;ex_date:string|null;declared_date:string|null;payment_date_precision?:'exact'|'from'|'unknown';payment_deadline?:string|null;notes?:string;status:'reported'|'scheduled'|'paid'|'cancelled';source:{url:string;document:string;dataset:string;sha256:string};
}
export const distributionKind=(kind:string)=>kind==='jcp'?'JCP':'Dividendos';
export const distributionStatus=(status:Distribution['status'])=>({reported:'Informado no FRE',scheduled:'Programado no aviso',paid:'Liquidação confirmada',cancelled:'Cancelado'})[status];
export function manualYield(proceeds:number,price:number){if(!Number.isFinite(proceeds)||proceeds<0||!Number.isFinite(price)||price<=0)throw Error('Informe proventos não negativos e preço maior que zero.');return proceeds/price*100}
export function selectDistributions(events:Distribution[],symbol='',kind='',year='',status='',dateKey:'payment_date'|'record_date'|'ex_date'='payment_date',from='',to=''){
 return events.filter(e=>(!symbol||e.symbol===symbol)&&(!kind||e.kind===kind)&&(!status||e.status===status)&&(!year||e[dateKey]?.startsWith(year))&&(!from||!!e[dateKey]&&e[dateKey]!>=from)&&(!to||!!e[dateKey]&&e[dateKey]!<=to)).sort((a,b)=>(a[dateKey]||'9999').localeCompare(b[dateKey]||'9999')||a.symbol.localeCompare(b.symbol)||(a.id||'').localeCompare(b.id||''));
}
export const hasExactDate=(e:Distribution,key:'payment_date'|'record_date'|'ex_date')=>!!e[key]&&(key!=='payment_date'||(e.payment_date_precision||'exact')==='exact');
export const paymentDescription=(e:Distribution)=>e.payment_date?`${e.payment_date_precision==='from'?'A partir de ':''}${e.payment_date}`:e.payment_deadline?`Até ${e.payment_deadline} · dia não definido`:'Não informado';
const UNIT_SCALE=1000000000000n;
function fixedUnit(value:string){if(!/^\d+(\.\d{1,12})?$/.test(value))throw Error('Valor unitário inválido.');const [i,f='']=value.split('.');return BigInt(i)*UNIT_SCALE+BigInt(f.padEnd(12,'0'))}
const fromFixed=(n:bigint)=>`${n/UNIT_SCALE}.${String(n%UNIT_SCALE).padStart(12,'0')}`;
function uniqueEvents(events:Distribution[]){const unique=new Map<string,Distribution>();for(const e of events){const previous=unique.get(e.id);if(previous&&JSON.stringify(previous)!==JSON.stringify(e))throw Error('Registros duplicados com dados divergentes.');unique.set(e.id,e)}return [...unique.values()]}
export function summarizeDistributions(events:Distribution[],symbol:string,basis:'class_total'|'per_share'){
 const groups=new Map<string,{period:string;class_name:string;dividend:bigint;jcp:bigint}>();
 for(const e of uniqueEvents(events).filter(e=>e.symbol===symbol&&e.amount_basis===basis&&e.status!=='cancelled')){
  const period=basis==='per_share'?e.record_date:e.payment_date?.slice(0,4);if(!period)continue;
  const key=e.class_name+':'+period,g=groups.get(key)||{period,class_name:e.class_name,dividend:0n,jcp:0n};
  g[e.kind]+=fixedUnit(basis==='per_share'?e.gross_per_share!:e.amount);groups.set(key,g);
 }
 return [...groups.values()].sort((a,b)=>a.period.localeCompare(b.period)).map(g=>({...g,dividend:fromFixed(g.dividend),jcp:fromFixed(g.jcp),total:fromFixed(g.dividend+g.jcp)}));
}
export function simulateAnnouncements(events:Distribution[],symbol:string,quantity:number,start:string,end:string,includeDividends=true,includeJCP=true){
 const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 if(!Number.isSafeInteger(quantity)||quantity<=0||quantity>1000000000||!validDate(start)||!validDate(end)||start>end)throw Error('Confira quantidade inteira positiva (até 1 bilhão) e intervalo.');
 const eligible=uniqueEvents(events).filter(e=>e.symbol===symbol&&e.amount_basis==='per_share'&&e.status==='scheduled'&&hasExactDate(e,'payment_date')&&e.payment_date!>=start&&e.payment_date!<=end&&((includeDividends&&e.kind==='dividend')||(includeJCP&&e.kind==='jcp')));
 if(eligible.some(e=>e.gross_per_share==null||!e.record_date))throw Error('Faltam valor unitário ou data-com verificáveis.');
 if(new Set(eligible.map(e=>e.class_name+':'+e.record_date)).size>1)throw Error('Há mais de uma base de elegibilidade; ajustes societários precisam de revisão antes de simular este intervalo.');
 const rows=eligible.sort((a,b)=>a.payment_date!.localeCompare(b.payment_date!)).map(e=>({event:e,gross:fromFixed(fixedUnit(e.gross_per_share!)*BigInt(quantity))}));
 const sum=(kind?:string)=>fromFixed(rows.filter(r=>!kind||r.event.kind===kind).reduce((s,r)=>s+fixedUnit(r.gross),0n));
 const annual=[...new Set(rows.map(r=>r.event.payment_date!.slice(0,4)))].sort().map(year=>({year,total:fromFixed(rows.filter(r=>r.event.payment_date!.startsWith(year)).reduce((s,r)=>s+fixedUnit(r.gross),0n))}));
 return {rows,total:sum(),dividends:sum('dividend'),jcp:sum('jcp'),annual};
}
export const formatUnit=(n:string)=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:12});
