import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { managementRoute } from '../../../app/router/router';
import { dashboardOptions } from '../model/management.queries';
import { managementApi } from '../model/management.api';
import { normalizeDashboardSearch, periodRange, shiftAnchor } from '../model/periods';
import { settingsOptions } from '../../clinic/model/clinic.queries';
import { localDate } from '../../clinic/model/fixtures';
import { toCents } from '../../finance/model/finance.rules';
import { statementRows } from '../model/statements';
import { dreRows, categoryExpenseTotals } from '../model/reports';
import {
  expenseCategories,
  type Expense,
  type DashboardSearch,
  type ExpenseInput,
} from '../model/types';

type Panel = 'expenses' | 'expense' | 'cancel' | 'goal' | 'export' | 'dentist' | null;
export function useManagementViewModel() {
  const search = managementRoute.useSearch();
  const navigate = managementRoute.useNavigate();
  const client = useQueryClient();
  let rangeError: Error | null = null;
  try {
    periodRange(search);
  } catch (error) {
    rangeError = error instanceof Error ? error : new Error('Período inválido.');
  }
  const query = useQuery({ ...dashboardOptions(search), enabled: !rangeError });
  const clinic = useQuery(settingsOptions);
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [dentistId, setDentistId] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState('');
  const [responsible, setResponsible] = useState('');
  const [exporting, setExporting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');
  const mutation = useMutation({
    mutationFn: async (
      action:
        | { kind: 'expense'; input: ExpenseInput & { id?: string } }
        | { kind: 'cancel'; id: string; reason: string }
        | { kind: 'goal'; amount: number },
    ) => {
      if (action.kind === 'expense') return managementApi.saveExpense(action.input);
      if (action.kind === 'cancel') return managementApi.cancelExpense(action);
      return managementApi.saveSettings({ dailyGoalCents: action.amount });
    },
    onSuccess: async (_, action) => {
      await client.invalidateQueries({ queryKey: ['finance', 'management'] });
      setPanel(action.kind === 'goal' ? null : 'expenses');
      setSuccess(
        action.kind === 'cancel'
          ? 'Despesa cancelada. O histórico foi preservado.'
          : 'Alteração salva com sucesso.',
      );
    },
  });
  const updateSearch = (next: Partial<DashboardSearch>) =>
    void navigate({ search: normalizeDashboardSearch({ ...search, ...next }) });
  const open = (next: Panel, expense?: Expense) => {
    setPanel(next);
    setEditing(expense ?? null);
    setError(null);
    mutation.reset();
    if (next === 'export' || next === 'dentist') setGeneratedAt(new Date().toLocaleString('pt-BR'));
  };
  return {
    search,
    updateSearch,
    shift: (direction: number) => {
      try {
        updateSearch(shiftAnchor(search, direction));
      } catch {
        /* Invalid custom range is shown by QueryState. */
      }
    },
    today: () => updateSearch({ date: localDate(), from: localDate(), to: localDate() }),
    data: query.data,
    pending: query.isPending && !rangeError,
    error: rangeError ?? query.error,
    retry: () => void query.refetch(),
    refreshing: query.isFetching,
    clinicName: clinic.data?.name ?? 'OdontoFlow',
    panel,
    editing,
    open,
    close: () => {
      if (!mutation.isPending && !exporting) setPanel(null);
    },
    dentist: query.data?.dentists.find((d) => d.id === dentistId),
    dentistRows: statementRows(
      (query.data?.details ?? []).filter((cell) => cell.dentistId === dentistId),
    ),
    dreRows: query.data ? dreRows(query.data) : [],
    categoryTotals: query.data ? categoryExpenseTotals(query.data) : [],
    openDentist: (id: string) => {
      setDentistId(id);
      open('dentist');
    },
    formError: error ?? mutation.error,
    success,
    saving: mutation.isPending,
    responsible,
    setResponsible,
    generatedAt,
    exporting,
    saveExpense: (form: FormData) => {
      const category = expenseCategories.find((c) => c === form.get('category')) ?? 'other';
      mutation.mutate({
        kind: 'expense',
        input: {
          id: editing?.id,
          description: String(form.get('description') ?? ''),
          category,
          date: String(form.get('date') ?? ''),
          amountCents: toCents(String(form.get('amount') ?? '')),
          dentistId: String(form.get('dentistId') ?? ''),
          serviceId: String(form.get('serviceId') ?? ''),
          reference: String(form.get('reference') ?? ''),
        },
      });
    },
    cancelExpense: (form: FormData) => {
      if (editing)
        mutation.mutate({
          kind: 'cancel',
          id: editing.id,
          reason: String(form.get('reason') ?? ''),
        });
    },
    saveGoal: (form: FormData) =>
      mutation.mutate({ kind: 'goal', amount: toCents(String(form.get('amount') ?? '')) }),
    print: () => window.print(),
    download: async () => {
      if (!query.data) return;
      if (responsible.trim().length < 3) {
        setError(new Error('Informe o nome do responsável pela emissão.'));
        return;
      }
      setError(null);
      setExporting(true);
      try {
        const { exportDashboardXlsx } = await import('../model/export');
        const bytes = exportDashboardXlsx(
          query.data,
          clinic.data?.name ?? 'OdontoFlow',
          responsible.trim(),
          generatedAt,
        );
        const url = URL.createObjectURL(
          new Blob([bytes], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        );
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `DRE-${query.data.range.from}-${query.data.range.to}.xlsx`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSuccess('Planilha Excel gerada com o detalhamento do período.');
      } catch (cause) {
        setError(cause instanceof Error ? cause : new Error('Não foi possível exportar.'));
      } finally {
        setExporting(false);
      }
    },
  };
}
export type ManagementViewModel = ReturnType<typeof useManagementViewModel>;
