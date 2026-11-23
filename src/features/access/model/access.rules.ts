import {
  permissions,
  type Role,
  type PermissionSet,
  type Permission,
  type TeamInput,
} from './types.ts';
export const publicPaths = ['/login', '/recuperar-senha', '/redefinir-senha', '/emails-demo'];
export const maximumPermissions = (role: Role): PermissionSet =>
  Object.fromEntries(
    permissions.map(({ key }) => [
      key,
      role === 'admin' ||
        (role === 'dentist'
          ? [
              'agenda.view',
              'agenda.edit',
              'agenda.cancel',
              'patients.view',
              'patients.edit',
              'records.view',
              'records.edit',
              'commissions.own',
              'services.view',
            ].includes(key)
          : [
              'agenda.view',
              'agenda.all',
              'agenda.edit',
              'agenda.cancel',
              'patients.view',
              'patients.edit',
              'records.view',
              'finance.view',
              'finance.receive',
              'finance.receipt',
              'finance.expense',
              'services.view',
            ].includes(key)),
    ]),
  ) as PermissionSet;
export function effectivePermissions(role: Role, configured: PermissionSet): PermissionSet {
  const ceiling = maximumPermissions(role);
  return Object.fromEntries(
    permissions.map(({ key }) => [key, role === 'admin' || (ceiling[key] && configured[key])]),
  ) as PermissionSet;
}
export function can(
  session: { permissions: PermissionSet } | null | undefined,
  permission: Permission,
): boolean {
  return session?.permissions[permission] === true;
}
export const validEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 150;
export function validatePassword(password: string): string | undefined {
  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  )
    return 'Use de 8 a 128 caracteres, com letras maiúsculas, minúsculas e números.';
}
export function validateTeam(input: TeamInput): string | undefined {
  if (input.name.trim().length < 3 || input.name.length > 150 || !validEmail(input.email))
    return 'Informe nome completo e e-mail válido.';
  if (!['admin', 'dentist', 'receptionist'].includes(input.role))
    return 'Selecione um perfil válido.';
  if (input.phone.replace(/\D/g, '').length < 10 || input.phone.length > 25)
    return 'Informe um celular válido com DDD.';
  if (
    input.role === 'dentist' &&
    (!/^CRO[-\s]?[A-Z]{2}\s?[\d.]+$/i.test(input.cro.trim()) || !input.specialty.trim())
  )
    return 'Informe o CRO com UF (ex.: CRO-CE 84213) e a especialidade.';
}
export function pathPermission(path: string): Permission | undefined {
  if (path.startsWith('/gestao-financeira')) return 'management.view';
  if (path.startsWith('/financeiro/recebimentos')) return 'finance.receive';
  if (path.startsWith('/financeiro')) return 'finance.view';
  if (path.startsWith('/meus-repasses')) return 'commissions.own';
  if (path.startsWith('/permissoes')) return 'permissions.manage';
  if (path.startsWith('/equipe') || path.startsWith('/dentistas')) return 'users.manage';
  if (path.startsWith('/configuracoes')) return 'settings.manage';
  if (path.startsWith('/servicos')) return 'services.view';
  if (path.startsWith('/prontuarios')) return 'records.view';
  if (path.startsWith('/pacientes')) return 'patients.view';
  if (path.startsWith('/agenda')) return 'agenda.view';
}
export function homePath(session: {
  user: { role: Role; id: string };
  permissions: PermissionSet;
}): string {
  if (session.user.role === 'admin') return '/gestao-financeira';
  if (can(session, 'agenda.view'))
    return session.user.role === 'dentist'
      ? `/agenda?view=individual&dentist=${encodeURIComponent(session.user.id)}`
      : '/agenda';
  for (const path of ['/pacientes', '/prontuarios', '/servicos', '/financeiro', '/meus-repasses']) {
    const permission = pathPermission(path);
    if (permission && can(session, permission)) return path;
  }
  return '/sem-acesso';
}
