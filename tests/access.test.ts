import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createDatabase, localDate } from '../src/features/clinic/model/fixtures.ts';
import {
  initializeAccess,
  login,
  authenticate,
  resetPassword,
  requestReset,
  saveTeamUser,
  savePolicy,
  AccessError,
} from '../src/features/access/model/access.mock.ts';
import {
  maximumPermissions,
  effectivePermissions,
  homePath,
  validateTeam,
} from '../src/features/access/model/access.rules.ts';
import { mockAdapter } from '../src/shared/lib/http/mockAdapter.ts';
import { loginAs } from './helpers/auth.ts';
import type { TeamInput } from '../src/features/access/model/types.ts';
import type { User, MedicalRecord, Appointment } from '../src/features/clinic/model/types.ts';
import type { ClinicalService } from '../src/features/services/model/types.ts';
const credentials = { email: 'admin@odontoflow.com', password: 'Odonto123!', remember: false };
async function setup() {
  const db = createDatabase();
  await initializeAccess(db);
  const admin = db.users.find((u) => u.role === 'admin');
  assert.ok(admin);
  return { db, admin };
}
test('prontuário preserva percentuais históricos e lançamentos registram o ator autenticado', async () => {
  const admin = axios.create({ adapter: mockAdapter });
  await loginAs(admin);
  const dentist = axios.create({ adapter: mockAdapter });
  await loginAs(dentist, 'camila@odontoflow.com');
  const services = (await admin.get<ClinicalService[]>('/services')).data;
  const cleaning = services.find((s) => s.id === 'service-cleaning');
  assert.ok(cleaning);
  await admin.put(`/services/${cleaning.id}`, { ...cleaning, commissionRate: 37 });
  const record = (await admin.get<MedicalRecord>('/records/p12')).data;
  record.treatments.push({
    id: 'preserve-rate',
    patientId: 'p12',
    dentistId: 'd1',
    serviceId: cleaning.id,
    tooth: 0,
    procedure: cleaning.name,
    price: 180,
    completed: false,
  });
  await admin.put('/records/p12', record);
  const clinical = (await dentist.get<MedicalRecord>('/records/p12')).data;
  const treatment = clinical.treatments.find((t) => t.id === 'preserve-rate');
  assert.ok(treatment);
  assert.equal(treatment.commissionRate, undefined);
  treatment.commissionRate = 0;
  clinical.anamnesis.complaint = 'Atualização clínica preservando o rateio';
  const response = (await dentist.put<MedicalRecord>('/records/p12', clinical)).data;
  assert.equal(
    response.treatments.find((t) => t.id === 'preserve-rate')?.commissionRate,
    undefined,
  );
  const saved = (await admin.get<MedicalRecord>('/records/p12')).data;
  assert.equal(saved.treatments.find((t) => t.id === 'preserve-rate')?.commissionRate, 37);
  const expense = (
    await admin.post('/management/expenses', {
      description: 'Despesa com autoria autenticada',
      category: 'supplies',
      date: localDate(),
      amountCents: 123,
      dentistId: '',
      serviceId: '',
      reference: '',
    })
  ).data;
  assert.equal(expense.operatorName, 'Administrador OdontoFlow');
});
test('perfis preservam limites clínicos e financeiros, com destino inicial próprio', () => {
  for (const role of ['admin', 'dentist', 'receptionist'] as const) {
    const maximum = maximumPermissions(role);
    const forged = effectivePermissions(role, maximumPermissions('admin'));
    assert.deepEqual(maximum, forged);
  }
  assert.equal(maximumPermissions('receptionist')['records.edit'], false);
  assert.equal(maximumPermissions('dentist')['management.view'], false);
  assert.equal(
    homePath({ user: { role: 'admin', id: 'a' }, permissions: maximumPermissions('admin') }),
    '/gestao-financeira',
  );
  assert.match(
    homePath({ user: { role: 'dentist', id: 'd1' }, permissions: maximumPermissions('dentist') }),
    /individual.*d1/,
  );
});
test('senhas são derivadas com salt, sessões expiram e lembrar sessão dura 30 dias', async () => {
  const { db } = await setup();
  const now = Date.now();
  const result = await login(db, { ...credentials, remember: true }, 'Teste', now);
  assert.equal(result.session.expiresAt, now + 30 * 86400000);
  assert.equal(result.session.idleMinutes, 60);
  assert.ok(!JSON.stringify(db).includes('Odonto123!'));
  assert.notEqual(db.access?.credentials[0].salt, db.access?.credentials[1].salt);
  assert.equal((await authenticate(db, result.demoSessionId, now + 59 * 60000)).user.role, 'admin');
  await assert.rejects(authenticate(db, result.demoSessionId, now + 60 * 60000), /sessão expirou/);
  assert.equal(db.access?.logs[0].ip, '127.0.0.1 (simulado)');
  assert.equal(db.access?.logs[0].device, 'Teste');
});
test('cinco falhas consecutivas bloqueiam por quinze minutos e sucesso zera o contador', async () => {
  const { db } = await setup();
  const now = Date.now();
  for (let i = 0; i < 4; i++)
    await assert.rejects(
      login(db, { ...credentials, password: 'errada' }, 'Teste', now),
      /inválidos/,
    );
  await assert.rejects(
    login(db, { ...credentials, password: 'errada' }, 'Teste', now),
    (e: unknown) => e instanceof AccessError && e.status === 429,
  );
  await assert.rejects(login(db, credentials, 'Teste', now + 14 * 60000), /bloqueado/);
  await login(db, credentials, 'Teste', now + 15 * 60000 + 1);
  const credential = db.access?.credentials.find((c) => c.userId === 'admin-demo');
  assert.equal(credential?.failures, 0);
  assert.equal(credential?.lockedUntil, 0);
});
test('recuperação não enumera contas, link é de uso único e revoga sessões antigas', async () => {
  const { db } = await setup();
  const session = await login(db, credentials, 'Teste');
  const known = requestReset(db, credentials.email);
  const unknown = requestReset(db, 'inexistente@odontoflow.com');
  assert.equal(known.message, unknown.message);
  assert.equal(db.access?.mails.length, 1);
  const mail = db.access?.mails[0];
  assert.ok(mail);
  assert.equal(mail.expiresAt - mail.createdAt, 30 * 60000);
  await assert.rejects(resetPassword(db, mail.token, 'fraca'), /maiúsculas/);
  await resetPassword(db, mail.token, 'NovaSenha123!');
  await assert.rejects(resetPassword(db, mail.token, 'OutraSenha123!'), /inválido/);
  await assert.rejects(authenticate(db, session.demoSessionId), /sessão expirou/);
  await assert.rejects(login(db, credentials, 'Teste'), /inválidos/);
  await login(db, { ...credentials, password: 'NovaSenha123!' }, 'Teste');
  requestReset(db, credentials.email);
  const expired = db.access?.mails[0];
  assert.ok(expired);
  expired.expiresAt = Date.now() - 1;
  await assert.rejects(resetPassword(db, expired.token, 'SenhaValida123!'), /expirou/);
});
test('convite ativa nova senha; equipe valida CRO, duplicidade e impede auto-offboarding', async () => {
  const { db, admin } = await setup();
  const input: TeamInput = {
    name: 'Dentista Convidado',
    email: 'novo@clinica.com',
    phone: '(85) 99999-1234',
    role: 'dentist',
    cro: 'CRO-CE 12345',
    specialty: 'Ortodontia',
    active: true,
  };
  assert.match(validateTeam({ ...input, cro: '' }) ?? '', /CRO/);
  const user = saveTeamUser(db, input, admin);
  assert.equal(user.invited, true);
  assert.equal(db.access?.mails[0].kind, 'invitation');
  assert.ok(db.users.some((u) => u.id === user.id && u.role === 'dentist'));
  assert.throws(() => saveTeamUser(db, input, admin), /Já existe/);
  assert.throws(
    () => saveTeamUser(db, { ...admin, phone: '85999991234', active: false }, admin, admin.id),
    /próprio/,
  );
  const mail = db.access?.mails[0];
  assert.ok(mail);
  await resetPassword(db, mail.token, 'Convite123!');
  assert.equal(user.invited, false);
  assert.equal(
    (await login(db, { email: user.email, password: 'Convite123!', remember: false }, 'Teste'))
      .session.user.id,
    user.id,
  );
  saveTeamUser(db, { ...user, phone: input.phone, active: false }, admin, user.id);
  await assert.rejects(
    login(db, { email: user.email, password: 'Convite123!', remember: false }, 'Teste'),
    /inválidos/,
  );
});
test('política aplica teto estrutural e valida inatividade e teto da recepção', async () => {
  const { db, admin } = await setup();
  savePolicy(
    db,
    'receptionist',
    maximumPermissions('admin'),
    { idleMinutes: 30, receptionExpenseCapCents: 5000 },
    admin,
  );
  assert.equal(db.access?.policy.receptionist['management.view'], false);
  assert.equal(db.access?.settings.idleMinutes, 30);
  assert.throws(
    () =>
      savePolicy(
        db,
        'dentist',
        maximumPermissions('dentist'),
        { idleMinutes: 0, receptionExpenseCapCents: 1 },
        admin,
      ),
    /Inatividade/,
  );
});
test('API exige sessão e impede acessos clínicos/financeiros proibidos mesmo por URL direta', async () => {
  const reception = axios.create({ adapter: mockAdapter });
  await assert.rejects(
    reception.get('/patients'),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 401,
  );
  await loginAs(reception, 'juliana@odontoflow.com');
  for (const url of ['/management/dashboard', '/team', '/access/policy', '/commissions/own'])
    await assert.rejects(
      reception.get(url),
      (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
    );
  const record = (await reception.get<MedicalRecord>('/records/p12')).data;
  await assert.rejects(
    reception.put('/records/p12', record),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  await assert.rejects(
    reception.post('/services', {}),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  const snapshot = (await reception.get('/finance')).data;
  assert.ok(snapshot.receipts.every((r: { commissionCents: number }) => r.commissionCents === 0));
  assert.deepEqual(snapshot.configuration.dentistRates, {});
  await assert.rejects(
    reception.post('/finance/expenses', {
      description: 'Acima do teto',
      category: 'supplies',
      date: localDate(),
      amountCents: 10001,
      reference: '',
    }),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  assert.equal(
    (
      await reception.post('/finance/expenses', {
        description: 'Dentro do teto',
        category: 'supplies',
        date: localDate(),
        amountCents: 100,
        reference: '',
      })
    ).status,
    201,
  );
  const dentist = axios.create({ adapter: mockAdapter });
  await loginAs(dentist, 'camila@odontoflow.com');
  const appointments = (await dentist.get<Appointment[]>('/appointments')).data;
  assert.ok(appointments.every((a) => a.dentistId === 'd1'));
  await assert.rejects(
    dentist.post('/appointments', { ...appointments[0], dentistId: 'd2' }),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  await assert.rejects(
    dentist.get('/finance'),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  const own = (await dentist.get('/commissions/own', { params: { dentistId: 'd2' } })).data;
  assert.ok(own.rows.every((r: { dentistName: string }) => r.dentistName.includes('Camila')));
});
test('API revoga sessão imediatamente ao inativar e aplica alterações de permissão', async () => {
  const admin = axios.create({ adapter: mockAdapter });
  const dentist = axios.create({ adapter: mockAdapter });
  await loginAs(admin);
  await loginAs(dentist, 'lucas@odontoflow.com');
  const users = (await admin.get<User[]>('/team')).data;
  const user = users.find((u) => u.id === 'd2');
  assert.ok(user);
  await admin.put(`/team/${user.id}`, { ...user, active: false });
  await assert.rejects(
    dentist.get('/auth/session'),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 401,
  );
  await admin.put(`/team/${user.id}`, { ...user, active: true });
  const settings = (await admin.get('/access/policy')).data;
  await admin.put('/access/policy', {
    role: 'receptionist',
    policy: { ...settings.policy.receptionist, 'agenda.edit': false },
    settings: settings.settings,
  });
  const reception = axios.create({ adapter: mockAdapter });
  await loginAs(reception, 'juliana@odontoflow.com');
  await assert.rejects(
    reception.post('/appointments', {}),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  await admin.put('/access/policy', {
    role: 'receptionist',
    policy: maximumPermissions('receptionist'),
    settings: settings.settings,
  });
});
test('autoria clínica usa sessão e CRO imutáveis; exclusão de ficha é exclusiva do admin', async () => {
  const dentist = axios.create({ adapter: mockAdapter });
  await loginAs(dentist, 'camila@odontoflow.com');
  const record = (await dentist.get<MedicalRecord>('/records/p12')).data;
  record.evolutions.unshift({
    id: 'signed-test',
    patientId: 'p12',
    dentistId: 'd3',
    date: localDate(),
    description: 'Evolução assinada pelo usuário autenticado',
  });
  const saved = (await dentist.put<MedicalRecord>('/records/p12', record)).data;
  assert.equal(saved.evolutions[0].signature?.cro, 'CRO-CE 84213');
  assert.equal(saved.evolutions[0].dentistId, 'd1');
  saved.evolutions[0].description = 'Alteração indevida';
  await assert.rejects(dentist.put('/records/p12', saved), /imutáveis/);
  await assert.rejects(
    dentist.delete('/patients/p12'),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  const admin = axios.create({ adapter: mockAdapter });
  await loginAs(admin);
  const created = (
    await admin.post('/patients', {
      ...(await admin.get('/patients')).data[0],
      name: 'Ficha excluível',
      id: undefined,
    })
  ).data;
  await admin.delete(`/patients/${created.id}`);
  assert.ok(!(await admin.get('/patients')).data.some((p: { id: string }) => p.id === created.id));
});
