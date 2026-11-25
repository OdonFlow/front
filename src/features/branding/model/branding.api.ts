import { http } from '../../../shared/lib/http/client';
import type { AssetKind, BrandAsset, BrandingSaveInput, ClinicBranding } from './types';
export const brandingApi = {
  public: async (signal?: AbortSignal) =>
    (await http.get<ClinicBranding>('/public/branding', { signal })).data,
  get: async (clinicId: string, signal?: AbortSignal) =>
    (
      await http.get<ClinicBranding>(`/clinics/${encodeURIComponent(clinicId)}/branding`, {
        signal,
      })
    ).data,
  save: async ({ clinicId, ...input }: BrandingSaveInput & { clinicId: string }) =>
    (await http.put<ClinicBranding>(`/clinics/${encodeURIComponent(clinicId)}/branding`, input))
      .data,
  upload: async ({ clinicId, kind, file }: { clinicId: string; kind: AssetKind; file: File }) => {
    const form = new FormData();
    form.set('kind', kind);
    form.set('file', file);
    return (
      await http.post<BrandAsset>(`/clinics/${encodeURIComponent(clinicId)}/branding/assets`, form)
    ).data;
  },
};
