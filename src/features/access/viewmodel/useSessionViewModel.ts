import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { sessionOptions } from '../model/access.queries';
import { accessApi } from '../model/access.api';
import { can } from '../model/access.rules';
import type { Permission } from '../model/types';
export function useSession() {
  const query = useQuery(sessionOptions);
  return { ...query, can: (permission: Permission) => can(query.data, permission) };
}
export function useSessionViewModel() {
  const query = useQuery({ ...sessionOptions, refetchInterval: 15000 });
  const client = useQueryClient();
  const router = useRouter();
  const logout = useMutation({
    mutationFn: accessApi.logout,
    onSuccess: async () => {
      client.clear();
      client.setQueryData(sessionOptions.queryKey, null);
      await router.navigate({ to: '/login', search: { redirect: '', reason: '' } });
    },
  });
  useEffect(() => {
    const session = query.data;
    if (!session) return;
    let lastActivity = Date.now();
    let lastPing = 0;
    const expire = () => {
      client.clear();
      client.setQueryData(sessionOptions.queryKey, null);
      void router.navigate({ to: '/login', search: { redirect: '', reason: 'expired' } });
    };
    const activity = () => {
      const now = Date.now();
      lastActivity = now;
      if (now - lastPing > 30000) {
        lastPing = now;
        void accessApi.activity().catch(() => expire());
      }
    };
    const check = () => {
      if (
        Date.now() - lastActivity >= session.idleMinutes * 60000 ||
        Date.now() >= session.expiresAt
      ) {
        void accessApi.logout().then(expire, expire);
      }
    };
    const timer = setInterval(check, 5000);
    for (const event of ['pointerdown', 'keydown', 'scroll', 'touchstart'])
      window.addEventListener(event, activity, { passive: true });
    window.addEventListener('odontoflow:session-expired', expire);
    return () => {
      clearInterval(timer);
      for (const event of ['pointerdown', 'keydown', 'scroll', 'touchstart'])
        window.removeEventListener(event, activity);
      window.removeEventListener('odontoflow:session-expired', expire);
    };
  }, [
    query.data?.user.id,
    query.data?.idleMinutes,
    query.data?.expiresAt,
    client,
    router,
    query.data,
  ]);
  // Session polling detects offboarding or password reset in another tab/device.
  useEffect(() => {
    if (query.data === null) {
      client.removeQueries({
        predicate: (q) => q.queryKey[0] !== 'access' || q.queryKey[1] !== 'session',
      });
      void router.invalidate();
    }
  }, [query.data, client, router]);
  useEffect(() => {
    if (query.data?.permissions) void router.invalidate();
  }, [query.data?.permissions, router]);
  return {
    ...query,
    can: (permission: Permission) => can(query.data, permission),
    logout: () => logout.mutate(),
    loggingOut: logout.isPending,
    logoutError: logout.error,
  };
}
