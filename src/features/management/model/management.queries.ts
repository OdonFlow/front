import { queryOptions } from '@tanstack/react-query';
import { managementApi } from './management.api';
import type { DashboardSearch } from './types';
export const dashboardOptions = (search: DashboardSearch) =>
  queryOptions({
    queryKey: ['finance', 'management', search],
    queryFn: ({ signal }) => managementApi.dashboard(search, signal),
  });
