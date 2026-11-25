import type { LayoutMode } from '../../branding/model/types.ts';

export interface AppearanceInput {
  preferredLayout: LayoutMode | 'default';
  highContrastAlerts: boolean;
}
export interface UserAppearance extends AppearanceInput {
  clinicId: string;
  userId: string;
}
export const defaultAppearance = (): AppearanceInput => ({
  preferredLayout: 'default',
  highContrastAlerts: true,
});
export function isAppearance(value: unknown): value is AppearanceInput {
  if (!value || typeof value !== 'object') return false;
  return (
    'preferredLayout' in value &&
    (value.preferredLayout === 'default' ||
      value.preferredLayout === 'light_sidebar' ||
      value.preferredLayout === 'dark_sidebar') &&
    'highContrastAlerts' in value &&
    typeof value.highContrastAlerts === 'boolean'
  );
}
export function resolveLayout(preference: AppearanceInput, clinicDefault: LayoutMode): LayoutMode {
  return preference.preferredLayout === 'default' ? clinicDefault : preference.preferredLayout;
}
export const appearanceCacheKey = (clinicId: string, userId: string) =>
  `odontoflow-appearance:${encodeURIComponent(clinicId)}:${encodeURIComponent(userId)}`;
export function readAppearanceCache(clinicId: string, userId: string): UserAppearance | undefined {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(appearanceCacheKey(clinicId, userId)) ?? 'null',
    );
    if (
      isAppearance(value) &&
      'clinicId' in value &&
      'userId' in value &&
      value.clinicId === clinicId &&
      value.userId === userId
    )
      return { ...value, clinicId, userId };
  } catch {
    /* An unavailable or obsolete cache must not prevent login. */
  }
}
export function writeAppearanceCache(value: UserAppearance) {
  try {
    const key = appearanceCacheKey(value.clinicId, value.userId);
    const serialized = JSON.stringify(value);
    if (localStorage.getItem(key) !== serialized) localStorage.setItem(key, serialized);
  } catch {
    /* The API remains the source of truth when browser storage is unavailable. */
  }
}
