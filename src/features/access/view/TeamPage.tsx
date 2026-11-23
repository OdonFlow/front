import { Link } from '@tanstack/react-router';
import {
  Avatar,
  PageHeading,
  QueryState,
  SearchInput,
  Feedback,
  Dialog,
  Field,
} from '../../../shared/components/ui';
import { useTeamViewModel } from '../viewmodel/useTeamViewModel';
import { roleLabels, type Role } from '../model/types';
import { useSession } from '../viewmodel/useSessionViewModel';
export function TeamPage() {
  const vm = useTeamViewModel();
  const session = useSession();
  const user = vm.editing && vm.editing !== 'new' ? vm.editing : undefined;
  return (
    <>
      <PageHeading
        title="Equipe e usuários"
        subtitle="Colaboradores, convites e perfis de acesso da clínica"
      >
        <Link className="btn btn-secondary" to="/permissoes" search={{ role: 'receptionist' }}>
          Matriz de permissões
        </Link>
        <button className="btn btn-primary" onClick={() => vm.open('new')}>
          + Novo usuário
        </button>
      </PageHeading>
      <Feedback success={vm.success} error={vm.editing ? null : vm.formError} />
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={vm.search.q}
            onChange={(q) => vm.updateSearch({ q })}
            placeholder="Buscar por nome, e-mail ou CRO..."
          />
          <nav className="access-tabs" aria-label="Perfis da equipe">
            {(['all', 'dentist', 'receptionist', 'admin'] as const).map((role) => (
              <button
                key={role}
                className={vm.search.role === role ? 'active' : ''}
                onClick={() => vm.updateSearch({ role })}
              >
                {role === 'all' ? 'Todos' : roleLabels[role]} (
                {vm.allUsers.filter((u) => role === 'all' || u.role === role).length})
              </button>
            ))}
          </nav>
        </div>
        <QueryState pending={vm.pending} error={vm.error} retry={vm.retry} empty={!vm.users.length}>
          <div className="table-scroll">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Perfil</th>
                  <th>Especialidade</th>
                  <th>Registro CRO</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vm.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div>
                          <strong>{u.name}</strong>
                          <span className="block secondary-text">{u.email}</span>
                          <span className="block secondary-text">{u.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td>{roleLabels[u.role]}</td>
                    <td>{u.specialty || '—'}</td>
                    <td>{u.cro || '—'}</td>
                    <td>
                      <span
                        className={`badge ${u.active === false ? 'badge-slate' : 'badge-teal'}`}
                      >
                        {u.active === false ? 'Inativo' : u.invited ? 'Convite pendente' : 'Ativo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-3">
                        <button className="text-button" onClick={() => vm.open(u)}>
                          Editar
                        </button>
                        <button
                          className="text-button"
                          disabled={vm.inviting || u.active === false}
                          onClick={() => vm.invite(u.id)}
                        >
                          {u.invited ? 'Reenviar convite' : 'Redefinir senha'}
                        </button>
                        <button
                          className="access-switch"
                          role="switch"
                          aria-label={`Acesso de ${u.name}`}
                          aria-checked={u.active !== false}
                          disabled={vm.saving || u.id === session.data?.user.id}
                          onClick={() => vm.toggle(u)}
                        >
                          <span />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </section>
      {vm.editing && (
        <Dialog
          title={user ? 'Editar colaborador' : 'Novo usuário'}
          subtitle="O primeiro acesso é ativado por convite"
          onClose={vm.close}
          drawer
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              vm.save(new FormData(e.currentTarget));
            }}
          >
            <Feedback error={vm.formError} />
            <Field label="Nome completo">
              <input name="name" required minLength={3} maxLength={150} defaultValue={user?.name} />
            </Field>
            <Field label="E-mail corporativo">
              <input
                name="email"
                type="email"
                required
                maxLength={150}
                defaultValue={user?.email}
              />
            </Field>
            <Field label="Celular">
              <input name="phone" type="tel" required maxLength={25} defaultValue={user?.phone} />
            </Field>
            <Field label="Perfil de acesso">
              <select
                name="role"
                value={vm.role}
                onChange={(e) => vm.setRole(e.target.value as Role)}
              >
                {Object.entries(roleLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            {vm.role === 'dentist' && (
              <>
                <Field label="Registro no CRO (obrigatório)">
                  <input
                    name="cro"
                    placeholder="CRO-CE 84213"
                    required
                    maxLength={40}
                    defaultValue={user?.cro}
                  />
                </Field>
                <Field label="Especialidade principal">
                  <input name="specialty" required maxLength={100} defaultValue={user?.specialty} />
                </Field>
              </>
            )}
            <label className="flex gap-3 items-center">
              <input name="active" type="checkbox" defaultChecked={user?.active !== false} />
              Usuário ativo
            </label>
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={vm.close}
                disabled={vm.saving}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={vm.saving}>
                {vm.saving ? 'Salvando…' : 'Salvar usuário'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
