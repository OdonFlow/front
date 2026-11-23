import { queryOptions } from '@tanstack/react-query';
import { clinicApi } from './clinic.api';

export const usersOptions = queryOptions({
  queryKey: ['users'],
  queryFn: ({ signal }) => clinicApi.users(signal),
});
export const patientsOptions = queryOptions({
  queryKey: ['patients'],
  queryFn: ({ signal }) => clinicApi.patients(signal),
});
export const settingsOptions = queryOptions({
  queryKey: ['settings'],
  queryFn: ({ signal }) => clinicApi.settings(signal),
});
export const appointmentsOptions = (date: string) =>
  queryOptions({
    queryKey: ['appointments', date],
    queryFn: ({ signal }) => clinicApi.appointments(date, signal),
  });
export const recordOptions = (patientId: string) =>
  queryOptions({
    queryKey: ['records', patientId],
    queryFn: ({ signal }) => clinicApi.record(patientId, signal),
    enabled: Boolean(patientId),
  });
