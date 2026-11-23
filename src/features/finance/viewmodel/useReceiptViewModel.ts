import { useReducer, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { receiptsRoute } from '../../../app/router/router';
import { financeOptions } from '../model/finance.queries';
import { financeApi } from '../model/finance.api';
import { patientsOptions, settingsOptions, usersOptions } from '../../clinic/model/clinic.queries';
import { servicesOptions } from '../../services/model/services.queries';
import { toCents, methodKeys, isCents } from '../model/finance.rules';
import { calculateCheckout } from '../model/checkout.rules';
import { localDate } from '../../clinic/model/fixtures';
import { searchText } from '../../clinic/model/validation';
import {
  checkoutReducer,
  initialCheckout,
  paymentDraft,
  type BasketLineDraft,
  type CheckoutDraft,
  type PaymentDraft,
} from './checkoutDraft';
import type {
  CheckoutInput,
  CheckoutLineInput,
  PaymentMethod,
  PaymentPartInput,
  Receivable,
  ReceiptLine,
} from '../model/types';

export function useReceiptViewModel() {
  const search = receiptsRoute.useSearch();
  const navigate = receiptsRoute.useNavigate();
  const client = useQueryClient();
  const query = useQuery(financeOptions);
  const settings = useQuery(settingsOptions);
  const patients = useQuery(patientsOptions);
  const users = useQuery(usersOptions);
  const services = useQuery(servicesOptions);
  const [draft, dispatch] = useReducer(checkoutReducer, search.treatment, initialCheckout);
  const [validationError, setValidationError] = useState<Error | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const mutation = useMutation({
    mutationFn: financeApi.checkout,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['finance'] }),
        client.invalidateQueries({ queryKey: ['records'] }),
        client.invalidateQueries({ queryKey: ['appointments'] }),
      ]);
      setReceiptOpen(draft.printReceipt);
    },
  });
  const appointment = query.data?.appointments?.find((a) => a.id === search.appointment);
  const patientId =
    search.patient ||
    appointment?.patientId ||
    query.data?.pending.find((p) => p.treatmentId === search.treatment)?.patientId ||
    '';
  const patient = patients.data?.find((p) => p.id === patientId);
  const activeShift = query.data?.shifts.find((s) => !s.closing);
  const dentists = users.data?.filter((u) => u.role === 'dentist') ?? [];
  const defaultDentistId = appointment?.dentistId ?? patient?.dentistId ?? dentists[0]?.id ?? '';
  const pendingItems = (query.data?.pending ?? []).filter(
    (r) =>
      (!patientId || r.patientId === patientId) &&
      searchText(`${r.patientName} ${r.procedure} ${r.dentistName}`).includes(searchText(search.q)),
  );
  const lines = draft.lines.map((line) => {
    const pending = query.data?.pending.find((r) => r.treatmentId === line.treatmentId);
    const service = services.data?.find((s) => s.id === line.serviceId);
    const dentistId = line.dentistId || pending?.dentistId || defaultDentistId;
    const basePrice = pending?.unitPriceCents ?? pending?.grossCents ?? service?.priceCents ?? 0;
    const unitPrice = line.unitPrice ?? (basePrice / 100).toFixed(2);
    const quantity = line.quantity ?? String(pending?.quantity ?? 1);
    const parsedUnitPrice = toCents(unitPrice);
    const previewUnitPrice =
      isCents(parsedUnitPrice) && parsedUnitPrice <= 100000000 ? parsedUnitPrice : 0;
    const parsedQuantity = Number(quantity);
    const previewQuantity =
      Number.isInteger(parsedQuantity) && parsedQuantity > 0 && parsedQuantity <= 100
        ? parsedQuantity
        : 0;
    const item: ReceiptLine = {
      treatmentId: pending?.treatmentId ?? line.key,
      patientId,
      patientName: patient?.name ?? '',
      dentistId,
      dentistName: dentists.find((d) => d.id === dentistId)?.name ?? '',
      procedure: pending?.procedure ?? service?.name ?? 'Procedimento indisponível',
      tooth: Number(line.tooth || pending?.tooth || 0),
      grossCents: previewUnitPrice * previewQuantity,
      commissionRate: pending?.commissionRate ?? service?.commissionRate ?? 0,
      serviceId: pending?.serviceId ?? service?.id,
      quantity: previewQuantity,
      unitPriceCents: previewUnitPrice,
      discountCents: 0,
      netCents: 0,
      commissionCents: 0,
    };
    return {
      ...line,
      unitPrice,
      quantity,
      dentistId,
      tooth: String(item.tooth),
      name: item.procedure,
      rate: item.commissionRate,
      item,
      basePrice,
      unavailable: line.treatmentId ? !pending : !service?.active,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.item.grossCents, 0);
  const discountCents = draft.courtesy ? subtotal : toCents(draft.discount) || 0;
  const total = Math.max(0, subtotal - discountCents);
  const payments: PaymentPartInput[] =
    draft.courtesy || total === 0
      ? []
      : draft.payments.map((p) => ({
          method: p.method,
          amountCents: draft.payments.length === 1 ? total : toCents(p.amount) || 0,
          tenderedCents: toCents(p.tendered) || 0,
          installments: p.installments,
          proof: p.proof.trim(),
          destination: p.destination.trim(),
          pixVerified: p.pixVerified,
        }));
  const totals = query.data
    ? calculateCheckout(
        lines.map((l) => l.item),
        Math.min(subtotal, discountCents),
        payments,
        query.data.configuration,
      )
    : undefined;
  const allocated = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const needsAuthorization =
    draft.courtesy ||
    (lines.length > 0 && total === 0) ||
    discountCents > 0 ||
    lines.some(
      (l) =>
        l.item.unitPriceCents !== l.basePrice ||
        (l.treatmentId &&
          l.item.quantity !==
            (query.data?.pending.find((p) => p.treatmentId === l.treatmentId)?.quantity ?? 1)),
    );
  const updateDraft = (patch: Partial<CheckoutDraft>) => {
    setValidationError(null);
    dispatch({ type: 'patch', patch });
  };
  const addPending = (item: Receivable) => {
    setValidationError(null);
    dispatch({
      type: 'add-line',
      line: {
        key: `pending-${item.treatmentId}`,
        treatmentId: item.treatmentId,
        dentistId: item.dentistId,
        tooth: String(item.tooth),
        quantity: String(item.quantity ?? 1),
        unitPrice: ((item.unitPriceCents ?? item.grossCents) / 100).toFixed(2),
      },
    });
  };
  const addService = (id = serviceId) => {
    const service = services.data?.find((s) => s.id === id && s.active);
    if (!service) return;
    dispatch({
      type: 'add-line',
      line: {
        key: crypto.randomUUID(),
        serviceId: id,
        dentistId: defaultDentistId,
        tooth: '0',
        quantity: '1',
        unitPrice: (service.priceCents / 100).toFixed(2),
      },
    });
    setServiceId('');
  };
  const submit = () => {
    if (!patient || !activeShift) return;
    setValidationError(null);
    if (!Number.isFinite(new Date(draft.paidAt).getTime())) {
      setValidationError(new Error('Informe uma data e hora válidas.'));
      return;
    }
    if (lines.some((l) => l.unavailable)) {
      setValidationError(
        new Error(
          'Há um procedimento indisponível na comanda. Remova-o ou atualize as pendências.',
        ),
      );
      return;
    }
    const inputLines: CheckoutLineInput[] = lines.map((line) => ({
      key: line.key,
      treatmentId: line.treatmentId,
      serviceId: line.serviceId,
      dentistId: line.dentistId,
      tooth: Number(line.tooth),
      quantity: Number(line.quantity),
      unitPriceCents: toCents(line.unitPrice),
    }));
    const input: CheckoutInput = {
      requestId,
      patientId,
      appointmentId: search.appointment || undefined,
      shiftId: activeShift.id,
      lines: inputLines,
      payments,
      discountCents: draft.courtesy ? 0 : toCents(draft.discount),
      courtesy: draft.courtesy,
      authorizationReason: draft.authorizationReason,
      authorizedBy: draft.authorizedBy,
      paidAt: new Date(draft.paidAt).toISOString(),
    };
    mutation.mutate(input);
  };
  return {
    search,
    patient,
    patientId,
    patients: patients.data ?? [],
    dentists,
    users: users.data ?? [],
    services: services.data?.filter((s) => s.active) ?? [],
    appointment,
    appointments:
      query.data?.appointments?.filter((a) => !patientId || a.patientId === patientId) ?? [],
    plannedService: services.data?.find((s) => s.id === appointment?.serviceId),
    serviceId,
    setServiceId,
    addService,
    pendingItems,
    addPending,
    lines,
    setLine: (key: string, patch: Partial<BasketLineDraft>) =>
      dispatch({ type: 'line', key, patch }),
    removeLine: (key: string) => dispatch({ type: 'remove-line', key }),
    draft,
    setDraft: updateDraft,
    totals,
    subtotal,
    total,
    needsAuthorization,
    paymentDifference: total - allocated,
    setPayment: (key: string, patch: Partial<PaymentDraft>) =>
      dispatch({ type: 'payment', key, patch }),
    setMethod: (key: string, method: PaymentMethod) => {
      const current = draft.payments.find((p) => p.key === key);
      if (current)
        dispatch({
          type: 'payment',
          key,
          patch: { ...paymentDraft(method), key, amount: current.amount },
        });
    },
    addPayment: () => {
      const method = methodKeys.find((m) => !draft.payments.some((p) => p.method === m));
      if (!method) return;
      const previous =
        draft.payments.length === 1
          ? [{ ...draft.payments[0], amount: (Math.floor(total / 2) / 100).toFixed(2) }]
          : draft.payments;
      updateDraft({
        payments: [
          ...previous,
          {
            ...paymentDraft(method),
            amount:
              draft.payments.length === 1
                ? ((total - Math.floor(total / 2)) / 100).toFixed(2)
                : '0.00',
          },
        ],
      });
    },
    removePayment: (key: string) => dispatch({ type: 'remove-payment', key }),
    updateSearch: (q: string) =>
      void navigate({ search: (prev) => ({ ...prev, q }), replace: true }),
    select: (id: string) => {
      const pending = query.data?.pending.find((p) => p.treatmentId === id);
      void navigate({ search: { q: '', patient: pending?.patientId ?? patientId, treatment: id } });
    },
    selectPatient: (id: string) => void navigate({ search: { q: '', patient: id, treatment: '' } }),
    selectAppointment: (id: string) => {
      const item = query.data?.appointments?.find((a) => a.id === id);
      void navigate({
        search: {
          q: '',
          patient: item?.patientId ?? patientId,
          treatment: '',
          appointment: id || undefined,
        },
      });
    },
    clearPatient: () => void navigate({ search: { q: '', patient: '', treatment: '' } }),
    activeShift,
    canReceive: Boolean(activeShift && activeShift.date === localDate()),
    settings: settings.data,
    pending:
      query.isPending ||
      settings.isPending ||
      patients.isPending ||
      services.isPending ||
      users.isPending,
    error: query.error ?? settings.error ?? patients.error ?? services.error ?? users.error,
    retry: () => {
      void query.refetch();
      void settings.refetch();
      void patients.refetch();
      void services.refetch();
      void users.refetch();
    },
    submit,
    mutation,
    formError: validationError ?? mutation.error,
    receipt: mutation.data,
    receiptOpen,
    showReceipt: () => setReceiptOpen(true),
    closeReceipt: () => setReceiptOpen(false),
    print: () => window.print(),
  };
}
