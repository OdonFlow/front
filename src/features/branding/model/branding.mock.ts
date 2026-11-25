import type { Database } from '../../clinic/model/types.ts';
import type { Session } from '../../access/model/types.ts';
import { AccessError, logAccess } from '../../access/model/access.mock.ts';
import { can } from '../../access/model/access.rules.ts';
import {
  defaultBranding,
  type BrandingSaveInput,
  type ClinicBranding,
  type BrandingRecord,
  type AssetKind,
} from './types.ts';
import { validateBranding, darken } from './branding.rules.ts';
import { prepareBrandImage } from './images.ts';
export const demoClinicId = 'demo-clinic';
export function clinicIdOf(db: Database) {
  return db.settings.id ?? demoClinicId;
}
function recordOf(db: Database, clinicId: string): BrandingRecord {
  db.branding ??= {};
  const record = (db.branding[clinicId] ??= {
    config: defaultBranding(),
    assets: {},
    revision: 0,
    updatedAt: null,
  });
  // Older identities keep their palette and assets while gaining the triad defaults.
  record.config = { ...defaultBranding(), ...record.config };
  return record;
}
export function getBranding(db: Database, clinicId = clinicIdOf(db)): ClinicBranding {
  const record = recordOf(db, clinicId);
  return {
    clinicId,
    clinicName: clinicId === clinicIdOf(db) ? db.settings.name : 'Clínica',
    config: record.config,
    revision: record.revision,
    updatedAt: record.updatedAt,
  };
}
export function saveBranding(
  db: Database,
  session: Session,
  input: BrandingSaveInput,
): ClinicBranding {
  if (!can(session, 'settings.manage'))
    throw new AccessError('Somente administradores podem personalizar a marca.', 403);
  const record = recordOf(db, session.clinicId);
  if (input.revision !== record.revision)
    throw new AccessError(
      'A identidade foi alterada por outro administrador. Atualize os dados antes de salvar.',
      409,
    );
  const config = {
    primary: input.primary?.toUpperCase(),
    hover: input.hover ? input.hover.toUpperCase() : darken(input.primary ?? ''),
    secondary: (input.secondary ?? record.config.secondary).toUpperCase(),
    tertiary: (input.tertiary ?? record.config.tertiary).toUpperCase(),
    defaultLayout: input.defaultLayout ?? record.config.defaultLayout,
    fontScale: input.fontScale,
    logo: input.logo,
    icon: input.icon,
  };
  const error = validateBranding(config);
  if (error) throw new AccessError(error);
  for (const kind of ['logo', 'icon'] as const) {
    const asset = config[kind];
    if (asset) {
      const stored = record.assets[asset.id];
      if (!stored)
        throw new AccessError(
          'A imagem não pertence a esta clínica. Faça o upload novamente.',
          403,
        );
      config[kind] = stored;
    }
  }
  record.config = config;
  record.revision++;
  record.updatedAt = new Date().toISOString();
  const retained = new Set([config.logo?.id, config.icon?.id]);
  for (const id of Object.keys(record.assets)) if (!retained.has(id)) delete record.assets[id];
  logAccess(
    db,
    session.user.email,
    'Identidade visual atualizada',
    'Personalização da marca',
    session.user.id,
  );
  return getBranding(db, session.clinicId);
}
export async function uploadBrandAsset(
  db: Database,
  session: Session,
  kind: AssetKind,
  file: Blob & { name?: string },
) {
  if (!can(session, 'settings.manage'))
    throw new AccessError('Seu perfil não pode carregar imagens de marca.', 403);
  if (!['logo', 'icon'].includes(kind)) throw new AccessError('Tipo de imagem inválido.');
  const asset = await prepareBrandImage(file);
  const record = recordOf(db, session.clinicId);
  // Keep current assets and a small number of staged replacements until the identity is saved.
  const protectedIds = new Set([record.config.logo?.id, record.config.icon?.id]);
  const staged = Object.keys(record.assets).filter((id) => !protectedIds.has(id));
  for (const id of staged.slice(0, Math.max(0, staged.length - 1))) delete record.assets[id];
  record.assets[asset.id] = asset;
  return asset;
}
