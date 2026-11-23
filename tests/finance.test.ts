import { test } from 'node:test';
import { loginAs } from './helpers/auth.ts';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createDatabase } from '../src/features/clinic/model/fixtures.ts';
import {
  calculatePayment,
  emptyAmounts,
  money,
  shiftSummary,
  toCents,
} from '../src/features/finance/model/finance.rules.ts';
import {
  closeShift,
  createFinanceData,
  createShift,
  pendingReceivables,
  receivePayment,
  recordWithPayments,
  reverseReceipt,
  saveFinanceConfiguration,
  validatePaidTreatments,
  withdrawCash,
} from '../src/features/finance/model/finance.mock.ts';
import type { FinanceSnapshot, PaymentInput } from '../src/features/finance/model/types.ts';
import type { MedicalRecord } from '../src/features/clinic/model/types.ts';
import { mockAdapter } from '../src/shared/lib/http/mockAdapter.ts';

function setup() {
  const db = createDatabase();
  const finance = createFinanceData(db);
  db.finance = finance;
  const item = pendingReceivables(db)[0];
  const shift = finance.shifts[0];
  const input: PaymentInput = {
    treatmentId: item.treatmentId,
    shiftId: shift.id,
    method: 'debit',
    discountCents: 0,
    tenderedCents: 0,
    installments: 1,
    proof: 'TEST-NSU-1',
    destination: 'POS da recepção',
    paidAt: new Date().toISOString(),
    pixVerified: false,
  };
  return { db, finance, item, shift, input };
}
test('valores monetários preservam centavos e rejeitam formatos ambíguos', () => {
  assert.equal(toCents('280,10'), 28010);
  assert.equal(toCents('0.01'), 1);
  assert.equal(toCents('300'), 30000);
  assert.equal(Number.isNaN(toCents('1.234,56')), true);
  assert.equal(Number.isNaN(toCents('-10')), true);
  assert.equal(Number.isNaN(toCents('1.234')), true);
  assert.match(money(28010), /280,10/);
});
test('conclusão de procedimento gera pendência e preserva o dentista executor', () => {
  const { db, item } = setup();
  const record = db.records.find((r) => r.patientId === item.patientId);
  assert.ok(record);
  const treatment = record.treatments.find((t) => !t.completed);
  assert.ok(treatment);
  assert.equal(
    pendingReceivables(db).some((r) => r.treatmentId === treatment.id),
    false,
  );
  treatment.completed = true;
  assert.equal(
    pendingReceivables(db).some((r) => r.treatmentId === treatment.id),
    true,
  );
  const patient = db.patients.find((p) => p.id === item.patientId);
  assert.ok(patient);
  patient.dentistId = 'another-dentist';
  assert.equal(
    pendingReceivables(db).find((r) => r.treatmentId === item.treatmentId)?.dentistId,
    item.dentistId,
  );
});
test('crédito parcelado quita integralmente, provisiona taxa e repasse após desconto', () => {
  const { db, finance, item, input } = setup();
  const receipt = receivePayment(db, {
    ...input,
    method: 'credit',
    installments: 3,
    discountCents: 5000,
  });
  assert.equal(receipt.settledCents, item.grossCents - 5000);
  assert.equal(receipt.feeRate, 4.5);
  assert.equal(receipt.feeCents, Math.round(receipt.settledCents * 0.045));
  assert.equal(receipt.commissionCents, Math.round(receipt.settledCents * 0.4));
  assert.equal(
    pendingReceivables(db).some((r) => r.treatmentId === item.treatmentId),
    false,
  );
  const record = db.records.find((r) => r.patientId === item.patientId);
  assert.ok(record);
  assert.equal(
    recordWithPayments(db, record).treatments.find((t) => t.id === item.treatmentId)?.paymentStatus,
    'paid',
  );
  assert.throws(() => receivePayment(db, input), /já quitado/);
  const original = receipt.feeCents;
  saveFinanceConfiguration(db, { ...finance.configuration, creditRate: 5 });
  assert.equal(receipt.feeCents, original);
});
test('dinheiro calcula troco e movimenta apenas valor líquido na gaveta', () => {
  const { db, finance, shift, input, item } = setup();
  const before = shiftSummary(finance, shift).expected.cash;
  const receipt = receivePayment(db, {
    ...input,
    method: 'cash',
    tenderedCents: item.grossCents + 2000,
  });
  assert.equal(receipt.changeCents, 2000);
  assert.equal(receipt.feeCents, 0);
  assert.equal(shiftSummary(finance, shift).expected.cash, before + item.grossCents);
  assert.equal(receipt.proof, '');
});
test('baixa valida NSU, confirmação Pix, parcelas, valor entregue e data', () => {
  const { db, input, item } = setup();
  assert.throws(() => receivePayment(db, { ...input, proof: '' }), /comprovante/);
  assert.throws(
    () => receivePayment(db, { ...input, method: 'pix', pixVerified: false }),
    /Confirme/,
  );
  assert.throws(
    () => receivePayment(db, { ...input, method: 'cash', tenderedCents: 1 }),
    /não cobre/,
  );
  assert.throws(() => receivePayment(db, { ...input, discountCents: item.grossCents }), /desconto/);
  assert.throws(() => receivePayment(db, { ...input, installments: 3 }), /Somente o crédito/);
  assert.throws(() => receivePayment(db, { ...input, method: 'credit', installments: 13 }), /12/);
  assert.throws(() => receivePayment(db, { ...input, paidAt: '2999-01-01T12:00:00Z' }), /data/);
  assert.throws(() => receivePayment(db, { ...input, paidAt: 'invalid' }), /data/);
  const receipt = receivePayment(db, { ...input, method: 'pix', pixVerified: true });
  assert.equal(receipt.method, 'pix');
});
test('comprovante não pode ser usado em duas baixas e repetição concorrente não duplica', () => {
  const { db, input } = setup();
  receivePayment(db, input);
  const next = pendingReceivables(db)[0];
  assert.throws(
    () => receivePayment(db, { ...input, treatmentId: next.treatmentId }),
    /já está vinculado/,
  );
});
test('procedimentos pagos não podem ser reabertos nem alterar valor ou executor', () => {
  const { db, input, item } = setup();
  receivePayment(db, input);
  const record = db.records.find((r) => r.patientId === item.patientId);
  assert.ok(record);
  validatePaidTreatments(db, record);
  for (const changes of [{ completed: false }, { price: 1 }, { dentistId: 'other' }]) {
    const next = structuredClone(record);
    Object.assign(next.treatments.find((t) => t.id === item.treatmentId) ?? {}, changes);
    assert.throws(() => validatePaidTreatments(db, next), /Estorne/);
  }
});
test('estorno mantém trilha de auditoria, remove repasse e reabre pendência', () => {
  const { db, finance, shift, input, item } = setup();
  const before = shiftSummary(finance, shift);
  const receipt = receivePayment(db, input);
  reverseReceipt(db, receipt.id, 'Cancelamento do recebimento de teste');
  const summary = shiftSummary(finance, shift);
  assert.equal(summary.totalCents, before.totalCents);
  assert.equal(summary.commissionCents, before.commissionCents);
  assert.equal(summary.feesCents, before.feesCents);
  assert.ok(finance.receipts.find((r) => r.id === receipt.id)?.reversal?.operatorName);
  assert.ok(pendingReceivables(db).some((r) => r.treatmentId === item.treatmentId));
  assert.throws(() => reverseReceipt(db, receipt.id, 'Novamente'), /já foi estornado/);
});
test('sangria controla saldo, destino e justificativa; impede devolução sem dinheiro', () => {
  const { db, finance, shift } = setup();
  const balance = shiftSummary(finance, shift).expected.cash;
  assert.throws(
    () =>
      withdrawCash(db, {
        shiftId: shift.id,
        amountCents: balance + 1,
        destination: 'safe',
        reason: 'Transferência ao cofre',
      }),
    /saldo/,
  );
  assert.throws(
    () =>
      withdrawCash(db, { shiftId: shift.id, amountCents: 100, destination: 'bank', reason: '' }),
    /justificativa/,
  );
  withdrawCash(db, {
    shiftId: shift.id,
    amountCents: balance,
    destination: 'safe',
    reason: 'Transferência ao cofre',
  });
  assert.equal(shiftSummary(finance, shift).expected.cash, 0);
  const cashReceipt = finance.receipts.find((r) => r.method === 'cash');
  assert.ok(cashReceipt);
  assert.throws(() => reverseReceipt(db, cashReceipt.id, 'Devolver pagamento'), /saldo físico/);
});
test('fechamento exige conferência e justificativa por modalidade e bloqueia alterações', () => {
  const { db, finance, shift, input } = setup();
  const expected = shiftSummary(finance, shift).expected;
  const counted = { ...expected, debit: expected.debit + 100, cash: expected.cash - 100 };
  assert.throws(
    () => closeShift(db, { shiftId: shift.id, counted, signature: 'Juliana Santos', reason: '' }),
    /divergências/,
  );
  assert.throws(
    () =>
      closeShift(db, {
        shiftId: shift.id,
        counted: { ...expected, pix: Number.NaN },
        signature: 'Juliana Santos',
        reason: '',
      }),
    /valores conferidos/,
  );
  closeShift(db, {
    shiftId: shift.id,
    counted,
    signature: 'Juliana Santos',
    reason: 'Diferenças conferidas com comprovantes',
  });
  assert.equal(shift.closing?.differences.debit, 100);
  assert.equal(shift.closing?.differences.cash, -100);
  assert.throws(() => receivePayment(db, input), /fechado/);
  assert.throws(
    () =>
      withdrawCash(db, {
        shiftId: shift.id,
        amountCents: 100,
        destination: 'safe',
        reason: 'Transferir para cofre',
      }),
    /fechado/,
  );
  assert.throws(() => reverseReceipt(db, finance.receipts[0].id, 'Estorno após fechar'), /fechado/);
  assert.throws(
    () => closeShift(db, { shiftId: shift.id, counted, signature: 'Juliana', reason: '' }),
    /já foi fechado/,
  );
  createShift(db, { openingCents: 10000 });
  assert.equal(finance.shifts.length, 2);
  assert.throws(() => createShift(db, { openingCents: 0 }), /Já existe/);
});
test('regras de taxa e arredondamento não permitem repasse superior ao recebido', () => {
  const { db, finance, item } = setup();
  const totals = calculatePayment(
    { ...item, grossCents: 1999, commissionRate: 40 },
    { method: 'credit', installments: 3, discountCents: 0, tenderedCents: 0 },
    finance.configuration,
  );
  assert.equal(totals.feeCents, 90);
  assert.equal(totals.commissionCents, 800);
  assert.throws(
    () => saveFinanceConfiguration(db, { ...finance.configuration, creditRate: 99 }),
    /percentuais|100%/,
  );
  assert.throws(
    () => saveFinanceConfiguration(db, { ...finance.configuration, debitRate: -1 }),
    /percentuais/,
  );
});
test('API Axios financeira integra pendência, baixa, prontuário, sangria e fechamento', async () => {
  const http = axios.create({ adapter: mockAdapter });
  await loginAs(http);
  const snapshot = (await http.get<FinanceSnapshot>('/finance')).data;
  assert.ok(snapshot.pending.length > 0);
  const item = snapshot.pending[0];
  const input = {
    treatmentId: item.treatmentId,
    shiftId: snapshot.shifts[0].id,
    method: 'pix',
    discountCents: 0,
    tenderedCents: 0,
    installments: 1,
    proof: 'API-PIX-UNIQUE',
    destination: 'Conta bancária da clínica',
    paidAt: new Date().toISOString(),
    pixVerified: true,
  };
  const results = await Promise.allSettled([
    http.post('/finance/receipts', input),
    http.post('/finance/receipts', input),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
  const record = (await http.get<MedicalRecord>(`/records/${item.patientId}`)).data;
  assert.equal(record.treatments.find((t) => t.id === item.treatmentId)?.paymentStatus, 'paid');
  const received = (await http.get<FinanceSnapshot>('/finance')).data.receipts.find(
    (r) => r.proof === input.proof,
  );
  assert.ok(received);
  await http.post(`/finance/receipts/${received.id}/reversal`, {
    reason: 'Estorno de teste da API',
  });
  assert.equal(
    (await http.get<MedicalRecord>(`/records/${item.patientId}`)).data.treatments.find(
      (t) => t.id === item.treatmentId,
    )?.paymentStatus,
    'pending',
  );
  const current = (await http.get<FinanceSnapshot>('/finance')).data;
  const shift = current.shifts[0];
  const summary = shiftSummary(current, shift);
  await http.post('/finance/withdrawals', {
    shiftId: shift.id,
    amountCents: 10000,
    destination: 'safe',
    reason: 'Recolhimento de numerário',
  });
  const counted = { ...summary.expected, cash: summary.expected.cash - 10000 };
  await http.post(`/finance/shifts/${shift.id}/closing`, {
    counted,
    reason: '',
    signature: 'Juliana Santos',
  });
  await assert.rejects(
    http.post('/finance/receipts', { ...input, proof: 'AFTER-CLOSE' }),
    /fechado/,
  );
  assert.deepEqual(emptyAmounts(), { cash: 0, debit: 0, credit: 0, pix: 0 });
});
