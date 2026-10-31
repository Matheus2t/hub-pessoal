import {parseBrazilian} from './ui';
import {addMonths,isoDate,type Investment,type Product} from './fixed-income';
export type NumericKey='amount'|'cdi'|'percentage'|'fixed'|'selic'|'spread'|'inflation'|'real'|'custody'|'fee'|'otherSelic'|'grace';
export type InvestmentDraft=Omit<Investment,NumericKey>&Record<NumericKey,string>;
export function newInvestment(product:Product='cdb'):InvestmentDraft {
  const now=new Date();
  const start=isoDate(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
  return {product,amount:'',start,maturity:addMonths(start,24),indexation:'cdi',cdi:'',percentage:'',fixed:'',selic:'',spread:'0',inflation:'',real:'',custody:'0,20',fee:'0',otherSelic:'0',liquidity:product==='lci'||product==='lca'||product==='ipca'?'maturity':'daily',grace:'0'};
}
export function readInvestment(d:InvestmentDraft):Investment {
  const numeric={} as Record<NumericKey,number>;
  const needed:NumericKey[]=['amount','grace'];
  if(d.product==='cdb'||((d.product==='lci'||d.product==='lca')&&d.indexation==='cdi'))needed.push('cdi','percentage');
  if((d.product==='lci'||d.product==='lca')&&d.indexation==='fixed')needed.push('fixed');
  if(d.product==='selic')needed.push('selic','spread','custody','fee','otherSelic');
  if(d.product==='ipca')needed.push('inflation','real','custody','fee');
  for(const key of ['amount','cdi','percentage','fixed','selic','spread','inflation','real','custody','fee','otherSelic','grace'] as NumericKey[])numeric[key]=needed.includes(key)?(!d[key].trim()&&['otherSelic','spread','fee','grace'].includes(key)?0:parseBrazilian(d[key])):0;
  if(needed.some(key=>!Number.isFinite(numeric[key])))throw Error('Preencha os valores e taxas da simulação.');
  return {...d,...numeric};
}
