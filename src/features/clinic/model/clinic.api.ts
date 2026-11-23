import { http } from '../../../shared/lib/http/client';
import type {
  Appointment,
  AppointmentStatus,
  ClinicSettings,
  MedicalRecord,
  Patient,
  User,
} from './types';

export const clinicApi = {
  users: async (signal?: AbortSignal) => (await http.get<User[]>('/users', { signal })).data,
  patients: async (signal?: AbortSignal) =>
    (await http.get<Patient[]>('/patients', { signal })).data,
  deletePatient: async (id: string) => {
    await http.delete(`/patients/${id}`);
  },
  appointments: async (date: string, signal?: AbortSignal) =>
    (await http.get<Appointment[]>('/appointments', { params: { date }, signal })).data,
  record: async (patientId: string, signal?: AbortSignal) =>
    (await http.get<MedicalRecord>(`/records/${patientId}`, { signal })).data,
  settings: async (signal?: AbortSignal) =>
    (await http.get<ClinicSettings>('/settings', { signal })).data,
  savePatient: async (patient: Omit<Patient, 'id'> & { id?: string }) =>
    (patient.id
      ? await http.put<Patient>(`/patients/${patient.id}`, patient)
      : await http.post<Patient>('/patients', patient)
    ).data,
  createAppointment: async (appointment: Omit<Appointment, 'id'>) =>
    (await http.post<Appointment>('/appointments', appointment)).data,
  rescheduleAppointment: async (appointment: Appointment) =>
    (await http.put<Appointment>(`/appointments/${appointment.id}`, appointment)).data,
  changeStatus: async ({ id, status }: { id: string; status: AppointmentStatus }) =>
    (await http.patch<Appointment>(`/appointments/${id}`, { status })).data,
  saveRecord: async (record: MedicalRecord) =>
    (await http.put<MedicalRecord>(`/records/${record.patientId}`, record)).data,
  createDentist: async (user: Omit<User, 'id'>) => (await http.post<User>('/users', user)).data,
  saveSettings: async (settings: ClinicSettings) =>
    (await http.put<ClinicSettings>('/settings', settings)).data,
};
