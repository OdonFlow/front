import { AccessGate } from '../../access/view/AccessGate';
import { Link } from '@tanstack/react-router';
import { usePatientsViewModel } from '../viewmodel/usePatientsViewModel';
import {
  Avatar,
  Dialog,
  Feedback,
  Field,
  PageHeading,
  QueryState,
  SearchInput,
} from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/Icon';
import { formatDate } from '../../clinic/model/validation';
import { localDate } from '../../clinic/model/fixtures';

export function PatientsPage() {
  const vm = usePatientsViewModel();
  const patient = vm.editing && vm.editing !== 'new' ? vm.editing : null;
  return (
    <>
      <PageHeading
        title="Gestão de Pacientes"
        subtitle="Cuidado começa por conhecer cada paciente."
      >
        <button className="btn btn-primary" onClick={() => vm.open('new')} disabled={!vm.canEdit}>
          <Icon name="plus" size={18} />
          Novo paciente
        </button>
      </PageHeading>
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={vm.search.q}
            onChange={(q) => vm.updateSearch({ q })}
            placeholder="Buscar nome, telefone ou e-mail..."
          />
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Filtrar por dentista"
              value={vm.search.dentist}
              onChange={(e) => vm.updateSearch({ dentist: e.target.value })}
            >
              <option value="">Todos os profissionais</option>
              {vm.dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por status"
              value={vm.search.status}
              onChange={(e) => vm.updateSearch({ status: e.target.value })}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
        <Feedback success={vm.success} />
        <QueryState
          pending={vm.pending}
          error={vm.error}
          retry={vm.retry}
          empty={!vm.patients.length}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nome completo</th>
                  <th>Dentista responsável</th>
                  <th>Contato / WhatsApp</th>
                  <th>Último atendimento</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {vm.patients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="patient-name"
                        onClick={() => vm.open(p)}
                        disabled={!vm.canEdit}
                      >
                        <Avatar name={p.name} />
                        <span>
                          <strong>{p.name}</strong>
                          <span>{p.insurance}</span>
                        </span>
                      </button>
                    </td>
                    <td>{vm.dentistName(p.dentistId)}</td>
                    <td>
                      <a
                        className="contact-link"
                        href={`https://wa.me/55${p.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {p.phone}
                      </a>
                    </td>
                    <td>{p.lastVisit ? formatDate(p.lastVisit) : 'Primeira consulta'}</td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-teal' : 'badge-slate'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <AccessGate permission="records.view">
                        <Link
                          className="icon-button"
                          aria-label={`Abrir prontuário de ${p.name}`}
                          to="/prontuarios"
                          search={{ patient: p.id, tab: 'evolution' }}
                        >
                          <Icon name="file" size={18} />
                        </Link>
                      </AccessGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
        <div className="table-footer">
          <span>
            {vm.patients.length} de {vm.total} pacientes
          </span>
          <span>Seus pacientes, sempre por perto.</span>
        </div>
      </section>
      {vm.editing && (
        <Dialog
          title={patient ? 'Editar paciente' : 'Novo paciente'}
          subtitle="Cadastro e informações de cuidado"
          onClose={vm.close}
          drawer
        >
          <form
            key={patient?.id ?? 'new'}
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              vm.save(new FormData(e.currentTarget));
            }}
          >
            <div className="drawer-patient">
              <Avatar name={patient?.name ?? 'Novo Paciente'} large />
              <div>
                <h3>{patient?.name ?? 'Vamos nos conhecer'}</h3>
                <p>Preencha os dados do paciente.</p>
              </div>
            </div>
            <h3 className="form-section-title">Dados pessoais</h3>
            <Field label="Nome completo *">
              <input
                name="name"
                autoComplete="name"
                defaultValue={patient?.name}
                required
                minLength={3}
                maxLength={100}
              />
            </Field>
            <div className="form-grid">
              <Field label="Data de nascimento *">
                <input
                  type="date"
                  name="birthDate"
                  max={localDate()}
                  defaultValue={patient?.birthDate}
                  required
                />
              </Field>
              <Field label="Convênio">
                <input
                  name="insurance"
                  defaultValue={patient?.insurance ?? 'Particular'}
                  maxLength={100}
                />
              </Field>
            </div>
            <h3 className="form-section-title">Contato</h3>
            <Field label="Telefone / WhatsApp *">
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(85) 99999-9999"
                defaultValue={patient?.phone}
                required
                maxLength={25}
              />
            </Field>
            <Field label="E-mail">
              <input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={patient?.email}
                maxLength={150}
              />
            </Field>
            <Field label="Responsável (se aplicável)">
              <input name="responsible" defaultValue={patient?.responsible} maxLength={100} />
            </Field>
            <h3 className="form-section-title">Informações clínicas</h3>
            <Field label="Dentista titular *">
              <select name="dentistId" defaultValue={patient?.dentistId ?? ''} required>
                <option value="" disabled>
                  Selecione o profissional
                </option>
                {vm.dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Alergias">
              <input
                name="allergies"
                disabled={!vm.canEditClinical}
                placeholder="Ex.: Penicilina"
                defaultValue={patient?.allergies}
                maxLength={300}
              />
            </Field>
            <Field label="Condições de saúde">
              <input
                name="conditions"
                disabled={!vm.canEditClinical}
                placeholder="Ex.: Hipertensão"
                defaultValue={patient?.conditions}
                maxLength={300}
              />
            </Field>
            <label className="checkbox-label">
              <input type="checkbox" name="active" defaultChecked={patient?.active ?? true} />
              Paciente ativo
            </label>
            <Feedback error={vm.formError} />
            <div className="form-actions">
              {patient && vm.canDelete && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={vm.deleting}
                  onClick={vm.remove}
                >
                  Excluir ficha
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={vm.close}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={vm.mutation.isPending}>
                {vm.mutation.isPending ? 'Salvando...' : 'Salvar paciente'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
