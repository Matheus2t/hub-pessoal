export interface EvolutionRow {
  month: number;
  interest: string | number;
  deposit: string | number;
  balance: string | number;
  invested: string | number;
}
export interface CalculationResult {
  total_invested: string | number;
  total_interest: string | number;
  final_amount: string | number;
  evolution: EvolutionRow[];
}
export interface CalculationInput {
  initial_capital: number;
  monthly_contribution: number;
  monthly_rate: number;
  months: number;
}
export interface HistoryItem {
  id: number;
  monthly_rate: string | number;
  months: number;
  final_amount: string | number;
  created_at: string;
}
