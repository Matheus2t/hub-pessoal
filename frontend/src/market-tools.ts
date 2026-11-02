export interface ContributionPoint {month:number;invested:number;balance:number;cash:number;total:number}
/** Hypothetical price growth and separate gross distributions, paid before end-month deposits. */
export function projectContributions(capital:number,deposit:number,months:number,annual:number,dividendYield:number,reinvest:boolean):ContributionPoint[]{
 if(![capital,deposit,months,annual,dividendYield].every(Number.isFinite)||capital<0||capital>1e12||deposit<0||deposit>1e9||!Number.isInteger(months)||months<1||months>600||annual<=-100||annual>100||dividendYield<0||dividendYield>100)throw Error('Revise os valores, as taxas e o prazo entre 1 e 600 meses.');
 const rate=Math.expm1(Math.log1p(annual/100)/12),dividend=dividendYield/100/12;let balance=capital,cash=0;const rows:ContributionPoint[]=[];
 for(let month=1;month<=months;month++){const paid=balance*dividend;balance*=1+rate;if(reinvest)balance+=paid;else cash+=paid;balance+=deposit;rows.push({month,invested:capital+deposit*month,balance,cash,total:balance+cash})}return rows;
}
