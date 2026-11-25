import type { Database } from '../../clinic/model/types.ts';
import type { Session } from '../../access/model/types.ts';
import { AccessError } from '../../access/model/access.mock.ts';
import { getBranding, saveBranding, uploadBrandAsset } from './branding.mock.ts';
import type { BrandingSaveInput } from './types.ts';
export async function dispatchBranding(
  db: Database,
  session: Session,
  path: string,
  method: string,
  body: unknown,
) {
  const match = /^\/clinics\/([^/]+)\/branding(\/assets)?$/.exec(path);
  if (!match) return null;
  if (decodeURIComponent(match[1]) !== session.clinicId)
    throw new AccessError('Você não pode acessar a identidade visual de outra clínica.', 403);
  if (method === 'get' && !match[2])
    return { handled: true, data: getBranding(db, session.clinicId), session };
  if (method === 'put' && !match[2])
    return { handled: true, data: saveBranding(db, session, body as BrandingSaveInput), session };
  if (method === 'post' && match[2]) {
    if (!(body instanceof FormData))
      throw new AccessError('Envie a imagem em um formulário multipart.');
    const file = body.get('file');
    const kind = body.get('kind');
    if (!(file instanceof Blob) || (kind !== 'logo' && kind !== 'icon'))
      throw new AccessError('Selecione a imagem e o tipo de logomarca.');
    return {
      handled: true,
      data: await uploadBrandAsset(db, session, kind, file),
      status: 201,
      session,
    };
  }
  throw new AccessError('Operação de marca não encontrada.', 404);
}
export function publicBranding(db: Database) {
  return { handled: true, data: getBranding(db) };
}
