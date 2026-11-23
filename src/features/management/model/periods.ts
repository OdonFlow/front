import { isValidDate } from '../../clinic/model/validation.ts';
import { localDate } from '../../clinic/model/fixtures.ts';
import { methodKeys } from '../../finance/model/finance.rules.ts';
import { periodKeys, type DashboardSearch, type DateRange } from './types.ts';

const dayMs = 86400000;
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
export const addDays = (date: string, days: number) =>
  iso(new Date(utc(date).getTime() + days * dayMs));
export const rangeDays = (range: DateRange) =>
  Math.round((utc(range.to).getTime() - utc(range.from).getTime()) / dayMs) + 1;
const arrayParam = (value: unknown): string[] =>
  [
    ...new Set(
      (Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string')
        : typeof value === 'string'
          ? value.split(',')
          : []
      )
        .map((v) => v.trim())
        .filter((v) => v.length > 0 && v.length <= 200),
    ),
  ]
    .sort()
    .slice(0, 100);
export function normalizeDashboardSearch(
  input: Record<string, unknown>,
  today = localDate(),
): DashboardSearch {
  const date = typeof input.date === 'string' && isValidDate(input.date) ? input.date : today;
  return {
    period: periodKeys.find((p) => p === input.period) ?? 'month',
    date,
    from:
      typeof input.from === 'string' && isValidDate(input.from)
        ? input.from
        : `${date.slice(0, 7)}-01`,
    to: typeof input.to === 'string' && isValidDate(input.to) ? input.to : date,
    dentists: arrayParam(input.dentists),
    services: arrayParam(input.services),
    methods: methodKeys.filter((m) => arrayParam(input.methods).includes(m)),
    ranking: input.ranking === 'revenue' ? 'revenue' : 'profit',
  };
}
export function periodRange(search: DashboardSearch): DateRange {
  const date = utc(search.date);
  if (search.period === 'day') return { from: search.date, to: search.date };
  if (search.period === 'week') {
    const from = addDays(search.date, -(date.getUTCDay() + 6) % 7);
    return { from, to: addDays(from, 6) };
  }
  if (search.period === 'month')
    return {
      from: `${search.date.slice(0, 7)}-01`,
      to: iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12))),
    };
  if (search.period === 'year')
    return { from: `${date.getUTCFullYear()}-01-01`, to: `${date.getUTCFullYear()}-12-31` };
  if (search.from > search.to)
    throw new Error('A data final deve ser igual ou posterior à data inicial.');
  const result = { from: search.from, to: search.to };
  if (rangeDays(result) > 3660) throw new Error('Selecione um período de até dez anos.');
  return result;
}
export function previousPeriod(search: DashboardSearch, current = periodRange(search)): DateRange {
  const date = utc(search.date);
  if (search.period === 'month')
    return {
      from: iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1, 12))),
      to: addDays(current.from, -1),
    };
  if (search.period === 'year')
    return { from: `${date.getUTCFullYear() - 1}-01-01`, to: `${date.getUTCFullYear() - 1}-12-31` };
  return { from: addDays(current.from, -rangeDays(current)), to: addDays(current.from, -1) };
}
export function shiftAnchor(search: DashboardSearch, direction: number): Partial<DashboardSearch> {
  if (search.period === 'custom') {
    const days = rangeDays(periodRange(search));
    return {
      from: addDays(search.from, days * direction),
      to: addDays(search.to, days * direction),
    };
  }
  if (search.period === 'day' || search.period === 'week')
    return { date: addDays(search.date, direction * (search.period === 'day' ? 1 : 7)) };
  const date = utc(search.date);
  return {
    date: iso(
      new Date(
        Date.UTC(
          date.getUTCFullYear() + (search.period === 'year' ? direction : 0),
          date.getUTCMonth() + (search.period === 'month' ? direction : 0),
          1,
          12,
        ),
      ),
    ),
  };
}
export function businessDays(range: DateRange): number {
  let count = 0;
  for (let date = range.from; date <= range.to; date = addDays(date, 1))
    if (![0, 6].includes(utc(date).getUTCDay())) count++;
  return count;
}
export function trendBuckets(
  range: DateRange,
  period: DashboardSearch['period'],
): { key: string; label: string; from: string; to: string }[] {
  const days = rangeDays(range);
  const monthly = period === 'year' || days > 90;
  if (!monthly)
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(range.from, index);
      return { key: date, label: date.slice(8, 10), from: date, to: date };
    });
  const result = [];
  const cursor = utc(`${range.from.slice(0, 7)}-01`);
  while (iso(cursor) <= range.to) {
    const start = iso(cursor);
    const end = iso(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 12)));
    result.push({
      key: start.slice(0, 7),
      label: new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
        timeZone: 'UTC',
        ...(days > 366 ? ({ year: '2-digit' } as const) : {}),
      }).format(cursor),
      from: start < range.from ? range.from : start,
      to: end > range.to ? range.to : end,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}
