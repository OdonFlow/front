import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toCents } from '../../finance/model/finance.rules';
import { localDate } from '../../clinic/model/fixtures';
import { useSession } from './useSessionViewModel';
import { smallExpense } from '../model/smallExpense.api';
export function useSmallExpenseViewModel() {
  const session = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: smallExpense,
    onSuccess: () => {
      setOpen(false);
      void client.invalidateQueries({ queryKey: ['finance'] });
    },
  });
  return {
    open,
    show: () => {
      mutation.reset();
      setOpen(true);
    },
    close: () => {
      if (!mutation.isPending) setOpen(false);
    },
    cap: session.data?.receptionExpenseCapCents ?? 0,
    limited: session.data?.user.role === 'receptionist',
    date: localDate(),
    saving: mutation.isPending,
    error: mutation.error,
    success: mutation.isSuccess && !open,
    save: (form: FormData) =>
      mutation.mutate({
        description: String(form.get('description') ?? ''),
        amountCents: toCents(String(form.get('amount') ?? '')),
        date: localDate(),
        category: 'supplies',
        reference: String(form.get('reference') ?? ''),
      }),
  };
}
