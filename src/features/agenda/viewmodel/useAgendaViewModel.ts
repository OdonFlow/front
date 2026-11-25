import { useEffect, useState } from 'react';
import { useSession } from '../../access/viewmodel/useSessionViewModel';
import { useBranding } from '../../branding/viewmodel/useBranding';
import { fontScales } from '../../branding/model/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agendaRoute } from '../../../app/router/router';
import {
  appointmentsOptions,
  patientsOptions,
  settingsOptions,
  usersOptions,
} from '../../clinic/model/clinic.queries';
import { clinicApi } from '../../clinic/model/clinic.api';
import { localDate } from '../../clinic/model/fixtures';
import { minutes } from '../../clinic/model/validation';
import type { Appointment } from '../../clinic/model/types';
import { servicesOptions } from '../../services/model/services.queries';
import { waitingMinutes, isWaitingOverdue, waitingAlertMinutes } from '../model/waiting.rules';

export function useAgendaViewModel() {
  const session = useSession();
  const branding = useBranding();
  const timeScale =
    (1.2 * (fontScales.find((s) => s.id === branding.config.fontScale)?.size ?? 14)) / 14;
  const search = agendaRoute.useSearch();
  const navigate = agendaRoute.useNavigate();
  const client = useQueryClient();
  const users = useQuery(usersOptions);
  const patients = useQuery(patientsOptions);
  const appointments = useQuery(appointmentsOptions(search.date));
  const settings = useQuery(settingsOptions);
  const services = useQuery(servicesOptions);
  const [form, setForm] = useState<{ dentistId: string; time: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [waitingId, setWaitingId] = useState('');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const create = useMutation({
    mutationFn: clinicApi.createAppointment,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['appointments'] });
      setForm(null);
    },
  });
  const change = useMutation({
    mutationFn: clinicApi.changeStatus,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['appointments'] });
      setDetailId(null);
    },
  });
  const reschedule = useMutation({
    mutationFn: clinicApi.rescheduleAppointment,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['appointments'] });
      setDetailId(null);
    },
  });
  const dentists = (users.data ?? []).filter(
    (u) => u.role === 'dentist' && (session.can('agenda.all') || u.id === session.data?.user.id),
  );
  const selectedDentist =
    dentists.find((d) => d.id === search.dentist)?.id ?? dentists[0]?.id ?? '';
  const visibleDentists =
    search.view === 'individual' ? dentists.filter((d) => d.id === selectedDentist) : dentists;
  const allAppointments = appointments.data ?? [];
  const visibleAppointments = allAppointments.filter((a) =>
    visibleDentists.some((d) => d.id === a.dentistId),
  );
  const waiting = visibleAppointments
    .filter((a) => a.status === 'waiting')
    .sort((a, b) => (a.arrivedAt ?? '').localeCompare(b.arrivedAt ?? ''));
  const selectedWaiting = waiting.find((a) => a.id === waitingId) ?? waiting[0];
  // Preserve visibility of existing consultations when the clinic changes its hours.
  const scheduled = allAppointments.filter((a) => a.status !== 'cancelled');
  const opening = Math.min(
    minutes(settings.data?.openingTime ?? '08:00'),
    ...scheduled.map((a) => minutes(a.time)),
  );
  const closing = Math.max(
    minutes(settings.data?.closingTime ?? '18:00'),
    ...scheduled.map((a) => minutes(a.time) + a.duration),
  );
  const hours = Array.from(
    { length: Math.ceil((closing - opening) / 60) },
    (_, i) => opening + i * 60,
  );
  const timeLabel = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const detail = allAppointments.find((a) => a.id === detailId);
  const patientName = (id: string) => patients.data?.find((p) => p.id === id)?.name ?? 'Paciente';
  const dentistName = (id: string) => dentists.find((d) => d.id === id)?.name ?? 'Dentista';
  const updateSearch = (next: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }) });
  return {
    timeScale,
    canEdit: session.can('agenda.edit'),
    canCancel: session.can('agenda.cancel'),
    rescheduleError: reschedule.error,
    rescheduling: reschedule.isPending,
    reschedule: (form: FormData) => {
      if (detail)
        reschedule.mutate({
          ...detail,
          date: String(form.get('date')),
          time: String(form.get('time')),
          duration: Number(form.get('duration')),
        });
    },
    search,
    updateSearch,
    dentists,
    visibleDentists,
    selectedDentist,
    visibleAppointments,
    patients: patients.data?.filter((p) => p.active) ?? [],
    services: services.data?.filter((s) => s.active) ?? [],
    patientName,
    dentistName,
    pending:
      users.isPending ||
      patients.isPending ||
      appointments.isPending ||
      settings.isPending ||
      services.isPending,
    error: users.error ?? patients.error ?? appointments.error ?? settings.error ?? services.error,
    retry: () => {
      void users.refetch();
      void patients.refetch();
      void appointments.refetch();
      void settings.refetch();
      void services.refetch();
    },
    stats: [
      allAppointments.length,
      allAppointments.filter((a) => a.status === 'waiting').length,
      allAppointments.filter((a) => a.status === 'in-progress').length,
      allAppointments.filter((a) => a.status === 'completed').length,
    ],
    waiting,
    selectedWaiting,
    setWaitingId,
    waited: (appointment: Appointment) => waitingMinutes(appointment, now),
    isOverdue: (appointment: Appointment) => isWaitingOverdue(appointment, now),
    waitingAlertMinutes,
    callPatient: () => {
      if (selectedWaiting && session.can('agenda.edit'))
        change.mutate({ id: selectedWaiting.id, status: 'in-progress' });
    },
    change,
    detail,
    closeDetail: () => setDetailId(null),
    openDetail: (id: string) => {
      change.reset();
      setDetailId(id);
    },
    form,
    openForm: (dentistId = selectedDentist, time = settings.data?.openingTime ?? '08:00') => {
      if (!session.can('agenda.edit')) return;
      create.reset();
      setForm({ dentistId, time });
    },
    closeForm: () => setForm(null),
    create,
    save: (data: FormData) =>
      create.mutate({
        patientId: String(data.get('patientId')),
        dentistId: String(data.get('dentistId')),
        date: String(data.get('date')),
        time: String(data.get('time')),
        duration: Number(data.get('duration')),
        procedure: String(data.get('procedure')).trim(),
        serviceId: String(data.get('serviceId') ?? '') || undefined,
        reason: String(data.get('reason') ?? '').trim(),
        status: 'confirmed',
      }),
    shiftDate: (delta: number) => {
      const date = new Date(`${search.date}T12:00:00`);
      date.setDate(date.getDate() + delta);
      updateSearch({ date: localDate(date) });
    },
    today: () => updateSearch({ date: localDate() }),
    dateLabel: new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${search.date}T12:00:00`)),
    hours,
    timeLabel,
    opening,
    closing,
    gridHeight: (closing - opening) * timeScale,
    nowPosition:
      localDate(now) === search.date &&
      now.getHours() * 60 + now.getMinutes() >= opening &&
      now.getHours() * 60 + now.getMinutes() < closing
        ? (now.getHours() * 60 + now.getMinutes() - opening) * timeScale
        : null,
    step: (settings.data?.slotDuration ?? 30) * 60,
  };
}
