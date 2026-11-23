import { http } from '../../../shared/lib/http/client';
import type {
  DashboardData,
  DashboardSearch,
  Expense,
  ExpenseInput,
  ManagementSettings,
} from './types';
export const managementApi = {
  dashboard: async (search: DashboardSearch, signal?: AbortSignal) =>
    (
      await http.get<DashboardData>('/management/dashboard', {
        params: {
          ...search,
          dentists: search.dentists.join(','),
          services: search.services.join(','),
          methods: search.methods.join(','),
        },
        signal,
      })
    ).data,
  saveExpense: async ({ id, ...input }: ExpenseInput & { id?: string }) =>
    (id
      ? await http.put<Expense>(`/management/expenses/${id}`, input)
      : await http.post<Expense>('/management/expenses', input)
    ).data,
  cancelExpense: async ({ id, reason }: { id: string; reason: string }) =>
    (await http.post<Expense>(`/management/expenses/${id}/cancellation`, { reason })).data,
  saveSettings: async (input: ManagementSettings) =>
    (await http.put<ManagementSettings>('/management/settings', input)).data,
};
