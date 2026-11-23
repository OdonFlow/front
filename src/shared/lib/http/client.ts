import axios from 'axios';
export class HttpError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
});
if (import.meta.env.VITE_USE_MOCK_API !== 'false') {
  http.defaults.adapter = async (config) => (await import('./mockAdapter')).mockAdapter(config);
}
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const message = axios.isAxiosError<{ message?: string }>(error)
      ? (error.response?.data?.message ??
        (error.code === 'ECONNABORTED'
          ? 'A conexão demorou demais. Tente novamente.'
          : 'Não foi possível acessar a API. Verifique sua conexão.'))
      : 'Ocorreu um erro inesperado.';
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (
      status === 401 &&
      axios.isAxiosError(error) &&
      !error.config?.url?.startsWith('/auth/') &&
      typeof window !== 'undefined'
    )
      window.dispatchEvent(new Event('odontoflow:session-expired'));
    return Promise.reject(new HttpError(message, status));
  },
);
