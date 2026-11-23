import type { DashboardData } from './types.ts';
import { categoryLabels } from './expense.rules.ts';

export function dreRows(data: DashboardData) {
  const t = data.totals;
  return [
    ['(+) Serviços antes dos descontos', t.grossCents],
    ['(-) Descontos e cortesias', -t.discountsCents],
    ['(=) Receita recebida', t.revenueCents],
    ['(-) Repasses aos dentistas', -t.commissionCents],
    ['(-) Taxas de operadoras', -t.feesCents],
    ['(-) Despesas operacionais', -t.operatingExpensesCents],
    ['(=) Lucro líquido gerencial', t.profitCents],
  ] as const;
}
export function categoryExpenseTotals(data: DashboardData) {
  return Object.entries(categoryLabels).map(([key, name]) => ({
    key,
    name,
    amountCents: data.expenses
      .filter((e) => e.expense.category === key)
      .reduce((sum, e) => sum + e.allocatedCents, 0),
  }));
}
