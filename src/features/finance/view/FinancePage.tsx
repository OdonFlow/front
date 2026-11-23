import { Link } from '@tanstack/react-router';
import { AccessGate } from '../../access/view/AccessGate';
import { SmallExpense } from '../../access/view/SmallExpense';
import { useFinanceViewModel } from '../viewmodel/useFinanceViewModel';
import { Feedback, PageHeading, QueryState } from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/Icon';
import { money, methodKeys, methodLabels, receiptPayments } from '../model/finance.rules';
import { ClosingDocument, DocumentDialog, ReceiptDocument } from './components/FinanceDocuments';
import { FinanceDialogs } from './components/FinanceDialogs';
import { normalizeDashboardSearch } from '../../management/model/periods';

export function FinancePage() {
  const vm = useFinanceViewModel();
  return (
    <>
      <PageHeading
        title="Conferência de Caixa"
        subtitle="Recebimentos, conferência e fechamento diário."
      >
        <AccessGate permission="management.view">
          <Link
            className="btn btn-secondary"
            to="/gestao-financeira"
            search={normalizeDashboardSearch({})}
          >
            Gestão financeira e DRE
          </Link>
        </AccessGate>
        <AccessGate permission="settings.manage">
          <button
            className="btn btn-secondary"
            onClick={() => vm.openModal('configuration')}
            disabled={!vm.data}
          >
            <Icon name="settings" size={17} />
            Taxas e repasses
          </button>
        </AccessGate>
        <AccessGate permission="finance.expense">
          <SmallExpense />
        </AccessGate>
        <AccessGate permission="finance.receive">
          <Link
            className="btn btn-primary"
            to="/financeiro/recebimentos"
            search={{ q: '', patient: '', treatment: '' }}
          >
            <Icon name="plus" size={18} />
            Novo lançamento
          </Link>
        </AccessGate>
      </PageHeading>
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry}>
        <div className="finance-toolbar">
          <div>
            <h2>Caixa e lançamentos da recepção</h2>
            {vm.shift && (
              <span className={`badge ${vm.shift.closing ? 'badge-slate' : 'badge-teal'}`}>
                {vm.shift.closing ? 'Turno fechado' : 'Turno aberto'} · {vm.shift.operatorName}
              </span>
            )}
          </div>
          <div className="finance-date-controls">
            <input
              aria-label="Data do caixa"
              type="date"
              value={vm.search.date}
              onChange={(e) => {
                if (e.target.value) vm.updateSearch({ date: e.target.value });
              }}
            />
            {vm.shifts.length > 1 && (
              <select
                aria-label="Turno do caixa"
                value={vm.shift?.id ?? ''}
                onChange={(e) => vm.updateSearch({ shift: e.target.value })}
              >
                {vm.shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {new Date(shift.openedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {shift.closing ? 'Fechado' : 'Aberto'}
                  </option>
                ))}
              </select>
            )}
            {!vm.activeShift && (
              <button className="btn btn-primary" onClick={() => vm.openModal('open')}>
                Abrir caixa
              </button>
            )}
          </div>
        </div>
        <Feedback success={vm.success} />
        {vm.shift && vm.summary && vm.data ? (
          <>
            <div className="stat-grid finance-stats">
              <div className="stat-card stat-primary">
                <span className="stat-label">Total lançado no turno</span>
                <strong className="stat-value">{money(vm.summary.totalCents)}</strong>
                <span>{vm.summary.active.length} comandas quitadas</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Dinheiro em gaveta</span>
                <strong className="stat-value">{money(vm.summary.expected.cash)}</strong>
                <span>Inclui fundo inicial e desconta sangrias</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Maquininhas de cartão</span>
                <strong className="stat-value">
                  {money(vm.summary.amounts.debit + vm.summary.amounts.credit)}
                </strong>
                <span>
                  {
                    vm.summary.active
                      .flatMap(receiptPayments)
                      .filter((r) => r.method === 'debit' || r.method === 'credit').length
                  }{' '}
                  transações no POS · valor bruto
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Pix bancário</span>
                <strong className="stat-value">{money(vm.summary.amounts.pix)}</strong>
                <span>
                  {
                    vm.summary.active.flatMap(receiptPayments).filter((r) => r.method === 'pix')
                      .length
                  }{' '}
                  comprovantes validados
                </span>
              </div>
            </div>
            <div className="finance-dashboard-layout">
              <div className="finance-ledger">
                <section className="panel">
                  <div className="section-heading p-5">
                    <h2>Lançamentos do turno</h2>
                    <span className="secondary-text">{vm.summary.receipts.length} lançamentos</span>
                  </div>
                  {vm.summary.receipts.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Horário</th>
                            <th>Paciente / procedimento</th>
                            <th>Dentista</th>
                            <th>Meio externo</th>
                            <th>Valor</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...vm.summary.receipts].reverse().map((receipt) => (
                            <tr
                              key={receipt.id}
                              className={receipt.reversal ? 'reversed-receipt' : ''}
                            >
                              <td>
                                {new Date(receipt.paidAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td>
                                <strong>{receipt.patientName}</strong>
                                <span className="ledger-detail">
                                  {receipt.procedure}
                                  {(!receipt.items || receipt.items.length === 1) && receipt.tooth
                                    ? ` · Dente ${receipt.tooth}`
                                    : ''}
                                </span>
                                {receipt.reversal && (
                                  <span className="badge badge-red">Estornado</span>
                                )}
                              </td>
                              <td>
                                {receipt.dentistName}
                                <AccessGate permission="management.view">
                                  <span className="ledger-detail">
                                    Repasse {money(receipt.commissionCents)}
                                  </span>
                                </AccessGate>
                              </td>
                              <td>
                                {receipt.courtesy ? (
                                  <span className="badge badge-teal">Cortesia</span>
                                ) : (
                                  receiptPayments(receipt).map((payment) => (
                                    <div key={payment.method}>
                                      {methodLabels[payment.method]}
                                      {payment.method === 'credit' &&
                                        ` ${payment.installments}x`} · {money(payment.amountCents)}
                                      <span className="ledger-detail">
                                        {payment.method === 'cash'
                                          ? `Troco ${money(payment.changeCents)}`
                                          : payment.proof}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </td>
                              <td>
                                <strong>{money(receipt.settledCents)}</strong>
                              </td>
                              <td>
                                <div className="ledger-actions">
                                  <button
                                    className="text-button"
                                    onClick={() => vm.showReceipt(receipt.id)}
                                  >
                                    Ver recibo
                                  </button>
                                  {!receipt.reversal && (
                                    <button
                                      className="text-button subtle"
                                      disabled={!vm.canWrite}
                                      onClick={() => vm.showReversal(receipt.id)}
                                      title={
                                        !vm.canWrite
                                          ? 'Turnos fechados não permitem estorno.'
                                          : undefined
                                      }
                                    >
                                      Estornar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state compact">
                      <Icon name="wallet" size={30} />
                      <p>Nenhum recebimento neste turno.</p>
                    </div>
                  )}
                </section>
                <section className="panel finance-withdrawals">
                  <div className="section-heading">
                    <h2>Sangrias do turno</h2>
                    <span className="secondary-text">Total {money(vm.summary.withdrawnCents)}</span>
                  </div>
                  {vm.summary.withdrawals.length ? (
                    vm.summary.withdrawals.map((withdrawal) => (
                      <div className="withdrawal-row" key={withdrawal.id}>
                        <span className="feature-icon">
                          <Icon name="wallet" size={18} />
                        </span>
                        <div>
                          <strong>
                            {withdrawal.destination === 'safe'
                              ? 'Cofre da clínica'
                              : 'Depósito bancário'}
                          </strong>
                          <p>{withdrawal.reason}</p>
                          <span>
                            {new Date(withdrawal.at).toLocaleTimeString('pt-BR')} ·{' '}
                            {withdrawal.operatorName}
                          </span>
                        </div>
                        <strong>{money(withdrawal.amountCents)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="secondary-text mt-3">Nenhuma retirada de dinheiro registrada.</p>
                  )}
                </section>
              </div>
              <aside className="panel shift-summary">
                <div className="section-heading">
                  <h2>Fechamento de turno</h2>
                  <span className="secondary-text">
                    {vm.shift.closing ? 'Fechado' : 'Aberto'}{' '}
                    {new Date(vm.shift.closing?.at ?? vm.shift.openedAt).toLocaleTimeString(
                      'pt-BR',
                      { hour: '2-digit', minute: '2-digit' },
                    )}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Fundo inicial</dt>
                    <dd>{money(vm.shift.openingCents)}</dd>
                  </div>
                  {methodKeys.map((method) => (
                    <div key={method}>
                      <dt>{methodLabels[method]}</dt>
                      <dd>{money(vm.summary?.amounts[method] ?? 0)}</dd>
                    </div>
                  ))}
                  <div className="shift-total">
                    <dt>Total do turno</dt>
                    <dd>{money(vm.summary.totalCents)}</dd>
                  </div>
                  <div>
                    <dt>Taxas provisionadas</dt>
                    <dd>{money(vm.summary.feesCents)}</dd>
                  </div>
                  <AccessGate permission="management.view">
                    <div>
                      <dt>Repasses aos dentistas</dt>
                      <dd>{money(vm.summary.commissionCents)}</dd>
                    </div>
                  </AccessGate>
                  <div>
                    <dt>Sangrias</dt>
                    <dd>− {money(vm.summary.withdrawnCents)}</dd>
                  </div>
                </dl>
                <div className="cash-available">
                  <span>Fica em gaveta</span>
                  <strong>{money(vm.summary.expected.cash)}</strong>
                </div>
                {!vm.shift.closing && (
                  <>
                    <button
                      className="btn btn-secondary w-full"
                      onClick={() => vm.openModal('withdraw')}
                      disabled={!vm.canWrite || vm.summary.expected.cash <= 0}
                    >
                      <Icon name="wallet" size={16} />
                      Registrar sangria
                    </button>
                    <button
                      className="btn btn-primary w-full"
                      onClick={() => vm.openModal('close')}
                    >
                      <Icon name="check" size={16} />
                      Conferir e fechar turno
                    </button>
                  </>
                )}
                <button
                  className={`btn ${vm.shift.closing ? 'btn-primary' : 'btn-quiet'} w-full`}
                  onClick={vm.showReport}
                >
                  <Icon name="print" size={17} />
                  {vm.shift.closing ? 'Ver borderô de fechamento' : 'Relatório parcial do turno'}
                </button>
                {vm.shift.closing && (
                  <p className="secondary-text mt-3">Responsável: {vm.shift.closing.signature}</p>
                )}
              </aside>
            </div>
          </>
        ) : (
          <div className="panel empty-state">
            <Icon name="wallet" size={36} />
            <h2>Nenhum turno nesta data</h2>
            <p>
              {vm.activeShift
                ? 'Selecione a data do turno aberto para continuar a conferência.'
                : 'Abra o caixa para iniciar os lançamentos de hoje.'}
            </p>
            {vm.activeShift ? (
              <button
                className="btn btn-primary"
                onClick={() => vm.updateSearch({ date: vm.activeShift?.date ?? vm.search.date })}
              >
                Ver turno aberto
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => vm.openModal('open')}>
                Abrir caixa
              </button>
            )}
          </div>
        )}
      </QueryState>
      <FinanceDialogs vm={vm} />
      {vm.receipt && (
        <DocumentDialog title="Recibo de recebimento" onClose={vm.closeReceipt} onPrint={vm.print}>
          <ReceiptDocument receipt={vm.receipt} clinic={vm.settings} />
        </DocumentDialog>
      )}
      {vm.reportOpen && vm.shift && vm.data && (
        <DocumentDialog title="Borderô do turno" onClose={vm.closeReport} onPrint={vm.print}>
          <ClosingDocument finance={vm.data} shift={vm.shift} clinic={vm.settings} />
        </DocumentDialog>
      )}
    </>
  );
}
