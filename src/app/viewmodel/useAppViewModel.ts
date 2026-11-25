import { useQuery } from '@tanstack/react-query';
import { settingsOptions } from '../../features/clinic/model/clinic.queries';
import { useSessionViewModel } from '../../features/access/viewmodel/useSessionViewModel';
import { roleLabels } from '../../features/access/model/types';
import { useLayoutStore } from '../../shared/stores/layout';
import { useAppearanceViewModel } from '../../features/appearance/viewmodel/useAppearanceViewModel';
export function useAppViewModel() {
  const session = useSessionViewModel();
  const settings = useQuery(settingsOptions);
  const appearance = useAppearanceViewModel();
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useLayoutStore((s) => s.toggleSidebarCollapsed);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const closeSidebar = useLayoutStore((s) => s.closeSidebar);
  return {
    appearance,
    user: session.data?.user,
    roleLabel: session.data ? roleLabels[session.data.user.role] : '',
    can: session.can,
    logout: session.logout,
    loggingOut: session.loggingOut,
    logoutError: session.logoutError,
    clinicName: settings.data?.name ?? 'OdontoFlow',
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    toggleSidebar,
    closeSidebar,
  };
}
