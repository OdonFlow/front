import type { FinanceData } from '../../finance/model/types.ts';
import type { ClinicalService } from '../../services/model/types.ts';
import type { ManagementData } from '../../management/model/types.ts';
import type { AccessData } from '../../access/model/types.ts';
import type { BrandingRecord } from '../../branding/model/types.ts';
import type { UserAppearance } from '../../appearance/model/appearance.ts';

export interface User {
  clinicId?: string;
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'dentist' | 'receptionist';
  phone?: string;
  active?: boolean;
  invited?: boolean;
  specialty: string;
  cro: string;
}
export interface Patient {
  deletedAt?: string;
  id: string;
  name: string;
  birthDate: string;
  email: string;
  phone: string;
  responsible: string;
  insurance: string;
  dentistId: string;
  lastVisit: string;
  active: boolean;
  allergies: string;
  conditions: string;
}
export type AppointmentStatus =
  'confirmed' | 'waiting' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
export interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  date: string;
  time: string;
  duration: number;
  procedure: string;
  status: AppointmentStatus;
  arrivedAt?: string;
  serviceId?: string;
  reason?: string;
}
export type ToothStatus = 'healthy' | 'restoration' | 'endo' | 'extraction' | 'crown' | 'implant';
export interface Evolution {
  signature?: { name: string; cro: string; at: string; userId: string };
  id: string;
  patientId: string;
  dentistId: string;
  date: string;
  description: string;
}
export interface Treatment {
  id: string;
  patientId: string;
  tooth: number;
  procedure: string;
  price: number;
  completed: boolean;
  dentistId?: string;
  completedAt?: string;
  paymentStatus?: 'pending' | 'paid';
  receiptId?: string;
  serviceId?: string;
  quantity?: number;
  unitPriceCents?: number;
  commissionRate?: number;
  appointmentId?: string;
}
export interface Prescription {
  id: string;
  patientId: string;
  date: string;
  medication: string;
  instructions: string;
  dentistId: string;
}
export interface Anamnesis {
  patientId: string;
  complaint: string;
  medications: string;
  previousSurgery: string;
  notes: string;
}
export interface ClinicSettings {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  openingTime: string;
  closingTime: string;
  slotDuration: number;
}
export interface MedicalRecord {
  patientId: string;
  teeth: Record<string, ToothStatus>;
  anamnesis: Anamnesis;
  evolutions: Evolution[];
  treatments: Treatment[];
  prescriptions: Prescription[];
}
export interface Database {
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  records: MedicalRecord[];
  settings: ClinicSettings;
  finance?: FinanceData;
  services?: ClinicalService[];
  management?: ManagementData;
  access?: AccessData;
  branding?: Record<string, BrandingRecord>;
  appearance?: Record<string, UserAppearance>;
}
