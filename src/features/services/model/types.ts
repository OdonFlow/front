export const serviceCategories = [
  'Clínica Geral',
  'Ortodontia',
  'Estética',
  'Cirurgia',
  'Implantodontia',
] as const;
export type ServiceCategory = (typeof serviceCategories)[number];
export interface ClinicalService {
  id: string;
  name: string;
  category: ServiceCategory;
  priceCents: number;
  durationMinutes: number;
  commissionRate: number;
  active: boolean;
}
export type ServiceInput = Omit<ClinicalService, 'id'>;
