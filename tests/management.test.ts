import { test } from 'node:test';
import { loginAs } from './helpers/auth.ts';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createDatabase, localDate } from '../src/features/clinic/model/fixtures.ts';
import { createFinanceData } from '../src/features/finance/model/finance.mock.ts';
import { receiptItems } from '../src/features/finance/model/finance.rules.ts';
import { createServices } from '../src/features/services/model/services.mock.ts';
import { buildDashboard, financialCells } from '../src/features/management/model/dashboard.ts';
import {
  normalizeDashboardSearch,
  periodRange,
  previousPeriod,
  businessDays,
  trendBuckets,
  shiftAnchor,
} from '../src/features/management/model/periods.ts';
import {
  createManagementData,
  saveExpense,
  cancelExpense,
  saveManagementSettings,
} from '../src/features/management/model/management.mock.ts';
import { dashboardWorkbook, exportDashboardXlsx } from '../src/features/management/model/export.ts';
import { buildXlsx } from '../src/features/management/model/xlsx.ts';
import { statementRows } from '../src/features/management/model/statements.ts';
import { mockAdapter } from '../src/shared/lib/http/mockAdapter.ts';

function setup() {
  const db = createDatabase();
  db.services = createServices();
  db.finance = createFinanceData(db);
  db.management = createManagementData();
  const search = normalizeDashboardSearch({ period: 'month' });
  return { db, search };
}
test('períodos validam URL, semanas, meses, bissextos e comparação anterior', () => {
  const search = normalizeDashboardSearch({
    period: 'month',
    date: '2024-02-29',
    dentists: ['d2', 'd1', 'd2'],
    methods: 'pix,invalid,cash',
  });
  assert.deepEqual(search.dentists, ['d1', 'd2']);
  assert.deepEqual(search.methods, ['cash', 'pix']);
  assert.deepEqual(periodRange(search), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(previousPeriod(search), { from: '2024-01-01', to: '2024-01-31' });
  assert.deepEqual(periodRange({ ...search, period: 'week', date: '2024-03-03' }), {
    from: '2024-02-26',
    to: '2024-03-03',
  });
  assert.deepEqual(shiftAnchor(search, 1), { date: '2024-03-01' });
  assert.equal(businessDays({ from: '2024-02-26', to: '2024-03-03' }), 5);
  assert.throws(
    () => periodRange({ ...search, period: 'custom', from: '2024-03-10', to: '2024-03-01' }),
    /data final/,
  );
  assert.throws(
    () => periodRange({ ...search, period: 'custom', from: '2000-01-01', to: '2024-03-01' }),
    /dez anos/,
  );
  assert.equal(
    normalizeDashboardSearch({ date: '2024-02-30', period: 'wrong' }, '2024-03-01').date,
    '2024-03-01',
  );
  assert.equal(trendBuckets({ from: '2024-01-01', to: '2024-12-31' }, 'year').length, 12);
});
test('DRE concilia receita, comissões, taxas, despesas, tendência e resultados por dimensão', () => {
  const { db, search } = setup();
  const data = buildDashboard(db, search);
  assert.equal(data.totals.revenueCents, 340000);
  assert.equal(data.totals.commissionCents, 136000);
  assert.equal(data.totals.feesCents, 5355);
  assert.equal(
    data.totals.profitCents,
    340000 - 136000 - 5355 - data.totals.operatingExpensesCents,
  );
  assert.equal(data.totals.attendances, 4);
  assert.equal(data.totals.ticketCents, 85000);
  for (const values of [data.dentists, data.services, data.channels, data.trend])
    assert.equal(
      values.reduce((sum, v) => sum + v.revenueCents, 0),
      data.totals.revenueCents,
    );
  assert.equal(
    data.trend.reduce((sum, p) => sum + p.profitCents, 0),
    data.totals.profitCents,
  );
  assert.equal(
    data.dentists.reduce((sum, p) => sum + p.profitCents, 0),
    data.totals.profitCents,
  );
  assert.equal(data.growthPercent, null);
  const full = data.totals.operatingExpensesCents;
  const parts = data.channels.map((c) => buildDashboard(db, { ...search, methods: [c.method] }));
  assert.equal(
    parts.reduce((sum, p) => sum + p.totals.operatingExpensesCents, 0),
    full,
  );
  assert.equal(
    parts.reduce((sum, p) => sum + p.totals.profitCents, 0),
    data.totals.profitCents,
  );
});
test('rateio de pagamentos mistos preserva centavos por serviço e canal sem duplicar atendimentos', () => {
  const { db, search } = setup();
  const receipt = db.finance.receipts[0];
  const item = receiptItems(receipt)[0];
  receipt.items = [0, 1, 2].map((index) => ({
    ...item,
    treatmentId: `item-${index}`,
    serviceId: `service-${index}`,
    grossCents: 2,
    netCents: 1,
    discountCents: 1,
    commissionCents: index === 0 ? 1 : 0,
  }));
  receipt.payments = ['cash', 'pix', 'credit'].map((method) => ({
    method: method === 'cash' ? 'cash' : method === 'pix' ? 'pix' : 'credit',
    amountCents: 1,
    tenderedCents: 1,
    installments: 1,
    proof: '',
    destination: '',
    pixVerified: true,
    feeCents: 0,
    feeRate: 0,
    changeCents: 0,
  }));
  db.finance.receipts = [receipt];
  db.management.expenses = [];
  const cells = financialCells(db, periodRange(search));
  for (let index = 0; index < 3; index++) {
    const rows = cells.filter((c) => c.treatmentId === `item-${index}`);
    assert.equal(
      rows.reduce((sum, c) => sum + c.revenueCents, 0),
      1,
    );
    assert.equal(
      rows.reduce((sum, c) => sum + c.grossCents, 0),
      2,
    );
  }
  const data = buildDashboard(db, search);
  assert.equal(data.totals.revenueCents, 3);
  assert.equal(data.totals.grossCents, 6);
  assert.equal(data.totals.attendances, 1);
  assert.equal(statementRows(cells).length, 3);
  for (const method of ['cash', 'pix', 'credit'] as const)
    assert.equal(buildDashboard(db, { ...search, methods: [method] }).totals.revenueCents, 1);
});
test('cortesia e estorno não geram receita ou taxa e preservam descontos na DRE', () => {
  const { db, search } = setup();
  const receipt = db.finance.receipts[0];
  const item = receiptItems(receipt)[0];
  receipt.items = [
    { ...item, grossCents: 10000, discountCents: 10000, netCents: 0, commissionCents: 0 },
  ];
  receipt.payments = [];
  db.finance.receipts = [receipt];
  db.management.expenses = [];
  const courtesy = buildDashboard(db, search);
  assert.equal(courtesy.totals.revenueCents, 0);
  assert.equal(courtesy.totals.discountsCents, 10000);
  assert.equal(courtesy.totals.attendances, 1);
  assert.equal(courtesy.totals.feesCents, 0);
  receipt.reversal = {
    at: new Date().toISOString(),
    reason: 'Teste de estorno',
    operatorId: 'u1',
    operatorName: 'Operador',
  };
  assert.equal(buildDashboard(db, search).totals.attendances, 0);
});
test('despesas validam, editam, cancelam com justificativa e não movimentam caixa', () => {
  const { db, search } = setup();
  const movements = structuredClone(db.finance);
  const expense = saveExpense(db, {
    description: 'Insumos adicionais',
    date: localDate(),
    category: 'supplies',
    amountCents: 101,
    dentistId: 'd1',
    serviceId: '',
    reference: '=SUM(A1)',
  });
  const before = buildDashboard(db, search);
  assert.equal(before.expenses.find((e) => e.expense.id === expense.id)?.allocatedCents, 101);
  assert.equal(
    buildDashboard(db, { ...search, dentists: ['d2'] }).expenses.find(
      (e) => e.expense.id === expense.id,
    )?.allocatedCents,
    0,
  );
  saveExpense(db, { ...expense, amountCents: 203 }, expense.id);
  assert.throws(() => cancelExpense(db, expense.id, 'abc'), /Justifique/);
  cancelExpense(db, expense.id, 'Lançamento duplicado');
  assert.equal(
    buildDashboard(db, search).expenses.find((e) => e.expense.id === expense.id)?.allocatedCents,
    0,
  );
  assert.throws(() => saveExpense(db, expense, expense.id), /cancelada/);
  assert.throws(() => saveExpense(db, { ...expense, date: '2999-01-01' }), /hoje/);
  assert.throws(() => saveExpense(db, { ...expense, amountCents: -1 }), /positivo/);
  assert.throws(() => saveManagementSettings(db, { dailyGoalCents: -1 }), /meta/);
  saveManagementSettings(db, { dailyGoalCents: 0 });
  assert.equal(buildDashboard(db, search).goalPercent, 0);
  assert.deepEqual(db.finance, movements);
});
test('período sem receita conserva despesas e prejuízo; base anterior gera crescimento', () => {
  const { db, search } = setup();
  db.management.expenses = [];
  const previous = structuredClone(db.finance.receipts[0]);
  previous.id = 'previous';
  previous.paidAt = `${previousPeriod(search).to}T12:00:00Z`;
  db.finance.receipts.push(previous);
  assert.equal(buildDashboard(db, search).growthPercent, 300);
  db.finance.receipts = [];
  saveExpense(db, {
    description: 'Despesa sem receita',
    date: localDate(),
    category: 'fixed',
    amountCents: 10000,
    dentistId: '',
    serviceId: '',
    reference: '',
  });
  const data = buildDashboard(db, search);
  assert.equal(data.totals.profitCents, -10000);
  assert.equal(data.totals.marginPercent, 0);
  assert.equal(data.totals.ticketCents, 0);
  const filtered = buildDashboard(db, { ...search, dentists: ['d1'] });
  assert.equal(filtered.totals.operatingExpensesCents, 0);
  assert.equal(filtered.unallocatedExpensesCents, 10000);
});
test('Excel gera OOXML válido com sete abas, fórmulas, valores conciliados e texto seguro', () => {
  const { db, search } = setup();
  const data = buildDashboard(db, search);
  const sheets = dashboardWorkbook(data, '=Clínica & <Nome>', 'Responsável', 'Hoje');
  assert.equal(sheets.length, 7);
  assert.deepEqual(sheets[0].rows[13][1], {
    value: data.totals.profitCents / 100,
    formula: 'SUM(B10:B13)',
    style: 'total',
  });
  const bytes = exportDashboardXlsx(data, '=Clínica & <Nome>', 'Responsável', 'Hoje');
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  const entries = new Map<string, string>();
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameSize = view.getUint16(offset + 26, true);
    const extra = view.getUint16(offset + 28, true);
    const start = offset + 30 + nameSize + extra;
    entries.set(
      new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameSize)),
      new TextDecoder().decode(bytes.slice(start, start + size)),
    );
    offset = start + size;
  }
  assert.equal(entries.size, 12);
  assert.match(entries.get('xl/worksheets/sheet1.xml') ?? '', /<f>SUM\(B10:B13\)<\/f>/);
  assert.match(entries.get('xl/worksheets/sheet1.xml') ?? '', /inlineStr/);
  assert.match(entries.get('xl/worksheets/sheet1.xml') ?? '', /=Clínica &amp; &lt;Nome&gt;/);
  assert.throws(() => buildXlsx([{ name: 'Inválido/', rows: [] }]), /abas/);
});
test('API demonstrativa persiste despesas e respeita filtros e cancelamento de requisição', async () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  const api = axios.create({ adapter: mockAdapter });
  await loginAs(api);
  const before = await api.get('/management/dashboard');
  assert.equal(before.data.totals.revenueCents, 340000);
  const saved = await api.post('/management/expenses', {
    description: 'Despesa pela API',
    date: localDate(),
    category: 'fixed',
    amountCents: 105,
    dentistId: '',
    serviceId: '',
    reference: '',
  });
  assert.equal(saved.status, 201);
  const after = await api.get('/management/dashboard');
  assert.equal(after.data.totals.profitCents, before.data.totals.profitCents - 105);
  await api.post(`/management/expenses/${saved.data.id}/cancellation`, {
    reason: 'Duplicidade de lançamento',
  });
  assert.equal(
    (await api.get('/management/dashboard')).data.totals.profitCents,
    before.data.totals.profitCents,
  );
  assert.equal(
    (await api.get('/management/dashboard', { params: { methods: 'pix' } })).data.totals
      .revenueCents,
    85000,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    api.get('/management/dashboard', { signal: controller.signal }),
    axios.isCancel,
  );
  Reflect.deleteProperty(globalThis, 'localStorage');
});
