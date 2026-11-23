import type { Database, MedicalRecord, Treatment } from '../../clinic/model/types.ts';
import { validateService } from './services.rules.ts';
import { searchText } from '../../clinic/model/validation.ts';
import type { ClinicalService, ServiceInput } from './types.ts';

export function createServices(): ClinicalService[] {
  return [
    {
      id: 'service-cleaning',
      name: 'Profilaxia e Limpeza',
      category: 'Clínica Geral',
      priceCents: 18000,
      durationMinutes: 30,
      commissionRate: 40,
      active: true,
    },
    {
      id: 'service-restoration',
      name: 'Restauração Resina (1 Face)',
      category: 'Clínica Geral',
      priceCents: 22000,
      durationMinutes: 45,
      commissionRate: 40,
      active: true,
    },
    {
      id: 'service-whitening',
      name: 'Clareamento Dental a Laser',
      category: 'Estética',
      priceCents: 85000,
      durationMinutes: 75,
      commissionRate: 45,
      active: true,
    },
    {
      id: 'service-extraction',
      name: 'Exodontia Simples',
      category: 'Cirurgia',
      priceCents: 35000,
      durationMinutes: 45,
      commissionRate: 50,
      active: true,
    },
    {
      id: 'service-orthodontics',
      name: 'Manutenção Ortodôntica',
      category: 'Ortodontia',
      priceCents: 16000,
      durationMinutes: 30,
      commissionRate: 35,
      active: true,
    },
    {
      id: 'service-evaluation',
      name: 'Consulta / Avaliação Clínica',
      category: 'Clínica Geral',
      priceCents: 15000,
      durationMinutes: 30,
      commissionRate: 40,
      active: true,
    },
    {
      id: 'service-endo',
      name: 'Tratamento de Canal',
      category: 'Clínica Geral',
      priceCents: 85000,
      durationMinutes: 90,
      commissionRate: 40,
      active: true,
    },
    {
      id: 'service-implant',
      name: 'Implante Unitário',
      category: 'Implantodontia',
      priceCents: 180000,
      durationMinutes: 120,
      commissionRate: 45,
      active: true,
    },
  ];
}
export function saveService(db: Database, input: ServiceInput, id?: string): ClinicalService {
  const error = validateService(input);
  if (error) throw new Error(error);
  db.services ??= createServices();
  if (
    db.services.some(
      (s) => s.id !== id && searchText(s.name.trim()) === searchText(input.name.trim()),
    )
  )
    throw new Error('Já existe um serviço com este nome.');
  const saved: ClinicalService = {
    ...input,
    name: input.name.trim(),
    id: id ?? crypto.randomUUID(),
  };
  if (id) {
    const index = db.services.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Serviço não encontrado.');
    db.services[index] = saved;
  } else db.services.push(saved);
  return saved;
}
export function snapshotCatalogTreatments(
  db: Database,
  next: MedicalRecord,
  previous: MedicalRecord,
): Treatment[] {
  const patient = db.patients.find((p) => p.id === next.patientId);
  return next.treatments.map((t) => {
    const normalized = { ...t, dentistId: t.dentistId ?? patient?.dentistId };
    if (
      !t.serviceId ||
      previous.treatments.some((old) => old.id === t.id && old.serviceId === t.serviceId)
    )
      return normalized;
    const service = db.services?.find((s) => s.id === t.serviceId && s.active);
    if (!service) throw new Error('Selecione um serviço ativo do catálogo.');
    return {
      ...normalized,
      procedure: service.name,
      price: (service.priceCents * (t.quantity ?? 1)) / 100,
      unitPriceCents: service.priceCents,
      commissionRate: service.commissionRate,
      quantity: t.quantity ?? 1,
    };
  });
}
