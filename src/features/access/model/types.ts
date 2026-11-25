import type { User } from '../../clinic/model/types.ts';
export type Role = 'admin' | 'dentist' | 'receptionist';
export const permissions = [
  { key: 'agenda.view', group: 'Agenda', label: 'Visualizar agenda' },
  { key: 'agenda.all', group: 'Agenda', label: 'Visualizar todas as cadeiras' },
  { key: 'agenda.edit', group: 'Agenda', label: 'Agendar, remarcar e confirmar' },
  { key: 'agenda.cancel', group: 'Agenda', label: 'Cancelar consultas e registrar faltas' },
  { key: 'patients.view', group: 'Pacientes e prontuário', label: 'Visualizar dados cadastrais' },
  { key: 'patients.edit', group: 'Pacientes e prontuário', label: 'Cadastrar e editar pacientes' },
  { key: 'patients.delete', group: 'Pacientes e prontuário', label: 'Excluir ficha de paciente' },
  { key: 'records.view', group: 'Pacientes e prontuário', label: 'Ler prontuário e odontograma' },
  {
    key: 'records.edit',
    group: 'Pacientes e prontuário',
    label: 'Editar e assinar dados clínicos',
  },
  { key: 'finance.view', group: 'Caixa e financeiro', label: 'Visualizar caixa operacional' },
  { key: 'finance.receive', group: 'Caixa e financeiro', label: 'Lançar recebimentos externos' },
  { key: 'finance.receipt', group: 'Caixa e financeiro', label: 'Emitir recibos e comprovantes' },
  {
    key: 'finance.expense',
    group: 'Caixa e financeiro',
    label: 'Lançar despesas (recepção sujeita ao teto)',
  },
  {
    key: 'management.view',
    group: 'Caixa e financeiro',
    label: 'Visualizar DRE, despesas e repasses globais',
  },
  { key: 'commissions.own', group: 'Caixa e financeiro', label: 'Consultar os próprios repasses' },
  {
    key: 'services.view',
    group: 'Configurações e cadastros',
    label: 'Consultar catálogo e preços',
  },
  {
    key: 'services.edit',
    group: 'Configurações e cadastros',
    label: 'Configurar catálogo e comissões',
  },
  {
    key: 'users.manage',
    group: 'Configurações e cadastros',
    label: 'Gerenciar usuários e convites',
  },
  {
    key: 'permissions.manage',
    group: 'Configurações e cadastros',
    label: 'Gerenciar permissões e segurança',
  },
  {
    key: 'settings.manage',
    group: 'Configurações e cadastros',
    label: 'Configurar a clínica e taxas',
  },
] as const;
export type Permission = (typeof permissions)[number]['key'];
export type PermissionSet = Record<Permission, boolean>;
export interface AccessSettings {
  idleMinutes: number;
  receptionExpenseCapCents: number;
}
export interface Session {
  clinicId: string;
  user: User;
  permissions: PermissionSet;
  expiresAt: number;
  idleMinutes: number;
  receptionExpenseCapCents: number;
}
export interface Credential {
  userId: string;
  salt: string;
  hash: string;
  failures: number;
  lockedUntil: number;
}
export interface AccessSession {
  idHash: string;
  userId: string;
  expiresAt: number;
  lastActivity: number;
}
export interface AccessMail {
  id: string;
  to: string;
  name: string;
  kind: 'invitation' | 'reset';
  token: string;
  expiresAt: number;
  usedAt?: number;
  createdAt: number;
}
export interface AccessLog {
  id: string;
  at: string;
  email: string;
  userId?: string;
  action: string;
  ip: string;
  device: string;
}
export interface AccessData {
  credentials: Credential[];
  sessions: AccessSession[];
  mails: AccessMail[];
  logs: AccessLog[];
  policy: Record<Role, PermissionSet>;
  settings: AccessSettings;
}
export interface TeamInput {
  name: string;
  email: string;
  phone: string;
  role: Role;
  cro: string;
  specialty: string;
  active: boolean;
}
export const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  dentist: 'Dentista',
  receptionist: 'Recepção',
};
