import {test,expect} from '@playwright/test';
import {project,compareInvestments,irRate,iofRate,IOF,annualToDaily,ipcaNominal,addMonths,firstRedemption,type Investment} from '../src/fixed-income';
import {newInvestment,readInvestment} from '../src/fixed-income-form';

const at=(days:number)=>new Date(Date.UTC(2027,0,1)+days*86400000).toISOString().slice(0,10);
const base:Investment={product:'cdb',amount:10000,start:at(0),maturity:at(365),indexation:'cdi',cdi:12,percentage:100,fixed:10,selic:10,spread:0,inflation:4,real:6,custody:0,fee:0,otherSelic:0,liquidity:'daily',grace:0};

for(const [day,rate] of [[180,.225],[181,.20],[360,.20],[361,.175],[720,.175],[721,.15]])test(`IR boundary ${day}`,()=>{
 expect(irRate(day)).toBe(rate);const r=project({...base,maturity:at(day)}).final;
 expect(r.ir).toBeCloseTo((r.gross-base.amount)*rate,8);expect(r.iof).toBe(0);
});
test('official IOF table has every day; no interpolation',()=>{
 const official=[96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3,0];
 expect([...IOF]).toEqual(official);official.forEach((percent,index)=>expect(iofRate(index+1)).toBe(percent/100));expect(iofRate(31)).toBe(0);
});
// Expected amounts independently computed with Python Decimal, precision 60.
for(const [amount,percent,days,gross,iof,ir,net] of [
 [1000,100,365,1120,0,21,1099],
 [10000,110,730,12831.493714593933,0,424.72405718908993,12406.769657404842],
 [10000,100,15,10046.682055113586,23.34102755679308,5.251731200278443,10018.089296356515],
 [10000,100,30,10093.582031654136,0,21.0559571221804,10072.526074531956],
])test(`independent Decimal oracle ${amount}/${percent}/${days}`,()=>{
 const r=project({...base,amount,percentage:percent,maturity:at(days)}).final;
 expect(r.gross).toBeCloseTo(gross,7);expect(r.iof).toBeCloseTo(iof,8);expect(r.ir).toBeCloseTo(ir,8);expect(r.net).toBeCloseTo(net,7);
});
test('LCI 90% CDI is exempt and annual CDI multiplication is not exact',()=>{
 const r=project({...base,product:'lci',amount:100000,percentage:90}).final;
 expect(r.gross).toBeCloseTo(110738.13787352189,6);expect(r.net).toBe(r.gross);expect(r.ir+r.iof).toBe(0);
 const cdb=project({...base,percentage:110}).final;
 expect(Math.abs(cdb.gross-10000*1.132)).toBeGreaterThan(1);
 expect(annualToDaily(12)).toBeCloseTo(Math.pow(1.12,1/252)-1,14);
});
test('LCA fixed rate uses its own factor and is exempt for PF',()=>{
 const r=project({...base,product:'lca',indexation:'fixed',fixed:10,cdi:0}).final;
 expect(r.gross).toBeCloseTo(11000,8);expect(r.net).toBeCloseTo(11000,8);expect(r.ir+r.iof).toBe(0);
});
for(const amount of [1000,10000,100000])test(`zero and negative yields preserve tax base ${amount}`,()=>{
 const zero=project({...base,amount,cdi:0}).final;expect(zero.net).toBe(amount);expect(zero.ir+zero.iof).toBe(0);expect(zero.annualized).toBe(0);
 const loss=project({...base,amount,cdi:-5}).final;expect(loss.gross).toBeCloseTo(amount*.95,7);expect(loss.ir+loss.iof).toBe(0);expect(loss.netProfit).toBeLessThan(0);
});
test('IOF precedes IR and never taxes principal',()=>{
 const r=project({...base,maturity:at(1)}).final;const gain=r.gross-base.amount;
 expect(r.iof).toBeCloseTo(gain*.96,10);expect(r.ir).toBeCloseTo(gain*.04*.225,10);
 expect(r.iof+r.ir).toBeLessThan(gain);
});
test('Selic custody exemption uses daily marginal stock and optional other holdings',()=>{
 const zero={...base,product:'selic' as const,selic:0,custody:.2};
 expect(project({...zero,amount:1000}).final.custody).toBe(0);
 expect(project({...zero,amount:10000}).final.custody).toBe(0);
 expect(project({...zero,amount:100000}).final.custody).toBeCloseTo(180,9);
 expect(project({...zero,amount:10000,otherSelic:5000}).final.custody).toBeCloseTo(10,9);
 expect(project({...zero,amount:10000,otherSelic:20000}).final.custody).toBeCloseTo(20,9);
 expect(project({...zero,amount:10000,fee:.1}).final.fee).toBeCloseTo(10,9);
 const growing=project({...zero,amount:10000,selic:10}).final;
 const q=Math.pow(1.1,1/365);const dailySum=10000*(q*(1.1-1)/(q-1)-365)*.002/365;
 expect(growing.custody).toBeCloseTo(dailySum,6);expect(growing.custody).toBeGreaterThan(0);
});
test('Selic additional factor is compounded, not an annual sum',()=>{
 const r=project({...base,product:'selic',selic:10,spread:1}).final;
 expect(r.gross).toBeCloseTo(11110,8);expect(r.gross).not.toBeCloseTo(11100,1);
});
test('IPCA factors, net purchasing power and real return after taxes',()=>{
 const r=project({...base,product:'ipca',liquidity:'maturity'}).final;
 expect(ipcaNominal(4,6)).toBeCloseTo(.1024,12);expect(r.gross).toBeCloseTo(11024,8);
 expect(r.ir).toBeCloseTo(179.2,8);expect(r.net).toBeCloseTo(10844.8,8);
 expect(r.purchasingPower).toBeCloseTo(10844.8/1.04,8);expect(r.realReturn).toBeCloseTo((10844.8/1.04)/10000-1,10);
 const early=project({...base,product:'ipca',liquidity:'daily'},at(180));expect(early.comparable).toBe(false);expect(early.final.status).toContain('venda não estimada');
});
test('custody is accrued, not a single deduction on the final balance',()=>{
 const r=project({...base,product:'ipca',custody:.2,fee:.1});const q=Math.pow(1.1024,1/365);
 const sum=10000*q*(1.1024-1)/(q-1);
 expect(r.final.custody).toBeCloseTo(sum*.002/365,6);expect(r.final.fee).toBeCloseTo(sum*.001/365,6);
 expect(r.final.ir).toBeCloseTo(179.2,8);expect(r.final.costs).not.toBeCloseTo(r.final.gross*.003,2);
});
test('monthly points recalculate tax brackets and maintain locked status',()=>{
 const r=project({...base,grace:200});
 expect(r.series.find(p=>p.days===31)?.redeemable).toBe(false);
 for(const p of r.series.slice(1))expect(p.ir).toBeCloseTo(Math.max(0,p.profit-p.iof)*irRate(p.days),8);
 expect(r.series.find(p=>p.days===31)?.irRate).toBe(.225);expect(r.final.irRate).toBe(.175);
 expect(r.series.at(-1)?.date).toBe(base.maturity);
});
test('calendar-month minimum, leap days and month ends',()=>{
 expect(addMonths('2028-01-31',1)).toBe('2028-02-29');expect(addMonths('2027-01-31',1)).toBe('2027-02-28');
 const lci={...base,product:'lci' as const,start:'2027-01-31',maturity:'2028-01-31'};
 expect(firstRedemption(lci)).toBe('2027-07-31');
 expect(project(lci,'2027-07-30').final.redeemable).toBe(false);expect(project(lci,'2027-07-31').final.redeemable).toBe(true);
 expect(()=>project({...lci,maturity:'2027-07-30'})).toThrow(/seis meses/);
 expect(()=>project({...base,product:'lca',maturity:at(180)})).toThrow(/seis meses/);
});
test('up to 600 months; exact final date; all numbers finite',()=>{
 const r=project({...base,maturity:addMonths(base.start,600)});expect(r.series).toHaveLength(601);
 expect(r.final.date).toBe(addMonths(base.start,600));expect(Number.isFinite(r.final.net)).toBe(true);
 expect(()=>project({...base,maturity:addMonths(base.start,601)})).toThrow(/600 meses/);
});
test('same-date comparison never extends an expired investment or sells IPCA by its curve',()=>{
 const horizon=at(365);const inputs=[{...base,maturity:at(180)},{...base,grace:366,maturity:at(500)},{...base,product:'ipca' as const,maturity:at(730)}];
 const r=compareInvestments(inputs,horizon);expect(r.map(x=>x.comparable)).toEqual([false,false,false]);
 expect(r[0].final.days).toBe(180);expect(r[0].maturedBefore).toBe(true);expect(r[0].series.at(-1)?.date).toBe(at(180));
 expect(r[1].final.status).toBe('Indisponível para resgate');expect(r[2].final.status).toContain('Curva');
 const fair=compareInvestments([base,{...base,product:'lci',percentage:90}],horizon);expect(fair.every(r=>r.comparable)).toBe(true);
 expect(fair[0].final.net).toBe(project(base).final.net);expect(compareInvestments([base,base,base,base],horizon)).toHaveLength(4);
 expect(()=>compareInvestments([base],horizon)).toThrow(/dois a quatro/);
 expect(()=>compareInvestments([base,{...base,amount:2000}],horizon)).toThrow(/mesmo valor/);
});
test('invalid dates, amount, rate and contractual grace are rejected',()=>{
 for(const patch of [{amount:0},{amount:NaN},{cdi:-100},{custody:-1},{maturity:at(0)},{maturity:'2027-02-30'},{grace:366},{grace:1.5},{otherSelic:-1}])expect(()=>project({...base,...patch})).toThrow();
 expect(()=>project(base,at(-1))).toThrow();expect(()=>project({...base,cdi:1000,maturity:addMonths(base.start,600)})).toThrow(/limite numérico/);
 expect(()=>project({...base,product:'lci',start:'2025-01-01'})).toThrow(/23\/05\/2025/);
});
test('forms do not turn blank rates into zero; optional fields can be blank',()=>{
 expect(()=>readInvestment(newInvestment())).toThrow(/Preencha/);
 const r=readInvestment({...newInvestment('selic'),amount:'1.000,50',selic:'0',otherSelic:'',fee:'',spread:''});
 expect(r.amount).toBe(1000.5);expect(r.otherSelic+r.fee+r.spread).toBe(0);
});
