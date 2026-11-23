import type { Database, MedicalRecord, User } from '../../clinic/model/types.ts';
import { localDate } from '../../clinic/model/fixtures.ts';
import {
  calculatePayment,
  isCents,
  methodKeys,
  paidReceipt,
  shiftSummary,
  validatePayment,
  receiptItems,
  receiptPayments,
} from './finance.rules.ts';
import type {
  CashShift,
  CloseShiftInput,
  FinanceConfiguration,
  FinanceData,
  OpenShiftInput,
  PaymentInput,
  Receipt,
  Receivable,
  WithdrawalInput,
} from './types.ts';

function operator(db: Database, actor?: User) {
  const user = actor ?? db.users.find((u) => u.role === 'receptionist');
  if (!user) throw new Error('Nenhum operador de recepção está disponível.');
  return user;
}
function financeOf(db: Database): FinanceData {
  if (!db.finance) throw new Error('O módulo financeiro não foi inicializado.');
  return db.finance;
}
function openShift(db: Database, id: string): CashShift {
  const shift = financeOf(db).shifts.find((s) => s.id === id);
  if (!shift || shift.closing)
    throw new Error('O caixa está fechado. Abra um turno para realizar lançamentos.');
  if (shift.date !== localDate())
    throw new Error('Este turno é de outro dia. Finalize a conferência e abra um novo caixa.');
  return shift;
}
export function pendingReceivables(db: Database): Receivable[] {
  const finance = financeOf(db);
  return db.records.flatMap((record) => {
    const patient = db.patients.find((p) => p.id === record.patientId);
    if (!patient) return [];
    return record.treatments
      .filter((t) => t.completed && t.price >= 0 && !paidReceipt(finance.receipts, t.id))
      .map((t) => {
        const dentistId = t.dentistId ?? patient.dentistId;
        return {
          treatmentId: t.id,
          patientId: patient.id,
          patientName: patient.name,
          dentistId,
          dentistName: db.users.find((u) => u.id === dentistId)?.name ?? 'Dentista',
          procedure: t.procedure,
          tooth: t.tooth,
          grossCents: Math.round(t.price * 100),
          commissionRate: t.commissionRate ?? finance.configuration.dentistRates[dentistId] ?? 40,
          serviceId: t.serviceId,
          quantity: t.quantity ?? 1,
          unitPriceCents: t.unitPriceCents ?? Math.round(t.price * 100),
        };
      });
  });
}
export function recordWithPayments(db: Database, record: MedicalRecord): MedicalRecord {
  return {
    ...record,
    treatments: record.treatments.map((t) => {
      const receipt = paidReceipt(financeOf(db).receipts, t.id);
      return { ...t, paymentStatus: receipt ? 'paid' : 'pending', receiptId: receipt?.id };
    }),
  };
}
export function validatePaidTreatments(db: Database, next: MedicalRecord): void {
  for (const receipt of financeOf(db).receipts.filter(
    (r) => r.patientId === next.patientId && !r.reversal,
  )) {
    for (const item of receiptItems(receipt)) {
      const treatment = next.treatments.find((t) => t.id === item.treatmentId);
      const patient = db.patients.find((p) => p.id === next.patientId);
      if (
        !treatment ||
        !treatment.completed ||
        Math.round(treatment.price * 100) !== item.grossCents ||
        treatment.procedure !== item.procedure ||
        treatment.tooth !== item.tooth ||
        (treatment.quantity ?? 1) !== item.quantity ||
        (treatment.commissionRate !== undefined &&
          treatment.commissionRate !== item.commissionRate) ||
        (treatment.dentistId ?? patient?.dentistId) !== item.dentistId
      )
        throw new Error('Estorne o recebimento antes de alterar um procedimento pago.');
    }
  }
}
export function receivePayment(db: Database, input: PaymentInput, actor?: User): Receipt {
  const finance = financeOf(db);
  const shift = openShift(db, input.shiftId);
  const item = pendingReceivables(db).find((r) => r.treatmentId === input.treatmentId);
  if (!item) throw new Error('Procedimento indisponível ou já quitado. Atualize as pendências.');
  const error = validatePayment(item, input, finance.configuration);
  if (error) throw new Error(error);
  const now = new Date();
  const paidAt = new Date(input.paidAt);
  if (
    !Number.isFinite(paidAt.getTime()) ||
    paidAt.getTime() < Math.floor(new Date(shift.openedAt).getTime() / 60000) * 60000 ||
    paidAt.getTime() > now.getTime() ||
    localDate(paidAt) !== shift.date
  )
    throw new Error(
      'A data do recebimento deve estar dentro do turno aberto e não pode ser futura.',
    );
  if (
    input.method !== 'cash' &&
    finance.receipts.some(
      (r) =>
        !r.reversal &&
        localDate(new Date(r.paidAt)) === shift.date &&
        receiptPayments(r).some(
          (p) =>
            p.method === input.method &&
            p.proof.toLowerCase() === input.proof.trim().toLowerCase() &&
            p.destination.toLowerCase() === input.destination.trim().toLowerCase(),
        ),
    )
  )
    throw new Error('Este comprovante já está vinculado a um recebimento.');
  const totals = calculatePayment(item, input, finance.configuration);
  const receipt: Receipt = {
    ...item,
    ...totals,
    id: crypto.randomUUID(),
    number: `REC-${shift.date.replaceAll('-', '')}-${String(finance.receipts.length + 1).padStart(4, '0')}`,
    shiftId: shift.id,
    method: input.method,
    discountCents: input.discountCents,
    tenderedCents: input.method === 'cash' ? input.tenderedCents : totals.settledCents,
    installments: input.installments,
    proof: input.method === 'cash' ? '' : input.proof.trim(),
    destination: input.method === 'cash' ? 'Gaveta do caixa' : input.destination.trim(),
    paidAt: paidAt.toISOString(),
    recordedAt: now.toISOString(),
    operatorId: actor?.id ?? shift.operatorId,
    operatorName: actor?.name ?? shift.operatorName,
  };
  finance.receipts.push(receipt);
  return receipt;
}
export function reverseReceipt(db: Database, id: string, reason: string, actor?: User): Receipt {
  const finance = financeOf(db);
  const receipt = finance.receipts.find((r) => r.id === id);
  if (!receipt || receipt.reversal)
    throw new Error('O recebimento não existe ou já foi estornado.');
  const shift = openShift(db, receipt.shiftId);
  if (reason.trim().length < 5)
    throw new Error('Informe o motivo do estorno com pelo menos 5 caracteres.');
  const cashReturned = receiptPayments(receipt)
    .filter((p) => p.method === 'cash')
    .reduce((sum, p) => sum + p.amountCents, 0);
  if (shiftSummary(finance, shift).expected.cash < cashReturned)
    throw new Error('Não há saldo físico suficiente para devolver este recebimento.');
  receipt.reversal = {
    reason: reason.trim(),
    at: new Date().toISOString(),
    operatorId: operator(db, actor).id,
    operatorName: operator(db, actor).name,
  };
  return receipt;
}
export function createShift(db: Database, input: OpenShiftInput, actor?: User): CashShift {
  const finance = financeOf(db);
  if (finance.shifts.some((s) => !s.closing))
    throw new Error('Já existe um caixa aberto. Encerre o turno atual antes de abrir outro.');
  if (!isCents(input.openingCents)) throw new Error('Informe um saldo inicial válido.');
  const user = operator(db, actor);
  const shift: CashShift = {
    id: crypto.randomUUID(),
    date: localDate(),
    openedAt: new Date().toISOString(),
    operatorId: user.id,
    operatorName: user.name,
    openingCents: input.openingCents,
  };
  finance.shifts.push(shift);
  return shift;
}
export function withdrawCash(db: Database, input: WithdrawalInput, actor?: User) {
  const finance = financeOf(db);
  const shift = openShift(db, input.shiftId);
  if (
    !isCents(input.amountCents) ||
    input.amountCents === 0 ||
    input.amountCents > shiftSummary(finance, shift).expected.cash
  )
    throw new Error('A sangria deve ser positiva e não pode superar o saldo da gaveta.');
  if (!['safe', 'bank'].includes(input.destination) || input.reason.trim().length < 5)
    throw new Error('Informe o destino e a justificativa da sangria.');
  const withdrawal = {
    ...input,
    reason: input.reason.trim(),
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    operatorName: operator(db, actor).name,
  };
  finance.withdrawals.push(withdrawal);
  return withdrawal;
}
export function closeShift(db: Database, input: CloseShiftInput, actor?: User): CashShift {
  const finance = financeOf(db);
  // An old open shift can be reconciled, but cannot receive new transactions.
  const shift = finance.shifts.find((s) => s.id === input.shiftId && !s.closing);
  if (!shift) throw new Error('O turno não existe ou já foi fechado.');
  if (!input.counted || methodKeys.some((method) => !isCents(input.counted[method])))
    throw new Error('Informe os valores conferidos para todas as modalidades.');
  if (input.signature.trim().length < 3)
    throw new Error('Informe o nome do responsável pelo fechamento.');
  const summary = shiftSummary(finance, shift);
  const differences = {
    cash: input.counted.cash - summary.expected.cash,
    debit: input.counted.debit - summary.expected.debit,
    credit: input.counted.credit - summary.expected.credit,
    pix: input.counted.pix - summary.expected.pix,
  };
  if (Object.values(differences).some((value) => value !== 0) && input.reason.trim().length < 5)
    throw new Error('Justifique as divergências antes de fechar o caixa.');
  shift.closing = {
    at: new Date().toISOString(),
    operatorName: operator(db, actor).name,
    signature: input.signature.trim(),
    expected: { ...summary.expected },
    counted: { ...input.counted },
    differences,
    reason: input.reason.trim(),
    totalCents: summary.totalCents,
    feesCents: summary.feesCents,
    commissionCents: summary.commissionCents,
    withdrawnCents: summary.withdrawnCents,
  };
  return shift;
}
export function saveFinanceConfiguration(
  db: Database,
  config: FinanceConfiguration,
): FinanceConfiguration {
  const rates = [
    config.debitRate,
    config.creditRate,
    config.additionalInstallmentRate,
    ...Object.values(config.dentistRates),
  ];
  if (
    rates.some((r) => !Number.isFinite(r) || r < 0 || r > 100) ||
    config.creditRate + config.additionalInstallmentRate * 11 > 100
  )
    throw new Error('Informe percentuais válidos entre 0 e 100.');
  const dentistIds = db.users.filter((u) => u.role === 'dentist').map((u) => u.id);
  if (
    dentistIds.some(
      (id) =>
        typeof config.dentistRates[id] !== 'number' ||
        config.dentistRates[id] +
          Math.max(config.debitRate, config.creditRate + config.additionalInstallmentRate * 11) >
          100,
    )
  )
    throw new Error('As taxas e o repasse do dentista não podem superar 100%.');
  financeOf(db).configuration = structuredClone(config);
  return config;
}
export function createFinanceData(db: Database): FinanceData {
  for (const record of db.records) {
    const dentistId = db.patients.find((p) => p.id === record.patientId)?.dentistId;
    for (const treatment of record.treatments) treatment.dentistId ??= dentistId;
  }
  const user = operator(db);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const finance: FinanceData = {
    configuration: {
      debitRate: 1.8,
      creditRate: 3.5,
      additionalInstallmentRate: 0.5,
      dentistRates: Object.fromEntries(
        db.users.filter((u) => u.role === 'dentist').map((u) => [u.id, 40]),
      ),
    },
    shifts: [
      {
        id: 'shift-demo',
        date: localDate(),
        openedAt: start.toISOString(),
        operatorId: user.id,
        operatorName: user.name,
        openingCents: 20000,
      },
    ],
    receipts: [],
    withdrawals: [],
  };
  const demo = { ...db, finance };
  const methods = ['cash', 'debit', 'credit', 'pix'] as const;
  pendingReceivables(demo)
    .slice(0, 4)
    .forEach((item, index) => {
      receivePayment(demo, {
        treatmentId: item.treatmentId,
        shiftId: 'shift-demo',
        method: methods[index],
        discountCents: 0,
        tenderedCents: item.grossCents + (index === 0 ? 5000 : 0),
        installments: index === 2 ? 3 : 1,
        proof: `DEMO-${index + 1}`,
        destination:
          index === 0
            ? 'Gaveta do caixa'
            : index === 3
              ? 'Conta bancária da clínica'
              : 'POS da recepção',
        paidAt: now.toISOString(),
        pixVerified: true,
      });
    });
  // Existing clinical data is preserved when upgrading a stored demo database.
  return finance;
}
