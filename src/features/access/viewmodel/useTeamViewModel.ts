import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { teamRoute } from '../../../app/router/router';
import { accessApi } from '../model/access.api';
import { teamOptions } from '../model/access.queries';
import { searchText } from '../../clinic/model/validation';
import { validateTeam } from '../model/access.rules';
import type { User } from '../../clinic/model/types';
import type { Role, TeamInput } from '../model/types';
export function useTeamViewModel() {
  const search = teamRoute.useSearch();
  const navigate = teamRoute.useNavigate();
  const query = useQuery(teamOptions);
  const client = useQueryClient();
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [role, setRole] = useState<Role>('receptionist');
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState('');
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['access'] }),
      client.invalidateQueries({ queryKey: ['users'] }),
      client.invalidateQueries({ queryKey: ['appointments'] }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: accessApi.saveUser,
    onSuccess: async () => {
      await invalidate();
      setEditing(null);
      setSuccess('Colaborador salvo. Novos acessos recebem um convite para criar a senha.');
    },
  });
  const invite = useMutation({
    mutationFn: accessApi.invite,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['access', 'mailbox'] });
      setSuccess('Link de acesso enviado para o colaborador.');
    },
  });
  return {
    search,
    updateSearch: (next: Partial<typeof search>) =>
      void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true }),
    users: (query.data ?? []).filter(
      (u) =>
        (search.role === 'all' || u.role === search.role) &&
        searchText(`${u.name} ${u.email} ${u.cro}`).includes(searchText(search.q)),
    ),
    allUsers: query.data ?? [],
    pending: query.isPending,
    error: query.error,
    retry: () => void query.refetch(),
    editing,
    role,
    setRole,
    open: (user: User | 'new') => {
      setEditing(user);
      setRole(user === 'new' ? 'receptionist' : user.role);
      setError(null);
      mutation.reset();
    },
    close: () => {
      if (!mutation.isPending) setEditing(null);
    },
    formError: error ?? mutation.error ?? invite.error,
    success,
    saving: mutation.isPending,
    inviting: invite.isPending,
    invite: (id: string) => invite.mutate(id),
    toggle: (user: User) =>
      mutation.mutate({
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        role: user.role,
        specialty: user.specialty,
        cro: user.cro,
        active: user.active === false,
        id: user.id,
      }),
    save: (form: FormData) => {
      const input: TeamInput = {
        name: String(form.get('name') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        phone: String(form.get('phone') ?? ''),
        role,
        specialty: String(form.get('specialty') ?? ''),
        cro: String(form.get('cro') ?? ''),
        active: form.get('active') === 'on',
      };
      const problem = validateTeam(input);
      setError(problem ? new Error(problem) : null);
      if (!problem)
        mutation.mutate({ ...input, id: editing && editing !== 'new' ? editing.id : undefined });
    },
  };
}
