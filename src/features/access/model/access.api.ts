import { http, HttpError } from '../../../shared/lib/http/client';
import type { User } from '../../clinic/model/types';
import type {
  Session,
  AccessMail,
  AccessLog,
  Role,
  PermissionSet,
  AccessSettings,
  TeamInput,
} from './types';
import type { ownCommissions } from './authorization';
export interface PolicyResponse {
  policy: Record<Role, PermissionSet>;
  settings: AccessSettings;
}
export const accessApi = {
  session: async (signal?: AbortSignal): Promise<Session | null> => {
    try {
      return (await http.get<Session>('/auth/session', { signal })).data;
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) return null;
      throw error;
    }
  },
  login: async (input: { email: string; password: string; remember: boolean }) =>
    (await http.post<{ session: Session }>('/auth/login', input)).data.session,
  logout: async () => {
    await http.post('/auth/logout');
  },
  activity: async () => {
    await http.post('/auth/activity');
  },
  recovery: async (email: string) =>
    (await http.post<{ message: string; maskedEmail: string }>('/auth/recovery', { email })).data,
  reset: async (input: { token: string; password: string }) =>
    (await http.post<{ message: string }>('/auth/reset', input)).data,
  mailbox: async (signal?: AbortSignal) =>
    (await http.get<AccessMail[]>('/auth/demo-mailbox', { signal })).data,
  team: async (signal?: AbortSignal) => (await http.get<User[]>('/team', { signal })).data,
  saveUser: async ({ id, ...input }: TeamInput & { id?: string }) =>
    (id ? await http.put<User>(`/team/${id}`, input) : await http.post<User>('/team', input)).data,
  invite: async (id: string) => (await http.post(`/team/${id}/reset`)).data,
  policy: async (signal?: AbortSignal) =>
    (await http.get<PolicyResponse>('/access/policy', { signal })).data,
  savePolicy: async (input: { role: Role; policy: PermissionSet; settings: AccessSettings }) =>
    (await http.put<PolicyResponse>('/access/policy', input)).data,
  logs: async (signal?: AbortSignal) =>
    (await http.get<AccessLog[]>('/access/logs', { signal })).data,
  commissions: async (from: string, to: string, signal?: AbortSignal) =>
    (
      await http.get<ReturnType<typeof ownCommissions>>('/commissions/own', {
        params: { from, to },
        signal,
      })
    ).data,
};
