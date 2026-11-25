import { queryOptions } from '@tanstack/react-query';
import { brandingApi } from './branding.api';
export const brandingOptions = (clinicId: string) =>
  queryOptions({
    queryKey: ['branding', clinicId],
    queryFn: async ({ signal }) => {
      const result = await brandingApi.get(clinicId, signal);
      if (result.clinicId !== clinicId)
        throw new Error('A identidade recebida não corresponde à clínica da sessão.');
      return result;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
export const publicBrandingOptions = queryOptions({
  queryKey: ['branding', 'public'],
  queryFn: ({ signal }) => brandingApi.public(signal),
  staleTime: 15000,
});
