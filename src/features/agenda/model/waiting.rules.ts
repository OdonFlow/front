import type { Appointment } from '../../clinic/model/types.ts';
export const waitingAlertMinutes = 15;
export function waitingMinutes(appointment: Appointment, now: Date): number {
  if (!appointment.arrivedAt) return 0;
  const elapsed = now.getTime() - new Date(appointment.arrivedAt).getTime();
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / 60000)) : 0;
}
export function isWaitingOverdue(appointment: Appointment, now: Date) {
  return (
    appointment.status === 'waiting' && waitingMinutes(appointment, now) >= waitingAlertMinutes
  );
}
