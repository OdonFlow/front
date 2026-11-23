import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsOptions } from '../../clinic/model/clinic.queries';
import { clinicApi } from '../../clinic/model/clinic.api';
export function useSettingsViewModel() {
  const query = useQuery(settingsOptions);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: clinicApi.saveSettings,
    onSuccess: async (settings) => {
      client.setQueryData(settingsOptions.queryKey, settings);
      await client.invalidateQueries({ queryKey: ['settings'] });
    },
  });
  return {
    settings: query.data,
    pending: query.isPending,
    error: query.error,
    retry: () => void query.refetch(),
    mutation,
    save: (form: FormData) =>
      mutation.mutate({
        name: String(form.get('name')).trim(),
        phone: String(form.get('phone')).trim(),
        email: String(form.get('email')).trim(),
        address: String(form.get('address')).trim(),
        openingTime: String(form.get('openingTime')),
        closingTime: String(form.get('closingTime')),
        slotDuration: Number(form.get('slotDuration')),
      }),
  };
}
