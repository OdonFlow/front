import type { Database } from '../../clinic/model/types.ts';
import { localDate } from '../../clinic/model/fixtures.ts';
import { isValidDate } from '../../clinic/model/validation.ts';
import { saveExpense } from '../../management/model/management.mock.ts';
import {
  AccessError,
  authenticate,
  login,
  requestReset,
  resetPassword,
  revokeSession,
  saveTeamUser,
  queueMail,
  savePolicy,
  digestToken,
  logAccess,
} from './access.mock.ts';
import { authorizeRequest, ownCommissions } from './authorization.ts';
import { setDemoCookie, clearDemoCookie } from './demoCookie.ts';
import type { AccessSettings, PermissionSet, Role, TeamInput, Session } from './types.ts';
interface Body extends Partial<TeamInput> {
  token?: string;
  password?: string;
  remember?: boolean;
  policy?: PermissionSet;
  settings?: AccessSettings;
  amountCents?: number;
  description?: string;
  date?: string;
  category?: string;
  reference?: string;
}
export async function dispatchAccess(
  db: Database,
  path: string,
  method: string,
  body: Body = {},
  params: Record<string, unknown> = {},
  token: string,
  device: string,
): Promise<{ handled: boolean; data?: unknown; status?: number; session?: Session }> {
  if (path.startsWith('/auth/')) {
    let data: unknown;
    if (path === '/auth/login' && method === 'post') {
      const result = await login(
        db,
        {
          email: body.email ?? '',
          password: body.password ?? '',
          remember: Boolean(body.remember),
        },
        device,
      );
      setDemoCookie(result.demoSessionId, Boolean(body.remember));
      data = result;
    } else if (path === '/auth/recovery' && method === 'post')
      data = requestReset(db, body.email ?? '');
    else if (path === '/auth/reset' && method === 'post')
      data = await resetPassword(db, body.token ?? '', body.password ?? '');
    else if (path === '/auth/demo-mailbox' && method === 'get') data = db.access?.mails;
    else if (path === '/auth/logout' && method === 'post') {
      await revokeSession(db, token, device);
      clearDemoCookie();
      data = {};
    } else {
      const session = await authenticate(db, token);
      if (path === '/auth/session' && method === 'get') data = session;
      else if (path === '/auth/activity' && method === 'post') {
        const hash = await digestToken(token);
        const active = db.access?.sessions.find((s) => s.idHash === hash);
        if (active) active.lastActivity = Date.now();
        data = {};
      } else throw new AccessError('Recurso não encontrado.', 404);
    }
    return { handled: true, data };
  }
  const session = await authenticate(db, token);
  authorizeRequest(db, session, path, method, body as Record<string, unknown>);
  if (path === '/team' && method === 'get') return { handled: true, data: db.users, session };
  if ((path === '/team' && method === 'post') || (/^\/team\/[^/]+$/.test(path) && method === 'put'))
    return {
      handled: true,
      data: saveTeamUser(
        db,
        body as TeamInput,
        session.user,
        path === '/team' ? undefined : path.split('/')[2],
      ),
      status: method === 'post' ? 201 : 200,
      session,
    };
  if (/^\/team\/[^/]+\/reset$/.test(path) && method === 'post') {
    const user = db.users.find((u) => u.id === path.split('/')[2] && u.active !== false);
    if (!user) throw new AccessError('Colaborador não encontrado ou inativo.', 404);
    queueMail(db, user, user.invited ? 'invitation' : 'reset');
    logAccess(
      db,
      session.user.email,
      `Redefinição solicitada: ${user.email}`,
      device,
      session.user.id,
    );
    return {
      handled: true,
      data: { message: 'Link enviado para a caixa demonstrativa.' },
      session,
    };
  }
  if (path === '/access/policy' && method === 'get')
    return {
      handled: true,
      data: { policy: db.access?.policy, settings: db.access?.settings },
      session,
    };
  if (path === '/access/policy' && method === 'put') {
    if (!body.role || !body.policy || !body.settings) throw new AccessError('Dados incompletos.');
    return {
      handled: true,
      data: savePolicy(db, body.role as Role, body.policy, body.settings, session.user),
      session,
    };
  }
  if (path === '/access/logs' && method === 'get')
    return { handled: true, data: db.access?.logs, session };
  if (path === '/commissions/own' && method === 'get') {
    const from = String(params.from ?? `${localDate().slice(0, 7)}-01`);
    const to = String(params.to ?? localDate());
    if (!isValidDate(from) || !isValidDate(to) || from > to)
      throw new AccessError('Período inválido.');
    return { handled: true, data: ownCommissions(db, session, from, to), session };
  }
  if (path === '/finance/expenses' && method === 'post') {
    const input = {
      description: body.description ?? '',
      date: body.date ?? '',
      category: body.category,
      amountCents: body.amountCents ?? 0,
      reference: body.reference ?? '',
      dentistId: '',
      serviceId: '',
    };
    const { expenseCategories } = await import('../../management/model/types.ts');
    const category = expenseCategories.find((c) => c === input.category);
    if (!category) throw new AccessError('Categoria inválida.');
    return {
      handled: true,
      data: saveExpense(db, { ...input, category }, undefined, session.user),
      status: 201,
      session,
    };
  }
  return { handled: false, session };
}
