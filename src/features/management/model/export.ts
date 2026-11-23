import { buildXlsx, type SpreadsheetCell, type SpreadsheetSheet } from './xlsx.ts';
import { methodLabels } from '../../finance/model/finance.rules.ts';
import { dashboardFilterLabel } from './statements.ts';
import type { DashboardData } from './types.ts';
import { categoryLabels } from './expense.rules.ts';

const currency = (cents: number, formula?: string): SpreadsheetCell => ({
  value: cents / 100,
  formula,
  style: 'currency',
});
const excelDate = (date: string): SpreadsheetCell => ({
  value: (new Date(`${date}T00:00:00Z`).getTime() - Date.UTC(1899, 11, 30)) / 86400000,
  style: 'date',
});
export function dashboardWorkbook(
  data: DashboardData,
  clinicName: string,
  responsible: string,
  generatedAt: string,
): SpreadsheetSheet[] {
  const r = data.totals;
  const receiptLast = Math.max(2, data.details.length + 1);
  const expenseLast = Math.max(2, data.expenses.length + 1);
  const sumReceipt = (col: string) => `SUM(Recebimentos!${col}2:${col}${receiptLast})`;
  return [
    {
      name: 'DRE',
      widths: [43, 24, 95],
      headerRow: 7,
      titleRow: true,
      rows: [
        [`${clinicName} — DRE gerencial`],
        ['Período', `${data.range.from} a ${data.range.to}`],
        ['Filtros', dashboardFilterLabel(data)],
        ['Responsável', responsible],
        ['Emitido em', generatedAt],
        [],
        ['Conceito', 'Valor (R$)', 'Critério'],
        [
          '(+) Serviços antes dos descontos',
          currency(r.grossCents, sumReceipt('G')),
          'Procedimentos quitados no período',
        ],
        ['(-) Descontos e cortesias', currency(-r.discountsCents, `-${sumReceipt('H')}`)],
        ['(=) Receita recebida', currency(r.revenueCents, 'SUM(B8:B9)')],
        ['(-) Repasses aos dentistas', currency(-r.commissionCents, `-${sumReceipt('J')}`)],
        ['(-) Taxas de operadoras', currency(-r.feesCents, `-${sumReceipt('K')}`)],
        [
          '(-) Despesas operacionais',
          currency(-r.operatingExpensesCents, `-SUM(Despesas!E2:E${expenseLast})`),
        ],
        [
          '(=) Lucro líquido gerencial',
          { value: r.profitCents / 100, formula: 'SUM(B10:B13)', style: 'total' },
        ],
        [
          'Margem líquida',
          { value: r.marginPercent / 100, formula: 'IF(B10=0,0,B14/B10)', style: 'percent' },
        ],
        ['Atendimentos quitados', r.attendances],
        ['Ticket médio', currency(r.ticketCents, 'IF(B16=0,0,ROUND(B10/B16,2))')],
        ['Meta do período', currency(data.goalCents)],
        [
          'Atingimento da meta',
          { value: data.goalPercent / 100, formula: 'IF(B18=0,0,B10/B18)', style: 'percent' },
        ],
        ['Receita do período anterior', currency(data.previous.revenueCents)],
        [
          'Crescimento da receita',
          data.growthPercent === null
            ? 'Sem base comparável'
            : {
                value: data.growthPercent / 100,
                formula: 'IF(B20=0,0,(B10-B20)/B20)',
                style: 'percent',
              },
        ],
        [
          'Método',
          'Regime gerencial de recebimentos',
          'Repasses e taxas dos recibos são preservados. Estornos não integram a receita.',
        ],
        [
          'Rateio de despesas',
          'Proporcional à receita do recorte',
          'Custos vinculados a dentista/serviço são rateados somente entre os itens elegíveis.',
        ],
      ],
    },
    {
      name: 'Recebimentos',
      widths: [15, 27, 26, 26, 38, 22, 20, 20, 20, 20, 20, 20, 20],
      headerRow: 1,
      autoFilter: true,
      rows: [
        [
          'Data',
          'Recibo',
          'Paciente',
          'Dentista',
          'Serviço',
          'Canal externo',
          'Valor antes do desconto',
          'Desconto rateado',
          'Receita recebida',
          'Repasse',
          'Taxa POS',
          'Despesa rateada',
          'Resultado',
        ],
        ...data.details.map((cell, index) => [
          excelDate(cell.date),
          cell.receiptNumber,
          cell.patientName,
          cell.dentistName,
          cell.serviceName,
          cell.method ? methodLabels[cell.method] : 'Cortesia',
          currency(cell.grossCents),
          currency(cell.discountCents),
          currency(cell.revenueCents, `G${index + 2}-H${index + 2}`),
          currency(cell.commissionCents),
          currency(cell.feeCents),
          currency(cell.expenseCents),
          currency(
            cell.revenueCents - cell.commissionCents - cell.feeCents - cell.expenseCents,
            `I${index + 2}-SUM(J${index + 2}:L${index + 2})`,
          ),
        ]),
      ],
    },
    {
      name: 'Despesas',
      widths: [15, 38, 22, 22, 22, 26, 18, 40],
      headerRow: 1,
      autoFilter: true,
      rows: [
        [
          'Data',
          'Descrição',
          'Categoria',
          'Valor original',
          'Valor neste recorte',
          'Referência',
          'Situação',
          'Justificativa do cancelamento',
        ],
        ...data.expenses.map(({ expense, allocatedCents }) => [
          excelDate(expense.date),
          expense.description,
          categoryLabels[expense.category],
          currency(expense.amountCents),
          currency(allocatedCents),
          expense.reference,
          expense.cancellation ? 'Cancelada' : 'Ativa',
          expense.cancellation?.reason ?? '',
        ]),
      ],
    },
    {
      name: 'Dentistas',
      widths: [30, 18, 20, 20, 20, 20, 20, 20],
      headerRow: 1,
      autoFilter: true,
      rows: [
        [
          'Profissional',
          'Atendimentos',
          'Receita recebida',
          'Repasse',
          'Saldo após repasse',
          'Taxas POS',
          'Despesas rateadas',
          'Lucro gerencial',
        ],
        ...data.dentists.map((d, i) => [
          d.name,
          d.attendances,
          currency(d.revenueCents),
          currency(d.commissionCents),
          currency(d.clinicMarginCents, `C${i + 2}-D${i + 2}`),
          currency(d.feesCents),
          currency(d.expensesCents),
          currency(d.profitCents, `E${i + 2}-SUM(F${i + 2}:G${i + 2})`),
        ]),
      ],
    },
    {
      name: 'Serviços',
      widths: [38, 18, 20, 20, 20, 20, 20],
      headerRow: 1,
      autoFilter: true,
      rows: [
        [
          'Procedimento',
          'Quantidade',
          'Receita recebida',
          'Repasse',
          'Taxas POS',
          'Despesas rateadas',
          'Lucro gerencial',
        ],
        ...data.services.map((s, i) => [
          s.name,
          s.quantity,
          currency(s.revenueCents),
          currency(s.commissionCents),
          currency(s.feesCents),
          currency(s.expensesCents),
          currency(s.profitCents, `C${i + 2}-SUM(D${i + 2}:F${i + 2})`),
        ]),
      ],
    },
    {
      name: 'Canais',
      widths: [30, 20, 22, 20, 18],
      headerRow: 1,
      autoFilter: true,
      rows: [
        ['Canal', 'Transações', 'Receita recebida', 'Taxas POS', 'Participação'],
        ...data.channels.map((c, i) => [
          methodLabels[c.method],
          c.transactions,
          currency(c.revenueCents),
          currency(c.feeCents),
          {
            value: c.percent / 100,
            formula: `IF(DRE!B10=0,0,C${i + 2}/DRE!B10)`,
            style: 'percent',
          } as SpreadsheetCell,
        ]),
      ],
    },
    {
      name: 'Evolução',
      widths: [22, 23, 30, 23],
      headerRow: 1,
      autoFilter: true,
      rows: [
        ['Período', 'Receita recebida', 'Custos e repasses', 'Lucro gerencial'],
        ...data.trend.map((t, i) => [
          t.key,
          currency(t.revenueCents),
          currency(t.expensesCents),
          currency(t.profitCents, `B${i + 2}-C${i + 2}`),
        ]),
      ],
    },
  ];
}
export function exportDashboardXlsx(
  data: DashboardData,
  clinicName: string,
  responsible: string,
  generatedAt: string,
): Uint8Array<ArrayBuffer> {
  return buildXlsx(dashboardWorkbook(data, clinicName, responsible, generatedAt));
}
