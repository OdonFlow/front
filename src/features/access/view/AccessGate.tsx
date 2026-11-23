import type { ReactNode } from 'react';
import type { Permission } from '../model/types';
import { useSession } from '../viewmodel/useSessionViewModel';
export function AccessGate({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const session = useSession();
  return session.can(permission) ? children : null;
}
