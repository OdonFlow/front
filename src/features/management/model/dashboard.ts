import type { Database } from '../../clinic/model/types.ts';
import { localDate } from '../../clinic/model/fixtures.ts';
import { searchText } from '../../clinic/model/validation.ts';
import { receiptItems, receiptPayments, methodKeys } from '../../finance/model/finance.rules.ts';
import { allocateCents } from '../../finance/model/checkout.rules.ts';
import { businessDays, periodRange, previousPeriod, trendBuckets } from './periods.ts';
import type {
  DashboardData,
  DashboardSearch,
  DateRange,
  FinancialCell,
  IndicatorTotals,
  ExpenseAllocation,
  DentistResult,
  ServiceResult,
} from './types.ts';

export function financialCells(db: Database, range: DateRange): FinancialCell[] {
  return (db.finance?.receipts ?? []).flatMap((receipt) => {
    const date = localDate(new Date(receipt.paidAt));
    if (receipt.reversal || date < range.from || date > range.to) return [];
    const items = receiptItems(receipt);
    const payments = receiptPayments(receipt);
    const netWeights = items.map((i) => i.netCents);
    // Preserve both item totals and payment totals, including indivisible cents.
    const remaining = [...netWeights];
    const paymentAmounts = payments.map((payment, index) => {
      const parts =
        index === payments.length - 1
          ? [...remaining]
          : allocateCents(payment.amountCents, remaining);
      parts.forEach((amount, item) => {
        remaining[item] -= amount;
      });
      return parts;
    });
    const paymentFees = payments.map((p) => allocateCents(p.feeCents, netWeights));
    return items.flatMap<FinancialCell>((item, index) => {
      const base = {
        receiptId: receipt.id,
        receiptNumber: receipt.number,
        date,
        paidAt: receipt.paidAt,
        patientId: receipt.patientId,
        patientName: receipt.patientName,
        treatmentId: item.treatmentId,
        dentistId: item.dentistId,
        dentistName: item.dentistName,
        serviceKey: item.serviceId ?? `legacy:${searchText(item.procedure.trim())}`,
        serviceName: item.procedure,
        quantity: item.quantity,
        expenseCents: 0,
      };
      if (!payments.length)
        return [
          {
            ...base,
            key: `${receipt.id}:${item.treatmentId}:courtesy`,
            method: null,
            proof: '',
            installments: 1,
            grossCents: item.grossCents,
            discountCents: item.discountCents,
            revenueCents: 0,
            commissionCents: 0,
            feeCents: 0,
          },
        ];
      const weights = payments.map((_, p) => paymentAmounts[p][index]);
      const discountWeights = weights.some((n) => n > 0)
        ? weights
        : payments.map((p) => p.amountCents);
      const discounts = allocateCents(item.discountCents, discountWeights);
      const commissions = allocateCents(item.commissionCents, weights);
      return payments.map((payment, p) => ({
        ...base,
        key: `${receipt.id}:${item.treatmentId}:${payment.method}`,
        method: payment.method,
        proof: payment.proof,
        installments: payment.installments,
        grossCents: weights[p] + discounts[p],
        discountCents: discounts[p],
        revenueCents: weights[p],
        commissionCents: commissions[p],
        feeCents: paymentFees[p][index],
      }));
    });
  });
}
const inScope = (cell: FinancialCell, search: DashboardSearch) =>
  (!search.dentists.length || search.dentists.includes(cell.dentistId)) &&
  (!search.services.length || search.services.includes(cell.serviceKey)) &&
  (!search.methods.length || (cell.method !== null && search.methods.includes(cell.method)));
