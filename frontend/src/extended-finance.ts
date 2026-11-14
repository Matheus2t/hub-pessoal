/** Modelos determinísticos. Taxas anuais são efetivas; valores em reais, sem API. */
export const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export const monthlyEffective = (annualPercent: number) => Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
export type FinancePoint = { period: number; first: number; second: number };
export type ScheduleRow = { month: number; payment: number; interest: number; amortization: number; extra: number; balance: number };
export type LoanSystem = 'price' | 'sac';
export type ExtraMode = 'term' | 'payment';
export type LoanInput = { principal: number; annualRate: number; months: number; system: LoanSystem; extraLump?: number; extraMonth?: number; extraMonthly?: number; mode?: ExtraMode };
export type LoanOutput = { rows: ScheduleRow[]; totalInterest: number; totalPaid: number; firstPayment: number; finalBalance: number };

function paymentFor(balance: number, monthlyRate: number, months: number): number {
  if (months <= 0) return 0;
  return monthlyRate === 0 ? balance / months : balance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}
export function loanSchedule(input: LoanInput): LoanOutput {
  const { principal, annualRate, months, system } = input;
  if (!(principal > 0 && Number.isFinite(principal) && months >= 1 && Number.isInteger(months) && months <= 600 && annualRate >= 0 && annualRate <= 100 && Number.isFinite(annualRate))) throw new Error('Financiamento inválido.');
  const rate = monthlyEffective(annualRate);
  const originalPricePayment = paymentFor(principal, rate, months);
  const originalSacPrincipal = principal / months;
  const mode = input.mode ?? 'term';
  let balance = principal, totalInterest = 0, totalPaid = 0;
  const rows: ScheduleRow[] = [];
  for (let month = 1; month <= months && balance > 0.0000001; month++) {
    const interest = balance * rate;
    const scheduled = system === 'price'
      ? mode === 'payment' ? paymentFor(balance, rate, months - month + 1) : originalPricePayment
      : interest + (mode === 'payment' ? balance / (months - month + 1) : originalSacPrincipal);
    const regular = Math.min(balance + interest, Math.max(interest, scheduled));
    const amortization = Math.max(0, regular - interest);
    balance = Math.max(0, balance - amortization);
    const lump = month === (input.extraMonth ?? 0) ? (input.extraLump ?? 0) : 0;
    const extra = Math.min(balance, Math.max(0, lump) + Math.max(0, input.extraMonthly ?? 0));
    balance = Math.max(0, balance - extra);
    const payment = regular + extra;
    totalInterest += interest;
    totalPaid += payment;
    rows.push({ month, payment: roundCurrency(payment), interest: roundCurrency(interest), amortization: roundCurrency(amortization), extra: roundCurrency(extra), balance: roundCurrency(balance) });
  }
  return { rows, totalInterest: roundCurrency(totalInterest), totalPaid: roundCurrency(totalPaid), firstPayment: rows[0]?.payment ?? 0, finalBalance: roundCurrency(balance) };
}

export type AmortizationInput = LoanInput & { extraLump: number; extraMonth: number; extraMonthly: number; mode: ExtraMode };
export function simulateAmortization(input: AmortizationInput) {
  const baseline = loanSchedule({ principal: input.principal, annualRate: input.annualRate, months: input.months, system: input.system });
  const accelerated = loanSchedule(input);
  return {
    baseline, accelerated,
    interestSaved: roundCurrency(Math.max(0, baseline.totalInterest - accelerated.totalInterest)),
    monthsSaved: baseline.rows.length - accelerated.rows.length,
    points: [{ period: 0, first: input.principal, second: input.principal }, ...Array.from({ length: baseline.rows.length }, (_, index) => ({
      period: index + 1, first: baseline.rows[index].balance, second: accelerated.rows[index]?.balance ?? 0,
    }))] satisfies FinancePoint[],
  };
}


export type RetirementMode = 'goal' | 'contribution';
export type RetirementInput = {
  currentAge: number; retirementAge: number; currentAssets: number; monthlyContribution: number;
  desiredIncome: number; annualReturn: number; inflation: number; withdrawalRate: number;
  mode?: RetirementMode;
};
export type RetirementMonth = { month: number; age: number; deposit: number; interest: number; invested: number; balance: number };
/**
 * Goal mode solves the annuity backwards: the requested income determines the monthly
 * contribution. Contribution mode projects what the chosen contribution will achieve.
 * Assumptions: end-of-month deposits, constant effective annual rate, nominal deposits.
 */
