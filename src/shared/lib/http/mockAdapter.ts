import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';
import {
  AccessError,
  initializeAccess,
  saveTeamUser,
} from '../../../features/access/model/access.mock.ts';
import { dispatchAccess } from '../../../features/access/model/access.dispatcher.ts';
import { redactReceipt } from '../../../features/access/model/authorization.ts';
import { demoCookie } from '../../../features/access/model/demoCookie.ts';
import { can } from '../../../features/access/model/access.rules.ts';
import type { Session } from '../../../features/access/model/types.ts';
import {
  createDatabase,
  createRecord,
  localDate,
} from '../../../features/clinic/model/fixtures.ts';
import {
  createServices,
  saveService,
  snapshotCatalogTreatments,
} from '../../../features/services/model/services.mock.ts';
import { settleCheckout } from '../../../features/finance/model/checkout.mock.ts';
import {
  createManagementData,
  saveExpense,
  cancelExpense,
  saveManagementSettings,
} from '../../../features/management/model/management.mock.ts';
import { buildDashboard } from '../../../features/management/model/dashboard.ts';
import { normalizeDashboardSearch } from '../../../features/management/model/periods.ts';
import {
  closeShift,
  createFinanceData,
  createShift,
  pendingReceivables,
  receivePayment,
  recordWithPayments,
  reverseReceipt,
  saveFinanceConfiguration,
  validatePaidTreatments,
  withdrawCash,
} from '../../../features/finance/model/finance.mock.ts';
import type {
  Appointment,
  ClinicSettings,
  Database,
  MedicalRecord,
  Patient,
  User,
} from '../../../features/clinic/model/types.ts';
import {
  appointmentConflict,
  isValidDate,
  isValidTime,
  minutes,
  validatePatient,
} from '../../../features/clinic/model/validation.ts';

const storageKey = 'odontoflow-demo-v1';
let database: Database | undefined;
let accessInitialization: Promise<unknown> | undefined;
if (typeof window !== 'undefined')
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) {
      database = undefined;
      accessInitialization = undefined;
    }
  });
function getDatabase(): Database {
  if (database) return database;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed: Database = JSON.parse(stored);
      if (
        parsed.users &&
        parsed.patients &&
        parsed.records &&
        parsed.settings &&
        parsed.appointments
      )
        database = parsed;
    }
  } catch {
    /* A demo continua em memória quando o armazenamento não está disponível. */
  }
  database ??= createDatabase();
  database.services ??= createServices();
  database.finance ??= createFinanceData(database);
  database.management ??= createManagementData();
  persist();
  return database;
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(database));
  } catch {
    /* Modo privado: persistência limitada à sessão. */
  }
}

