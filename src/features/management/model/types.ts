import type { PaymentMethod } from '../../finance/model/types.ts';

export const periodKeys = ['day', 'week', 'month', 'year', 'custom'] as const;
export type PeriodKey = (typeof periodKeys)[number];
export interface DashboardSearch {
  period: PeriodKey;
  date: string;
  from: string;
  to: string;
  dentists: string[];
  services: string[];
  methods: PaymentMethod[];
  ranking: 'profit' | 'revenue';
}
export interface DateRange {
  from: string;
  to: string;
}
export const expenseCategories = ['fixed', 'supplies', 'laboratory', 'other'] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];
export interface ExpenseInput {
  description: string;
  category: ExpenseCategory;
  date: string;
  amountCents: number;
  dentistId: string;
  serviceId: string;
  reference: string;
}
export interface Expense extends ExpenseInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  operatorName: string;
  cancellation?: { at: string; reason: string; operatorName: string };
}
export interface ManagementSettings {
  dailyGoalCents: number;
}
export interface ManagementData {
  expenses: Expense[];
  settings: ManagementSettings;
}
export interface IndicatorTotals {
  grossCents: number;
  discountsCents: number;
  revenueCents: number;
  commissionCents: number;
  feesCents: number;
  operatingExpensesCents: number;
  totalExpensesCents: number;
  profitCents: number;
  marginPercent: number;
  commissionPercent: number;
  attendances: number;
  patients: number;
  ticketCents: number;
}
export interface FinancialCell {
  key: string;
  receiptId: string;
  receiptNumber: string;
  date: string;
  paidAt: string;
  patientId: string;
  patientName: string;
  treatmentId: string;
  dentistId: string;
  dentistName: string;
  serviceKey: string;
  serviceName: string;
  method: PaymentMethod | null;
  proof: string;
  installments: number;
  quantity: number;
  grossCents: number;
  discountCents: number;
  revenueCents: number;
  commissionCents: number;
  feeCents: number;
  expenseCents: number;
}
export interface DentistResult {
  id: string;
  name: string;
  attendances: number;
  patients: number;
  revenueCents: number;
  commissionCents: number;
  commissionPercent: number;
  clinicMarginCents: number;
  feesCents: number;
  expensesCents: number;
  profitCents: number;
}
export interface ServiceResult {
  key: string;
  name: string;
  quantity: number;
  revenueCents: number;
  commissionCents: number;
  feesCents: number;
  expensesCents: number;
  profitCents: number;
  revenuePercent: number;
}
export interface ChannelResult {
  method: PaymentMethod;
  revenueCents: number;
  feeCents: number;
  percent: number;
  transactions: number;
}
export interface TrendPoint {
  key: string;
  label: string;
  revenueCents: number;
  expensesCents: number;
  profitCents: number;
}
export interface ExpenseAllocation {
  expense: Expense;
  allocatedCents: number;
}
export interface DashboardData {
  search: DashboardSearch;
  range: DateRange;
  previousRange: DateRange;
  totals: IndicatorTotals;
  previous: IndicatorTotals;
  growthPercent: number | null;
  goalCents: number;
  goalPercent: number;
  settings: ManagementSettings;
  dentists: DentistResult[];
  services: ServiceResult[];
  channels: ChannelResult[];
  trend: TrendPoint[];
  details: FinancialCell[];
  expenses: ExpenseAllocation[];
  unallocatedExpensesCents: number;
  options: { dentists: { id: string; name: string }[]; services: { id: string; name: string }[] };
}
