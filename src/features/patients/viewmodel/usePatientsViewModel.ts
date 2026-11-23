import { useState } from 'react';
import { useSession } from '../../access/viewmodel/useSessionViewModel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patientsRoute } from '../../../app/router/router';
import { patientsOptions, usersOptions } from '../../clinic/model/clinic.queries';
import { clinicApi } from '../../clinic/model/clinic.api';
import { searchText, validatePatient } from '../../clinic/model/validation';
import type { Patient } from '../../clinic/model/types';

export function usePatientsViewModel() {
  const session = useSession();
  const search = patientsRoute.useSearch();
  const navigate = patientsRoute.useNavigate();
  const client = useQueryClient();
  const patients = useQuery(patientsOptions);
  const users = useQuery(usersOptions);
  const [editing, setEditing] = useState<Patient | 'new' | null>(null);
  const [validationError, setValidationError] = useState<Error | null>(null);
  const [success, setSuccess] = useState('');
  const deletion = useMutation({
    mutationFn: clinicApi.deletePatient,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['patients'] });
      setEditing(null);
      setSuccess('Ficha excluída da listagem. Histórico preservado.');
    },
  });
  const mutation = useMutation({
    mutationFn: clinicApi.savePatient,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['patients'] });
      setEditing(null);
      setSuccess('Paciente salvo com sucesso.');
    },
  });
  const dentists = (users.data ?? []).filter((u) => u.role === 'dentist');
  const filtered = (patients.data ?? []).filter(
    (p) =>
      searchText(`${p.name} ${p.phone} ${p.email}`).includes(searchText(search.q)) &&
      (!search.dentist || p.dentistId === search.dentist) &&
      (search.status === 'all' || p.active === (search.status === 'active')),
  );
  return {
    canEdit: session.can('patients.edit'),
    canDelete: session.can('patients.delete'),
    canEditClinical: session.can('records.edit'),
    deleting: deletion.isPending,
    remove: () => {
      if (
        editing &&
        editing !== 'new' &&
        session.can('patients.delete') &&
        window.confirm(
          `Excluir a ficha de ${editing.name} da listagem? O histórico será preservado.`,
        )
      )
        deletion.mutate(editing.id);
    },
    search,
    updateSearch: (next: Partial<typeof search>) =>
      void navigate({ search: (previous) => ({ ...previous, ...next }), replace: true }),
    patients: filtered,
    total: patients.data?.length ?? 0,
    dentists,
    dentistName: (id: string) => dentists.find((d) => d.id === id)?.name ?? 'Sem responsável',
    pending: patients.isPending || users.isPending,
    error: patients.error ?? users.error,
    retry: () => {
      void patients.refetch();
      void users.refetch();
    },
    editing,
    open: (patient: Patient | 'new') => {
      if (!session.can('patients.edit')) return;
      mutation.reset();
      setValidationError(null);
      setSuccess('');
      setEditing(patient);
    },
    close: () => setEditing(null),
    mutation,
    formError: validationError ?? mutation.error ?? deletion.error,
    success,
    save: (form: FormData) => {
      const patient = {
        name: String(form.get('name')).trim(),
        birthDate: String(form.get('birthDate')),
        email: String(form.get('email')).trim(),
        phone: String(form.get('phone')),
        responsible: String(form.get('responsible')).trim(),
        insurance: String(form.get('insurance')).trim(),
        dentistId: String(form.get('dentistId')),
        lastVisit: editing && editing !== 'new' ? editing.lastVisit : '',
        active: form.get('active') === 'on',
        allergies: String(form.get('allergies')).trim(),
        conditions: String(form.get('conditions')).trim(),
      };
      const error = validatePatient(patient);
      setValidationError(error ? new Error(error) : null);
      if (!error)
        mutation.mutate({
          ...patient,
          ...(editing && editing !== 'new' ? { id: editing.id } : {}),
        });
    },
  };
}