export const mockAdapter: AxiosAdapter = async (config) => {
  await new Promise<void>((resolve) => setTimeout(resolve, 180));
  const db = getDatabase();
  accessInitialization ??= initializeAccess(db);
  await accessInitialization;
  const path = (config.url ?? '').split('?')[0];
  const method = config.method?.toLowerCase() ?? 'get';
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  let data: unknown;
  let status = 200;
  let session: Session | undefined;
  const fail = (message: string, code = 400) => {
    data = { message };
    status = code;
  };
  let accessHandled: boolean;
  try {
    const result = await dispatchAccess(
      db,
      path,
      method,
      body,
      config.params,
      String(config.headers.get('X-Demo-Session') ?? demoCookie()),
      typeof navigator !== 'undefined' ? navigator.userAgent : 'Cliente de testes',
    );
    accessHandled = result.handled;
    session = result.session;
    if (result.handled) {
      data = result.data;
      status = result.status ?? 200;
    }
  } catch (error) {
    accessHandled = true;
    fail(
      error instanceof Error ? error.message : 'Acesso recusado.',
      error instanceof AccessError ? error.status : 400,
    );
  }
  if (accessHandled) {
    /* Access endpoints or rejected requests were handled above. */
  } else if (method === 'get') {
    if (path === '/management/dashboard') {
      try {
        data = buildDashboard(db, normalizeDashboardSearch(config.params ?? {}));
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Não foi possível calcular o dashboard.');
      }
    } else if (path === '/finance')
      data = {
        ...db.finance,
        pending: pendingReceivables(db),
        appointments: db.appointments.filter(
          (a) =>
            a.status !== 'cancelled' &&
            a.date <= localDate() &&
            !db.finance?.receipts.some((r) => r.appointmentId === a.id && !r.reversal),
        ),
      };
    else if (path === '/services') data = db.services;
    else if (path === '/users') data = db.users;
    else if (path === '/patients') data = db.patients.filter((p) => !p.deletedAt);
    else if (path === '/appointments')
      data = db.appointments.filter(
        (a) =>
          (!config.params?.date || a.date === config.params.date) &&
          session &&
          (can(session, 'agenda.all') || a.dentistId === session.user.id),
      );
    else if (path === '/settings') data = db.settings;
    else if (path.startsWith('/records/')) {
      const record = db.records.find((r) => r.patientId === path.split('/')[2]);
      if (!record) fail('Prontuário não encontrado.', 404);
      else data = recordWithPayments(db, record);
    } else fail('Recurso não encontrado.', 404);
  } else if (path.startsWith('/management/')) {
    try {
      if (path === '/management/expenses' && method === 'post') {
        data = saveExpense(db, body, undefined, session?.user);
        status = 201;
      } else if (/^\/management\/expenses\/[^/]+$/.test(path) && method === 'put')
        data = saveExpense(db, body, path.split('/')[3], session?.user);
      else if (/^\/management\/expenses\/[^/]+\/cancellation$/.test(path) && method === 'post')
        data = cancelExpense(db, path.split('/')[3], String(body.reason ?? ''), session?.user);
      else if (path === '/management/settings' && method === 'put')
        data = saveManagementSettings(db, body);
      else fail('Operação gerencial não encontrada.', 404);
    } catch (error) {
      fail(
        error instanceof Error ? error.message : 'Não foi possível salvar o lançamento gerencial.',
        409,
      );
    }
  } else if (path === '/services' || path.startsWith('/services/')) {
    try {
      if (method === 'post' && path === '/services') {
        data = saveService(db, body);
        status = 201;
      } else if (method === 'put' && path.startsWith('/services/'))
        data = saveService(db, body, path.split('/')[2]);
      else fail('Operação não encontrada.', 404);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Não foi possível salvar o serviço.', 409);
    }
  } else if (path.startsWith('/finance/')) {
    try {
      if (path === '/finance/checkout' && method === 'post') {
        data = settleCheckout(db, body, session?.user);
        status = 201;
      } else if (path === '/finance/receipts' && method === 'post') {
        data = receivePayment(db, body, session?.user);
        status = 201;
      } else if (/^\/finance\/receipts\/[^/]+\/reversal$/.test(path) && method === 'post')
        data = reverseReceipt(db, path.split('/')[3], String(body.reason ?? ''), session?.user);
      else if (path === '/finance/shifts' && method === 'post') {
        data = createShift(db, body, session?.user);
        status = 201;
      } else if (path === '/finance/withdrawals' && method === 'post') {
        data = withdrawCash(db, body, session?.user);
        status = 201;
      } else if (/^\/finance\/shifts\/[^/]+\/closing$/.test(path) && method === 'post')
        data = closeShift(db, { ...body, shiftId: path.split('/')[3] }, session?.user);
      else if (path === '/finance/configuration' && method === 'put')
        data = saveFinanceConfiguration(db, body);
      else fail('Operação financeira não encontrada.', 404);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Não foi possível realizar o lançamento.', 409);
    }
  } else if (path === '/patients' && method === 'post') {
    const candidate: Omit<Patient, 'id'> = {
      ...body,
      deletedAt: undefined,
      ...(session?.user.role === 'receptionist' ? { allergies: '', conditions: '' } : {}),
    };
    const error = validatePatient(candidate);
    if (error) fail(error);
    else if (!db.users.some((u) => u.id === candidate.dentistId && u.role === 'dentist'))
      fail('Dentista não encontrado.');
    else {
      const patient = { ...candidate, id: crypto.randomUUID() };
      db.patients.push(patient);
      db.records.push(createRecord(patient.id));
      data = patient;
      status = 201;
    }
  } else if (path.startsWith('/patients/') && method === 'put') {
    const patient = db.patients.find((p) => p.id === path.split('/')[2]);
    const error = validatePatient(body);
    if (!patient) fail('Paciente não encontrado.', 404);
    else if (error) fail(error);
    else if (!db.users.some((u) => u.id === body.dentistId && u.role === 'dentist'))
      fail('Dentista não encontrado.');
    else {
      Object.assign(patient, body, {
        id: patient.id,
        deletedAt: patient.deletedAt,
        ...(session?.user.role === 'receptionist'
          ? { allergies: patient.allergies, conditions: patient.conditions }
          : {}),
      });
      data = patient;
    }
  } else if (path.startsWith('/patients/') && method === 'delete') {
    const patient = db.patients.find((p) => p.id === path.split('/')[2]);
    if (!patient) fail('Paciente não encontrado.', 404);
    else {
      patient.deletedAt = new Date().toISOString();
      patient.active = false;
      data = {};
    }
  } else if (
    (path === '/appointments' && method === 'post') ||
    (path.startsWith('/appointments/') && method === 'put')
  ) {
    const candidate: Omit<Appointment, 'id'> = body;
    const previous =
      method === 'put' ? db.appointments.find((a) => a.id === path.split('/')[2]) : undefined;
    const { settings } = db;
    if (
      !db.patients.some((p) => p.id === candidate.patientId && p.active) ||
      !db.users.some(
        (u) => u.id === candidate.dentistId && u.role === 'dentist' && u.active !== false,
      )
    )
      fail('Selecione um paciente ativo e um dentista.');
    else if (
      !isValidDate(candidate.date) ||
      !isValidTime(candidate.time) ||
      !Number.isFinite(candidate.duration) ||
      candidate.duration < 15
    )
      fail('Preencha os dados da consulta.');
    else if (
      minutes(candidate.time) < minutes(settings.openingTime) ||
      minutes(candidate.time) + candidate.duration > minutes(settings.closingTime)
    )
      fail('O horário deve estar dentro do expediente da clínica.');
    else if (
      method === 'put' &&
      (!previous ||
        db.finance?.receipts.some((r) => r.appointmentId === previous.id && !r.reversal))
    )
      fail('Consulta inexistente ou já quitada. Estorne o recebimento antes de remarcar.', 409);
    else if (
      appointmentConflict(
        candidate,
        db.appointments.filter((a) => a.id !== previous?.id),
      )
    )
      fail('O dentista ou paciente já tem consulta nesse horário.', 409);
    else {
      const service = candidate.serviceId
        ? db.services?.find((s) => s.id === candidate.serviceId && s.active)
        : undefined;
      if (candidate.serviceId && !service)
        fail('Selecione um serviço ativo ou deixe a consulta sem procedimento definido.');
      else {
        const appointment = {
          ...candidate,
          procedure: service?.name ?? (candidate.procedure?.trim() || 'Avaliação / A definir'),
          reason: candidate.reason?.trim() ?? '',
          id: previous?.id ?? crypto.randomUUID(),
        };
        if (previous) db.appointments[db.appointments.indexOf(previous)] = appointment;
        else db.appointments.push(appointment);
        data = appointment;
        status = 201;
      }
    }
  } else if (path.startsWith('/appointments/') && method === 'patch') {
    const appointment = db.appointments.find((a) => a.id === path.split('/')[2]);
    if (!appointment) fail('Consulta não encontrada.', 404);
    else if (
      body.status !== 'completed' &&
      db.finance?.receipts.some((r) => r.appointmentId === appointment.id && !r.reversal)
    )
      fail('Estorne o acerto no caixa antes de reabrir ou cancelar o atendimento.', 409);
    else if (
      !['confirmed', 'waiting', 'in-progress', 'completed', 'cancelled', 'no-show'].includes(
        body.status,
      )
    )
      fail('Status inválido.');
    else {
      appointment.status = body.status;
      if (body.status === 'waiting') appointment.arrivedAt = new Date().toISOString();
      data = appointment;
    }
  } else if (path.startsWith('/records/') && method === 'put') {
    const index = db.records.findIndex((r) => r.patientId === path.split('/')[2]);
    if (index === -1) fail('Prontuário não encontrado.', 404);
    else {
      try {
        const next = { ...(body as MedicalRecord), patientId: db.records[index].patientId };
        if (session) {
          const previous = db.records[index];
          if (!can(session, 'management.view'))
            next.treatments = next.treatments.map((t) => ({
              ...t,
              commissionRate: previous.treatments.find((old) => old.id === t.id)?.commissionRate,
            }));
          for (const evolution of next.evolutions) {
            const old = previous.evolutions.find((e) => e.id === evolution.id);
            if (old && JSON.stringify(old) !== JSON.stringify(evolution))
              throw new Error('Evoluções registradas são imutáveis. Acrescente uma nova evolução.');
            if (!old) {
              const author =
                session.user.role === 'dentist'
                  ? session.user
                  : db.users.find((u) => u.id === evolution.dentistId && u.role === 'dentist');
              if (!author?.cro || author.active === false)
                throw new Error('Selecione um dentista ativo com CRO.');
              evolution.dentistId = author.id;
              evolution.signature = {
                name: author.name,
                cro: author.cro,
                at: new Date().toISOString(),
                userId: session.user.id,
              };
            }
          }
          if (previous.evolutions.some((e) => !next.evolutions.some((v) => v.id === e.id)))
            throw new Error('Evoluções registradas não podem ser excluídas.');
        }
        validatePaidTreatments(db, next);
        next.treatments = snapshotCatalogTreatments(db, next, db.records[index]);
        validatePaidTreatments(db, next);
        db.records[index] = next;
        data = recordWithPayments(db, next);
      } catch (error) {
        fail(
          error instanceof Error ? error.message : 'Não foi possível atualizar o procedimento.',
          409,
        );
      }
    }
  } else if (path === '/users' && method === 'post') {
    const user: Omit<User, 'id'> = body;
    if (
      !user.name.trim() ||
      !user.specialty.trim() ||
      !user.cro.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)
    )
      fail('Preencha nome, e-mail, especialidade e CRO.');
    else if (db.users.some((u) => u.email === user.email || u.cro === user.cro))
      fail('Já existe um profissional com esse e-mail ou CRO.', 409);
    else {
      try {
        if (!session) throw new AccessError('Entre novamente.', 401);
        data = saveTeamUser(
          db,
          { ...user, role: 'dentist', active: true, phone: user.phone ?? '(85) 99999-1000' },
          session.user,
        );
        status = 201;
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Não foi possível criar o convite.', 400);
      }
    }
  } else if (path === '/settings' && method === 'put') {
    const settings: ClinicSettings = body;
    if (
      !settings.name.trim() ||
      !settings.email.includes('@') ||
      !isValidTime(settings.openingTime) ||
      !isValidTime(settings.closingTime) ||
      settings.openingTime >= settings.closingTime ||
      ![15, 30, 60].includes(settings.slotDuration)
    )
      fail('Revise o nome, e-mail e horário de funcionamento.');
    else {
      db.settings = settings;
      data = settings;
    }
  } else fail('Operação não encontrada.', 404);
  if (status < 400 && session && !can(session, 'management.view')) {
    if (path === '/finance' && method === 'get') {
      const snapshot = data as import('../../../features/finance/model/types.ts').FinanceSnapshot;
      data = {
        ...snapshot,
        receipts: snapshot.receipts.map(redactReceipt),
        shifts: snapshot.shifts.map((s) => ({
          ...s,
          closing: s.closing ? { ...s.closing, commissionCents: 0 } : undefined,
        })),
        pending: snapshot.pending.map((p) => ({ ...p, commissionRate: 0 })),
        configuration: { ...snapshot.configuration, dentistRates: {} },
      };
    } else if (
      path.startsWith('/finance/') &&
      data &&
      typeof data === 'object' &&
      'commissionCents' in data
    )
      data = redactReceipt(data as import('../../../features/finance/model/types.ts').Receipt);
    else if (
      path.startsWith('/finance/') &&
      data &&
      typeof data === 'object' &&
      'closing' in data
    ) {
      const shift = data as import('../../../features/finance/model/types.ts').CashShift;
      data = {
        ...shift,
        closing: shift.closing ? { ...shift.closing, commissionCents: 0 } : undefined,
      };
    } else if (path === '/services' && method === 'get')
      data = db.services?.map((s) => ({ ...s, commissionRate: 0 }));
    else if (path.startsWith('/records/')) {
      const record = data as MedicalRecord;
      data = {
        ...record,
        treatments: record.treatments.map((t) => ({ ...t, commissionRate: undefined })),
      };
    }
  }
  persist();
  const response: AxiosResponse = {
    data: structuredClone(data),
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    headers: {},
    config,
  };
  if (status >= 400)
    throw new AxiosError(
      (data as { message: string }).message,
      'ERR_BAD_REQUEST',
      config,
      undefined,
      response,
    );
  if (method !== 'get') persist();
  return response;
};