export function simulateRetirement(input: RetirementInput) {
  const { currentAge, retirementAge, currentAssets, monthlyContribution, desiredIncome, annualReturn, inflation, withdrawalRate } = input;
  if (!(retirementAge > currentAge && currentAge >= 18 && retirementAge <= 100 &&
      currentAssets >= 0 && Number.isFinite(currentAssets) && monthlyContribution >= 0 && Number.isFinite(monthlyContribution) &&
      desiredIncome >= 0 && Number.isFinite(desiredIncome) && annualReturn >= 0 && annualReturn <= 40 &&
      inflation >= 0 && inflation <= 30 && withdrawalRate > 0 && withdrawalRate <= 20))
    throw new Error('Parâmetros de aposentadoria inválidos.');
  const months = (retirementAge - currentAge) * 12;
  const rate = monthlyEffective(annualReturn);
  const growthFactor = Math.pow(1 + rate, months);
  const annuityFactor = rate === 0 ? months : (growthFactor - 1) / rate;
  const inflationFactor = Math.pow(1 + inflation / 100, retirementAge - currentAge);
  const futureMonthlyIncome = desiredIncome * inflationFactor;
  const targetAssets = futureMonthlyIncome * 12 / (withdrawalRate / 100);
  const exactRequired = Math.max(0, (targetAssets - currentAssets * growthFactor) / annuityFactor);
  // Round UP in goal mode to avoid missing the target by a few cents.
  const requiredMonthlyContribution = Math.ceil(exactRequired * 100 - 1e-8) / 100;
  const mode: RetirementMode = input.mode === 'goal' ? 'goal' : 'contribution';
  const usedMonthlyContribution = mode === 'goal' ? requiredMonthlyContribution : monthlyContribution;
  let assets = currentAssets;
  let invested = currentAssets;
  const points: FinancePoint[] = [{ period: currentAge, first: roundCurrency(assets), second: roundCurrency(invested) }];
  const monthlyRows: RetirementMonth[] = [];
  for (let month = 1; month <= months; month++) {
    const interest = assets * rate;
    assets += interest + usedMonthlyContribution;
    invested += usedMonthlyContribution;
    monthlyRows.push({
      month, age: currentAge + month / 12, deposit: roundCurrency(usedMonthlyContribution),
      interest: roundCurrency(interest), invested: roundCurrency(invested), balance: roundCurrency(assets)
    });
    if (month % 12 === 0) points.push({ period: currentAge + month / 12, first: roundCurrency(assets), second: roundCurrency(invested) });
  }
  const futureMonthlyCapacity = assets * withdrawalRate / 100 / 12;
  return {
    mode, months, points, monthlyRows,
    requestedIncomeToday: roundCurrency(desiredIncome),
    usedMonthlyContribution: roundCurrency(usedMonthlyContribution),
    finalAssets: roundCurrency(assets),
    targetAssets: roundCurrency(targetAssets),
    gap: roundCurrency(Math.max(0, targetAssets - assets)),
    surplus: roundCurrency(Math.max(0, assets - targetAssets)),
    requiredMonthlyContribution: roundCurrency(requiredMonthlyContribution),
    futureMonthlyIncome: roundCurrency(futureMonthlyIncome),
    projectedMonthlyIncomeToday: roundCurrency(futureMonthlyCapacity / inflationFactor),
    realWealthToday: roundCurrency(assets / inflationFactor),
  };
}

