/** IPCA number-index ratio, using official SIDRA table 1737 / variable 2266.
 * The IBGE calculator includes the initial and final months:
 * corrected = value * index[final] / index[month before initial].
 * The nominal-money purchasing power is expressed in the initial month's reais.
 */
export type IpcaPoint = { month: string; index: number };
export type IpcaMode = 'adjust' | 'inflation';
export type IpcaRow = {
  month: string;
  factor: number;
  monthlyRate: number;
  accumulatedPercent: number;
  updatedValue: number;
  purchasingPower: number;
};
export type IpcaResult = {
  startMonth: string;
  endMonth: string;
  initialValue: number;
  finalValue: number;
  accumulatedPercent: number;
  factor: number;
  priceIncrease: number;
  purchasingPower: number;
  purchasingPowerLoss: number;
  totalMonths: number;
  rows: IpcaRow[];
};

const monthNumber = (month: string): number => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Mês inválido.');
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
};
const previousMonth = (month: string): string => {
  const d = monthNumber(month) - 1;
  return `${Math.floor(d / 12)}-${String(d % 12 + 1).padStart(2, '0')}`;
};

export function calculateIpca(points: readonly IpcaPoint[], startMonth: string, endMonth: string, initialValue: number): IpcaResult {
  const start = monthNumber(startMonth), end = monthNumber(endMonth);
  if (start < monthNumber('1994-07') || end < start ||
    !Number.isFinite(initialValue) || initialValue < 0.01 || initialValue > 1e12)
    throw Error('Confira o valor e os meses selecionados.');
  const index = new Map<string, number>();
  for (const point of points) {
    if (!Number.isFinite(point.index) || point.index <= 0 || index.has(point.month)) throw Error('Série histórica do IPCA inválida.');
    index.set(point.month, point.index);
  }
  const before = index.get(previousMonth(startMonth));
  const finalIndex = index.get(endMonth);
  if (!before || !finalIndex) throw Error('Um dos meses ainda não possui IPCA oficial disponível.');
  const rows: IpcaRow[] = [];
  let prior = before;
  for (let i = start; i <= end; i++) {
    const month = `${Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`;
    const current = index.get(month);
    if (!current) throw Error(`Falta um mês da série oficial: ${month}.`);
    const factor = current / before;
    rows.push({
      month,
      factor,
      monthlyRate: (current / prior - 1) * 100,
      accumulatedPercent: (factor - 1) * 100,
      updatedValue: initialValue * factor,
      purchasingPower: initialValue / factor,
    });
    prior = current;
  }
  const factor = finalIndex / before;
  return {
    startMonth, endMonth, initialValue,
    finalValue: initialValue * factor,
    accumulatedPercent: (factor - 1) * 100,
    factor,
    priceIncrease: initialValue * (factor - 1),
    purchasingPower: initialValue / factor,
    purchasingPowerLoss: initialValue - initialValue / factor,
    totalMonths: rows.length,
    rows,
  };
}
