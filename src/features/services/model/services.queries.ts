import { queryOptions } from '@tanstack/react-query';
import { servicesApi } from './services.api';
export const servicesOptions = queryOptions({
  queryKey: ['services'],
  queryFn: ({ signal }) => servicesApi.list(signal),
});
