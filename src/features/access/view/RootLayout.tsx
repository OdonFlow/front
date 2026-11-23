import { Outlet, useRouterState } from '@tanstack/react-router';
import { AppLayout } from '../../../app/view/AppLayout';
import { publicPaths } from '../model/access.rules';
export function RootLayout() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return publicPaths.includes(path) ? (
    <main id="main" className="auth-shell">
      <Outlet />
    </main>
  ) : (
    <AppLayout />
  );
}
