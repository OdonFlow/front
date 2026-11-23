export type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash';
export interface FinanceConfiguration {
  debitRate: number;
  creditRate: number;
  additionalInstallmentRate: number;
  dentistRates: Record<string, number>;
}
export interface Receivable {
  treatmentId: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  procedure: string;
  tooth: number;
  grossCents: number;
  commissionRate: number;
  serviceId?: string;
  quantity?: number;
  unitPriceCents?: number;
}
export interface PaymentInput {
  treatmentId: string;
  shiftId: string;
  method: PaymentMethod;
  discountCents: number;
  tenderedCents: number;
  installments: number;
  proof: string;
  destination: string;
  paidAt: string;
  pixVerified: boolean;
}
export interface PaymentTotals {
  settledCents: number;
  changeCents: number;
  feeCents: number;
  commissionCents: number;
  clinicCents: number;
  feeRate: number;
}
export interface Receipt extends Receivable, PaymentTotals {
  id: string;
  number: string;
  shiftId: string;
  method: PaymentMethod;
  discountCents: number;
  tenderedCents: number;
  installments: number;
  proof: string;
  destination: string;
  paidAt: string;
  recordedAt: string;
  operatorId: string;
  operatorName: string;
  reversal?: { reason: string; at: string; operatorId: string; operatorName: string };
  items?: ReceiptLine[];
  payments?: ReceiptPayment[];
  appointmentId?: string;
  courtesy?: boolean;
  authorizationReason?: string;
  authorizedBy?: string;
  authorizedByName?: string;
}
export interface ReceiptLine extends Receivable {
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  netCents: number;
  commissionCents: number;
}
export interface PaymentPartInput {
  method: PaymentMethod;
  amountCents: number;
  tenderedCents: number;
  installments: number;
  proof: string;
  destination: string;
  pixVerified: boolean;
}
export interface ReceiptPayment extends PaymentPartInput {
  feeRate: number;
  feeCents: number;
  changeCents: number;
}
export interface CheckoutLineInput {
  key: string;
  treatmentId?: string;
  serviceId?: string;
  dentistId: string;
  tooth: number;
  quantity: number;
  unitPriceCents: number;
}
export interface CheckoutInput {
  requestId: string;
  patientId: string;
  appointmentId?: string;
  shiftId: string;
  lines: CheckoutLineInput[];
  payments: PaymentPartInput[];
  discountCents: number;
  courtesy: boolean;
  authorizationReason: string;
  authorizedBy: string;
  paidAt: string;
}
export type MethodAmounts = Record<PaymentMethod, number>;
export interface CashWithdrawal {
  id: string;
  shiftId: string;
  amountCents: number;
  destination: 'safe' | 'bank';
  reason: string;
  at: string;
  operatorName: string;
}
export interface CashShift {
  id: string;
  date: string;
  openedAt: string;
  operatorId: string;
  operatorName: string;
  openingCents: number;
  closing?: {
    at: string;
    operatorName: string;
    signature: string;
    expected: MethodAmounts;
    counted: MethodAmounts;
    differences: MethodAmounts;
    reason: string;
    totalCents: number;
    feesCents: number;
    commissionCents: number;
    withdrawnCents: number;
  };
}
export interface FinanceData {
  configuration: FinanceConfiguration;
  shifts: CashShift[];
  receipts: Receipt[];
  withdrawals: CashWithdrawal[];
  checkoutRequests?: Record<string, { receiptId: string; fingerprint: string }>;
}
export interface FinanceSnapshot extends FinanceData {
  pending: Receivable[];
  appointments?: import('../../clinic/model/types').Appointment[];
}
export interface OpenShiftInput {
  openingCents: number;
}
export interface WithdrawalInput {
  shiftId: string;
  amountCents: number;
  destination: 'safe' | 'bank';
  reason: string;
}
export interface CloseShiftInput {
  shiftId: string;
  counted: MethodAmounts;
  reason: string;
  signature: string;
}
