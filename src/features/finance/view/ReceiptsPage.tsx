import { Link } from '@tanstack/react-router';
import { receiptsRoute } from '../../../app/router/router';
import { useReceiptViewModel } from '../viewmodel/useReceiptViewModel';
import {
  Avatar,
  Feedback,
  Field,
  PageHeading,
  QueryState,
  SearchInput,
} from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/Icon';
import { localDate } from '../../clinic/model/fixtures';
import { money } from '../model/finance.rules';
import { PaymentForm } from './components/PaymentForm';
import { DocumentDialog, ReceiptDocument } from './components/FinanceDocuments';

export function ReceiptsPage() {
  const search = receiptsRoute.useSearch();
  return (
    <ReceiptContent key={`${search.patient}:${search.treatment}:${search.appointment ?? ''}`} />
  );
}
function ReceiptContent() {
  const vm = useReceiptViewModel();
  return (
    <>
      <PageHeading
        title="Lançamento de Recebimento"
        subtitle="Comanda de serviços executados e acerto no balcão."
      >
        <Link
          className="btn btn-secondary"
          to="/financeiro"
          search={{ date: localDate(), shift: '' }}
        >
          <Icon name="wallet" size={18} />
          Conferência de caixa
        </Link>
      </PageHeading>
      <div className="finance-context">
        <span>
          Financeiro / <strong>Acerto do atendimento</strong>
        </span>
        {vm.activeShift && (
          <span className="badge badge-teal">
            Caixa da recepção · {vm.activeShift.operatorName}
          </span>
        )}
      </div>
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry}>
        {!vm.canReceive && (
          <div className="feedback feedback-error" role="alert">
            {vm.activeShift
              ? 'O turno aberto é de outro dia. Confira e feche esse caixa antes de continuar.'
              : 'Abra o caixa para registrar novos recebimentos.'}
            <Link
              className="text-button"
              to="/financeiro"
              search={{
                date: vm.activeShift?.date ?? localDate(),
                shift: vm.activeShift?.id ?? '',
              }}
            >
              Ir para o caixa
            </Link>
          </div>
        )}
        {vm.mutation.isSuccess ? (
          <div className="panel checkout-success">
            <Feedback
              success={
                vm.receipt?.courtesy
                  ? 'Avaliação encerrada como cortesia, sem movimentação financeira.'
                  : 'Recebimento registrado. Os procedimentos foram quitados no prontuário.'
              }
            />
            <div className="flex gap-3 flex-wrap">
              <button className="btn btn-primary" onClick={vm.showReceipt}>
                <Icon name="file" size={17} />
                Ver recibo detalhado
              </button>
              <button className="btn btn-secondary" onClick={vm.clearPatient}>
                Novo acerto
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="panel checkout-context-picker">
              <Field label="Paciente do atendimento">
                <select
                  aria-label="Paciente do atendimento"
                  value={vm.patientId}
                  onChange={(e) => vm.selectPatient(e.target.value)}
                >
                  <option value="">Selecione o paciente</option>
                  {vm.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Atendimento da agenda (opcional)">
                <select
                  aria-label="Atendimento da agenda"
                  value={vm.search.appointment ?? ''}
                  onChange={(e) => vm.selectAppointment(e.target.value)}
                >
                  <option value="">Acerto sem vínculo com agendamento</option>
                  {vm.appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.date} · {a.time} · {vm.patients.find((p) => p.id === a.patientId)?.name} ·{' '}
                      {a.procedure}
                    </option>
                  ))}
                </select>
              </Field>
            </section>
            <section className="panel payment-picker">
              <SearchInput
                value={vm.search.q}
                onChange={vm.updateSearch}
                placeholder="Buscar paciente, procedimento ou dentista..."
              />
              <select
                aria-label="Selecionar pendência"
                value={vm.search.treatment}
                onChange={(e) => vm.select(e.target.value)}
              >
                <option value="">Selecione uma pendência do prontuário</option>
                {vm.pendingItems.map((item) => (
                  <option key={item.treatmentId} value={item.treatmentId}>
                    {item.patientName} · {item.procedure} · {money(item.grossCents)}
                  </option>
                ))}
              </select>
              {vm.patientId && (
                <button className="text-button" onClick={vm.clearPatient}>
                  Ver todos
                </button>
              )}
            </section>
            {vm.patient ? (
              <>
                <div className="selected-receivable">
                  <Avatar name={vm.patient.name} />
                  <div>
                    <strong>{vm.patient.name}</strong>
                    <p>
                      {vm.appointment
                        ? `${vm.appointment.procedure} · ${vm.appointment.time}`
                        : 'Inclua os serviços executados e confirme os valores recebidos.'}
                    </p>
                  </div>
                  {vm.appointment && (
                    <span className="badge badge-teal">Atendimento vinculado</span>
                  )}
                </div>
                <PaymentForm vm={vm} />
              </>
            ) : (
              <section className="panel">
                <div className="section-heading p-5">
                  <div>
                    <h2>Procedimentos aguardando pagamento</h2>
                    <p className="secondary-text">
                      Selecione uma pendência ou um paciente para montar a comanda.
                    </p>
                  </div>
                  <span className="count-badge">{vm.pendingItems.length}</span>
                </div>
                {vm.pendingItems.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Paciente</th>
                          <th>Procedimento</th>
                          <th>Dentista executor</th>
                          <th>Valor</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vm.pendingItems.map((item) => (
                          <tr key={item.treatmentId}>
                            <td>
                              <span className="patient-name">
                                <Avatar name={item.patientName} />
                                <strong>{item.patientName}</strong>
                              </span>
                            </td>
                            <td>
                              {item.procedure}
                              {item.tooth ? ` · Dente ${item.tooth}` : ''}
                            </td>
                            <td>{item.dentistName}</td>
                            <td>
                              <strong>{money(item.grossCents)}</strong>
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => vm.select(item.treatmentId)}
                              >
                                Lançar recebimento
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Icon name="check" size={30} />
                    <h2>Nenhuma pendência encontrada</h2>
                    <p>
                      Escolha um paciente para incluir serviços adicionais ou encerrar uma
                      avaliação.
                    </p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </QueryState>
      {vm.receipt && vm.receiptOpen && (
        <DocumentDialog title="Recibo de recebimento" onClose={vm.closeReceipt} onPrint={vm.print}>
          <ReceiptDocument receipt={vm.receipt} clinic={vm.settings} />
        </DocumentDialog>
      )}
    </>
  );
}
