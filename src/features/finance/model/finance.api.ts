import { http } from '../../../shared/lib/http/client';
import type {
  CashShift,
  CloseShiftInput,
  FinanceConfiguration,
  FinanceSnapshot,
  OpenShiftInput,
  PaymentInput,
  Receipt,
  WithdrawalInput,
  CheckoutInput,
} from './types';

export const financeApi = {
  checkout: async (input: CheckoutInput) =>
    (await http.post<Receipt>('/finance/checkout', input)).data,
  snapshot: async (signal?: AbortSignal) =>
    (await http.get<FinanceSnapshot>('/finance', { signal })).data,
  receive: async (input: PaymentInput) =>
    (await http.post<Receipt>('/finance/receipts', input)).data,
  reverse: async ({ id, reason }: { id: string; reason: string }) =>
    (await http.post<Receipt>(`/finance/receipts/${id}/reversal`, { reason })).data,
  openShift: async (input: OpenShiftInput) =>
    (await http.post<CashShift>('/finance/shifts', input)).data,
  withdraw: async (input: WithdrawalInput) => (await http.post('/finance/withdrawals', input)).data,
  closeShift: async (input: CloseShiftInput) =>
    (await http.post<CashShift>(`/finance/shifts/${input.shiftId}/closing`, input)).data,
  configure: async (input: FinanceConfiguration) =>
    (await http.put<FinanceConfiguration>('/finance/configuration', input)).data,
};
