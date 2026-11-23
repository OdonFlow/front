import type { Database, MedicalRecord } from './types.ts';

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createRecord(patientId: string): MedicalRecord {
  return {
    patientId,
    teeth: {},
    anamnesis: { patientId, complaint: '', medications: '', previousSurgery: '', notes: '' },
    evolutions: [],
    treatments: [],
    prescriptions: [],
  };
}

export function createDatabase(): Database {
  const today = localDate();
  const names = [
    'Marina Alves',
    'Renata Lopes',
    'Pedro Nogueira',
    'Helena Prado',
    'Clara Menezes',
    'André Silveira',
    'Otávio Reis',
    'Igor Tavares',
    'Beatriz Ramos',
    'Sílvia Cardoso',
    'Larissa Fontes',
    'Lucas Ferreira',
  ];
  const patients = names.map((name, index) => ({
    id: `p${index + 1}`,
    name,
    birthDate: `${1988 + index}-0${(index % 9) + 1}-15`,
    email: `${name
      .split(' ')[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')}@exemplo.com`,
    phone: `(85) 9${String(87654321 + index * 1000100).slice(0, 4)}-${String(87654321 + index * 1000100).slice(4, 8)}`,
    responsible: '',
    insurance: index % 3 === 0 ? 'OdontoPrev' : 'Particular',
    dentistId: `d${(index % 3) + 1}`,
    lastVisit: `2026-11-${String(5 + index).padStart(2, '0')}`,
    active: index !== 8,
    allergies: index === 11 ? 'Penicilina' : '',
    conditions: index === 11 ? 'Hipertensão' : '',
  }));
  const records = patients.map((patient) => ({
    ...createRecord(patient.id),
    teeth: {
      '16': 'endo' as const,
      '14': 'restoration' as const,
      '24': 'restoration' as const,
      '26': 'crown' as const,
      '46': 'restoration' as const,
      '36': 'endo' as const,
    },
    anamnesis: {
      patientId: patient.id,
      complaint: 'Avaliação de rotina e sensibilidade no lado direito.',
      medications: patient.conditions ? 'Losartana 50 mg, 1 vez ao dia.' : 'Não faz uso contínuo.',
      previousSurgery: 'Sem cirurgias anteriores relatadas.',
      notes: 'Paciente orientado sobre higiene bucal e uso diário de fio dental.',
    },
    evolutions: [
      {
        id: `e-${patient.id}-1`,
        patientId: patient.id,
        dentistId: 'd1',
        date: '2026-11-12',
        description:
          'Avaliação clínica e profilaxia realizadas. Boa cicatrização e ausência de dor. Orientações de higiene reforçadas.',
      },
      {
        id: `e-${patient.id}-2`,
        patientId: patient.id,
        dentistId: 'd2',
        date: '2026-10-20',
        description:
          'Tratamento endodôntico do elemento 16. Procedimento realizado sem intercorrências. Retorno para avaliação.',
      },
      {
        id: `e-${patient.id}-3`,
        patientId: patient.id,
        dentistId: 'd1',
        date: '2026-09-15',
        description: 'Primeira consulta. Anamnese, exame clínico e planejamento do tratamento.',
      },
    ],
    treatments: [
      {
        id: `t-${patient.id}-1`,
        patientId: patient.id,
        tooth: 16,
        procedure: 'Tratamento de canal',
        price: 850,
        completed: true,
      },
      {
        id: `t-${patient.id}-2`,
        patientId: patient.id,
        tooth: 14,
        procedure: 'Restauração em resina',
        price: 250,
        completed: false,
      },
      {
        id: `t-${patient.id}-3`,
        patientId: patient.id,
        tooth: 26,
        procedure: 'Coroa em porcelana',
        price: 1200,
        completed: false,
      },
    ],
    prescriptions: [
      {
        id: `rx-${patient.id}`,
        patientId: patient.id,
        dentistId: 'd1',
        date: '2026-11-12',
        medication: 'Enxaguante bucal sem álcool',
        instructions:
          'Bochechar 15 ml por 30 segundos, após a higiene bucal, conforme orientação do profissional.',
      },
    ],
  }));
  return {
    users: [
      {
        id: 'd1',
        name: 'Dra. Camila Oliveira',
        email: 'camila@odontoflow.com',
        role: 'dentist',
        specialty: 'Ortodontia',
        cro: 'CRO-CE 84213',
      },
      {
        id: 'd2',
        name: 'Dr. Lucas Martins',
        email: 'lucas@odontoflow.com',
        role: 'dentist',
        specialty: 'Endodontia',
        cro: 'CRO-CE 61907',
      },
      {
        id: 'd3',
        name: 'Dr. Roberto Lima',
        email: 'roberto@odontoflow.com',
        role: 'dentist',
        specialty: 'Implantodontia',
        cro: 'CRO-CE 72654',
      },
      {
        id: 'u1',
        name: 'Juliana Santos',
        email: 'juliana@odontoflow.com',
        role: 'receptionist',
        specialty: 'Recepção',
        cro: '',
      },
    ],
    patients,
    records,
    appointments: [
      {
        id: 'a1',
        patientId: 'p1',
        dentistId: 'd1',
        date: today,
        time: '08:00',
        duration: 60,
        procedure: 'Manutenção de aparelho',
        status: 'completed',
      },
      {
        id: 'a2',
        patientId: 'p2',
        dentistId: 'd2',
        date: today,
        time: '09:00',
        duration: 90,
        procedure: 'Tratamento de canal',
        status: 'completed',
      },
      {
        id: 'a3',
        patientId: 'p3',
        dentistId: 'd1',
        date: today,
        time: '10:00',
        duration: 60,
        procedure: 'Instalação de bráquetes',
        status: 'in-progress',
      },
      {
        id: 'a4',
        patientId: 'p4',
        dentistId: 'd3',
        date: today,
        time: '10:00',
        duration: 120,
        procedure: 'Implante unitário',
        status: 'in-progress',
      },
      {
        id: 'a5',
        patientId: 'p5',
        dentistId: 'd1',
        date: today,
        time: '11:00',
        duration: 60,
        procedure: 'Avaliação ortodôntica',
        status: 'waiting',
        arrivedAt: new Date(Date.now() - 18 * 60000).toISOString(),
      },
      {
        id: 'a6',
        patientId: 'p6',
        dentistId: 'd2',
        date: today,
        time: '10:30',
        duration: 90,
        procedure: 'Retratamento endodôntico',
        status: 'in-progress',
      },
      {
        id: 'a7',
        patientId: 'p7',
        dentistId: 'd3',
        date: today,
        time: '13:00',
        duration: 60,
        procedure: 'Moldagem protética',
        status: 'waiting',
        arrivedAt: new Date(Date.now() - 9 * 60000).toISOString(),
      },
      {
        id: 'a8',
        patientId: 'p8',
        dentistId: 'd1',
        date: today,
        time: '14:00',
        duration: 60,
        procedure: 'Alinhadores',
        status: 'confirmed',
      },
      {
        id: 'a9',
        patientId: 'p9',
        dentistId: 'd2',
        date: today,
        time: '15:00',
        duration: 60,
        procedure: 'Pulpotomia',
        status: 'confirmed',
      },
      {
        id: 'a10',
        patientId: 'p10',
        dentistId: 'd3',
        date: today,
        time: '16:00',
        duration: 90,
        procedure: 'Enxerto ósseo',
        status: 'confirmed',
      },
      {
        id: 'a11',
        patientId: 'p11',
        dentistId: 'd2',
        date: today,
        time: '12:00',
        duration: 60,
        procedure: 'Avaliação clínica',
        status: 'waiting',
        arrivedAt: new Date(Date.now() - 4 * 60000).toISOString(),
      },
    ],
    settings: {
      name: 'OdontoFlow',
      phone: '(85) 3333-2020',
      email: 'contato@odontoflow.com',
      address: 'Av. Santos Dumont, 1500 — Fortaleza, CE',
      openingTime: '08:00',
      closingTime: '18:00',
      slotDuration: 30,
    },
  };
}
