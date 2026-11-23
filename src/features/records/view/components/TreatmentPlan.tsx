import { AccessGate } from '../../../access/view/AccessGate';
import type { Treatment } from '../../../clinic/model/types';
import { Icon } from '../../../../shared/components/Icon';
import { Link } from '@tanstack/react-router';
import { localDate } from '../../../clinic/model/fixtures';
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
interface Props {
  treatments: Treatment[];
  total: number;
  pendingTotal: number;
  pending: boolean;
  onAdd: () => void;
  onToggle: (id: string) => void;
  readOnly?: boolean;
}
export function TreatmentPlan({
  treatments,
  total,
  pendingTotal,
  pending,
  onAdd,
  onToggle,
  readOnly = false,
}: Props) {
  return (
    <section className="panel">
      <div className="section-heading p-5">
        <div>
          <h2>Plano de tratamento</h2>
          <p className="secondary-text">Acompanhe cada etapa do cuidado.</p>
        </div>
        <button className="btn btn-secondary" onClick={onAdd} disabled={readOnly}>
          <Icon name="plus" size={17} />
          Adicionar procedimento
        </button>
      </div>
      {!treatments.length ? (
        <div className="empty-state compact">
          <p>Nenhum procedimento planejado.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Dente</th>
                <th>Procedimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Financeiro</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {treatments.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="tooth-chip">{t.tooth || '—'}</span>
                  </td>
                  <td>
                    <strong>{t.procedure}</strong>
                  </td>
                  <td>{money(t.price)}</td>
                  <td>
                    <span className={`badge ${t.completed ? 'badge-teal' : 'badge-amber'}`}>
                      {t.completed ? 'Concluído' : 'Planejado'}
                    </span>
                  </td>
                  <td>
                    {t.completed ? (
                      t.paymentStatus === 'paid' ? (
                        <AccessGate permission="finance.receipt">
                          <Link
                            className="badge badge-teal"
                            to="/financeiro"
                            search={{ date: localDate(), shift: '', receipt: t.receiptId }}
                          >
                            Pago · Ver recibo
                          </Link>
                        </AccessGate>
                      ) : (
                        <AccessGate permission="finance.receive">
                          <Link
                            className="badge badge-amber"
                            to="/financeiro/recebimentos"
                            search={{ q: '', patient: t.patientId, treatment: t.id }}
                          >
                            Pendente · Receber
                          </Link>
                        </AccessGate>
                      )
                    ) : (
                      <span className="secondary-text">Após conclusão</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="text-button"
                      disabled={pending || t.paymentStatus === 'paid'}
                      title={
                        t.paymentStatus === 'paid'
                          ? 'Estorne o recebimento antes de reabrir este procedimento.'
                          : undefined
                      }
                      onClick={() => onToggle(t.id)}
                    >
                      {t.completed ? 'Reabrir' : 'Concluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="treatment-total">
        <span>
          Total do plano <strong>{money(total)}</strong>
        </span>
        <span>
          A realizar <strong>{money(pendingTotal)}</strong>
        </span>
      </div>
    </section>
  );
}
