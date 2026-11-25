import { queryOptions } from '@tanstack/react-query';
import { http } from '../../../shared/lib/http/client';
import {
  isAppearance,
  readAppearanceCache,
  writeAppearanceCache,
  type UserAppearance,
} from './appearance';

function validateScope(value: UserAppearance, clinicId: string, userId: string) {
  if (!isAppearance(value) || value.clinicId !== clinicId || value.userId !== userId)
    throw new Error('Não foi possível identificar as preferências deste perfil.');
  writeAppearanceCache(value);
  return value;
}
export const appearanceOptions = (clinicId: string, userId: string) =>
  queryOptions({
    queryKey: ['appearance', clinicId, userId] as const,
    queryFn: async ({ signal }) => {
      const { data } = await http.get<UserAppearance>('/profiles/me/preferences', { signal });
      return validateScope(data, clinicId, userId);
    },
    initialData: () => readAppearanceCache(clinicId, userId),
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });
export async function saveAppearanceApi(value: UserAppearance) {
  const { data } = await http.put<UserAppearance>('/profiles/me/preferences', value);
  return validateScope(data, value.clinicId, value.userId);
}
