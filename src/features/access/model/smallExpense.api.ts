import { http } from '../../../shared/lib/http/client';
export async function smallExpense(input: {
  description: string;
  amountCents: number;
  date: string;
  category: string;
  reference: string;
}) {
  return (await http.post('/finance/expenses', input)).data as unknown;
}
