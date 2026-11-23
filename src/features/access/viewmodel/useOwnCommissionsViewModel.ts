import { useQuery } from '@tanstack/react-query';
import { commissionsRoute } from '../../../app/router/router';
import { accessApi } from '../model/access.api';
export function useOwnCommissionsViewModel() {
  const search = commissionsRoute.useSearch();
  const navigate = commissionsRoute.useNavigate();
  const query = useQuery({
    queryKey: ['finance', 'commissions', 'own', search],
    queryFn: ({ signal }) => accessApi.commissions(search.from, search.to, signal),
    enabled: search.from <= search.to,
  });
  return {
    search,
    data: query.data,
    pending: query.isPending && search.from <= search.to,
    error:
      search.from > search.to
        ? new Error('A data final deve ser posterior à inicial.')
        : query.error,
    retry: () => void query.refetch(),
    updateSearch: (next: Partial<typeof search>) =>
      void navigate({ search: (prev) => ({ ...prev, ...next }) }),
  };
}
