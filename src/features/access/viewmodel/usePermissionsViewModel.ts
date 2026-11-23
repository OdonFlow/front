import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsRoute } from '../../../app/router/router';
import { policyOptions, logsOptions, sessionOptions } from '../model/access.queries';
import { accessApi } from '../model/access.api';
import { maximumPermissions } from '../model/access.rules';
import { toCents } from '../../finance/model/finance.rules';
import type { Role, PermissionSet, Permission } from '../model/types';
export function usePermissionsViewModel() {
  const search = permissionsRoute.useSearch();
  const role: Role =
    search.role === 'admin' ? 'admin' : search.role === 'dentist' ? 'dentist' : 'receptionist';
  const navigate = permissionsRoute.useNavigate();
  const query = useQuery(policyOptions);
  const logs = useQuery(logsOptions);
  const client = useQueryClient();
  const [draft, setDraft] = useState<{ role: Role; values: PermissionSet } | null>(null);
  const [success, setSuccess] = useState('');
  const policy =
    draft?.role === role ? draft.values : (query.data?.policy[role] ?? maximumPermissions(role));
  const mutation = useMutation({
    mutationFn: accessApi.savePolicy,
    onSuccess: async (saved) => {
      client.setQueryData(policyOptions.queryKey, saved);
      setDraft(null);
      await client.invalidateQueries({ queryKey: sessionOptions.queryKey });
      setSuccess('Permissões e limites salvos com sucesso.');
    },
  });
  return {
    role,
    policy,
    ceiling: maximumPermissions(role),
    settings: query.data?.settings,
    logs: logs.data ?? [],
    logsError: logs.error,
    pending: query.isPending,
    error: query.error,
    retry: () => {
      void query.refetch();
      void logs.refetch();
    },
    changeRole: (next: Role) => {
      setDraft(null);
      mutation.reset();
      setSuccess('');
      void navigate({ search: { role: next } });
    },
    toggle: (key: Permission) => setDraft({ role, values: { ...policy, [key]: !policy[key] } }),
    restore: () => setDraft({ role, values: maximumPermissions(role) }),
    saving: mutation.isPending,
    formError: mutation.error,
    success,
    save: (form: FormData) =>
      mutation.mutate({
        role,
        policy,
        settings: {
          idleMinutes: Number(form.get('idle')),
          receptionExpenseCapCents: toCents(String(form.get('cap') ?? '')),
        },
      }),
  };
}
