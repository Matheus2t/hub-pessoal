import {project,validateInvestment,type Investment} from './fixed-income';
/** Same cash flows, taxes, capitalization and costs as project(); no new tax rule. */
export function equivalentCDI(source:Investment,target:Investment){
 if(!['cdb','lci','lca'].includes(source.product)||!['cdb','lci','lca'].includes(target.product)||source.indexation!=='cdi'||target.indexation!=='cdi')throw Error('Compare CDB, LCI ou LCA indexados ao CDI.');
 if(source.amount!==target.amount||source.start!==target.start||source.maturity!==target.maturity||source.cdi!==target.cdi)throw Error('Use capital, datas e CDI iguais.');
 if(source.cdi<=0)throw Error('Informe CDI positivo para uma solução única.');
 const original=project(source),goal=original.final.net;if(!Number.isFinite(goal))throw Error('As premissas excedem o limite numérico da projeção.');let low=0,high=1000;
 const net=(percentage:number)=>project({...target,percentage}).final.net;
 if(goal<net(low)-.005||goal>net(high)+.005)throw Error('Não há solução entre 0 e 1.000% do CDI.');
 for(let i=0;i<60;i++){const mid=(low+high)/2;if(net(mid)<goal)low=mid;else high=mid}
 const percentage=(low+high)/2,result=project({...target,percentage});
 return {percentage,original,result,difference:result.final.net-goal};
}
export interface SavedInvestment {id:string;name:string;at:number;input:Investment}
const key='2t-fixed-income-scenarios-v1';
export function readScenarios(storage:Pick<Storage,'getItem'>=localStorage):SavedInvestment[]{
 const raw=storage.getItem(key);if(!raw)return [];const data=JSON.parse(raw);
 if(data.version!==1||!Array.isArray(data.items)||data.items.length>50)throw Error('Cenários locais incompatíveis. Os dados não foram substituídos.');
 const ids=new Set<string>();for(const row of data.items){if(typeof row.id!=='string'||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>100||!Number.isFinite(row.at))throw Error('Cenário local inválido.');validateInvestment(row.input);ids.add(row.id)}return data.items;
}
export function writeScenarios(items:SavedInvestment[],storage:Pick<Storage,'setItem'>=localStorage){
 const raw=JSON.stringify({version:1,items});readScenarios({getItem:()=>raw});storage.setItem(key,raw);
}
