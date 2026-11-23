import { PageHeading, QueryState, Feedback, Field } from '../../../shared/components/ui';
import { permissions, roleLabels, type Role } from '../model/types';
import { usePermissionsViewModel } from '../viewmodel/usePermissionsViewModel';
export function PermissionsPage() {
  const vm = usePermissionsViewModel();
  return (
    <>
      <PageHeading
        title="Matriz de permissões"
        subtitle="Privilégios por perfil, limites operacionais e auditoria de acesso"
      />
      <nav className="access-tabs mb-5" aria-label="Perfil da matriz">
        {Object.entries(roleLabels).map(([role, label]) => (
          <button
            key={role}
            onClick={() => vm.changeRole(role as Role)}
            className={vm.role === role ? 'active' : ''}
          >
            {label}
          </button>
        ))}
      </nav>
      <p className="feedback feedback-success">
        {vm.role === 'admin'
          ? 'Administradores mantêm acesso total para evitar bloqueio da gestão.'
          : vm.role === 'dentist'
            ? 'Dentistas acessam sua agenda, dados clínicos e os próprios repasses.'
            : 'Recepção opera agendas e caixa, com prontuário somente para leitura.'}{' '}
        Os limites estruturais de cada perfil permanecem bloqueados.
      </p>
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry}>
        {vm.settings && (
          <form
            key={`${vm.role}-${vm.settings.idleMinutes}-${vm.settings.receptionExpenseCapCents}`}
            onSubmit={(e) => {
              e.preventDefault();
              vm.save(new FormData(e.currentTarget));
            }}
          >
            <Feedback error={vm.formError} success={vm.success} />
            <section className="panel">
              <div className="table-scroll">
                <table className="permission-table">
                  <thead>
                    <tr>
                      <th>Módulo</th>
                      <th>Permissão</th>
                      <th>Acesso</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((p) => (
                      <tr key={p.key}>
                        <td>{p.group}</td>
                        <td>{p.label}</td>
                        <td>
                          <button
                            type="button"
                            className="access-switch"
                            role="switch"
                            aria-label={p.label}
                            aria-checked={vm.policy[p.key]}
                            disabled={vm.saving || vm.role === 'admin' || !vm.ceiling[p.key]}
                            onClick={() => vm.toggle(p.key)}
                          >
                            <span />
                          </button>
                        </td>
                        <td>
                          {vm.policy[p.key]
                            ? 'Permitido'
                            : !vm.ceiling[p.key]
                              ? 'Bloqueado pelo perfil'
                              : 'Restrito'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-5 form-grid">
                <Field label="Encerrar sessão após inatividade (minutos)">
                  <input
                    name="idle"
                    type="number"
                    min="1"
                    max="240"
                    required
                    defaultValue={vm.settings.idleMinutes}
                  />
                </Field>
                <Field label="Teto por despesa da recepção (R$)">
                  <input
                    name="cap"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    required
                    defaultValue={(vm.settings.receptionExpenseCapCents / 100).toFixed(2)}
                  />
                </Field>
              </div>
              <div className="p-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={vm.saving}
                  onClick={vm.restore}
                >
                  Restaurar padrão seguro
                </button>
                <button className="btn btn-primary" disabled={vm.saving}>
                  {vm.saving ? 'Salvando…' : 'Salvar permissões'}
                </button>
              </div>
            </section>
          </form>
        )}
      </QueryState>
      <section className="panel mt-6">
        <div className="p-5">
          <h2>Logs de acesso e administração</h2>
          <p className="secondary-text">
            Data, hora, usuário, ação, IP e dispositivo. IP identificado como simulado no modo
            demonstrativo.
          </p>
          <Feedback error={vm.logsError} />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data / hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>IP</th>
                <th>Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {vm.logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.at).toLocaleString('pt-BR')}</td>
                  <td>{log.email}</td>
                  <td>{log.action}</td>
                  <td>{log.ip}</td>
                  <td className="access-device">{log.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
