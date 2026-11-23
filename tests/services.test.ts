import { test } from 'node:test';
import { loginAs } from './helpers/auth.ts';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createDatabase, localDate } from '../src/features/clinic/model/fixtures.ts';
import type { Appointment, MedicalRecord } from '../src/features/clinic/model/types.ts';
import {
  createServices,
  saveService,
  snapshotCatalogTreatments,
} from '../src/features/services/model/services.mock.ts';
import { validateService } from '../src/features/services/model/services.rules.ts';
import type { ClinicalService } from '../src/features/services/model/types.ts';
import {
  createFinanceData,
  pendingReceivables,
  reverseReceipt,
  validatePaidTreatments,
} from '../src/features/finance/model/finance.mock.ts';
import { settleCheckout } from '../src/features/finance/model/checkout.mock.ts';
import { allocateCents } from '../src/features/finance/model/checkout.rules.ts';
import {
  paidReceipt,
  receiptItems,
  receiptPayments,
  shiftSummary,
} from '../src/features/finance/model/finance.rules.ts';
import type {
  CheckoutInput,
  FinanceSnapshot,
  Receipt,
} from '../src/features/finance/model/types.ts';
import { mockAdapter } from '../src/shared/lib/http/mockAdapter.ts';

function setup() {
  const db = createDatabase();
  db.services = createServices();
  const finance = createFinanceData(db);
  db.finance = finance;
  const input: CheckoutInput = {
    requestId: crypto.randomUUID(),
    patientId: 'p12',
    shiftId: finance.shifts[0].id,
    lines: [
      {
        key: 'cleaning',
        serviceId: 'service-cleaning',
        dentistId: 'd1',
        tooth: 0,
        quantity: 1,
        unitPriceCents: 18000,
      },
      {
        key: 'restoration',
        serviceId: 'service-restoration',
        dentistId: 'd2',
        tooth: 26,
        quantity: 1,
        unitPriceCents: 22000,
      },
    ],
    payments: [
      {
        method: 'pix',
        amountCents: 20000,
        tenderedCents: 0,
        installments: 1,
        proof: 'E2E-SPLIT-1',
        destination: 'Conta clínica',
        pixVerified: true,
      },
      {
        method: 'credit',
        amountCents: 20000,
        tenderedCents: 0,
        installments: 2,
        proof: 'NSU-SPLIT-1',
        destination: 'POS clínica',
        pixVerified: false,
      },
    ],
    discountCents: 0,
    courtesy: false,
    authorizationReason: '',
    authorizedBy: '',
    paidAt: new Date().toISOString(),
  };
  return { db, finance, shift: finance.shifts[0], input };
}
test('catálogo valida parâmetros, evita nomes duplicados e permite edição e inativação', () => {
  const { db } = setup();
  const service = createServices()[0];
  assert.equal(validateService(service), undefined);
  assert.match(validateService({ ...service, durationMinutes: 16 }) ?? '', /duração/);
  assert.match(validateService({ ...service, commissionRate: 101 }) ?? '', /repasse/);
  assert.match(validateService({ ...service, priceCents: -1 }) ?? '', /valor/);
  assert.throws(() => saveService(db, { ...service, name: 'PROFILAXIA E LIMPEZA' }), /Já existe/);
  const added = saveService(db, { ...service, name: 'Novo serviço de teste', durationMinutes: 45 });
  saveService(db, { ...added, active: false, priceCents: 25000 }, added.id);
  assert.equal(db.services?.find((s) => s.id === added.id)?.active, false);
});
test('rateio de descontos preserva todos os centavos e tem desempate determinístico', () => {
  assert.deepEqual(allocateCents(1, [100, 100, 100]), [1, 0, 0]);
  assert.deepEqual(allocateCents(4000, [18000, 22000]), [1800, 2200]);
  assert.deepEqual(allocateCents(2, [0, 100, 100]), [0, 1, 1]);
  assert.deepEqual(allocateCents(0, [0, 0]), [0, 0]);
  assert.throws(() => allocateCents(1, [0]), /ratear/);
});
test('plano clínico usa preço e repasse do catálogo e preserva o histórico após edição', () => {
  const { db } = setup();
  const previous = db.records.find((r) => r.patientId === 'p12');
  assert.ok(previous);
  const next = structuredClone(previous);
  next.treatments.push({
    id: 'catalog-treatment',
    patientId: 'p12',
    dentistId: 'd2',
    tooth: 0,
    serviceId: 'service-cleaning',
    procedure: 'Nome provisório',
    price: 999,
    completed: false,
  });
  next.treatments = snapshotCatalogTreatments(db, next, previous);
  const treatment = next.treatments.find((t) => t.id === 'catalog-treatment');
  assert.ok(treatment);
  assert.equal(treatment.price, 180);
  assert.equal(treatment.commissionRate, 40);
  assert.equal(treatment.procedure, 'Profilaxia e Limpeza');
  const service = db.services?.find((s) => s.id === 'service-cleaning');
  assert.ok(service);
  saveService(db, { ...service, priceCents: 25000, commissionRate: 50, active: false }, service.id);
  treatment.completed = true;
  const updated = snapshotCatalogTreatments(db, next, next).find((t) => t.id === treatment.id);
  assert.equal(updated?.price, 180);
  assert.equal(updated?.commissionRate, 40);
});
test('Limpeza e Restauração totalizam R$ 400 com R$ 160 de repasse e Pix + crédito corretos', () => {
  const { db, finance, shift, input } = setup();
  const before = shiftSummary(finance, shift);
  const receipt = settleCheckout(db, input);
  assert.equal(receipt.grossCents, 40000);
  assert.equal(receipt.settledCents, 40000);
  assert.equal(receipt.commissionCents, 16000);
  assert.equal(receipt.feeCents, 800); // 4% on the R$ 200 credit portion, Pix has no POS fee.
  assert.equal(receipt.clinicCents, 23200);
  assert.equal(receiptItems(receipt).length, 2);
  assert.equal(receiptItems(receipt)[0].commissionCents, 7200);
  assert.equal(receiptItems(receipt)[1].commissionCents, 8800);
  const after = shiftSummary(finance, shift);
  assert.equal(after.amounts.pix - before.amounts.pix, 20000);
  assert.equal(after.amounts.credit - before.amounts.credit, 20000);
  assert.equal(after.expected.cash, before.expected.cash);
  for (const item of receiptItems(receipt))
    assert.equal(paidReceipt(finance.receipts, item.treatmentId)?.id, receipt.id);
});
test('desconto autorizado é proporcional por serviço e dentista e não altera a tabela oficial', () => {
  const { db, input } = setup();
  input.discountCents = 4000;
  input.authorizationReason = 'Desconto autorizado para convênio';
  input.authorizedBy = 'u1';
  input.payments[0].amountCents = 18000;
  input.payments[1].amountCents = 18000;
  const receipt = settleCheckout(db, input);
  assert.equal(receipt.settledCents, 36000);
  assert.equal(receipt.commissionCents, 14400);
  assert.deepEqual(
    receipt.items?.map((i) => i.discountCents),
    [1800, 2200],
  );
  assert.deepEqual(
    receipt.items?.map((i) => i.commissionCents),
    [6480, 7920],
  );
  assert.equal(db.services?.find((s) => s.id === 'service-restoration')?.priceCents, 22000);
  assert.equal(receipt.authorizedByName, 'Juliana Santos');
});
test('ajuste do preço unitário exige autorização e recalcula quantidade e repasse', () => {
  const { db, input } = setup();
  input.lines = [input.lines[0]];
  input.lines[0].quantity = 2;
  input.lines[0].unitPriceCents = 15000;
  input.payments = [{ ...input.payments[0], amountCents: 30000 }];
  assert.throws(() => settleCheckout(db, input), /autorização/);
  input.authorizationReason = 'Ajuste de preço para tratamento familiar';
  input.authorizedBy = 'd1';
  const receipt = settleCheckout(db, input);
  assert.equal(receipt.settledCents, 30000);
  assert.equal(receipt.commissionCents, 12000);
  assert.equal(receipt.items?.[0].quantity, 2);
});
test('falhas nos meios, serviços e autorização não deixam quitação ou registros parciais', () => {
  for (const kind of ['sum', 'pix', 'inactive', 'discount', 'duplicate-method', 'tooth'] as const) {
    const { db, finance, input } = setup();
    if (kind === 'sum') input.payments[0].amountCents--;
    if (kind === 'pix') input.payments[0].pixVerified = false;
    if (kind === 'inactive') {
      const service = db.services?.find((s) => s.id === input.lines[1].serviceId);
      assert.ok(service);
      service.active = false;
    }
    if (kind === 'discount') {
      input.discountCents = 100;
      input.payments[0].amountCents -= 100;
    }
    if (kind === 'duplicate-method') input.payments[1].method = 'pix';
    if (kind === 'tooth') input.lines[1].tooth = 99;
    const beforeRecords = structuredClone(db.records);
    const beforeReceipts = finance.receipts.length;
    assert.throws(() => settleCheckout(db, input));
    assert.deepEqual(db.records, beforeRecords);
    assert.equal(finance.receipts.length, beforeReceipts);
  }
});
test('comanda não pode misturar pacientes, repetir pendência ou reabrir item pago', () => {
  const { db, input } = setup();
  const pending = pendingReceivables(db).find((p) => p.patientId === input.patientId);
  assert.ok(pending);
  const entry = {
    key: 'pending',
    treatmentId: pending.treatmentId,
    dentistId: pending.dentistId,
    tooth: pending.tooth,
    quantity: 1,
    unitPriceCents: pending.grossCents,
  };
  const payment = { ...input.payments[0], amountCents: pending.grossCents };
  assert.throws(
    () => settleCheckout(db, { ...input, patientId: 'p11', lines: [entry], payments: [payment] }),
    /indisponível/,
  );
  assert.throws(
    () =>
      settleCheckout(db, {
        ...input,
        lines: [entry, { ...entry, key: 'other' }],
        payments: [{ ...payment, amountCents: pending.grossCents * 2 }],
      }),
    /duplicado/,
  );
  const receipt = settleCheckout(db, input);
  const record = db.records.find((r) => r.patientId === input.patientId);
  assert.ok(record);
  const next = structuredClone(record);
  const second = next.treatments.find((t) => t.id === receipt.items?.[1].treatmentId);
  assert.ok(second);
  second.completed = false;
  assert.throws(() => validatePaidTreatments(db, next), /Estorne/);
});
test('avaliação gratuita encerra consulta, gera recibo zero e mantém caixa e comissões intactos', () => {
  const { db, finance, shift, input } = setup();
  const appointment = db.appointments[0];
  input.patientId = appointment.patientId;
  input.appointmentId = appointment.id;
  input.lines = [];
  input.payments = [];
  input.courtesy = true;
  input.authorizationReason = 'Avaliação inicial gratuita autorizada';
  input.authorizedBy = 'u1';
  const before = shiftSummary(finance, shift);
  const receipt = settleCheckout(db, input);
  assert.equal(receipt.courtesy, true);
  assert.equal(receipt.settledCents, 0);
  assert.equal(receipt.feeCents, 0);
  assert.equal(receipt.commissionCents, 0);
  assert.equal(receiptPayments(receipt).length, 0);
  assert.equal(appointment.status, 'completed');
  const after = shiftSummary(finance, shift);
  assert.deepEqual(after.amounts, before.amounts);
  assert.equal(after.expected.cash, before.expected.cash);
  assert.throws(
    () => settleCheckout(db, { ...input, requestId: crypto.randomUUID() }),
    /já foi acertado/,
  );
  const count = db.records.find((r) => r.patientId === appointment.patientId)?.treatments.length;
  reverseReceipt(db, receipt.id, 'Reabertura da avaliação para conferência');
  settleCheckout(db, { ...input, requestId: crypto.randomUUID() });
  assert.equal(
    db.records.find((r) => r.patientId === appointment.patientId)?.treatments.length,
    count,
  );
});
test('estorno misto devolve apenas a parcela em dinheiro e reabre todos os itens', () => {
  const { db, finance, shift, input } = setup();
  input.payments[0] = {
    method: 'cash',
    amountCents: 10000,
    tenderedCents: 15000,
    installments: 1,
    proof: '',
    destination: 'Gaveta do caixa',
    pixVerified: false,
  };
  input.payments[1] = {
    ...input.payments[1],
    method: 'pix',
    amountCents: 30000,
    installments: 1,
    pixVerified: true,
  };
  const receipt = settleCheckout(db, input);
  assert.equal(receipt.changeCents, 5000);
  finance.withdrawals.push({
    id: 'test-withdrawal',
    shiftId: shift.id,
    amountCents: 100000,
    destination: 'safe',
    reason: 'Recolhimento de teste',
    at: new Date().toISOString(),
    operatorName: 'Juliana Santos',
  });
  assert.equal(shiftSummary(finance, shift).expected.cash, 15000);
  reverseReceipt(db, receipt.id, 'Devolução externa confirmada');
  assert.equal(shiftSummary(finance, shift).expected.cash, 5000);
  for (const line of receiptItems(receipt))
    assert.ok(pendingReceivables(db).some((p) => p.treatmentId === line.treatmentId));
});
test('recibos preservam preços e percentuais após atualização do catálogo', () => {
  const { db, input } = setup();
  const receipt = settleCheckout(db, input);
  const service = db.services?.find((s) => s.id === 'service-cleaning');
  assert.ok(service);
  saveService(db, { ...service, priceCents: 99900, commissionRate: 50, active: false }, service.id);
  assert.equal(receipt.items?.[0].unitPriceCents, 18000);
  assert.equal(receipt.items?.[0].commissionRate, 40);
  const record = db.records.find((r) => r.patientId === input.patientId);
  assert.ok(record);
  validatePaidTreatments(db, record);
});
test('idempotência também impede duplicar recebimentos novos em dinheiro', () => {
  const { db, finance, input } = setup();
  input.payments = [
    {
      method: 'cash',
      amountCents: 40000,
      tenderedCents: 40000,
      installments: 1,
      proof: '',
      destination: 'Gaveta do caixa',
      pixVerified: false,
    },
  ];
  const count = finance.receipts.length;
  const first = settleCheckout(db, input);
  const second = settleCheckout(db, input);
  assert.equal(first.id, second.id);
  assert.equal(finance.receipts.length, count + 1);
  assert.throws(
    () => settleCheckout(db, { ...input, authorizationReason: 'Outra descrição' }),
    /outros dados/,
  );
});
test('API integra catálogo, serviço opcional na agenda, snapshots no prontuário e pagamento dividido', async () => {
  const http = axios.create({ adapter: mockAdapter });
  await loginAs(http);
  const list = (await http.get<ClinicalService[]>('/services')).data;
  assert.ok(list.length >= 8);
  const service = (
    await http.post<ClinicalService>('/services', {
      ...list[0],
      name: 'Serviço API novo',
      priceCents: 12345,
      durationMinutes: 45,
      commissionRate: 35,
    })
  ).data;
  const appointment = (
    await http.post<Appointment>('/appointments', {
      patientId: 'p12',
      dentistId: 'd1',
      date: localDate(),
      time: '17:00',
      duration: 30,
      procedure: '',
      status: 'confirmed',
      reason: 'Avaliação inicial sem diagnóstico',
    })
  ).data;
  assert.equal(appointment.serviceId, undefined);
  assert.equal(appointment.procedure, 'Avaliação / A definir');
  const known = (
    await http.post<Appointment>('/appointments', {
      patientId: 'p12',
      dentistId: 'd1',
      date: localDate(),
      time: '17:30',
      duration: 30,
      procedure: '',
      serviceId: service.id,
      status: 'confirmed',
    })
  ).data;
  assert.equal(known.procedure, service.name);
  const snapshot = (await http.get<FinanceSnapshot>('/finance')).data;
  const input: CheckoutInput = {
    requestId: crypto.randomUUID(),
    patientId: 'p12',
    appointmentId: appointment.id,
    shiftId: snapshot.shifts[0].id,
    lines: [
      {
        key: 'api-new',
        serviceId: service.id,
        dentistId: 'd1',
        tooth: 0,
        quantity: 1,
        unitPriceCents: service.priceCents,
      },
    ],
    payments: [
      {
        method: 'pix',
        amountCents: 6000,
        tenderedCents: 0,
        installments: 1,
        proof: 'API-SPLIT-PIX',
        destination: 'Conta clínica',
        pixVerified: true,
      },
      {
        method: 'debit',
        amountCents: 6345,
        tenderedCents: 0,
        installments: 1,
        proof: 'API-SPLIT-DEBIT',
        destination: 'POS clínica',
        pixVerified: false,
      },
    ],
    discountCents: 0,
    courtesy: false,
    authorizationReason: '',
    authorizedBy: '',
    paidAt: new Date().toISOString(),
  };
  const results = await Promise.all([
    http.post<Receipt>('/finance/checkout', input),
    http.post<Receipt>('/finance/checkout', input),
  ]);
  assert.equal(results[0].data.id, results[1].data.id);
  const record = (await http.get<MedicalRecord>('/records/p12')).data;
  assert.equal(record.treatments.find((t) => t.serviceId === service.id)?.paymentStatus, 'paid');
  await assert.rejects(
    http.patch(`/appointments/${appointment.id}`, { status: 'cancelled' }),
    /Estorne/,
  );
  await http.put(`/services/${service.id}`, { ...service, active: false, priceCents: 15000 });
  await assert.rejects(
    http.post('/appointments', {
      patientId: 'p12',
      dentistId: 'd2',
      date: localDate(),
      time: '17:00',
      duration: 30,
      serviceId: service.id,
      status: 'confirmed',
    }),
  );
  assert.equal(
    (await http.get<FinanceSnapshot>('/finance')).data.receipts.find(
      (r) => r.id === results[0].data.id,
    )?.items?.[0].grossCents,
    12345,
  );
});
