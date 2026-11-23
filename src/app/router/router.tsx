import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
  redirect,
} from '@tanstack/react-router';
import { RootLayout } from '../../features/access/view/RootLayout';
import { queryClient } from '../../shared/lib/query/client';
import { sessionOptions } from '../../features/access/model/access.queries';
import {
  can,
  pathPermission,
  homePath,
  publicPaths,
} from '../../features/access/model/access.rules';
import { AgendaPage } from '../../features/agenda/view/AgendaPage';
import { PatientsPage } from '../../features/patients/view/PatientsPage';
import { RecordsPage } from '../../features/records/view/RecordsPage';
import { DentistsPage } from '../../features/dentists/view/DentistsPage';
import { SettingsPage } from '../../features/settings/view/SettingsPage';
import { localDate } from '../../features/clinic/model/fixtures';
import { isValidDate } from '../../features/clinic/model/validation';
import { FinancePage } from '../../features/finance/view/FinancePage';
import { serviceCategories } from '../../features/services/model/types';
import { normalizeDashboardSearch } from '../../features/management/model/periods';

const rootRoute = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    if (publicPaths.includes(location.pathname)) return;
    const session = await queryClient.fetchQuery(sessionOptions);
    if (!session) throw redirect({ to: '/login', search: { redirect: location.href, reason: '' } });
    const permission = pathPermission(location.pathname);
    if (permission && !can(session, permission)) throw redirect({ to: '/sem-acesso' });
  },
  notFoundComponent: () => (
    <div className="empty-state">
      <h1>Página não encontrada</h1>
      <Link
        to="/agenda"
        search={{ date: localDate(), view: 'all', dentist: '' }}
        className="btn btn-primary"
      >
        Voltar para a agenda
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="empty-state" role="alert">
      <h1>Não foi possível abrir a página</h1>
      <p>{error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'}</p>
      <button className="btn btn-primary" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  ),
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    const session = await queryClient.ensureQueryData(sessionOptions);
    throw redirect({ href: session ? homePath(session) : '/login' });
  },
});
export const agendaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agenda',
  validateSearch: (
    search: Record<string, unknown>,
  ): { date: string; view: 'all' | 'individual'; dentist: string } => ({
    date: typeof search.date === 'string' && isValidDate(search.date) ? search.date : localDate(),
    view: search.view === 'individual' ? 'individual' : 'all',
    dentist: typeof search.dentist === 'string' ? search.dentist : '',
  }),
  component: AgendaPage,
});
export const patientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pacientes',
  validateSearch: (
    search: Record<string, unknown>,
  ): { q: string; dentist: string; status: string } => ({
    q: typeof search.q === 'string' ? search.q : '',
    dentist: typeof search.dentist === 'string' ? search.dentist : '',
    status: search.status === 'active' || search.status === 'inactive' ? search.status : 'all',
  }),
  component: PatientsPage,
});
export const recordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prontuarios',
  validateSearch: (
    search: Record<string, unknown>,
  ): { patient: string; tab: 'evolution' | 'anamnesis' | 'treatment' | 'prescriptions' } => ({
    patient: typeof search.patient === 'string' ? search.patient : '',
    tab:
      search.tab === 'anamnesis' || search.tab === 'treatment' || search.tab === 'prescriptions'
        ? search.tab
        : 'evolution',
  }),
  component: RecordsPage,
});
export const dentistsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dentistas',
  component: DentistsPage,
});
export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/configuracoes',
  component: SettingsPage,
});
export const financeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/financeiro',
  validateSearch: (
    search: Record<string, unknown>,
  ): { date: string; shift: string; receipt?: string } => ({
    date: typeof search.date === 'string' && isValidDate(search.date) ? search.date : localDate(),
    shift: typeof search.shift === 'string' ? search.shift : '',
    receipt: typeof search.receipt === 'string' ? search.receipt : undefined,
  }),
  component: FinancePage,
});
export const receiptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/financeiro/recebimentos',
  validateSearch: (
    search: Record<string, unknown>,
  ): { q: string; patient: string; treatment: string; appointment?: string } => ({
    q: typeof search.q === 'string' ? search.q : '',
    patient: typeof search.patient === 'string' ? search.patient : '',
    treatment: typeof search.treatment === 'string' ? search.treatment : '',
    appointment: typeof search.appointment === 'string' ? search.appointment : undefined,
  }),
  component: lazyRouteComponent(
    () => import('../../features/finance/view/ReceiptsPage'),
    'ReceiptsPage',
  ),
});
export const servicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/servicos',
  validateSearch: (
    search: Record<string, unknown>,
  ): { q: string; category: string; status: 'active' | 'inactive' | 'all' } => ({
    q: typeof search.q === 'string' ? search.q : '',
    category: serviceCategories.find((c) => c === search.category) ?? '',
    status: search.status === 'all' || search.status === 'inactive' ? search.status : 'active',
  }),
  component: lazyRouteComponent(
    () => import('../../features/services/view/ServicesPage'),
    'ServicesPage',
  ),
});
export const managementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gestao-financeira',
  validateSearch: normalizeDashboardSearch,
  component: lazyRouteComponent(
    () => import('../../features/management/view/ManagementPage'),
    'ManagementPage',
  ),
});
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (s: Record<string, unknown>) => ({
    redirect:
      typeof s.redirect === 'string' && s.redirect.startsWith('/') && !s.redirect.startsWith('//')
        ? s.redirect
        : '',
    reason: s.reason === 'expired' ? 'expired' : '',
  }),
  component: lazyRouteComponent(() => import('../../features/access/view/AuthPages'), 'LoginPage'),
});
export const recoveryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recuperar-senha',
  component: lazyRouteComponent(
    () => import('../../features/access/view/AuthPages'),
    'RecoveryPage',
  ),
});
export const resetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/redefinir-senha',
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === 'string' ? s.token : '',
  }),
  component: lazyRouteComponent(() => import('../../features/access/view/AuthPages'), 'ResetPage'),
});
export const mailboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/emails-demo',
  component: lazyRouteComponent(
    () => import('../../features/access/view/AuthPages'),
    'MailboxPage',
  ),
});
export const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/equipe',
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === 'string' ? s.q : '',
    role: s.role === 'dentist' || s.role === 'admin' || s.role === 'receptionist' ? s.role : 'all',
  }),
  component: lazyRouteComponent(() => import('../../features/access/view/TeamPage'), 'TeamPage'),
});
export const permissionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/permissoes',
  validateSearch: (s: Record<string, unknown>) => ({
    role: s.role === 'admin' || s.role === 'dentist' ? s.role : 'receptionist',
  }),
  component: lazyRouteComponent(
    () => import('../../features/access/view/PermissionsPage'),
    'PermissionsPage',
  ),
});
export const commissionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meus-repasses',
  validateSearch: (s: Record<string, unknown>) => ({
    from:
      typeof s.from === 'string' && isValidDate(s.from) ? s.from : `${localDate().slice(0, 7)}-01`,
    to: typeof s.to === 'string' && isValidDate(s.to) ? s.to : localDate(),
  }),
  component: lazyRouteComponent(
    () => import('../../features/access/view/OwnCommissionsPage'),
    'OwnCommissionsPage',
  ),
});
const deniedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sem-acesso',
  component: lazyRouteComponent(() => import('../../features/access/view/AuthPages'), 'DeniedPage'),
});
const routeTree = rootRoute.addChildren([
  loginRoute,
  recoveryRoute,
  resetRoute,
  mailboxRoute,
  teamRoute,
  permissionsRoute,
  commissionsRoute,
  deniedRoute,
  indexRoute,
  agendaRoute,
  patientsRoute,
  recordsRoute,
  dentistsRoute,
  settingsRoute,
  financeRoute,
  receiptsRoute,
  servicesRoute,
  managementRoute,
]);
export const router = createRouter({
  routeTree,
  defaultPendingComponent: () => (
    <p className="empty-state" role="status">
      Abrindo página...
    </p>
  ),
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
