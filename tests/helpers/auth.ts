import type { AxiosInstance } from 'axios';
export async function loginAs(
  http: AxiosInstance,
  email = 'admin@odontoflow.com',
  password = 'Odonto123!',
) {
  const { data } = await http.post<{ demoSessionId: string }>('/auth/login', {
    email,
    password,
    remember: false,
  });
  http.defaults.headers.common['X-Demo-Session'] = data.demoSessionId;
  return data.demoSessionId;
}
