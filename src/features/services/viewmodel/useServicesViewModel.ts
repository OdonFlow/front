import { useState } from 'react';
import { useSession } from '../../access/viewmodel/useSessionViewModel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { servicesRoute } from '../../../app/router/router';
import { servicesOptions } from '../model/services.queries';
import { servicesApi } from '../model/services.api';
import { serviceCategories, type ClinicalService, type ServiceInput } from '../model/types';
import { toCents } from '../../finance/model/finance.rules';
import { searchText } from '../../clinic/model/validation';
import { validateService } from '../model/services.rules';

export function useServicesViewModel() {
  const session = useSession();
  const search = servicesRoute.useSearch();
  const navigate = servicesRoute.useNavigate();
  const client = useQueryClient();
  const query = useQuery(servicesOptions);
  const [editing, setEditing] = useState<ClinicalService | 'new' | null>(null);
  const [price, setPrice] = useState('0.00');
  const [rate, setRate] = useState('40');
  const [validationError, setValidationError] = useState<Error | null>(null);
  const [success, setSuccess] = useState('');
  const mutation = useMutation({
    mutationFn: servicesApi.save,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['services'] }),
        client.invalidateQueries({ queryKey: ['finance'] }),
      ]);
      setEditing(null);
      setSuccess('Serviço salvo com sucesso.');
    },
  });
  const items = (query.data ?? []).filter(
    (s) =>
      searchText(s.name).includes(searchText(search.q)) &&
      (!search.category || s.category === search.category) &&
      (search.status === 'all' || s.active === (search.status === 'active')),
  );
  return {
    canEdit: session.can('services.edit'),
    search,
    updateSearch: (next: Partial<typeof search>) =>
      void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true }),
    services: items,
    total: query.data?.length ?? 0,
    categories: serviceCategories.map((category) => ({
      name: category,
      count: query.data?.filter((s) => s.category === category).length ?? 0,
    })),
    pending: query.isPending,
    error: query.error,
    retry: () => void query.refetch(),
    editing,
    open: (service: ClinicalService | 'new') => {
      if (!session.can('services.edit')) return;
      setEditing(service);
      setPrice(service === 'new' ? '0.00' : (service.priceCents / 100).toFixed(2));
      setRate(service === 'new' ? '40' : String(service.commissionRate));
      setValidationError(null);
      mutation.reset();
      setSuccess('');
    },
    close: () => {
      if (!mutation.isPending) setEditing(null);
    },
    price,
    setPrice,
    rate,
    setRate,
    commissionCents: Math.round(((toCents(price) || 0) * (Number(rate) || 0)) / 100),
    formError: validationError ?? mutation.error,
    saving: mutation.isPending,
    success,
    save: (form: FormData) => {
      const category = serviceCategories.find((c) => c === form.get('category')) ?? 'Clínica Geral';
      const input: ServiceInput = {
        name: String(form.get('name')).trim(),
        category,
        priceCents: toCents(price),
        durationMinutes: Number(form.get('duration')),
        commissionRate: Number(rate),
        active: form.get('active') === 'on',
      };
      const error = validateService(input);
      setValidationError(error ? new Error(error) : null);
      if (!error)
        mutation.mutate({ ...input, ...(editing && editing !== 'new' ? { id: editing.id } : {}) });
    },
  };
}
