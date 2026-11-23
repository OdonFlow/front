import type { PaymentMethod } from '../model/types';
import { localDate } from '../../clinic/model/fixtures';

export interface BasketLineDraft {
  key: string;
  treatmentId?: string;
  serviceId?: string;
  dentistId: string;
  tooth: string;
  quantity?: string;
  unitPrice?: string;
}
export interface PaymentDraft {
  key: string;
  method: PaymentMethod;
  amount: string;
  tendered: string;
  installments: number;
  proof: string;
  destination: string;
  pixVerified: boolean;
}
export interface CheckoutDraft {
  lines: BasketLineDraft[];
  payments: PaymentDraft[];
  discount: string;
  courtesy: boolean;
  authorizationReason: string;
  authorizedBy: string;
  paidAt: string;
  printReceipt: boolean;
}
export type CheckoutAction =
  | { type: 'patch'; patch: Partial<CheckoutDraft> }
  | { type: 'add-line'; line: BasketLineDraft }
  | { type: 'line'; key: string; patch: Partial<BasketLineDraft> }
  | { type: 'remove-line'; key: string }
  | { type: 'payment'; key: string; patch: Partial<PaymentDraft> }
  | { type: 'remove-payment'; key: string };
export function paymentDraft(method: PaymentMethod = 'debit'): PaymentDraft {
  return {
    key: crypto.randomUUID(),
    method,
    amount: '',
    tendered: '',
    installments: 1,
    proof: '',
    destination:
      method === 'cash'
        ? 'Gaveta do caixa'
        : method === 'pix'
          ? 'Conta bancária da clínica'
          : 'POS da recepção',
    pixVerified: false,
  };
}
export function initialCheckout(treatmentId: string): CheckoutDraft {
  const now = new Date();
  return {
    lines: treatmentId
      ? [{ key: `pending-${treatmentId}`, treatmentId, dentistId: '', tooth: '' }]
      : [],
    payments: [paymentDraft()],
    discount: '0.00',
    courtesy: false,
    authorizationReason: '',
    authorizedBy: '',
    paidAt: `${localDate(now)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    printReceipt: true,
  };
}
export function checkoutReducer(state: CheckoutDraft, action: CheckoutAction): CheckoutDraft {
  if (action.type === 'patch') return { ...state, ...action.patch };
  if (action.type === 'add-line')
    return state.lines.some((l) => l.treatmentId && l.treatmentId === action.line.treatmentId)
      ? state
      : { ...state, lines: [...state.lines, action.line] };
  if (action.type === 'line')
    return {
      ...state,
      lines: state.lines.map((l) => (l.key === action.key ? { ...l, ...action.patch } : l)),
    };
  if (action.type === 'remove-line')
    return { ...state, lines: state.lines.filter((l) => l.key !== action.key) };
  if (action.type === 'payment')
    return {
      ...state,
      payments: state.payments.map((p) => (p.key === action.key ? { ...p, ...action.patch } : p)),
    };
  return { ...state, payments: state.payments.filter((p) => p.key !== action.key) };
}
