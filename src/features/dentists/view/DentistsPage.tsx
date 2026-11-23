import { Link } from '@tanstack/react-router';
import { useDentistsViewModel } from '../viewmodel/useDentistsViewModel';
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
import { localDate } from '../../clinic/model/fixtures';

export function DentistsPage() {
  const vm = useDentistsViewModel();
  return (
    <>
      <PageHeading
        title="Dentistas"
        subtitle="Profissionais que fazem a diferença em cada sorriso."
      >
        <button className="btn btn-primary" onClick={vm.openForm}>
          <Icon name="plus" size={18} />
          Novo profissional
        </button>
      </PageHeading>
      <div className="section-heading mb-6">
        <SearchInput
          value={vm.search}
          onChange={vm.setSearch}
          placeholder="Buscar nome, especialidade ou CRO..."
        />
        <span className="secondary-text">{vm.dentists.length} profissionais</span>
      </div>
      <Feedback success={vm.success} />
      <QueryState
        pending={vm.pending}
        error={vm.error}
        retry={vm.retry}
        empty={!vm.dentists.length}
      >
        <div className="dentists-grid">
          {vm.dentists.map((d) => (
            <article className="panel dentist-card" key={d.id}>
              <div className="flex items-start justify-between">
                <Avatar name={d.name} large />
                <span className="badge badge-teal">Ativo</span>
              </div>
              <h2>{d.name}</h2>
              <p className="dentist-specialty">{d.specialty}</p>
              <p className="secondary-text mt-1">{d.cro}</p>
              <a href={`mailto:${d.email}`} className="dentist-contact">
                <Icon name="mail" size={17} />
                {d.email}
              </a>
              <div className="dentist-patients">
                <Icon name="users" size={18} />
                <strong>{vm.patientCount(d.id)}</strong>pacientes sob seus cuidados
              </div>
              <div className="flex gap-2">
                <Link
                  className="btn btn-secondary flex-1"
                  to="/agenda"
                  search={{ date: localDate(), view: 'individual', dentist: d.id }}
                >
                  <Icon name="calendar" size={16} />
                  Ver agenda
                </Link>
                <Link
                  className="btn btn-quiet"
                  to="/pacientes"
                  search={{ q: '', dentist: d.id, status: 'all' }}
                >
                  Pacientes
                </Link>
              </div>
            </article>
          ))}
        </div>
      </QueryState>
      {vm.open && (
        <Dialog
          title="Novo profissional"
          subtitle="Adicione um dentista à equipe da clínica."
          onClose={vm.close}
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              vm.save(new FormData(e.currentTarget));
            }}
          >
            <Field label="Nome completo">
              <input name="name" required minLength={3} maxLength={100} />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" required maxLength={150} />
            </Field>
            <Field label="Especialidade">
              <input name="specialty" placeholder="Ex.: Ortodontia" required maxLength={100} />
            </Field>
            <Field label="Registro profissional (CRO)">
              <input name="cro" placeholder="CRO-CE 12345" required maxLength={30} />
            </Field>
            <Feedback error={vm.mutation.error} />
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={vm.close}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={vm.mutation.isPending}>
                {vm.mutation.isPending ? 'Salvando...' : 'Cadastrar profissional'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
