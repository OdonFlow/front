import { Link, Outlet } from '@tanstack/react-router';
import { Icon } from '../../shared/components/Icon';
import { Avatar } from '../../shared/components/ui';
import { useAppViewModel } from '../viewmodel/useAppViewModel';
import { localDate } from '../../features/clinic/model/fixtures';
import { normalizeDashboardSearch } from '../../features/management/model/periods';

export function AppLayout() {
  const vm = useAppViewModel();
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="mobile-header">
        <span className="brand">
          <span className="brand-mark">
            <Icon name="tooth" />
          </span>
          {vm.clinicName}
        </span>
        <button
          className="icon-button"
          aria-label="Abrir menu"
          aria-expanded={vm.sidebarOpen}
          onClick={vm.toggleSidebar}
        >
          <Icon name="menu" />
        </button>
      </header>
      {vm.sidebarOpen && (
        <button className="sidebar-overlay" aria-label="Fechar menu" onClick={vm.closeSidebar} />
      )}
      <aside className={`sidebar ${vm.sidebarOpen ? 'sidebar-open' : ''}`}>
        <Link className="brand" to="/" onClick={vm.closeSidebar}>
          <span className="brand-mark">
            <Icon name="tooth" size={23} />
          </span>
          {vm.clinicName}
        </Link>
        <div className="sidebar-caption">ESPAÇO DA CLÍNICA</div>
        <nav aria-label="Navegação principal" onClick={vm.closeSidebar}>
          {vm.can('services.view') && (
            <Link
              to="/servicos"
              search={{ q: '', category: '', status: 'active' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="grid" />
              Serviços
            </Link>
          )}
          {vm.can('agenda.view') && (
            <Link
              to="/agenda"
              search={{ date: localDate(), view: 'all', dentist: '' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="calendar" />
              Agenda
            </Link>
          )}
          {vm.can('patients.view') && (
            <Link
              to="/pacientes"
              search={{ q: '', dentist: '', status: 'all' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="users" />
              Pacientes
            </Link>
          )}
          {vm.can('records.view') && (
            <Link
              to="/prontuarios"
              search={{ patient: '', tab: 'evolution' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="file" />
              Prontuários
            </Link>
          )}
          {vm.can('finance.view') && (
            <Link
              to="/financeiro"
              search={{ date: localDate(), shift: '' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="wallet" />
              Financeiro
            </Link>
          )}
          {vm.can('management.view') && (
            <Link
              to="/gestao-financeira"
              search={normalizeDashboardSearch({})}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="grid" />
              Gestão financeira
            </Link>
          )}
          {vm.can('users.manage') && (
            <Link
              to="/dentistas"
              activeProps={{ className: 'nav-link active' }}
              className="nav-link"
            >
              <Icon name="user" />
              Dentistas
            </Link>
          )}
          {vm.can('settings.manage') && (
            <Link
              to="/configuracoes"
              activeProps={{ className: 'nav-link active' }}
              className="nav-link"
            >
              <Icon name="settings" />
              Configurações
            </Link>
          )}
          {vm.can('users.manage') && (
            <Link
              to="/equipe"
              search={{ q: '', role: 'all' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="users" />
              Equipe e usuários
            </Link>
          )}
          {vm.can('permissions.manage') && (
            <Link
              to="/permissoes"
              search={{ role: 'receptionist' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="settings" />
              Permissões
            </Link>
          )}
          {vm.can('commissions.own') && vm.user?.role === 'dentist' && (
            <Link
              to="/meus-repasses"
              search={{ from: `${localDate().slice(0, 7)}-01`, to: localDate() }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="wallet" />
              Meus repasses
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="clinic-note">
            <span className="status-dot" />
            Ambiente de demonstração
          </div>
          <div className="profile">
            <Avatar name={vm.user?.name ?? 'Juliana Santos'} />
            <div>
              <strong>{vm.user?.name ?? 'Recepção'}</strong>
              <span>{vm.roleLabel}</span>
            </div>
          </div>
          {vm.logoutError && (
            <p role="alert" className="feedback feedback-error">
              {vm.logoutError.message}
            </p>
          )}
          <button
            className="btn btn-secondary w-full mt-3"
            onClick={vm.logout}
            disabled={vm.loggingOut}
          >
            Sair da conta
          </button>
        </div>
      </aside>
      <main id="main" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
