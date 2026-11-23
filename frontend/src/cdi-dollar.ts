/**
 * CDI x Dólar: compra teórica de USD à vista versus rendimento de um ativo
 * remunerado por um percentual constante da Taxa DI, sem aportes ou saques.
 *
 * CDI anual efetivo informado manualmente (não uma cotação atual):
 * taxa efetiva de um dia útil = (1 + CDI anual)^(1/252) - 1
 * rendimento do produto: taxa diária × percentual do CDI
 * dias úteis projetados = 252 × dias corridos / 365,25
 *
 * Datas e DI observados variam; o horizonte é uma aproximação determinística.
 */
export type CdiDollarTaxMode = 'taxable' | 'exempt';
export type CdiDollarInput = {
  principal: number;
  cdiAnnualPercent: number;
  cdiParticipation: number;
  days: number;
  initialFx: number;
  finalFx: number;
  taxMode: CdiDollarTaxMode;
};
export type CdiDollarRow = {
  month: number;
  elapsedDays: number;
  fx: number;
  cdiGrossBRL: number;
  cdiNetBRL: number;
  dollarHoldBRL: number;
  netDollarEquivalent: number;
  irRate: number;
  balanceDifferenceBRL: number;
};
export type CdiDollarOutput = {
  principal: number; initialFx: number; finalFx: number;
  grossBRL: number;
  gainBRL: number;
  irAmount: number;
  irRate: number;
  netBRL: number;
  nominalNetReturn: number;
  initialDollars: number;
  finalDollars: number;
  dollarHoldBRL: number;
  dollarAppreciation: number;
  fxBreakeven: number;
  fxBreakevenAppreciation: number;
  cdiDifferenceBRL: number;
  netDollarReturn: number;
  rows: CdiDollarRow[];
};

export function incomeTaxCdbRate(days: number): number {
  if (!Number.isInteger(days) || days < 1) throw new Error('Prazo inválido.');
  return days <= 180 ? 0.225 : days <= 360 ? 0.20 : days <= 720 ? 0.175 : 0.15;
}

export function simulateCdiDollar(input: CdiDollarInput): CdiDollarOutput {
  const {principal, cdiAnnualPercent, cdiParticipation, days, initialFx, finalFx, taxMode} = input;
  if (!Number.isFinite(principal) || principal < 0.01 || principal > 1e12 ||
      !Number.isFinite(cdiAnnualPercent) || cdiAnnualPercent < 0 || cdiAnnualPercent > 100 ||
      !Number.isFinite(cdiParticipation) || cdiParticipation < 0 || cdiParticipation > 300 ||
      !Number.isInteger(days) || days < 30 || days > 3650 ||
      !Number.isFinite(initialFx) || initialFx <= 0 || initialFx > 1000 ||
      !Number.isFinite(finalFx) || finalFx <= 0 || finalFx > 1000 ||
      !['taxable','exempt'].includes(taxMode))
    throw new Error('Revise os valores, câmbio e prazo informados.');

  const dailyCdi = Math.pow(1 + cdiAnnualPercent / 100, 1 / 252) - 1;
  const dailyInvestment = dailyCdi * cdiParticipation / 100;
  const initialDollars = principal / initialFx;
  const months = Math.max(1, Math.ceil(days / (365.25 / 12)));
  const atDays = (elapsedDays: number) => {
    const fx = initialFx * Math.pow(finalFx / initialFx, elapsedDays / days);
    const workingDays = elapsedDays * 252 / 365.25;
    const gross = principal * Math.pow(1 + dailyInvestment, workingDays);
    const gains = Math.max(0, gross - principal);
    const irRate = taxMode === 'taxable' ? incomeTaxCdbRate(Math.max(1, Math.round(elapsedDays))) : 0;
    const tax = gains * irRate;
    const net = gross - tax;
    const dollarHoldBRL = initialDollars * fx;
    return {fx, gross, gains, tax, irRate, net, dollarHoldBRL};
  };

  const final = atDays(days);
  const rows: CdiDollarRow[] = [];
  const initial = atDays(0);
  rows.push({month:0,elapsedDays:0,fx:initialFx,cdiGrossBRL:principal,cdiNetBRL:principal,
    dollarHoldBRL:principal,netDollarEquivalent:initialDollars,irRate:0,balanceDifferenceBRL:0});
  for (let month = 1; month <= months; month++) {
    const elapsedDays = Math.min(days, Math.round(month * 365.25 / 12));
    const row = atDays(elapsedDays);
    rows.push({
      month,elapsedDays,fx:row.fx,cdiGrossBRL:row.gross,cdiNetBRL:row.net,
      dollarHoldBRL:row.dollarHoldBRL,netDollarEquivalent:row.net / row.fx,
      irRate:row.irRate,balanceDifferenceBRL:row.net-row.dollarHoldBRL
    });
  }
  const fxBreakeven = initialFx * final.net / principal;
  return {
    principal,initialFx,finalFx,grossBRL:final.gross,gainBRL:final.gains,irAmount:final.tax,
    irRate:final.irRate,netBRL:final.net,
    nominalNetReturn:(final.net/principal-1)*100,
    initialDollars,
    finalDollars:final.net/finalFx,
    dollarHoldBRL:final.dollarHoldBRL,
    dollarAppreciation:(finalFx/initialFx-1)*100,
    fxBreakeven,fxBreakevenAppreciation:(fxBreakeven/initialFx-1)*100,
    cdiDifferenceBRL:final.net-final.dollarHoldBRL,
    netDollarReturn:((final.net/finalFx)/initialDollars-1)*100,
    rows
  };
}
