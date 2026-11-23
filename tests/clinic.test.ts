import { test } from 'node:test';
import { loginAs } from './helpers/auth.ts';
import assert from 'node:assert/strict';
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { mockAdapter } from '../src/shared/lib/http/mockAdapter.ts';
import {
  appointmentConflict,
  searchText,
  validatePatient,
} from '../src/features/clinic/model/validation.ts';
import { createDatabase, localDate } from '../src/features/clinic/model/fixtures.ts';
import type {
  Appointment,
  MedicalRecord,
  Patient,
  User,
} from '../src/features/clinic/model/types.ts';

const http = axios.create({ adapter: mockAdapter });
await loginAs(http);

test('conflitos consideram dentista, paciente, data, cancelamentos e intervalos adjacentes', () => {
  const appointment: Appointment = {
    id: 'test',
    patientId: 'p1',
    dentistId: 'd1',
    date: '2026-12-01',
    time: '09:00',
    duration: 60,
    procedure: 'Avaliação',
    status: 'confirmed',
  };
  assert.equal(
    appointmentConflict({ ...appointment, time: '09:30', patientId: 'p2' }, [appointment]),
    true,
  );
  assert.equal(
    appointmentConflict({ ...appointment, time: '09:30', dentistId: 'd2' }, [appointment]),
    true,
  );
  assert.equal(appointmentConflict({ ...appointment, time: '10:00' }, [appointment]), false);
  assert.equal(appointmentConflict({ ...appointment, date: '2026-12-02' }, [appointment]), false);
  assert.equal(
    appointmentConflict({ ...appointment, time: '09:30' }, [
      { ...appointment, status: 'cancelled' },
    ]),
    false,
  );
  assert.equal(appointmentConflict(appointment, [appointment], appointment.id), false);
});

test('validação de paciente rejeita dados incompletos e datas futuras', () => {
  const patient = createDatabase().patients[0];
  assert.equal(validatePatient(patient), undefined);
  assert.match(validatePatient({ ...patient, name: 'A' }) ?? '', /nome/);
  assert.match(validatePatient({ ...patient, birthDate: '2999-01-01' }) ?? '', /nascimento/);
  assert.match(validatePatient({ ...patient, birthDate: '2020-13-01' }) ?? '', /nascimento/);
  assert.match(validatePatient({ ...patient, birthDate: '2020-02-31' }) ?? '', /nascimento/);
  assert.match(validatePatient({ ...patient, phone: '123' }) ?? '', /telefone/);
  assert.equal(searchText('Otávio REIS'), 'otavio reis');
});

test('TanStack Query busca usuários pela API Axios e reutiliza o cache', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 60000, retry: false } },
  });
  let requests = 0;
  const options = {
    queryKey: ['users'],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      requests++;
      return (await http.get<User[]>('/users', { signal })).data;
    },
  };
  const first = await client.fetchQuery(options);
  const second = await client.fetchQuery(options);
  assert.equal(first.filter((u) => u.role === 'dentist').length, 3);
  assert.equal(
    first.some((u) => u.role === 'receptionist'),
    true,
  );
  assert.deepEqual(second, first);
  assert.equal(requests, 1);
  client.clear();
});

test('API cria e edita paciente, inicia prontuário e devolve cópias isoladas', async () => {
  const candidate = { ...createDatabase().patients[0], name: 'Paciente de Teste' };
  const created = (await http.post<Patient>('/patients', candidate)).data;
  const record = (await http.get<MedicalRecord>(`/records/${created.id}`)).data;
  assert.equal(record.patientId, created.id);
  assert.deepEqual(record.evolutions, []);
  assert.deepEqual(record.teeth, {});
  await http.put(`/patients/${created.id}`, {
    ...created,
    name: 'Paciente Atualizado',
    active: false,
  });
  const patients = (await http.get<Patient[]>('/patients')).data;
  assert.equal(patients.find((p) => p.id === created.id)?.active, false);
  assert.equal(created.name, 'Paciente de Teste');
  await assert.rejects(http.post('/patients', { ...candidate, phone: '' }), /telefone/);
});

test('API valida agendamentos e permite atualizar o fluxo da recepção', async () => {
  const candidate = {
    patientId: 'p1',
    dentistId: 'd1',
    date: '2026-12-25',
    time: '08:00',
    duration: 60,
    procedure: 'Avaliação',
    status: 'confirmed',
  };
  const created = (await http.post<Appointment>('/appointments', candidate)).data;
  await assert.rejects(
    http.post('/appointments', { ...candidate, patientId: 'p2', time: '08:30' }),
    /já tem consulta/,
  );
  await assert.rejects(http.post('/appointments', { ...candidate, time: '07:00' }), /expediente/);
  await http.patch(`/appointments/${created.id}`, { status: 'waiting' });
  const waiting = (
    await http.get<Appointment[]>('/appointments', { params: { date: candidate.date } })
  ).data;
  assert.equal(waiting[0].status, 'waiting');
  assert.ok(waiting[0].arrivedAt);
  await http.patch(`/appointments/${created.id}`, { status: 'in-progress' });
  await http.patch(`/appointments/${created.id}`, { status: 'completed' });
  assert.equal(
    (await http.get<Appointment[]>('/appointments', { params: { date: candidate.date } })).data[0]
      .status,
    'completed',
  );
  assert.equal(
    (await http.get<Appointment[]>('/appointments', { params: { date: '2099-01-01' } })).data
      .length,
    0,
  );
  await assert.rejects(
    http.patch(`/appointments/${created.id}`, { status: 'invalid' }),
    /Status inválido/,
  );
});

test('API salva odontograma e evolução no prontuário do paciente certo', async () => {
  const original = (await http.get<MedicalRecord>('/records/p12')).data;
  const next: MedicalRecord = {
    ...original,
    teeth: { ...original.teeth, '11': 'implant' },
    evolutions: [
      {
        id: 'test-evolution',
        patientId: 'p12',
        dentistId: 'd1',
        date: localDate(),
        description: 'Registro de teste.',
      },
      ...original.evolutions,
    ],
  };
  await http.put('/records/p12', next);
  const saved = (await http.get<MedicalRecord>('/records/p12')).data;
  const other = (await http.get<MedicalRecord>('/records/p1')).data;
  assert.equal(saved.teeth['11'], 'implant');
  assert.equal(saved.evolutions[0].description, 'Registro de teste.');
  assert.equal(other.teeth['11'], undefined);
  assert.equal(original.teeth['11'], undefined);
});

test('API retorna erro para recursos ausentes e respeita cancelamento do Axios', async () => {
  await assert.rejects(http.get('/records/absent'), /não encontrado/);
  const controller = new AbortController();
  const request = http.get('/users', { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, (error) => axios.isCancel(error));
});
