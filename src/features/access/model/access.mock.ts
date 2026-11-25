import type { Database, User } from '../../clinic/model/types.ts';
import {
  effectivePermissions,
  maximumPermissions,
  validatePassword,
  validateTeam,
  validEmail,
} from './access.rules.ts';
import type {
  AccessData,
  AccessSettings,
  PermissionSet,
  Role,
  Session,
  TeamInput,
} from './types.ts';

export class AccessError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (n) => n.toString(16).padStart(2, '0')).join('');
export const digestToken = async (token: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return hex(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, salt: new TextEncoder().encode(salt) },
      key,
      256,
    ),
  );
}
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
export async function initializeAccess(db: Database): Promise<AccessData> {
  if (db.access) return db.access;
  db.users.forEach((user) => {
    user.phone ??= '(85) 99999-1000';
    user.active ??= true;
  });
  if (!db.users.some((u) => u.role === 'admin'))
    db.users.push({
      id: 'admin-demo',
      name: 'Administrador OdontoFlow',
      email: 'admin@odontoflow.com',
      role: 'admin',
      specialty: 'Gestão',
      cro: '',
      phone: '(85) 99999-1000',
      active: true,
    });
  const credentials = await Promise.all(
    db.users.map(async (user) => {
      const salt = randomToken();
      return {
        userId: user.id,
        salt,
        hash: await passwordHash('Odonto123!', salt),
        failures: 0,
        lockedUntil: 0,
      };
    }),
  );
  db.access = {
    credentials,
    sessions: [],
    mails: [],
    logs: [],
    policy: {
      admin: maximumPermissions('admin'),
      dentist: maximumPermissions('dentist'),
      receptionist: maximumPermissions('receptionist'),
    },
    settings: { idleMinutes: 60, receptionExpenseCapCents: 10000 },
  };
  return db.access;
}
export function logAccess(
  db: Database,
  email: string,
  action: string,
  device: string,
  userId?: string,
) {
  db.access?.logs.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    email,
    action,
    device: device.slice(0, 250),
    ip: '127.0.0.1 (simulado)',
    userId,
  });
  if (db.access) db.access.logs = db.access.logs.slice(0, 500);
}
export async function authenticate(
  db: Database,
  token: string | undefined,
  now = Date.now(),
): Promise<Session> {
  const hash = await digestToken(token ?? '');
  const session = db.access?.sessions.find((s) => s.idHash === hash);
  const user = db.users.find((u) => u.id === session?.userId);
  if (
    !session ||
    !user ||
    user.active === false ||
    user.invited ||
    session.expiresAt <= now ||
    session.lastActivity + (db.access?.settings.idleMinutes ?? 60) * 60000 <= now
  )
    throw new AccessError('Sua sessão expirou. Entre novamente.', 401);
  const data = db.access;
  if (!data) throw new AccessError('Entre para continuar.', 401);
  return {
    user,
    clinicId: user.clinicId ?? db.settings.id ?? 'demo-clinic',
    permissions: effectivePermissions(user.role, data.policy[user.role]),
    expiresAt: session.expiresAt,
    ...data.settings,
  };
}
export async function login(
  db: Database,
  input: { email: string; password: string; remember: boolean },
  device: string,
  now = Date.now(),
) {
  const access = db.access;
  if (!access) throw new AccessError('Acesso indisponível.');
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  const credential = access.credentials.find((c) => c.userId === user?.id);
  if (credential && credential.lockedUntil > now) {
    logAccess(db, email, 'Bloqueio temporário', device, user?.id);
    throw new AccessError('Acesso temporariamente bloqueado. Tente novamente em 15 minutos.', 429);
  }
  // Do the same expensive derivation for unknown emails to avoid a trivial timing distinction.
  const hash = await passwordHash(
    String(input.password ?? ''),
    credential?.salt ?? 'unknown-account',
  );
  if (!user || !credential || hash !== credential.hash || user.active === false || user.invited) {
    if (credential) {
      credential.failures++;
      if (credential.failures >= 5) {
        credential.lockedUntil = now + 15 * 60000;
        credential.failures = 0;
      }
    }
    logAccess(db, email, 'Login recusado', device, user?.id);
    throw new AccessError(
      credential && credential.lockedUntil > now
        ? 'Acesso temporariamente bloqueado. Tente novamente em 15 minutos.'
        : 'E-mail ou senha inválidos.',
      credential && credential.lockedUntil > now ? 429 : 401,
    );
  }
  credential.failures = 0;
  credential.lockedUntil = 0;
  const token = randomToken();
  const expiresAt = now + (input.remember ? 30 * 86400000 : 86400000);
  access.sessions.push({
    idHash: await digestToken(token),
    userId: user.id,
    expiresAt,
    lastActivity: now,
  });
  logAccess(db, email, 'Login realizado', device, user.id);
  return { session: await authenticate(db, token, now), demoSessionId: token };
}
export async function revokeSession(db: Database, token: string, device: string) {
  const hash = await digestToken(token);
  const session = db.access?.sessions.find((s) => s.idHash === hash);
  if (db.access) db.access.sessions = db.access.sessions.filter((s) => s.idHash !== hash);
  const user = db.users.find((u) => u.id === session?.userId);
  if (user) logAccess(db, user.email, 'Logout', device, user.id);
}
export function queueMail(
  db: Database,
  user: User,
  kind: 'invitation' | 'reset',
  now = Date.now(),
) {
  const access = db.access;
  if (!access) throw new AccessError('Acesso indisponível.');
  for (const mail of access.mails) if (mail.to === user.email && !mail.usedAt) mail.usedAt = now;
  const mail = {
    id: crypto.randomUUID(),
    to: user.email,
    name: user.name,
    kind,
    token: randomToken(),
    expiresAt: now + 30 * 60000,
    createdAt: now,
  };
  access.mails.unshift(mail);
  access.mails = access.mails.slice(0, 100);
  return mail;
}
export function requestReset(db: Database, email: string) {
  if (!validEmail(email)) throw new AccessError('Informe um e-mail válido.');
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.active !== false,
  );
  if (user) queueMail(db, user, user.invited ? 'invitation' : 'reset');
  return {
    message:
      'Se houver uma conta ativa para este e-mail, você receberá as instruções de redefinição.',
    maskedEmail: `${email.trim().slice(0, 1)}***@${email.trim().split('@')[1]}`,
  };
}
export async function resetPassword(
  db: Database,
  token: string,
  password: string,
  now = Date.now(),
) {
  const error = validatePassword(password);
  if (error) throw new AccessError(error);
  const access = db.access;
  const mail = access?.mails.find((m) => m.token === token && !m.usedAt && m.expiresAt > now);
  const user = db.users.find((u) => u.email === mail?.to && u.active !== false);
  if (!mail || !user || !access)
    throw new AccessError('O link é inválido, já foi usado ou expirou. Solicite um novo link.');
  const salt = randomToken();
  const hash = await passwordHash(password, salt);
  // Recheck after asynchronous derivation so concurrent requests cannot consume the link twice.
  if (mail.usedAt || mail.expiresAt <= Date.now())
    throw new AccessError('O link já foi usado ou expirou.');
  mail.usedAt = now;
  user.invited = false;
  access.credentials = access.credentials.filter((c) => c.userId !== user.id);
  access.credentials.push({ userId: user.id, salt, hash, failures: 0, lockedUntil: 0 });
  access.sessions = access.sessions.filter((s) => s.userId !== user.id);
  logAccess(db, user.email, 'Senha redefinida; sessões revogadas', 'Link de recuperação', user.id);
  return { message: 'Senha salva. Entre com a nova senha.' };
}
export function saveTeamUser(db: Database, input: TeamInput, actor: User, id?: string): User {
  const error = validateTeam(input);
  if (error) throw new AccessError(error);
  const old = db.users.find((u) => u.id === id);
  if (id && !old) throw new AccessError('Colaborador não encontrado.', 404);
  const email = input.email.trim().toLowerCase();
  if (
    db.users.some(
      (u) =>
        u.id !== id &&
        (u.email.toLowerCase() === email ||
          (input.role === 'dentist' && u.cro.toUpperCase() === input.cro.trim().toUpperCase())),
    )
  )
    throw new AccessError('Já existe um colaborador com este e-mail ou CRO.', 409);
  if (old?.id === actor.id && (!input.active || input.role !== 'admin'))
    throw new AccessError('Você não pode inativar ou remover seu próprio perfil administrador.');
  if (
    old?.role === 'dentist' &&
    input.role !== 'dentist' &&
    (db.appointments.some((a) => a.dentistId === old.id) ||
      db.records.some(
        (r) =>
          r.evolutions.some((e) => e.dentistId === old.id) ||
          r.treatments.some((t) => t.dentistId === old.id),
      ))
  )
    throw new AccessError(
      'O profissional tem histórico clínico. Preserve o perfil e inative o acesso.',
    );
  if (
    old?.role === 'admin' &&
    (!input.active || input.role !== 'admin') &&
    !db.users.some((u) => u.id !== id && u.role === 'admin' && u.active !== false && !u.invited)
  )
    throw new AccessError('Mantenha ao menos um administrador ativo.');
  const user: User = {
    ...input,
    clinicId: old?.clinicId ?? actor.clinicId ?? db.settings.id ?? 'demo-clinic',
    name: input.name.trim(),
    email,
    cro: input.role === 'dentist' ? input.cro.trim().toUpperCase() : '',
    specialty: input.role === 'dentist' ? input.specialty.trim() : '',
    id: id ?? crypto.randomUUID(),
    invited: old && old.email === email ? (old.invited ?? false) : true,
  };
  if (old) db.users[db.users.indexOf(old)] = user;
  else db.users.push(user);
  if (db.access && (!input.active || old?.role !== input.role || old?.email !== email))
    db.access.sessions = db.access.sessions.filter((s) => s.userId !== user.id);
  if (!old || old.email !== email) queueMail(db, user, 'invitation');
  logAccess(
    db,
    actor.email,
    `${old ? 'Usuário atualizado' : 'Convite criado'}: ${user.email}`,
    'Gestão da equipe',
    actor.id,
  );
  return user;
}
export function savePolicy(
  db: Database,
  role: Role,
  policy: PermissionSet,
  settings: AccessSettings,
  actor: User,
) {
  if (!['admin', 'dentist', 'receptionist'].includes(role))
    throw new AccessError('Perfil inválido.');
  if (
    !Number.isInteger(settings.idleMinutes) ||
    settings.idleMinutes < 1 ||
    settings.idleMinutes > 240 ||
    !Number.isSafeInteger(settings.receptionExpenseCapCents) ||
    settings.receptionExpenseCapCents < 0 ||
    settings.receptionExpenseCapCents > 100000000
  )
    throw new AccessError('Inatividade: 1 a 240 minutos. Informe um teto de despesa válido.');
  if (!db.access) throw new AccessError('Acesso indisponível.');
  db.access.policy[role] = effectivePermissions(role, policy);
  db.access.settings = settings;
  logAccess(db, actor.email, `Permissões atualizadas: ${role}`, 'Matriz de permissões', actor.id);
  return { policy: db.access.policy, settings };
}