export type HousingInput = {
  propertyPrice: number; downPercent: number; closingPercent: number; mortgageRate: number; mortgageYears: number;
  horizonYears: number; rent: number; rentGrowth: number; propertyGrowth: number; investmentReturn: number;
  ownerMonthlyCosts: number; system: LoanSystem;
};
export type HousingRow = { year: number; buyWealth: number; rentWealth: number; loanBalance: number; rentMonthly: number };
export type HousingMonth = { month: number; year: number; buyWealth: number; rentWealth: number; loanBalance: number; rentMonthly: number; payment: number; ownerCost: number };
export function compareHousing(input: HousingInput) {
  const { propertyPrice, downPercent, closingPercent, mortgageRate, mortgageYears, horizonYears, rent, rentGrowth, propertyGrowth, investmentReturn, ownerMonthlyCosts, system } = input;
  if (!(propertyPrice > 0 && downPercent >= 0 && downPercent <= 100 && closingPercent >= 0 && closingPercent <= 20 && mortgageYears >= 1 && mortgageYears <= 50 && horizonYears >= 1 && horizonYears <= 50 && rent >= 0 && ownerMonthlyCosts >= 0)) throw new Error('Parâmetros do imóvel inválidos.');
  const down = propertyPrice * downPercent / 100;
  const fees = propertyPrice * closingPercent / 100;
  const financed = propertyPrice - down;
  const loan = financed > 0 ? loanSchedule({ principal: financed, annualRate: mortgageRate, months: mortgageYears * 12, system }) : null;
  const propertyMonthly = monthlyEffective(propertyGrowth);
  const investMonthly = monthlyEffective(investmentReturn);
  let propertyValue = propertyPrice, renterInvestments = down + fees, buyerInvestments = 0;
  const rows: HousingRow[] = [];
  const monthlyRows: HousingMonth[] = [];
  const points: FinancePoint[] = [{ period: 0, first: roundCurrency(propertyPrice - financed), second: roundCurrency(renterInvestments) }];
  for (let month = 1; month <= horizonYears * 12; month++) {
    const debt = loan?.rows[month - 1]?.balance ?? 0;
    const mortgagePayment = loan?.rows[month - 1]?.payment ?? 0;
    const monthlyRent = rent * Math.pow(1 + rentGrowth / 100, Math.floor((month - 1) / 12));
    const monthlyBuyCost = mortgagePayment + ownerMonthlyCosts;
    propertyValue *= (1 + propertyMonthly);
    // Fluxo de caixa equiparado: quem gasta menos com moradia investe a diferença.
    renterInvestments = renterInvestments * (1 + investMonthly) + Math.max(0, monthlyBuyCost - monthlyRent);
    buyerInvestments = buyerInvestments * (1 + investMonthly) + Math.max(0, monthlyRent - monthlyBuyCost);
    monthlyRows.push({
      month, year: Math.ceil(month / 12),
      buyWealth: roundCurrency(propertyValue - debt + buyerInvestments),
      rentWealth: roundCurrency(renterInvestments),
      loanBalance: roundCurrency(debt), rentMonthly: roundCurrency(monthlyRent),
      payment: roundCurrency(mortgagePayment), ownerCost: roundCurrency(ownerMonthlyCosts)
    });
    if (month % 12 === 0) {
      const buyWealth = propertyValue - debt + buyerInvestments;
      rows.push({ year: month / 12, buyWealth: roundCurrency(buyWealth), rentWealth: roundCurrency(renterInvestments), loanBalance: roundCurrency(debt), rentMonthly: roundCurrency(monthlyRent) });
      points.push({ period: month / 12, first: roundCurrency(buyWealth), second: roundCurrency(renterInvestments) });
    }
  }
  const last = rows.at(-1)!;
  return {
    rows, monthlyRows, points, buyWealth: last.buyWealth, rentWealth: last.rentWealth,
    difference: roundCurrency(last.buyWealth - last.rentWealth), initialCash: roundCurrency(down + fees),
    financed: roundCurrency(financed), firstPayment: loan?.firstPayment ?? 0,
  };
}


export type CltRegime = 'general' | 'simples' | 'annex4';
export type CltInput = {
  salary: number; benefits: number; transport: number; otherMonthly: number;
  inssEmployer: number; rat: number; thirdParties: number; fgts: number;
  employees?: number; projectionYears?: number; salaryGrowth?: number;
  benefitsGrowth?: number; contingencyPercent?: number;
};
export type CltMonth = {
  month: number; year: number; salary: number; thirteenth: number; vacationBonus: number;
  fgts: number; employerCharges: number; benefits: number; other: number; contingency: number;
  total: number; cumulative: number;
};
export type CltYear = { year: number; annualCost: number; averageMonthlyCost: number; salary: number };
export const cltRates: Record<CltRegime, Pick<CltInput, 'inssEmployer' | 'rat' | 'thirdParties' | 'fgts'>> = {
  general: { inssEmployer: 20, rat: 2, thirdParties: 5.8, fgts: 8 },
  simples: { inssEmployer: 0, rat: 0, thirdParties: 0, fgts: 8 },
  annex4: { inssEmployer: 20, rat: 2, thirdParties: 0, fgts: 8 },
};
/**
 * Annual accrual model, per employee unless marked as team total.
 * Vacations: 12 ordinary salaries already include the paid vacation month;
 * add only the constitutional 1/3, not a 13th ordinary salary.
 * Monthly rows are accounting provisions, not the date of a cash payment.
 */
