import type { Appointment, Patient } from './types.ts';

export const statusLabels = {
  confirmed: 'Confirmado',
  waiting: 'Aguardando',
  'in-progress': 'Em cadeira',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  'no-show': 'Faltou',
};
export const toothLabels = {
  healthy: 'Hígido',
  restoration: 'Restauração',
  endo: 'Canal',
  extraction: 'Extração indicada',
  crown: 'Prótese / Coroa',
  implant: 'Implante',
};
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
  );
}
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function minutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}
export function appointmentConflict(
  candidate: Omit<Appointment, 'id'>,
  appointments: Appointment[],
  excludeId?: string,
): boolean {
  return (
    candidate.status !== 'cancelled' &&
    appointments.some(
      (item) =>
        item.id !== excludeId &&
        item.status !== 'cancelled' &&
        item.status !== 'no-show' &&
        item.date === candidate.date &&
        (item.dentistId === candidate.dentistId || item.patientId === candidate.patientId) &&
        minutes(candidate.time) < minutes(item.time) + item.duration &&
        minutes(item.time) < minutes(candidate.time) + candidate.duration,
    )
  );
}
export function validatePatient(patient: Omit<Patient, 'id'>): string | undefined {
  if (patient.name.trim().length < 3) return 'Informe o nome completo do paciente.';
  if (!isValidDate(patient.birthDate) || new Date(`${patient.birthDate}T00:00:00`) > new Date())
    return 'Informe uma data de nascimento válida.';
  if (patient.phone.replace(/\D/g, '').length < 10) return 'Informe um telefone com DDD.';
  if (patient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email))
    return 'Informe um e-mail válido.';
  if (!patient.dentistId) return 'Selecione o dentista responsável.';
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`));
}
export function initials(name: string): string {
  return name
    .replace(/^(Dra?\.\s*)/, '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .filter((_, index, all) => index === 0 || index === all.length - 1)
    .join('');
}
export function age(birthDate: string): number {
  const today = new Date();
  const birth = new Date(`${birthDate}T12:00:00`);
  return (
    today.getFullYear() -
    birth.getFullYear() -
    (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
      ? 1
      : 0)
  );
}
export function searchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}
