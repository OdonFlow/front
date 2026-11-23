import type { FinancialCell } from './types.ts';
import { methodLabels } from '../../finance/model/finance.rules.ts';

export function statementRows(cells: FinancialCell[]) {
  const rows = new Map<
    string,
    {
      key: string;
      date: string;
      receiptNumber: string;
      patientName: string;
      serviceName: string;
      dentistName: string;
      quantity: number;
      grossCents: number;
      discountCents: number;
      revenueCents: number;
      commissionCents: number;
      feesCents: number;
      expensesCents: number;
      channels: string[];
    }
  >();
  for (const cell of cells) {
    const key = `${cell.receiptId}:${cell.treatmentId}`;
    const row = rows.get(key) ?? {
      key,
      date: cell.date,
      receiptNumber: cell.receiptNumber,
      patientName: cell.patientName,
      serviceName: cell.serviceName,
      dentistName: cell.dentistName,
      quantity: cell.quantity,
      grossCents: 0,
      discountCents: 0,
      revenueCents: 0,
      commissionCents: 0,
      feesCents: 0,
      expensesCents: 0,
      channels: [],
    };
    row.grossCents += cell.grossCents;
    row.discountCents += cell.discountCents;
    row.revenueCents += cell.revenueCents;
    row.commissionCents += cell.commissionCents;
    row.feesCents += cell.feeCents;
    row.expensesCents += cell.expenseCents;
    row.channels.push(
      cell.method
        ? `${methodLabels[cell.method]}${cell.proof ? ` · ${cell.proof}` : ''}`
        : 'Cortesia',
    );
    rows.set(key, row);
  }
  return [...rows.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || a.receiptNumber.localeCompare(b.receiptNumber),
  );
}
export function dashboardFilterLabel(data: {
  search: { dentists: string[]; services: string[]; methods: string[] };
  options: { dentists: { id: string; name: string }[]; services: { id: string; name: string }[] };
}): string {
  const dentists = data.search.dentists.map(
    (id) => data.options.dentists.find((d) => d.id === id)?.name ?? id,
  );
  const services = data.search.services.map(
    (id) => data.options.services.find((s) => s.id === id)?.name ?? id,
  );
  return [
    dentists.length ? `Dentistas: ${dentists.join(', ')}` : 'Todos os dentistas',
    services.length ? `Serviços: ${services.join(', ')}` : 'Todos os serviços',
    data.search.methods.length
      ? `Canais: ${data.search.methods.map((m) => methodLabels[m as keyof typeof methodLabels]).join(', ')}`
      : 'Todos os canais',
  ].join(' · ');
}
