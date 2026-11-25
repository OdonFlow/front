import { Link, Outlet } from '@tanstack/react-router';
import { Icon } from '../../shared/components/Icon';
import { Avatar } from '../../shared/components/ui';
import { useAppViewModel } from '../viewmodel/useAppViewModel';
import { localDate } from '../../features/clinic/model/fixtures';
import { normalizeDashboardSearch } from '../../features/management/model/periods';
import { ClinicBrand } from '../../features/branding/view/ClinicBrand';
import { SidebarThemeToggle } from '../../features/appearance/view/SidebarThemeToggle';

export function AppLayout() {
  const vm = useAppViewModel();
  return (
    <div
      className={`app-shell ${vm.sidebarCollapsed ? 'sidebar-collapsed' : ''} layout-${vm.appearance.layout === 'dark_sidebar' ? 'dark' : 'light'}-sidebar ${vm.appearance.value.highContrastAlerts ? 'alerts-high-contrast' : ''}`}
    >
      <a href="#main" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="mobile-header">
        <span className="brand mobile-clinic-brand">
          <ClinicBrand name={vm.clinicName} compact />
          <span>{vm.clinicName}</span>
        </span>
        <button
          className="icon-button"
          aria-label="Abrir menu"
          aria-expanded={vm.sidebarOpen}
          aria-controls="app-sidebar"
          onClick={vm.toggleSidebar}
        >
          <Icon name="menu" />
        </button>
      </header>
      {vm.sidebarOpen && (
        <button className="sidebar-overlay" aria-label="Fechar menu" onClick={vm.closeSidebar} />
      )}
      <aside id="app-sidebar" className={`sidebar ${vm.sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <Link
            className="clinic-brand-link"
            to="/"
            aria-label={vm.clinicName}
            title={vm.clinicName}
            onClick={vm.closeSidebar}
          >
            <span className="sidebar-brand-full">
              <ClinicBrand name={vm.clinicName} />
            </span>
            <span className="sidebar-brand-compact">
              <ClinicBrand name={vm.clinicName} compact />
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-control sidebar-collapse-toggle"
            aria-label={vm.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={vm.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-expanded={!vm.sidebarCollapsed}
            aria-controls="sidebar-navigation"
            onClick={vm.toggleSidebarCollapsed}
          >
            <Icon name={vm.sidebarCollapsed ? 'right' : 'left'} size={18} />
          </button>
          <button
            type="button"
            className="sidebar-control sidebar-mobile-close"
            aria-label="Fechar menu lateral"
            onClick={vm.closeSidebar}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="sidebar-caption">ESPAÇO DA CLÍNICA</div>
        <nav id="sidebar-navigation" aria-label="Navegação principal" onClick={vm.closeSidebar}>
          {vm.can('services.view') && (
            <Link
              aria-label="Serviços"
              title="Serviços"
              to="/servicos"
              search={{ q: '', category: '', status: 'active' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="grid" />
              <span className="sidebar-link-label">Serviços</span>
            </Link>
          )}
          {vm.can('agenda.view') && (
            <Link
              aria-label="Agenda"
              title="Agenda"
              to="/agenda"
              search={{ date: localDate(), view: 'all', dentist: '' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="calendar" />
              <span className="sidebar-link-label">Agenda</span>
            </Link>
          )}
          {vm.can('patients.view') && (
            <Link
              aria-label="Pacientes"
              title="Pacientes"
              to="/pacientes"
              search={{ q: '', dentist: '', status: 'all' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="users" />
              <span className="sidebar-link-label">Pacientes</span>
            </Link>
          )}
          {vm.can('records.view') && (
            <Link
              aria-label="Prontuários"
              title="Prontuários"
              to="/prontuarios"
              search={{ patient: '', tab: 'evolution' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="file" />
              <span className="sidebar-link-label">Prontuários</span>
            </Link>
          )}
          {vm.can('finance.view') && (
            <Link
              aria-label="Financeiro"
              title="Financeiro"
              to="/financeiro"
              search={{ date: localDate(), shift: '' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="wallet" />
              <span className="sidebar-link-label">Financeiro</span>
            </Link>
          )}
          {vm.can('management.view') && (
            <Link
              aria-label="Gestão financeira"
              title="Gestão financeira"
              to="/gestao-financeira"
              search={normalizeDashboardSearch({})}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="grid" />
              <span className="sidebar-link-label">Gestão financeira</span>
            </Link>
          )}
          {vm.can('users.manage') && (
            <Link
              aria-label="Dentistas"
              title="Dentistas"
              to="/dentistas"
              activeProps={{ className: 'nav-link active' }}
              className="nav-link"
            >
              <Icon name="user" />
              <span className="sidebar-link-label">Dentistas</span>
            </Link>
          )}
          {vm.can('settings.manage') && (
            <Link
              aria-label="Configurações"
              title="Configurações"
              to="/configuracoes"
              activeProps={{ className: 'nav-link active' }}
              className="nav-link"
            >
              <Icon name="settings" />
              <span className="sidebar-link-label">Configurações</span>
            </Link>
          )}
          {vm.can('users.manage') && (
            <Link
              aria-label="Equipe e usuários"
              title="Equipe e usuários"
              to="/equipe"
              search={{ q: '', role: 'all' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="users" />
              <span className="sidebar-link-label">Equipe e usuários</span>
            </Link>
          )}
          {vm.can('permissions.manage') && (
            <Link
              aria-label="Permissões"
              title="Permissões"
              to="/permissoes"
              search={{ role: 'receptionist' }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="settings" />
              <span className="sidebar-link-label">Permissões</span>
            </Link>
          )}
          {vm.can('commissions.own') && vm.user?.role === 'dentist' && (
            <Link
              aria-label="Meus repasses"
              title="Meus repasses"
              to="/meus-repasses"
              search={{ from: `${localDate().slice(0, 7)}-01`, to: localDate() }}
              activeProps={{ className: 'nav-link active' }}
              activeOptions={{ includeSearch: false }}
              className="nav-link"
            >
              <Icon name="wallet" />
              <span className="sidebar-link-label">Meus repasses</span>
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="clinic-note">
            <span className="status-dot" />
            <span className="sidebar-note-label">Ambiente de demonstração</span>
          </div>
          <div className="profile">
            <Avatar name={vm.user?.name ?? 'Juliana Santos'} />
            <div className="sidebar-profile-details">
              <strong>{vm.user?.name ?? 'Recepção'}</strong>
              <span>{vm.roleLabel}</span>
            </div>
            <SidebarThemeToggle vm={vm.appearance} />
          </div>
          {vm.logoutError && (
            <p role="alert" className="feedback feedback-error">
              {vm.logoutError.message}
            </p>
          )}
          <button
            className="btn btn-secondary sidebar-logout w-full mt-3"
            aria-label="Sair da conta"
            title="Sair da conta"
            onClick={vm.logout}
            disabled={vm.loggingOut}
          >
            <Icon name="logout" size={18} />
            <span className="sidebar-link-label">Sair da conta</span>
          </button>
        </div>
      </aside>
      <main id="main" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
