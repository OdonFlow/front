import { createPortal } from 'react-dom';
import { Dialog, Field, Feedback } from '../../../../shared/components/ui';
import { money } from '../../../finance/model/finance.rules';
import { localDate } from '../../../clinic/model/fixtures';
import { formatDate } from '../../../clinic/model/validation';
import { categoryLabels } from '../../model/expense.rules';
import { dashboardFilterLabel } from '../../model/statements';
import type { ManagementViewModel } from '../../viewmodel/useManagementViewModel';
import type { DashboardData } from '../../model/types';

export function ManagementDialogs({ vm }: { vm: ManagementViewModel }) {
  const data = vm.data;
  if (!vm.panel) return null;
  if (vm.panel === 'expense')
    return (
      <Dialog title={vm.editing ? 'Editar despesa' : 'Nova despesa'} onClose={vm.close}>
        <form
          className="management-form"
          onSubmit={(e) => {
            e.preventDefault();
            vm.saveExpense(new FormData(e.currentTarget));
          }}
        >
          <Feedback error={vm.formError} />
          <Field label="Descrição">
            <input
              name="description"
              required
              minLength={3}
              maxLength={150}
              defaultValue={vm.editing?.description}
            />
          </Field>
          <div className="form-grid">
            <Field label="Categoria">
              <select name="category" defaultValue={vm.editing?.category ?? 'fixed'}>
                {Object.entries(categoryLabels).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data da despesa">
              <input
                type="date"
                name="date"
                required
                defaultValue={vm.editing?.date ?? localDate()}
                max={localDate()}
              />
            </Field>
            <Field label="Valor (R$)">
              <input
                name="amount"
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
                defaultValue={vm.editing ? (vm.editing.amountCents / 100).toFixed(2) : ''}
              />
            </Field>
            <Field label="Referência / comprovante">
              <input name="reference" maxLength={150} defaultValue={vm.editing?.reference} />
            </Field>
            <Field label="Vínculo com dentista">
              <select name="dentistId" defaultValue={vm.editing?.dentistId ?? ''}>
                <option value="">Toda a clínica (rateio)</option>
                {data?.options.dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vínculo com serviço">
              <select name="serviceId" defaultValue={vm.editing?.serviceId ?? ''}>
                <option value="">Todos os serviços (rateio)</option>
                {data?.options.services
                  .filter((s) => !s.id.startsWith('legacy:'))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <p className="secondary-text">
            Lançamento gerencial realizado. Não movimenta o caixa físico. O custo será rateado no
            período consultado conforme os vínculos selecionados.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={vm.saving}
              onClick={() => vm.open('expenses')}
            >
              Voltar
            </button>
            <button className="btn btn-primary" disabled={vm.saving}>
              {vm.saving ? 'Salvando…' : 'Salvar despesa'}
            </button>
          </div>
        </form>
      </Dialog>
    );
  if (vm.panel === 'cancel')
    return (
      <Dialog title="Cancelar despesa" onClose={vm.close}>
        <form
          className="management-form"
          onSubmit={(e) => {
            e.preventDefault();
            vm.cancelExpense(new FormData(e.currentTarget));
          }}
        >
          <p>
            {vm.editing?.description} · {money(vm.editing?.amountCents ?? 0)}
          </p>
          <Feedback error={vm.formError} />
          <Field label="Motivo do cancelamento">
            <textarea name="reason" required minLength={5} maxLength={500} />
          </Field>
          <p className="secondary-text">
            O registro será preservado e deixará de compor o resultado.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={vm.saving}
              onClick={() => vm.open('expenses')}
            >
              Voltar
            </button>
            <button className="btn btn-primary" disabled={vm.saving}>
              Confirmar cancelamento
            </button>
          </div>
        </form>
      </Dialog>
    );
  if (vm.panel === 'goal')
    return (
      <Dialog title="Configurar meta diária" onClose={vm.close}>
        <form
          className="management-form"
          onSubmit={(e) => {
            e.preventDefault();
            vm.saveGoal(new FormData(e.currentTarget));
          }}
        >
          <Feedback error={vm.formError} />
          <Field label="Meta diária de receita (R$)">
            <input
              name="amount"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              defaultValue={((data?.settings.dailyGoalCents ?? 0) / 100).toFixed(2)}
            />
          </Field>
          <p className="secondary-text">
            A meta do período considera segunda a sexta, sem calendário de feriados. Use zero para
            desativar. Os filtros não reduzem a meta da clínica.
          </p>
          <div className="dialog-actions">
            <button className="btn btn-primary" disabled={vm.saving}>
              Salvar meta
            </button>
          </div>
        </form>
      </Dialog>
    );
  if (vm.panel === 'expenses')
    return (
      <Dialog
        title="Despesas operacionais"
        subtitle="Lançamentos no período selecionado, incluindo cancelados"
        onClose={vm.close}
      >
        <div className="management-form">
          <Feedback error={vm.formError} success={vm.success} />
          <div className="flex justify-between items-center gap-3">
            <p>Custos fixos, insumos e laboratórios</p>
            <button className="btn btn-primary" onClick={() => vm.open('expense')}>
              Nova despesa
            </button>
          </div>
          <p className="secondary-text">
            Valores totais dos lançamentos; a coluna “No recorte” indica o rateio que compõe a DRE
            com os filtros atuais.
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Despesa</th>
                  <th>Data</th>
                  <th>Total</th>
                  <th>No recorte</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.expenses.map(({ expense: e, allocatedCents }) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.description}</strong>
                      <small className="block secondary-text">
                        {categoryLabels[e.category]} · {e.reference || 'Sem referência'}
                      </small>
                      <small className="block secondary-text">
                        {e.operatorName} · {new Date(e.updatedAt).toLocaleString('pt-BR')}
                      </small>
                      {e.cancellation && (
                        <small className="block feedback-error">
                          Cancelada: {e.cancellation.reason} · {e.cancellation.operatorName} ·{' '}
                          {new Date(e.cancellation.at).toLocaleString('pt-BR')}
                        </small>
                      )}
                    </td>
                    <td>{formatDate(e.date)}</td>
                    <td>{money(e.amountCents)}</td>
                    <td>{money(allocatedCents)}</td>
                    <td>
                      {!e.cancellation && (
                        <div className="flex gap-2">
                          <button className="text-button" onClick={() => vm.open('expense', e)}>
                            Editar
                          </button>
                          <button className="text-button" onClick={() => vm.open('cancel', e)}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data?.expenses.length && (
            <p className="empty-state">Nenhuma despesa lançada neste período.</p>
          )}
        </div>
      </Dialog>
    );
  if (!data) return null;
  const doctor = vm.panel === 'dentist' ? vm.dentist : undefined;
  const report = (
    <article className="finance-document finance-report management-report">
      <header className="finance-document-heading">
        <div>
          <span className="brand">{vm.clinicName}</span>
          <h2>{doctor ? 'Extrato de produção e repasses' : 'DRE gerencial'}</h2>
        </div>
        <span className="badge badge-teal">Regime de caixa</span>
      </header>
      <p>
        <strong>
          {formatDate(data.range.from)} a {formatDate(data.range.to)}
        </strong>{' '}
        · Emitido em {vm.generatedAt}
      </p>
      <p className="secondary-text">{dashboardFilterLabel(data)}</p>
      {doctor ? (
        <>
          <h3>{doctor.name}</h3>
          <div className="report-summary">
            <span>
              Receita<strong>{money(doctor.revenueCents)}</strong>
            </span>
            <span>
              Repasse apurado<strong>{money(doctor.commissionCents)}</strong>
            </span>
            <span>
              Margem clínica antes dos custos<strong>{money(doctor.clinicMarginCents)}</strong>
            </span>
          </div>
          <p>
            Taxas: {money(doctor.feesCents)} · Despesas rateadas: {money(doctor.expensesCents)} ·
            Resultado atribuído: {money(doctor.profitCents)}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data / recibo</th>
                  <th>Paciente / serviço</th>
                  <th>Receita</th>
                  <th>Repasse</th>
                </tr>
              </thead>
              <tbody>
                {vm.dentistRows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      {formatDate(r.date)}
                      <small className="block">{r.receiptNumber}</small>
                    </td>
                    <td>
                      {r.patientName}
                      <small className="block">
                        {r.quantity} × {r.serviceName}
                      </small>
                      <small className="block">{r.channels.join(' / ')}</small>
                    </td>
                    <td>{money(r.revenueCents)}</td>
                    <td>{money(r.commissionCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Valores apurados nos recebimentos quitados. Este extrato não comprova pagamento de
            comissão ao profissional.
          </p>
        </>
      ) : (
        <DreTable data={data} vm={vm} />
      )}
      <p className="management-footnote">
        Descontos e cortesias deduzidos. Estornos excluídos. Taxas provisionadas conforme
        recebimentos. Despesas rateadas pela receita do período e pelos vínculos. Documento
        gerencial baseado em dados demonstrativos.
      </p>
      <div className="management-signature">
        <strong>{vm.responsible.trim() || 'Responsável pela conferência'}</strong>
        <span>Assinatura manual do responsável</span>
      </div>
    </article>
  );
  return (
    <>
      <Dialog title={doctor ? `Extrato · ${doctor.name}` : 'Exportar DRE'} onClose={vm.close}>
        <div className="management-form">
          <Feedback error={vm.formError} />
          <Field label="Responsável pela emissão">
            <input
              value={vm.responsible}
              onChange={(e) => vm.setResponsible(e.target.value)}
              maxLength={150}
              placeholder="Nome completo para identificação"
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            {!doctor && (
              <button
                className="btn btn-primary"
                disabled={vm.exporting}
                onClick={() => void vm.download()}
              >
                {vm.exporting ? 'Gerando…' : 'Baixar Excel (.xlsx)'}
              </button>
            )}
            <button
              className="btn btn-secondary"
              disabled={vm.responsible.trim().length < 3}
              onClick={vm.print}
            >
              Imprimir / salvar PDF
            </button>
          </div>
          <p className="secondary-text">
            PDF pela impressão do navegador, com campo para assinatura manual. A planilha inclui
            DRE, recebimentos, despesas, dentistas, serviços, canais e evolução.
          </p>
          {report}
        </div>
      </Dialog>
      {createPortal(<div className="finance-print-document">{report}</div>, document.body)}
    </>
  );
}
function DreTable({ data, vm }: { data: DashboardData; vm: ManagementViewModel }) {
  const t = data.totals;
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Demonstração do resultado</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {vm.dreRows.map(([name, value]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>
                <strong>{money(value)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Margem líquida:{' '}
        {t.revenueCents
          ? `${t.marginPercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
          : 'Sem receita'}{' '}
        · Ticket médio: {money(t.ticketCents)} · {t.attendances} atendimentos
      </p>
      <h3>Despesas por categoria</h3>
      <table>
        <tbody>
          {vm.categoryTotals.map(({ key, name, amountCents }) => (
            <tr key={key}>
              <td>{name}</td>
              <td>{money(amountCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Período anterior: {money(data.previous.revenueCents)} de receita ·{' '}
        {money(data.previous.profitCents)} de resultado.
      </p>
    </>
  );
}
