import { queryOptions } from '@tanstack/react-query';
import { accessApi } from './access.api';
export const sessionOptions = queryOptions({
  queryKey: ['access', 'session'],
  queryFn: ({ signal }) => accessApi.session(signal),
  retry: false,
  staleTime: 15000,
});
export const teamOptions = queryOptions({
  queryKey: ['access', 'team'],
  queryFn: ({ signal }) => accessApi.team(signal),
});
export const policyOptions = queryOptions({
  queryKey: ['access', 'policy'],
  queryFn: ({ signal }) => accessApi.policy(signal),
});
export const logsOptions = queryOptions({
  queryKey: ['access', 'logs'],
  queryFn: ({ signal }) => accessApi.logs(signal),
  refetchInterval: 30000,
});
export const mailboxOptions = queryOptions({
  queryKey: ['access', 'mailbox'],
  queryFn: ({ signal }) => accessApi.mailbox(signal),
  staleTime: 0,
});
