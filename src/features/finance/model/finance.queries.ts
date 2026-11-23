import { queryOptions } from '@tanstack/react-query';
import { financeApi } from './finance.api';
export const financeOptions = queryOptions({
  queryKey: ['finance'],
  queryFn: ({ signal }) => financeApi.snapshot(signal),
});
