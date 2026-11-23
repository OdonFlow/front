import type {
  FinanceConfiguration,
  PaymentPartInput,
  ReceiptLine,
  ReceiptPayment,
} from './types.ts';
import { calculatePayment, isCents, methodKeys, validatePayment } from './finance.rules.ts';

// Largest-remainder allocation keeps the sum exact even for a one-cent discount.
export function allocateCents(amount: number, weights: number[]): number[] {
  if (!isCents(amount) || weights.some((w) => !isCents(w)))
    throw new Error('Valores inválidos para o rateio.');
  const sum = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (sum === 0n) {
    if (amount) throw new Error('Não é possível ratear um valor sem serviços.');
    return weights.map(() => 0);
  }
  const shares = weights.map((w, index) => ({
    index,
    cents: Number((BigInt(amount) * BigInt(w)) / sum),
    remainder: (BigInt(amount) * BigInt(w)) % sum,
  }));
  let remaining = amount - shares.reduce((total, share) => total + share.cents, 0);
  for (const share of [...shares].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  )) {
    if (!remaining) break;
    share.cents++;
    remaining--;
  }
  return shares.map((s) => s.cents);
}
export function calculateCheckout(
  items: ReceiptLine[],
  discountCents: number,
  payments: PaymentPartInput[],
  configuration: FinanceConfiguration,
) {
  const grossCents = items.reduce((sum, item) => sum + item.grossCents, 0);
  const discounts = allocateCents(
    discountCents,
    items.map((item) => item.grossCents),
  );
  const lines = items.map((item, index) => ({
    ...item,
    discountCents: discounts[index],
    netCents: item.grossCents - discounts[index],
    commissionCents: Math.round(((item.grossCents - discounts[index]) * item.commissionRate) / 100),
  }));
  const methods: ReceiptPayment[] = payments.map((payment) => {
    const dummy = { ...items[0], grossCents: payment.amountCents, commissionRate: 0 };
    const totals = calculatePayment(dummy, { ...payment, discountCents: 0 }, configuration);
    return {
      ...payment,
      feeRate: totals.feeRate,
      feeCents: totals.feeCents,
      changeCents: payment.method === 'cash' ? payment.tenderedCents - payment.amountCents : 0,
    };
  });
  const settledCents = grossCents - discountCents;
  const feeCents = methods.reduce((sum, payment) => sum + payment.feeCents, 0);
  const commissionCents = lines.reduce((sum, line) => sum + line.commissionCents, 0);
  const commissions = Object.values(
    lines.reduce<Record<string, { dentistId: string; name: string; cents: number }>>(
      (result, item) => {
        result[item.dentistId] ??= { dentistId: item.dentistId, name: item.dentistName, cents: 0 };
        result[item.dentistId].cents += item.commissionCents;
        return result;
      },
      {},
    ),
  );
  return {
    lines,
    payments: methods,
    grossCents,
    settledCents,
    feeCents,
    commissionCents,
    clinicCents: settledCents - feeCents - commissionCents,
    commissions,
  };
}
export function validatePaymentParts(
  payments: PaymentPartInput[],
  totalCents: number,
  configuration: FinanceConfiguration,
): void {
  if (!Array.isArray(payments) || payments.length > 4)
    throw new Error('Informe até quatro meios de pagamento.');
  if (totalCents === 0) {
    if (payments.length) throw new Error('Cortesias não devem gerar movimentação financeira.');
    return;
  }
  if (!payments.length || payments.reduce((sum, p) => sum + p.amountCents, 0) !== totalCents)
    throw new Error('A soma dos meios de pagamento deve ser igual ao total a cobrar.');
  const used = new Set<string>();
  for (const payment of payments) {
    if (!methodKeys.includes(payment.method) || used.has(payment.method))
      throw new Error('Use cada meio de pagamento apenas uma vez.');
    used.add(payment.method);
    if (!isCents(payment.amountCents) || !payment.amountCents)
      throw new Error('Informe um valor positivo para cada meio de pagamento.');
    const error = validatePayment(
      {
        treatmentId: '',
        patientId: '',
        patientName: '',
        dentistId: '',
        dentistName: '',
        procedure: '',
        tooth: 0,
        grossCents: payment.amountCents,
        commissionRate: 0,
      },
      { ...payment, treatmentId: '', shiftId: '', paidAt: '', discountCents: 0 },
      configuration,
    );
    if (error) throw new Error(error);
  }
}
