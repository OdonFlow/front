import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../access/viewmodel/useSessionViewModel';
import { useBranding } from '../../branding/viewmodel/useBranding';
import { appearanceOptions, saveAppearanceApi } from '../model/appearance.queries';
import {
  defaultAppearance,
  resolveLayout,
  writeAppearanceCache,
  appearanceCacheKey,
  type AppearanceInput,
  type UserAppearance,
} from '../model/appearance';

export function useAppearanceViewModel() {
  const session = useSession();
  const branding = useBranding();
  const clinicId = session.data?.clinicId ?? '';
  const userId = session.data?.user.id ?? '';
  const client = useQueryClient();
  const options = appearanceOptions(clinicId, userId);
  const query = useQuery({ ...options, enabled: Boolean(clinicId && userId) });
  const value: UserAppearance = query.data ?? { ...defaultAppearance(), clinicId, userId };
  const save = useMutation({
    mutationFn: saveAppearanceApi,
    onMutate: async (next) => {
      await client.cancelQueries({ queryKey: options.queryKey });
      const previous = client.getQueryData(options.queryKey) ?? value;
      client.setQueryData(options.queryKey, next);
      writeAppearanceCache(next);
      return previous;
    },
    onError: (_error, _next, previous) => {
      if (previous) {
        client.setQueryData(options.queryKey, previous);
        writeAppearanceCache(previous);
      }
    },
    onSuccess: (saved) => client.setQueryData(options.queryKey, saved),
  });
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === appearanceCacheKey(clinicId, userId))
        void client.invalidateQueries({ queryKey: ['appearance', clinicId, userId] });
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [client, clinicId, userId]);
  const update = (patch: Partial<AppearanceInput>) => save.mutate({ ...value, ...patch });
  const layout = resolveLayout(value, branding.config.defaultLayout);
  return {
    value,
    layout,
    toggleTheme: () =>
      update({ preferredLayout: layout === 'dark_sidebar' ? 'light_sidebar' : 'dark_sidebar' }),
    themeActionLabel: layout === 'dark_sidebar' ? 'Ativar tema claro' : 'Ativar tema escuro',
    clinicDefault: branding.config.defaultLayout,
    user: session.data?.user,
    pending: query.isPending,
    saving: save.isPending,
    error: save.error ?? query.error,
    retry: () => {
      save.reset();
      void query.refetch();
    },
    saved: save.isSuccess,
    setLayout: (preferredLayout: AppearanceInput['preferredLayout']) => update({ preferredLayout }),
    setAlertContrast: (highContrastAlerts: boolean) => update({ highContrastAlerts }),
  };
}
