import type { Database } from '../../clinic/model/types.ts';
import type { Session } from '../../access/model/types.ts';
import { AccessError } from '../../access/model/access.mock.ts';
import {
  defaultAppearance,
  isAppearance,
  appearanceCacheKey,
  type UserAppearance,
} from './appearance.ts';

export function getAppearance(db: Database, session: Session): UserAppearance {
  const saved = db.appearance?.[appearanceCacheKey(session.clinicId, session.user.id)];
  return {
    ...(saved ?? defaultAppearance()),
    clinicId: session.clinicId,
    userId: session.user.id,
  };
}
export function saveAppearance(db: Database, session: Session, input: unknown): UserAppearance {
  if (!isAppearance(input)) throw new AccessError('Preferências de aparência inválidas.');
  if (
    ('clinicId' in input && input.clinicId !== session.clinicId) ||
    ('userId' in input && input.userId !== session.user.id)
  )
    throw new AccessError('Altere somente as preferências do seu perfil.', 403);
  const value: UserAppearance = {
    preferredLayout: input.preferredLayout,
    highContrastAlerts: input.highContrastAlerts,
    clinicId: session.clinicId,
    userId: session.user.id,
  };
  db.appearance ??= {};
  db.appearance[appearanceCacheKey(session.clinicId, session.user.id)] = value;
  return value;
}