const emptyTotals = (): IndicatorTotals => ({
  grossCents: 0,
  discountsCents: 0,
  revenueCents: 0,
  commissionCents: 0,
  feesCents: 0,
  operatingExpensesCents: 0,
  totalExpensesCents: 0,
  profitCents: 0,
  marginPercent: 0,
  commissionPercent: 0,
  attendances: 0,
  patients: 0,
  ticketCents: 0,
});
export function summarizePeriod(db: Database, search: DashboardSearch, range: DateRange) {
  const all = financialCells(db, range);
  const selected = all.filter((cell) => inScope(cell, search));
  const selectedKeys = new Set(selected.map((cell) => cell.key));
  const hasFilters = search.dentists.length + search.services.length + search.methods.length > 0;
  const allocations: ExpenseAllocation[] = [];
  let unallocated = 0;
  for (const expense of (db.management?.expenses ?? []).filter(
    (e) => e.date >= range.from && e.date <= range.to,
  )) {
    if (expense.cancellation) {
      allocations.push({ expense, allocatedCents: 0 });
      continue;
    }
    const eligible = all.filter(
      (cell) =>
        (!expense.dentistId || cell.dentistId === expense.dentistId) &&
        (!expense.serviceId || cell.serviceKey === expense.serviceId),
    );
    const totalRevenue = eligible.reduce((sum, cell) => sum + cell.revenueCents, 0);
    let scopedAmount = 0;
    if (totalRevenue > 0) {
      const parts = allocateCents(
        expense.amountCents,
        eligible.map((cell) => cell.revenueCents),
      );
      eligible.forEach((cell, index) => {
        cell.expenseCents += parts[index];
        if (selectedKeys.has(cell.key)) scopedAmount += parts[index];
      });
    } else {
      unallocated += expense.amountCents;
      const tagsMatch =
        (!search.dentists.length ||
          (Boolean(expense.dentistId) && search.dentists.includes(expense.dentistId))) &&
        (!search.services.length ||
          (Boolean(expense.serviceId) && search.services.includes(expense.serviceId))) &&
        !search.methods.length;
      if (!hasFilters || tagsMatch) scopedAmount = expense.amountCents;
    }
    // Without dimension filters all operating costs belong to the clinic, even in a zero-revenue period.
    if (!hasFilters) scopedAmount = expense.amountCents;
    allocations.push({ expense, allocatedCents: scopedAmount });
  }
  const totals = emptyTotals();
  for (const cell of selected) {
    totals.grossCents += cell.grossCents;
    totals.discountsCents += cell.discountCents;
    totals.revenueCents += cell.revenueCents;
    totals.commissionCents += cell.commissionCents;
    totals.feesCents += cell.feeCents;
  }
  totals.operatingExpensesCents = allocations.reduce((sum, e) => sum + e.allocatedCents, 0);
  totals.totalExpensesCents = totals.operatingExpensesCents + totals.feesCents;
  totals.profitCents = totals.revenueCents - totals.commissionCents - totals.totalExpensesCents;
  totals.marginPercent = totals.revenueCents ? (totals.profitCents / totals.revenueCents) * 100 : 0;
  totals.commissionPercent = totals.revenueCents
    ? (totals.commissionCents / totals.revenueCents) * 100
    : 0;
  totals.attendances = new Set(selected.map((c) => c.receiptId)).size;
  totals.patients = new Set(selected.map((c) => c.patientId)).size;
  totals.ticketCents = totals.attendances
    ? Math.round(totals.revenueCents / totals.attendances)
    : 0;
  return { totals, cells: selected, expenses: allocations, unallocatedExpensesCents: unallocated };
}
export function buildDashboard(db: Database, search: DashboardSearch): DashboardData {
  const range = periodRange(search);
  const previousRange = previousPeriod(search, range);
  const current = summarizePeriod(db, search, range);
  const previous = summarizePeriod(db, search, previousRange).totals;
  const dentistIds = [...new Set(current.cells.map((c) => c.dentistId))];
  const dentists: DentistResult[] = dentistIds
    .map((id) => {
      const cells = current.cells.filter((c) => c.dentistId === id);
      const revenueCents = cells.reduce((sum, c) => sum + c.revenueCents, 0);
      const commissionCents = cells.reduce((sum, c) => sum + c.commissionCents, 0);
      const feesCents = cells.reduce((sum, c) => sum + c.feeCents, 0);
      const expensesCents = cells.reduce((sum, c) => sum + c.expenseCents, 0);
      return {
        id,
        name: cells[0].dentistName,
        attendances: new Set(cells.map((c) => c.receiptId)).size,
        patients: new Set(cells.map((c) => c.patientId)).size,
        revenueCents,
        commissionCents,
        commissionPercent: revenueCents ? (commissionCents / revenueCents) * 100 : 0,
        clinicMarginCents: revenueCents - commissionCents,
        feesCents,
        expensesCents,
        profitCents: revenueCents - commissionCents - feesCents - expensesCents,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents || a.name.localeCompare(b.name, 'pt-BR'));
  const serviceKeys = [...new Set(current.cells.map((c) => c.serviceKey))];
  const services: ServiceResult[] = serviceKeys
    .map((key) => {
      const cells = current.cells.filter((c) => c.serviceKey === key);
      const quantity = [
        ...new Map(cells.map((c) => [`${c.receiptId}:${c.treatmentId}`, c.quantity])).values(),
      ].reduce((sum, n) => sum + n, 0);
      const revenueCents = cells.reduce((sum, c) => sum + c.revenueCents, 0);
      const commissionCents = cells.reduce((sum, c) => sum + c.commissionCents, 0);
      const feesCents = cells.reduce((sum, c) => sum + c.feeCents, 0);
      const expensesCents = cells.reduce((sum, c) => sum + c.expenseCents, 0);
      return {
        key,
        name: cells[0].serviceName,
        quantity,
        revenueCents,
        commissionCents,
        feesCents,
        expensesCents,
        profitCents: revenueCents - commissionCents - feesCents - expensesCents,
        revenuePercent: current.totals.revenueCents
          ? (revenueCents / current.totals.revenueCents) * 100
          : 0,
      };
    })
    .sort(
      (a, b) =>
        (search.ranking === 'revenue'
          ? b.revenueCents - a.revenueCents
          : b.profitCents - a.profitCents) || a.name.localeCompare(b.name, 'pt-BR'),
    );
  const channels = methodKeys.map((method) => {
    const cells = current.cells.filter((c) => c.method === method);
    const revenueCents = cells.reduce((sum, c) => sum + c.revenueCents, 0);
    return {
      method,
      revenueCents,
      feeCents: cells.reduce((sum, c) => sum + c.feeCents, 0),
      transactions: new Set(cells.map((c) => c.receiptId)).size,
      percent: current.totals.revenueCents ? (revenueCents / current.totals.revenueCents) * 100 : 0,
    };
  });
  const trend = trendBuckets(range, search.period).map((bucket) => {
    const cells = current.cells.filter((c) => c.date >= bucket.from && c.date <= bucket.to);
    const revenueCents = cells.reduce((sum, c) => sum + c.revenueCents, 0);
    const expensesCents =
      cells.reduce((sum, c) => sum + c.commissionCents + c.feeCents, 0) +
      current.expenses
        .filter((e) => e.expense.date >= bucket.from && e.expense.date <= bucket.to)
        .reduce((sum, e) => sum + e.allocatedCents, 0);
    return {
      key: bucket.key,
      label: bucket.label,
      revenueCents,
      expensesCents,
      profitCents: revenueCents - expensesCents,
    };
  });
  const historicalCells = financialCells(db, { from: '1900-01-01', to: '9999-12-31' });
  const dentistOptions = new Map(
    db.users.filter((u) => u.role === 'dentist').map((u) => [u.id, u.name]),
  );
  const serviceOptions = new Map(
    (db.services ?? []).map((s) => [s.id, `${s.name}${s.active ? '' : ' · Inativo'}`]),
  );
  for (const cell of historicalCells) {
    if (!dentistOptions.has(cell.dentistId)) dentistOptions.set(cell.dentistId, cell.dentistName);
    if (!serviceOptions.has(cell.serviceKey))
      serviceOptions.set(
        cell.serviceKey,
        `${cell.serviceName}${cell.serviceKey.startsWith('legacy:') ? ' · Histórico' : ''}`,
      );
  }
  const settings = db.management?.settings ?? { dailyGoalCents: 0 };
  const goalCents = settings.dailyGoalCents * businessDays(range);
  return {
    search,
    range,
    previousRange,
    totals: current.totals,
    previous,
    growthPercent:
      previous.revenueCents > 0
        ? ((current.totals.revenueCents - previous.revenueCents) / previous.revenueCents) * 100
        : null,
    goalCents,
    goalPercent: goalCents ? (current.totals.revenueCents / goalCents) * 100 : 0,
    settings,
    dentists,
    services,
    channels,
    trend,
    details: current.cells,
    expenses: current.expenses,
    unallocatedExpensesCents: current.unallocatedExpensesCents,
    options: {
      dentists: [...dentistOptions].map(([id, name]) => ({ id, name })),
      services: [...serviceOptions].map(([id, name]) => ({ id, name })),
    },
  };
}