export function calculateClt(input: CltInput) {
  const { salary, benefits, transport, otherMonthly, inssEmployer, rat, thirdParties, fgts } = input;
  const employees = input.employees ?? 1, projectionYears = input.projectionYears ?? 1;
  const salaryGrowth = input.salaryGrowth ?? 0, benefitsGrowth = input.benefitsGrowth ?? 0;
  const contingencyPercent = input.contingencyPercent ?? 0;
  const monetary = [salary, benefits, transport, otherMonthly];
  const rates = [inssEmployer, rat, thirdParties, fgts, salaryGrowth, benefitsGrowth, contingencyPercent];
  if (!(salary > 0 && monetary.every(n => Number.isFinite(n) && n >= 0) &&
      rates.every(n => Number.isFinite(n) && n >= 0 && n <= 100) &&
      Number.isInteger(employees) && employees >= 1 && employees <= 10000 &&
      Number.isInteger(projectionYears) && projectionYears >= 1 && projectionYears <= 30))
    throw new Error('Parâmetros CLT inválidos.');
  const monthlyRows: CltMonth[] = [];
  const annualRows: CltYear[] = [];
  let parts: {label:string;amount:number}[] = [];
  let annualCost = 0, totalProjected = 0, cumulative = 0;
  for (let year = 1; year <= projectionYears; year++) {
    const currentSalary = salary * Math.pow(1 + salaryGrowth/100, year-1);
    const variableFactor = Math.pow(1 + benefitsGrowth/100, year-1);
    const yearBenefits = benefits * variableFactor;
    const yearTransport = transport * variableFactor;
    const yearOther = otherMonthly * variableFactor;
    const salaryAnnual = currentSalary * 12;
    const thirteenth = currentSalary;
    const vacationBonus = currentSalary / 3;
    const taxablePayroll = salaryAnnual + thirteenth + vacationBonus;
    const fgtsAnnual = taxablePayroll * fgts/100;
    const inssAnnual = taxablePayroll * inssEmployer/100;
    const ratAnnual = taxablePayroll * rat/100;
    const thirdAnnual = taxablePayroll * thirdParties/100;
    const annualBenefits = yearBenefits*12;
    const annualTransport = yearTransport*12;
    const annualOther = yearOther*12;
    const contingency = taxablePayroll * contingencyPercent/100;
    const allParts = [
      {label:'Salários (12 meses)',amount:salaryAnnual},
      {label:'13º salário — provisão',amount:thirteenth},
      {label:'1/3 de férias — provisão',amount:vacationBonus},
      {label:'FGTS',amount:fgtsAnnual},
      {label:'INSS patronal',amount:inssAnnual},
      {label:'RAT/FAP efetivo',amount:ratAnnual},
      {label:'Terceiros / outras entidades',amount:thirdAnnual},
      {label:'Benefícios não salariais',amount:annualBenefits},
      {label:'Vale-transporte líquido da empresa',amount:annualTransport},
      {label:'Outros custos não salariais',amount:annualOther},
      {label:'Reserva gerencial opcional',amount:contingency},
    ];
    if (year === 1) parts = allParts.map(row => ({...row,amount:roundCurrency(row.amount)}));
    const personAnnual = allParts.reduce((sum,row) => sum + row.amount,0);
    if (year===1) annualCost = roundCurrency(personAnnual);
    const teamAnnual = personAnnual*employees;
    annualRows.push({year,annualCost:roundCurrency(teamAnnual),averageMonthlyCost:roundCurrency(teamAnnual/12),salary:roundCurrency(currentSalary)});
    totalProjected += teamAnnual;
    for (let month=1;month<=12;month++) {
      const salaryMonth = currentSalary*employees;
      const thirteenthMonth = thirteenth/12*employees;
      const vacationMonth = vacationBonus/12*employees;
      const fgtsMonth = fgtsAnnual/12*employees;
      const employerChargesMonth = (inssAnnual+ratAnnual+thirdAnnual)/12*employees;
      const benefitsMonth = yearBenefits*employees;
      const otherMonth = (yearTransport+yearOther)*employees;
      const contingencyMonth = contingency/12*employees;
      const totalMonth = teamAnnual/12;
      cumulative += totalMonth;
      monthlyRows.push({
        month:(year-1)*12+month,year,
        salary:roundCurrency(salaryMonth),thirteenth:roundCurrency(thirteenthMonth),
        vacationBonus:roundCurrency(vacationMonth),fgts:roundCurrency(fgtsMonth),
        employerCharges:roundCurrency(employerChargesMonth),
        benefits:roundCurrency(benefitsMonth),other:roundCurrency(otherMonth),
        contingency:roundCurrency(contingencyMonth),
        total:roundCurrency(totalMonth),cumulative:roundCurrency(cumulative),
      });
    }
  }
  return {
    parts, monthlyRows, annualRows, employees, projectionYears,
    annualCost, averageMonthlyCost:roundCurrency(annualCost/12),
    additionalMonthlyCost:roundCurrency(annualCost/12-salary),
    teamAnnualCost:roundCurrency(annualCost*employees),
    teamMonthlyCost:roundCurrency(annualCost*employees/12),
    totalProjectedCost:roundCurrency(totalProjected),
    multiplier:annualCost/(12*salary),
  };
}
