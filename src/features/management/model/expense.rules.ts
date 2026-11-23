import { isValidDate } from '../../clinic/model/validation.ts';
import { localDate } from '../../clinic/model/fixtures.ts';
import { isCents } from '../../finance/model/finance.rules.ts';
import { expenseCategories, type ExpenseInput } from './types.ts';
export const categoryLabels = {
  fixed: 'Custos fixos',
  supplies: 'Insumos',
  laboratory: 'Laboratórios',
  other: 'Outras despesas',
};
export function validateExpense(input: ExpenseInput): string | undefined {
  if (
    typeof input.description !== 'string' ||
    input.description.trim().length < 3 ||
    input.description.trim().length > 150
  )
    return 'Informe uma descrição de 3 a 150 caracteres.';
  if (!expenseCategories.includes(input.category)) return 'Selecione uma categoria válida.';
  if (!isValidDate(input.date)) return 'Informe uma data válida para a despesa.';
  if (input.date > localDate()) return 'A despesa deve ter uma data igual ou anterior a hoje.';
  if (!isCents(input.amountCents) || input.amountCents === 0 || input.amountCents > 100000000)
    return 'Informe um valor positivo para a despesa.';
  if (typeof input.reference !== 'string' || input.reference.length > 150)
    return 'A referência deve conter até 150 caracteres.';
}
