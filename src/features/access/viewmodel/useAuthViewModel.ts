import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { accessApi } from '../model/access.api';
import { mailboxOptions, sessionOptions } from '../model/access.queries';
import { can, homePath, pathPermission, validatePassword } from '../model/access.rules';
export function useAuthViewModel(
  mode: 'login' | 'recovery' | 'reset',
  token = '',
  destination = '',
) {
  const client = useQueryClient();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<Error | null>(null);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (mode === 'login') {
        const session = await accessApi.login({
          email: String(form.get('email') ?? '').trim(),
          password: String(form.get('password') ?? ''),
          remember: form.get('remember') === 'on',
        });
        await client.cancelQueries();
        client.clear();
        client.setQueryData(sessionOptions.queryKey, session);
        const permission = pathPermission(destination);
        await router.navigate({
          href:
            destination && permission && can(session, permission) ? destination : homePath(session),
        });
        return { message: 'Login realizado.', maskedEmail: '' };
      }
      if (mode === 'recovery') return accessApi.recovery(String(form.get('email') ?? '').trim());
      return {
        ...(await accessApi.reset({ token, password: String(form.get('password') ?? '') })),
        maskedEmail: '',
      };
    },
  });
  return {
    showPassword,
    togglePassword: () => setShowPassword((v) => !v),
    pending: mutation.isPending,
    error: validationError ?? mutation.error,
    success: mutation.data?.message ?? '',
    maskedEmail: mutation.data?.maskedEmail ?? '',
    submit: (form: FormData) => {
      setValidationError(null);
      if (mode === 'reset') {
        const password = String(form.get('password') ?? '');
        const error = validatePassword(password);
        if (error || password !== form.get('confirmation')) {
          setValidationError(new Error(error ?? 'As senhas devem ser iguais.'));
          return;
        }
      }
      mutation.mutate(form);
    },
  };
}
export function useMailboxViewModel() {
  const query = useQuery({
    ...mailboxOptions,
    enabled: import.meta.env.VITE_USE_MOCK_API !== 'false',
  });
  const [now, setNow] = useState(() => Date.now());
  return {
    mails: query.data ?? [],
    pending: query.isPending,
    error: query.error,
    retry: () => {
      setNow(Date.now());
      void query.refetch();
    },
    now,
  };
}
