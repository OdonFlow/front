import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { publicPaths } from '../../access/model/access.rules';
import { sessionOptions } from '../../access/model/access.queries';
import { brandingOptions, publicBrandingOptions } from '../model/branding.queries';
import { defaultBranding } from '../model/types';
export function useBranding() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const session = useQuery(sessionOptions);
  const query = useQuery(
    session.data && !publicPaths.includes(path)
      ? brandingOptions(session.data.clinicId)
      : publicBrandingOptions,
  );
  return {
    ...query,
    config: query.data?.config ?? defaultBranding(),
    clinicName: query.data?.clinicName ?? 'OdontoFlow',
  };
}
