import { AccessGate } from '../../../access/view/AccessGate';
import { Icon } from '../../../../shared/components/Icon';
import { ClinicBrand } from '../../../branding/view/ClinicBrand';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Dialog } from '../../../../shared/components/ui';
import type { ClinicSettings } from '../../../clinic/model/types';
import type { CashShift, FinanceData } from '../../model/types';
import {
  methodKeys,
  methodLabels,
  money,
  shiftSummary,
  receiptPayments,
  receiptItems,
} from '../../model/finance.rules';
import { formatDate } from '../../../clinic/model/validation';

export { ReceiptDocument } from './ReceiptDocument';

export function ClosingDocument({
  finance,
  shift,
  clinic,
}: {
  finance: FinanceData;
  shift: CashShift;
  clinic?: ClinicSettings;
}) {
  const summary = shiftSummary(finance, shift);
  return (
    <article className="finance-document finance-report">
      <header className="finance-document-heading">
        <div>
          <ClinicBrand name={clinic?.name} />
          <h2>Borderô de fechamento de turno</h2>
        </div>
        <span className="badge badge-teal">
          {shift.closing ? 'Fechado' : 'Conferência parcial'}
        </span>
      </header>
      <p>
        Data: <strong>{formatDate(shift.date)}</strong> · Operador:{' '}
        <strong>{shift.operatorName}</strong>
      </p>
      <p className="secondary-text">
        Abertura: {new Date(shift.openedAt).toLocaleString('pt-BR')}
        {shift.closing && ` · Fechamento: ${new Date(shift.closing.at).toLocaleString('pt-BR')}`}
      </p>
      <div className="report-summary">
        <span>
          Total recebido<strong>{money(shift.closing?.totalCents ?? summary.totalCents)}</strong>
        </span>
        <span>
          Taxas provisionadas<strong>{money(shift.closing?.feesCents ?? summary.feesCents)}</strong>
        </span>
        <AccessGate permission="management.view">
          <span>
            Repasses aos dentistas
            <strong>{money(shift.closing?.commissionCents ?? summary.commissionCents)}</strong>
          </span>
        </AccessGate>
      </div>
      <h3>Conferência por modalidade</h3>
      <table>
        <thead>
          <tr>
            <th>Modalidade</th>
            <th>Esperado</th>
            <th>Conferido</th>
            <th>Diferença</th>
          </tr>
        </thead>
        <tbody>
          {methodKeys.map((method) => (
            <tr key={method}>
              <td>{methodLabels[method]}</td>
              <td>{money(shift.closing?.expected[method] ?? summary.expected[method])}</td>
              <td>{shift.closing ? money(shift.closing.counted[method]) : '—'}</td>
              <td>{shift.closing ? money(shift.closing.differences[method]) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="secondary-text mt-3">
        Fundo inicial: {money(shift.openingCents)} · Sangrias: {money(summary.withdrawnCents)}
      </p>
      <h3 className="mt-6">Lançamentos e comprovantes</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Recibo / paciente</th>
              <th>Meio / comprovante</th>
              <th>Valor</th>
              <th>Taxa</th>
              <th>Profissional / procedimento</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {summary.receipts.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.number}
                  <br />
                  {r.patientName}
                </td>
                <td>
                  {r.courtesy
                    ? 'Cortesia — sem movimentação'
                    : receiptPayments(r).map((p) => (
                        <div key={p.method}>
                          {methodLabels[p.method]}
                          {p.method === 'credit' && ` ${p.installments}x`} · {money(p.amountCents)}
                          <br />
                          {p.proof || 'Espécie'}
                        </div>
                      ))}
                </td>
                <td>{money(r.settledCents)}</td>
                <td>{money(r.feeCents)}</td>
                <td>
                  {receiptItems(r).map((item) => (
                    <div key={item.treatmentId}>
                      {item.procedure} · {item.quantity}x<br />
                      {item.dentistName}
                      <AccessGate permission="management.view">
                        {' '}
                        · {money(item.commissionCents)}
                      </AccessGate>
                    </div>
                  ))}
                </td>
                <td>
                  {r.reversal ? (
                    <>
                      <strong>Estornado</strong>
                      <br />
                      {r.reversal.reason}
                      <br />
                      {r.reversal.operatorName} · {new Date(r.reversal.at).toLocaleString('pt-BR')}
                    </>
                  ) : (
                    'Quitado'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {summary.withdrawals.length > 0 && (
        <>
          <h3 className="mt-6">Sangrias registradas</h3>
          {summary.withdrawals.map((w) => (
            <p className="report-withdrawal" key={w.id}>
              {new Date(w.at).toLocaleTimeString('pt-BR')} · {money(w.amountCents)} ·{' '}
              {w.destination === 'safe' ? 'Cofre da clínica' : 'Depósito bancário'}
              <br />
              {w.reason} · {w.operatorName}
            </p>
          ))}
        </>
      )}
      {shift.closing?.reason && (
        <p className="feedback feedback-error">
          Justificativa da conferência: {shift.closing.reason}
        </p>
      )}
      <div className="document-signature">
        <span>{shift.closing?.signature ?? shift.operatorName}</span>
        <p>Responsável pela conferência e fechamento</p>
      </div>
      <p className="secondary-text">Turno: {shift.id}</p>
    </article>
  );
}
export function DocumentDialog({
  title,
  children,
  onClose,
  onPrint,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onPrint: () => void;
}) {
  return (
    <>
      <Dialog title={title} onClose={onClose}>
        <div className="p-5">
          <div className="flex justify-end mb-4">
            <AccessGate permission="finance.receipt">
              <button className="btn btn-primary" onClick={onPrint}>
                <Icon name="print" size={17} />
                Imprimir / salvar PDF
              </button>
            </AccessGate>
          </div>
          {children}
        </div>
      </Dialog>
      {createPortal(<div className="finance-print-document">{children}</div>, document.body)}
    </>
  );
}
