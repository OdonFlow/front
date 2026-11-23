import { isCents } from '../../finance/model/finance.rules.ts';
import { serviceCategories, type ServiceInput } from './types.ts';

export function validateService(input: ServiceInput): string | undefined {
  if (
    typeof input.name !== 'string' ||
    input.name.trim().length < 3 ||
    input.name.trim().length > 120
  )
    return 'Informe um nome de serviço entre 3 e 120 caracteres.';
  if (!serviceCategories.includes(input.category)) return 'Selecione uma categoria válida.';
  if (!isCents(input.priceCents) || input.priceCents > 100000000)
    return 'Informe um valor válido para o serviço.';
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 15 ||
    input.durationMinutes > 480 ||
    input.durationMinutes % 15 !== 0
  )
    return 'A duração deve ser de 15 a 480 minutos, em intervalos de 15 minutos.';
  if (
    !Number.isFinite(input.commissionRate) ||
    input.commissionRate < 0 ||
    input.commissionRate > 100
  )
    return 'O repasse deve ser um percentual entre 0 e 100.';
  if (typeof input.active !== 'boolean') return 'Informe a situação do serviço.';
}
