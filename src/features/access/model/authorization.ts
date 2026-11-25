import type { Database } from '../../clinic/model/types.ts';
import type { Session, Permission } from './types.ts';
import { AccessError } from './access.mock.ts';
import { can } from './access.rules.ts';
import { financialCells } from '../../management/model/dashboard.ts';
import { statementRows } from '../../management/model/statements.ts';
import { receiptItems } from '../../finance/model/finance.rules.ts';

export function authorizeRequest(
  db: Database,
  session: Session,
  path: string,
  method: string,
  body: Record<string, unknown> = {},
) {
  let permission: Permission | undefined;
  if (path.startsWith('/clinics/') && path.includes('/branding') && method !== 'get')
    permission = 'settings.manage';
  else if (path === '/team' || path.startsWith('/team/')) permission = 'users.manage';
  else if (path.startsWith('/access/')) permission = 'permissions.manage';
  else if (path === '/commissions/own') permission = 'commissions.own';
  else if (path.startsWith('/management/')) permission = 'management.view';
  else if (path === '/finance/expenses') permission = 'finance.expense';
  else if (path === '/finance/configuration') permission = 'settings.manage';
  else if (path.startsWith('/finance'))
    permission = method === 'get' ? 'finance.view' : 'finance.receive';
  else if (path.startsWith('/services'))
    permission = method === 'get' ? 'services.view' : 'services.edit';
  else if (path.startsWith('/records/'))
    permission = method === 'get' ? 'records.view' : 'records.edit';
  else if (path.startsWith('/patients'))
    permission =
      method === 'delete'
        ? 'patients.delete'
        : method === 'get'
          ? 'patients.view'
          : 'patients.edit';
  else if (path.startsWith('/appointments'))
    permission =
      method === 'get'
        ? 'agenda.view'
        : body.status === 'cancelled' || body.status === 'no-show'
          ? 'agenda.cancel'
          : 'agenda.edit';
  else if (path === '/settings' && method !== 'get') permission = 'settings.manage';
  else if (path === '/users' && method !== 'get') permission = 'users.manage';
  if (permission && !can(session, permission))
    throw new AccessError('Seu perfil não tem permissão para esta operação.', 403);
  if (!can(session, 'agenda.all') && path.startsWith('/appointments') && method !== 'get') {
    const dentistId =
      method === 'post'
        ? body.dentistId
        : db.appointments.find((a) => a.id === path.split('/')[2])?.dentistId;
    if (dentistId !== session.user.id || (body.dentistId && body.dentistId !== session.user.id))
      throw new AccessError('Você pode alterar somente sua própria agenda.', 403);
  }
  if (
    session.user.role === 'dentist' &&
    path.startsWith('/records/') &&
    method !== 'get' &&
    !session.user.cro.trim()
  )
    throw new AccessError('O CRO é obrigatório para registrar atos clínicos.', 403);
  if (
    path === '/finance/expenses' &&
    session.user.role === 'receptionist' &&
    (typeof body.amountCents !== 'number' || body.amountCents > session.receptionExpenseCapCents)
  )
    throw new AccessError('A despesa excede o teto autorizado para a recepção.', 403);
}
export function redactReceipt<
  T extends { commissionCents: number; items?: ReturnType<typeof receiptItems> },
>(receipt: T): T {
  return {
    ...receipt,
    commissionCents: 0,
    ...('commissionRate' in receipt ? { commissionRate: 0 } : {}),
    ...('clinicCents' in receipt ? { clinicCents: 0 } : {}),
    items: receipt.items?.map((i) => ({ ...i, commissionCents: 0, commissionRate: 0 })),
  };
}
export function ownCommissions(db: Database, session: Session, from: string, to: string) {
  const cells = financialCells(db, { from, to }).filter((c) => c.dentistId === session.user.id);
  return {
    rows: statementRows(cells).map((row) => ({ ...row, expensesCents: 0 })),
    revenueCents: cells.reduce((sum, c) => sum + c.revenueCents, 0),
    commissionCents: cells.reduce((sum, c) => sum + c.commissionCents, 0),
  };
}
