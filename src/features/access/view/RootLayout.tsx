import { Outlet, useRouterState } from '@tanstack/react-router';
import { AppLayout } from '../../../app/view/AppLayout';
import { publicPaths } from '../model/access.rules';
import { BrandingRuntime } from '../../branding/view/BrandingRuntime';
export function RootLayout() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <>
      <BrandingRuntime />
      {publicPaths.includes(path) ? (
        <main id="main" className="auth-shell">
          <Outlet />
        </main>
      ) : (
        <AppLayout />
      )}
    </>
  );
}
