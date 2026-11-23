import { PageHeading, QueryState, Field } from '../../../shared/components/ui';
import { money } from '../../finance/model/finance.rules';
import { formatDate } from '../../clinic/model/validation';
import { useOwnCommissionsViewModel } from '../viewmodel/useOwnCommissionsViewModel';
export function OwnCommissionsPage() {
  const vm = useOwnCommissionsViewModel();
  return (
    <>
      <PageHeading
        title="Meus repasses"
        subtitle="Produção e comissões apuradas exclusivamente para seu usuário"
      />
      <div className="panel p-5 flex flex-wrap gap-4 mb-5">
        <Field label="De">
          <input
            type="date"
            value={vm.search.from}
            onChange={(e) => {
              if (e.target.value) vm.updateSearch({ from: e.target.value });
            }}
          />
        </Field>
        <Field label="Até">
          <input
            type="date"
            value={vm.search.to}
            onChange={(e) => {
              if (e.target.value) vm.updateSearch({ to: e.target.value });
            }}
          />
        </Field>
      </div>
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry}>
        {vm.data && (
          <section className="panel">
            <div className="report-summary p-5">
              <span>
                Receita de minha produção<strong>{money(vm.data.revenueCents)}</strong>
              </span>
              <span>
                Repasse apurado<strong>{money(vm.data.commissionCents)}</strong>
              </span>
            </div>
            <p className="p-5 secondary-text">
              O valor apurado não comprova transferência. Recebimentos estornados são excluídos.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Data / recibo</th>
                    <th>Paciente</th>
                    <th>Serviço</th>
                    <th>Receita</th>
                    <th>Repasse</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.data.rows.map((r) => (
                    <tr key={r.key}>
                      <td>
                        {formatDate(r.date)} · {r.receiptNumber}
                      </td>
                      <td>{r.patientName}</td>
                      <td>{r.serviceName}</td>
                      <td>{money(r.revenueCents)}</td>
                      <td>{money(r.commissionCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!vm.data.rows.length && (
              <p className="empty-state">Nenhum repasse apurado neste período.</p>
            )}
          </section>
        )}
      </QueryState>
    </>
  );
}
