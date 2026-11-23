import { http } from '../../../shared/lib/http/client';
import type { ClinicalService, ServiceInput } from './types';
export const servicesApi = {
  list: async (signal?: AbortSignal) =>
    (await http.get<ClinicalService[]>('/services', { signal })).data,
  save: async ({ id, ...input }: ServiceInput & { id?: string }) =>
    (id
      ? await http.put<ClinicalService>(`/services/${id}`, input)
      : await http.post<ClinicalService>('/services', input)
    ).data,
};
