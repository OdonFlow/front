import type {
  CashShift,
  FinanceConfiguration,
  FinanceData,
  MethodAmounts,
  PaymentInput,
  PaymentMethod,
  Receivable,
  Receipt,
  ReceiptLine,
  ReceiptPayment,
} from './types.ts';

export const methodLabels: Record<PaymentMethod, string> = {
  pix: 'Pix bancário',
  debit: 'Cartão de débito',
  credit: 'Cartão de crédito',
  cash: 'Dinheiro em espécie',
};
export const methodKeys: PaymentMethod[] = ['cash', 'debit', 'credit', 'pix'];
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export function toCents(value: string): number {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return Number.NaN;
  const [whole, decimal = ''] = value.trim().replace(',', '.').split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
}
export function isCents(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
export function emptyAmounts(): MethodAmounts {
  return { cash: 0, debit: 0, credit: 0, pix: 0 };
}
export function calculatePayment(
  item: Receivable,
  input: Pick<PaymentInput, 'method' | 'discountCents' | 'tenderedCents' | 'installments'>,
  config: FinanceConfiguration,
) {
  const settledCents = item.grossCents - input.discountCents;
  const feeRate =
    input.method === 'debit'
      ? config.debitRate
      : input.method === 'credit'
        ? config.creditRate + config.additionalInstallmentRate * (input.installments - 1)
        : 0;
  const feeCents = Math.round((settledCents * feeRate) / 100);
  const commissionCents = Math.round((settledCents * item.commissionRate) / 100);
  return {
    settledCents,
    changeCents: input.method === 'cash' ? input.tenderedCents - settledCents : 0,
    feeCents,
    commissionCents,
    clinicCents: settledCents - feeCents - commissionCents,
    feeRate,
  };
}
export function shiftSummary(finance: FinanceData, shift: CashShift) {
  const receipts = finance.receipts.filter((r) => r.shiftId === shift.id);
  const active = receipts.filter((r) => !r.reversal);
  const withdrawals = finance.withdrawals.filter((w) => w.shiftId === shift.id);
  const amounts = emptyAmounts();
  for (const receipt of active)
    for (const payment of receiptPayments(receipt)) amounts[payment.method] += payment.amountCents;
  const totalCents = active.reduce((sum, r) => sum + r.settledCents, 0);
  const withdrawnCents = withdrawals.reduce((sum, w) => sum + w.amountCents, 0);
  const expected = { ...amounts, cash: shift.openingCents + amounts.cash - withdrawnCents };
  return {
    receipts,
    active,
    withdrawals,
    amounts,
    expected,
    totalCents,
    withdrawnCents,
    feesCents: active.reduce((sum, r) => sum + r.feeCents, 0),
    commissionCents: active.reduce((sum, r) => sum + r.commissionCents, 0),
  };
}
export function validatePayment(
  item: Receivable,
  input: PaymentInput,
  config: FinanceConfiguration,
): string | undefined {
  if (!methodKeys.includes(input.method)) return 'Selecione um meio de pagamento válido.';
  if (!isCents(input.discountCents) || input.discountCents >= item.grossCents)
    return 'O desconto deve ser menor que o valor do procedimento.';
  if (
    !Number.isInteger(input.installments) ||
    input.installments < 1 ||
    input.installments > 12 ||
    (input.method !== 'credit' && input.installments !== 1)
  )
    return 'Somente o crédito permite parcelamento, de 1 a 12 vezes.';
  if (
    !isCents(input.tenderedCents) ||
    (input.method === 'cash' && input.tenderedCents < item.grossCents - input.discountCents)
  )
    return 'O valor entregue não cobre o total a receber.';
  if (input.method !== 'cash' && !input.proof.trim())
    return 'Informe o NSU ou código do comprovante externo.';
  if (!input.destination.trim()) return 'Informe o destino do recebimento.';
  if (input.method === 'pix' && !input.pixVerified)
    return 'Confirme o crédito do Pix na conta bancária antes de dar baixa.';
  const totals = calculatePayment(item, input, config);
  if (!Number.isFinite(totals.feeCents) || totals.clinicCents < 0)
    return 'As taxas e o repasse não podem superar o valor liquidado.';
}
export function paidReceipt(receipts: Receipt[], treatmentId: string): Receipt | undefined {
  return receipts.find(
    (r) => !r.reversal && receiptItems(r).some((item) => item.treatmentId === treatmentId),
  );
}
export function receiptItems(receipt: Receipt): ReceiptLine[] {
  return (
    receipt.items ?? [
      {
        treatmentId: receipt.treatmentId,
        patientId: receipt.patientId,
        patientName: receipt.patientName,
        dentistId: receipt.dentistId,
        dentistName: receipt.dentistName,
        procedure: receipt.procedure,
        tooth: receipt.tooth,
        grossCents: receipt.grossCents,
        commissionRate: receipt.commissionRate,
        serviceId: receipt.serviceId,
        quantity: receipt.quantity ?? 1,
        unitPriceCents: receipt.unitPriceCents ?? receipt.grossCents,
        discountCents: receipt.discountCents,
        netCents: receipt.settledCents,
        commissionCents: receipt.commissionCents,
      },
    ]
  );
}
export function receiptPayments(receipt: Receipt): ReceiptPayment[] {
  return (
    receipt.payments ?? [
      {
        method: receipt.method,
        amountCents: receipt.settledCents,
        tenderedCents: receipt.tenderedCents,
        installments: receipt.installments,
        proof: receipt.proof,
        destination: receipt.destination,
        pixVerified: receipt.method === 'pix',
        feeRate: receipt.feeRate,
        feeCents: receipt.feeCents,
        changeCents: receipt.changeCents,
      },
    ]
  );
}
