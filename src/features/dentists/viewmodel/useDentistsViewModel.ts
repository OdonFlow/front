import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersOptions, patientsOptions } from '../../clinic/model/clinic.queries';
import { clinicApi } from '../../clinic/model/clinic.api';
import { searchText } from '../../clinic/model/validation';
export function useDentistsViewModel() {
  const users = useQuery(usersOptions);
  const patients = useQuery(patientsOptions);
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const mutation = useMutation({
    mutationFn: clinicApi.createDentist,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setSuccess('Profissional cadastrado com sucesso.');
    },
  });
  return {
    search,
    setSearch,
    dentists:
      users.data?.filter(
        (u) =>
          u.role === 'dentist' &&
          searchText(`${u.name} ${u.specialty} ${u.cro}`).includes(searchText(search)),
      ) ?? [],
    patientCount: (id: string) => patients.data?.filter((p) => p.dentistId === id).length ?? 0,
    pending: users.isPending || patients.isPending,
    error: users.error ?? patients.error,
    retry: () => {
      void users.refetch();
      void patients.refetch();
    },
    open,
    openForm: () => {
      mutation.reset();
      setOpen(true);
    },
    close: () => setOpen(false),
    mutation,
    success,
    save: (form: FormData) =>
      mutation.mutate({
        name: String(form.get('name')).trim(),
        email: String(form.get('email')).trim(),
        specialty: String(form.get('specialty')).trim(),
        cro: String(form.get('cro')).trim(),
        role: 'dentist',
      }),
  };
}
