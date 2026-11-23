import type { Database, User } from '../../clinic/model/types.ts';
import { localDate } from '../../clinic/model/fixtures.ts';
import { validateExpense } from './expense.rules.ts';
import { isCents } from '../../finance/model/finance.rules.ts';
import {
  type Expense,
  type ExpenseInput,
  type ManagementData,
  type ManagementSettings,
} from './types.ts';

export function createManagementData(today = localDate()): ManagementData {
  const month = today.slice(0, 7);
  const examples: ExpenseInput[] = [
    {
      description: 'Aluguel e condomínio',
      category: 'fixed',
      amountCents: 60000,
      date: `${month}-01`,
      dentistId: '',
      serviceId: '',
      reference: 'DEMO-ALUGUEL',
    },
    {
      description: 'Equipe administrativa',
      category: 'fixed',
      amountCents: 45000,
      date: `${month}-05`,
      dentistId: '',
      serviceId: '',
      reference: 'DEMO-EQUIPE',
    },
    {
      description: 'Materiais e insumos clínicos',
      category: 'supplies',
      amountCents: 18000,
      date: `${month}-12`,
      dentistId: '',
      serviceId: '',
      reference: 'DEMO-INSUMOS',
    },
    {
      description: 'Serviços de laboratório',
      category: 'laboratory',
      amountCents: 12000,
      date: `${month}-20`,
      dentistId: '',
      serviceId: '',
      reference: 'DEMO-LABORATORIO',
    },
  ];
  return {
    settings: { dailyGoalCents: 200000 },
    expenses: examples
      .filter((e) => e.date <= today)
      .map((e, index) => ({
        ...e,
        id: `expense-demo-${index}`,
        operatorName: 'Demonstração',
        createdAt: `${e.date}T12:00:00.000Z`,
        updatedAt: `${e.date}T12:00:00.000Z`,
      })),
  };
}
export function saveExpense(db: Database, input: ExpenseInput, id?: string, actor?: User): Expense {
  const error = validateExpense(input);
  if (error) throw new Error(error);
  const management = db.management;
  if (!management) throw new Error('A gestão financeira não foi inicializada.');
  if (input.dentistId && !db.users.some((u) => u.id === input.dentistId && u.role === 'dentist'))
    throw new Error('Dentista não encontrado.');
  if (input.serviceId && !db.services?.some((s) => s.id === input.serviceId))
    throw new Error('Serviço não encontrado.');
  const old = id ? management.expenses.find((e) => e.id === id) : undefined;
  if (id && (!old || old.cancellation)) throw new Error('A despesa não existe ou foi cancelada.');
  const now = new Date().toISOString();
  const operatorName =
    actor?.name ?? db.users.find((u) => u.role === 'receptionist')?.name ?? 'Operador';
  const expense: Expense = {
    ...input,
    description: input.description.trim(),
    reference: input.reference.trim(),
    id: old?.id ?? crypto.randomUUID(),
    createdAt: old?.createdAt ?? now,
    updatedAt: now,
    operatorName,
  };
  if (old) management.expenses[management.expenses.indexOf(old)] = expense;
  else management.expenses.push(expense);
  return expense;
}
export function cancelExpense(db: Database, id: string, reason: string, actor?: User): Expense {
  const expense = db.management?.expenses.find((e) => e.id === id);
  if (!expense || expense.cancellation)
    throw new Error('A despesa não existe ou já foi cancelada.');
  if (reason.trim().length < 5)
    throw new Error('Justifique o cancelamento com ao menos cinco caracteres.');
  expense.cancellation = {
    at: new Date().toISOString(),
    reason: reason.trim(),
    operatorName:
      actor?.name ?? db.users.find((u) => u.role === 'receptionist')?.name ?? 'Operador',
  };
  expense.updatedAt = expense.cancellation.at;
  return expense;
}
export function saveManagementSettings(
  db: Database,
  settings: ManagementSettings,
): ManagementSettings {
  if (!isCents(settings.dailyGoalCents) || settings.dailyGoalCents > 100000000)
    throw new Error('Informe uma meta diária válida. Use zero para desativar.');
  if (!db.management) throw new Error('A gestão financeira não foi inicializada.');
  db.management.settings = { ...settings };
  return settings;
}
