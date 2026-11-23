import { useState } from 'react';
import { useSession } from '../../access/viewmodel/useSessionViewModel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recordsRoute } from '../../../app/router/router';
import { patientsOptions, recordOptions, usersOptions } from '../../clinic/model/clinic.queries';
import { clinicApi } from '../../clinic/model/clinic.api';
import { localDate } from '../../clinic/model/fixtures';
import type { MedicalRecord, ToothStatus } from '../../clinic/model/types';
import { servicesOptions } from '../../services/model/services.queries';

export function useRecordsViewModel() {
  const session = useSession();
  const canEdit = session.can('records.edit');
  const search = recordsRoute.useSearch();
  const navigate = recordsRoute.useNavigate();
  const client = useQueryClient();
  const patients = useQuery(patientsOptions);
  const users = useQuery(usersOptions);
  const services = useQuery(servicesOptions);
  const [treatmentServiceId, setTreatmentServiceId] = useState('');
  const patientId =
    search.patient ||
    patients.data?.find((p) => p.id === 'p12')?.id ||
    patients.data?.[0]?.id ||
    '';
  const patient = patients.data?.find((p) => p.id === patientId);
  const record = useQuery(recordOptions(patientId));
  const [modal, setModal] = useState<'evolution' | 'treatment' | 'prescriptions' | null>(null);
  const [tooth, setTooth] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState<Error | null>(null);
  const mutation = useMutation({
    mutationFn: clinicApi.saveRecord,
    onSuccess: async (saved) => {
      client.setQueryData(recordOptions(saved.patientId).queryKey, saved);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['records', saved.patientId] }),
        client.invalidateQueries({ queryKey: ['finance'] }),
      ]);
      setModal(null);
      setTooth(null);
      setSuccess('Prontuário atualizado com sucesso.');
    },
  });
  const save = (next: MedicalRecord) => {
    if (!canEdit) return;
    setSuccess('');
    setFormError(null);
    mutation.mutate(next);
  };
  const dentists = users.data?.filter((u) => u.role === 'dentist') ?? [];
  const updateSearch = (next: Partial<typeof search>) => {
    setSuccess('');
    mutation.reset();
    void navigate({ search: (prev) => ({ ...prev, ...next }) });
  };
  const submit = (form: FormData) => {
    if (!record.data) return;
    const current = record.data;
    const dentistId =
      session.data?.user.role === 'dentist'
        ? session.data.user.id
        : String(form.get('dentistId') ?? patient?.dentistId ?? '');
    const date = localDate();
    const id = crypto.randomUUID();
    if (modal === 'evolution') {
      const description = String(form.get('description')).trim();
      if (!description) {
        setFormError(new Error('Descreva a evolução clínica.'));
        return;
      }
      save({
        ...current,
        evolutions: [{ id, patientId, dentistId, date, description }, ...current.evolutions],
      });
    } else if (modal === 'treatment') {
      const procedure = String(form.get('procedure')).trim();
      const price = Number(form.get('price'));
      if (!procedure || !Number.isFinite(price) || price < 0) {
        setFormError(new Error('Informe o procedimento e um valor válido.'));
        return;
      }
      save({
        ...current,
        treatments: [
          ...current.treatments,
          {
            id,
            patientId,
            dentistId,
            tooth: Number(form.get('tooth')),
            procedure,
            price,
            completed: false,
            serviceId: treatmentServiceId || undefined,
          },
        ],
      });
    } else if (modal === 'prescriptions') {
      const medication = String(form.get('medication')).trim();
      const instructions = String(form.get('instructions')).trim();
      if (!medication || !instructions) {
        setFormError(new Error('Preencha o medicamento e as orientações.'));
        return;
      }
      save({
        ...current,
        prescriptions: [
          { id, patientId, dentistId, date, medication, instructions },
          ...current.prescriptions,
        ],
      });
    }
  };
  return {
    canEdit,
    search,
    updateSearch,
    patients: patients.data ?? [],
    patient,
    record: record.data,
    dentists: dentists.filter(
      (d) =>
        d.active !== false &&
        (session.data?.user.role !== 'dentist' || d.id === session.data.user.id),
    ),
    services: services.data?.filter((s) => s.active) ?? [],
    serviceError: services.error,
    serviceLoading: services.isPending,
    retryServices: () => void services.refetch(),
    treatmentServiceId,
    setTreatmentServiceId,
    treatmentService: services.data?.find((s) => s.id === treatmentServiceId),
    pending: patients.isPending || users.isPending || (Boolean(patientId) && record.isPending),
    error: patients.error ?? users.error ?? record.error,
    retry: () => {
      void patients.refetch();
      void users.refetch();
      void record.refetch();
    },
    dentist: (id: string) => dentists.find((d) => d.id === id),
    mutation,
    formError: formError ?? mutation.error,
    success,
    modal,
    openModal: (next: NonNullable<typeof modal>) => {
      if (!canEdit) return;
      setTreatmentServiceId('');
      setFormError(null);
      mutation.reset();
      setModal(next);
    },
    closeModal: () => setModal(null),
    submit,
    tooth,
    openTooth: (number: number) => {
      if (!canEdit) return;
      mutation.reset();
      setTooth(number);
    },
    closeTooth: () => setTooth(null),
    saveTooth: (status: ToothStatus) => {
      if (record.data && tooth)
        save({ ...record.data, teeth: { ...record.data.teeth, [tooth]: status } });
    },
    saveAnamnesis: (form: FormData) => {
      if (record.data)
        save({
          ...record.data,
          anamnesis: {
            patientId,
            complaint: String(form.get('complaint')).trim(),
            medications: String(form.get('medications')).trim(),
            previousSurgery: String(form.get('previousSurgery')).trim(),
            notes: String(form.get('notes')).trim(),
          },
        });
    },
    toggleTreatment: (id: string) => {
      if (record.data)
        save({
          ...record.data,
          treatments: record.data.treatments.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: !t.completed,
                  dentistId: t.dentistId ?? patient?.dentistId,
                  completedAt: t.completed ? undefined : new Date().toISOString(),
                }
              : t,
          ),
        });
    },
    total: record.data?.treatments.reduce((sum, t) => sum + t.price, 0) ?? 0,
    pendingTotal:
      record.data?.treatments.filter((t) => !t.completed).reduce((sum, t) => sum + t.price, 0) ?? 0,
    print: () => window.print(),
    upperTeeth: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    lowerTeeth: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  };
}
