import {test,expect} from '@playwright/test';
import {simulateRetirement,calculateClt} from '../src/extended-finance';

test('goal retirement is calculated from desired income, not a frozen contribution',async({page})=>{
 await page.goto('/#/aposentadoria');
 const tool=page.locator('extended-finance-calculator');
 const preview=tool.locator('.retirement-goal-preview');
 await expect(preview).toBeVisible();
 await expect(tool.getByLabel('Aporte mensal que pretendo investir')).toHaveCount(0);
 const original=await preview.locator('strong').innerText();
 await tool.getByLabel('Renda mensal desejada, de hoje').fill('12.000');
 await expect(preview.locator('strong')).not.toHaveText(original);
 await tool.getByRole('button',{name:'Projetar aposentadoria'}).click();
 await expect(tool.locator('.metric-card').first()).toContainText((await preview.locator('strong').innerText()).replace('/mês','').trim());
 const periods=tool.locator('year-navigation');
 await periods.getByRole('button',{name:'Último ano'}).click();
 await expect(periods.getByRole('combobox',{name:'Ir para o ano'})).toHaveValue('35');
 await expect(tool.locator('.extended-table tbody tr').last()).toContainText('420');
 await tool.getByRole('button',{name:'Quero testar um aporte'}).click();
 await tool.getByLabel('Aporte mensal que pretendo investir').fill('300');
 await tool.getByRole('button',{name:'Projetar aposentadoria'}).click();
 await expect(tool.locator('.metric-card').first()).toContainText('Patrimônio projetado');
});

test('all extended tables offer direct year selection and monthly rows',async({page})=>{
 const paths:[string,string,string][]=[
  ['aposentadoria','Projetar aposentadoria','35'],
  ['aluguel-vs-financiamento','Comparar cenários','20'],
  ['amortizacao','Simular amortização','20'],
  ['custo-clt','Calcular custo CLT','5']
 ];
 for(const [path,action,last] of paths){
  await page.goto('/#/'+path);
  const tool=page.locator('extended-finance-calculator');
  await tool.getByRole('button',{name:action}).click();
  await expect(tool.locator('.extended-table tbody tr')).toHaveCount(12);
  await tool.locator('year-navigation').getByRole('combobox',{name:'Ir para o ano'}).selectOption(last);
  await expect(tool.locator('year-navigation').getByRole('combobox',{name:'Ir para o ano'})).toHaveValue(last);
  const expected=path==='aposentadoria'?'409':path==='aluguel-vs-financiamento'?'229':path==='amortizacao'?'229':'49';
  await expect(tool.locator('.extended-table tbody tr').first()).toContainText(expected);
 }
});

test('CLT: project a team, different regimes, years and a readable breakdown',async({page})=>{
 await page.goto('/#/custo-clt');
 const tool=page.locator('extended-finance-calculator');
 await tool.getByLabel('Quantidade de funcionários').fill('3');
 await tool.getByLabel('Anos de projeção').fill('2');
 await tool.getByLabel('Regime tributário').selectOption('simples');
 await tool.getByRole('button',{name:'Calcular custo CLT'}).click();
 await expect(tool.locator('.metric-card').first()).toContainText('equipe');
 await expect(tool.locator('.extended-detail')).toContainText('3 pessoas');
 await tool.locator('.extended-cost-breakdown summary').click();
 await expect(tool.locator('.extended-cost-breakdown tbody tr')).toHaveCount(11);
 await tool.locator('year-navigation').getByRole('combobox',{name:'Ir para o ano'}).selectOption('2');
 await expect(tool.locator('.extended-table tbody tr').first()).toContainText('13');
});

test('PRICE and SAC ledger is open and jumps directly to last year',async({page})=>{
 const schedule=Array.from({length:36},(_,i)=>({
  month:i+1,payment:'150.00',interest:'50.00',amortization:'100.00',balance:String(3600-100*(i+1))
 }));
 await page.route(/\\/api\\/finance\\/(price|sac)$/,route=>route.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify({total_paid:'5400.00',total_interest:'1800.00',first_payment:'150.00',last_payment:'150.00',schedule})
 }));
 for(const path of ['price','sac']){
  await page.goto('/#/'+path);
  const tool=page.locator('finance-calculator');
  await tool.getByRole('button',{name:'Calcular'}).click();
  const ledger=tool.locator('.loan-ledger');
  await expect(ledger.getByRole('heading',{name:'Parcelas e saldo devedor'})).toBeVisible();
  await expect(ledger.locator('tbody tr')).toHaveCount(12);
  await ledger.getByRole('button',{name:'Último ano'}).click();
  await expect(ledger.getByRole('combobox',{name:'Ir para o ano'})).toHaveValue('3');
  await expect(ledger.locator('tbody tr').first()).toContainText('25');
  await expect(ledger.locator('.loan-ledger-metrics')).toContainText('Saldo ao fim do ano');
 }
});

test('interest table reaches last year without dozens of clicks',async({page})=>{
 const evolution=Array.from({length:360},(_,i)=>({month:i+1,deposit:'10',interest:'1',invested:String(1000+(i+1)*10),balance:String(1000+(i+1)*11)}));
 await page.route('**/api/finance/simple',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  total_invested:'4600',total_interest:'360',final_amount:'4960',evolution
 })}));
 await page.goto('/#/juros-simples');
 const tool=page.locator('finance-calculator');
 await tool.getByRole('button',{name:'Calcular'}).click();
 await tool.locator('results-table summary').click();
 const nav=tool.locator('results-table year-navigation');
 await nav.getByRole('combobox',{name:'Ir para o ano'}).selectOption('30');
 await expect(tool.locator('results-table tbody tr').first()).toContainText('349');
});
test('math engines honor exact retirement target and CLT team multipliers',()=>{
 const base={currentAge:30,retirementAge:31,currentAssets:1000,monthlyContribution:100,
  desiredIncome:100,annualReturn:0,inflation:0,withdrawalRate:4};
 const goal=simulateRetirement({...base,mode:'goal'});
 expect(goal.requiredMonthlyContribution).toBe(2416.67);
 expect(goal.usedMonthlyContribution).toBe(goal.requiredMonthlyContribution);
 expect(goal.finalAssets).toBeGreaterThanOrEqual(goal.targetAssets);
 const manual=simulateRetirement({...base,mode:'contribution'});
 expect(manual.finalAssets).toBe(2200);
 expect(manual.monthlyRows).toHaveLength(12);
 const clt={salary:3000,benefits:0,transport:0,otherMonthly:0,inssEmployer:0,rat:0,thirdParties:0,fgts:8};
 const one=calculateClt(clt),team=calculateClt({...clt,employees:3,projectionYears:5,salaryGrowth:10});
 expect(one.annualCost).toBe(43200);
 expect(team.teamAnnualCost).toBe(129600);
 expect(team.monthlyRows).toHaveLength(60);
 expect(team.annualRows[4].annualCost).toBeGreaterThan(team.annualRows[0].annualCost);
});
