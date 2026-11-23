import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeRoute } from '../../../app/router/router';
import { financeOptions } from '../model/finance.queries';
import { financeApi } from '../model/finance.api';
import { settingsOptions, usersOptions } from '../../clinic/model/clinic.queries';
import { emptyAmounts, methodKeys, shiftSummary, toCents } from '../model/finance.rules';
import { localDate } from '../../clinic/model/fixtures';
import type { FinanceConfiguration, MethodAmounts } from '../model/types';

export function useFinanceViewModel() {
  const search = financeRoute.useSearch();
  const navigate = financeRoute.useNavigate();
  const client = useQueryClient();
  const query = useQuery(financeOptions);
  const settings = useQuery(settingsOptions);
  const users = useQuery(usersOptions);
  const [modal, setModal] = useState<'open' | 'withdraw' | 'close' | 'configuration' | null>(null);
  const [receiptId, setReceiptId] = useState('');
  const [reversalId, setReversalId] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [withdrawal, setWithdrawal] = useState('');
  const shifts = (query.data?.shifts ?? []).filter((s) => s.date === search.date).reverse();
  const shift = shifts.find((s) => s.id === search.shift) ?? shifts[0];
  const activeShift = query.data?.shifts.find((s) => !s.closing);
  const summary = query.data && shift ? shiftSummary(query.data, shift) : undefined;
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['finance'] }),
      client.invalidateQueries({ queryKey: ['records'] }),
    ]);
  };
  const open = useMutation({
    mutationFn: financeApi.openShift,
    onSuccess: async (saved) => {
      await invalidate();
      setModal(null);
      void navigate({ search: { date: saved.date, shift: saved.id } });
      setSuccess('Caixa aberto. Os recebimentos já podem ser lançados.');
    },
  });
  const withdraw = useMutation({
    mutationFn: financeApi.withdraw,
    onSuccess: async () => {
      await invalidate();
      setModal(null);
      setSuccess('Sangria registrada no caixa.');
    },
  });
  const close = useMutation({
    mutationFn: financeApi.closeShift,
    onSuccess: async () => {
      await invalidate();
      setModal(null);
      setReportOpen(true);
      setSuccess('Turno fechado. O borderô está disponível para impressão.');
    },
  });
  const reverse = useMutation({
    mutationFn: financeApi.reverse,
    onSuccess: async () => {
      await invalidate();
      setReversalId('');
      setSuccess('Estorno registrado. O procedimento voltou para as pendências.');
    },
  });
  const configure = useMutation({
    mutationFn: financeApi.configure,
    onSuccess: async () => {
      await invalidate();
      setModal(null);
      setSuccess('Taxas e repasses atualizados para os próximos recebimentos.');
    },
  });
  const counted: MethodAmounts = {
    cash: toCents(counts.cash ?? ''),
    debit: toCents(counts.debit ?? ''),
    credit: toCents(counts.credit ?? ''),
    pix: toCents(counts.pix ?? ''),
  };
  const differences = emptyAmounts();
  if (summary)
    for (const method of methodKeys)
      differences[method] = counted[method] - summary.expected[method];
  const isBusy =
    open.isPending ||
    withdraw.isPending ||
    close.isPending ||
    configure.isPending ||
    reverse.isPending;
  return {
    search,
    updateSearch: (next: Partial<typeof search>) => {
      setSuccess('');
      void navigate({
        search: (prev) => ({ ...prev, ...next, ...(next.date ? { shift: '' } : {}) }),
      });
    },
    data: query.data,
    shifts,
    shift,
    summary,
    activeShift,
    canReceive: Boolean(activeShift && activeShift.date === localDate()),
    canWrite: Boolean(shift && !shift.closing && shift.date === localDate()),
    settings: settings.data,
    dentists: users.data?.filter((u) => u.role === 'dentist') ?? [],
    pending: query.isPending || settings.isPending || users.isPending,
    error: query.error ?? settings.error ?? users.error,
    retry: () => {
      void query.refetch();
      void settings.refetch();
      void users.refetch();
    },
    modal,
    openModal: (next: NonNullable<typeof modal>) => {
      open.reset();
      withdraw.reset();
      close.reset();
      configure.reset();
      setWithdrawal('');
      if (summary) setCounts(Object.fromEntries(methodKeys.map((m) => [m, ''])));
      setModal(next);
    },
    closeModal: () => {
      if (!isBusy) setModal(null);
    },
    isBusy,
    receipt: query.data?.receipts.find((r) => r.id === (receiptId || search.receipt)),
    showReceipt: setReceiptId,
    closeReceipt: () => {
      setReceiptId('');
      if (search.receipt) void navigate({ search: (prev) => ({ ...prev, receipt: undefined }) });
    },
    reversal: query.data?.receipts.find((r) => r.id === reversalId),
    showReversal: (id: string) => {
      reverse.reset();
      setReversalId(id);
    },
    closeReversal: () => {
      if (!reverse.isPending) setReversalId('');
    },
    reverse,
    reportOpen,
    showReport: () => setReportOpen(true),
    closeReport: () => setReportOpen(false),
    print: () => window.print(),
    success,
    formError: open.error ?? withdraw.error ?? close.error ?? configure.error,
    saveOpen: (form: FormData) =>
      open.mutate({ openingCents: toCents(String(form.get('opening'))) }),
    withdrawal,
    setWithdrawal,
    remainingCash: (summary?.expected.cash ?? 0) - (toCents(withdrawal) || 0),
    saveWithdrawal: (form: FormData) => {
      if (shift)
        withdraw.mutate({
          shiftId: shift.id,
          amountCents: toCents(withdrawal),
          destination: form.get('destination') === 'bank' ? 'bank' : 'safe',
          reason: String(form.get('reason')).trim(),
        });
    },
    counts,
    setCount: (method: string, value: string) =>
      setCounts((previous) => ({ ...previous, [method]: value })),
    differences,
    hasDifference: Object.values(differences).some((v) => Number.isFinite(v) && v !== 0),
    saveClose: (form: FormData) => {
      if (shift)
        close.mutate({
          shiftId: shift.id,
          counted,
          reason: String(form.get('reason') ?? ''),
          signature: String(form.get('signature')),
        });
    },
    saveConfiguration: (form: FormData) => {
      const config: FinanceConfiguration = {
        debitRate: Number(form.get('debitRate')),
        creditRate: Number(form.get('creditRate')),
        additionalInstallmentRate: Number(form.get('additionalInstallmentRate')),
        dentistRates: Object.fromEntries(
          (users.data ?? [])
            .filter((u) => u.role === 'dentist')
            .map((u) => [u.id, Number(form.get(`rate-${u.id}`))]),
        ),
      };
      configure.mutate(config);
    },
  };
}
