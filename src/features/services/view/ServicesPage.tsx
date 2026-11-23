import { useServicesViewModel } from '../viewmodel/useServicesViewModel';
import {
  Dialog,
  Feedback,
  Field,
  PageHeading,
  QueryState,
  SearchInput,
} from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/Icon';
import { money } from '../../finance/model/finance.rules';
import { serviceCategories } from '../model/types';

export function ServicesPage() {
  const vm = useServicesViewModel();
  const service = vm.editing && vm.editing !== 'new' ? vm.editing : null;
  return (
    <>
      <PageHeading
        title="Catálogo de Serviços"
        subtitle="Preços, tempos de cadeira e repasses em um só lugar."
      >
        {vm.canEdit && (
          <button className="btn btn-primary" onClick={() => vm.open('new')}>
            <Icon name="plus" size={18} />
            Novo serviço
          </button>
        )}
      </PageHeading>
      <section className="panel">
        <div className="table-toolbar">
          <div>
            <h2>Tabela de serviços e procedimentos</h2>
            <p className="secondary-text">{vm.total} serviços cadastrados</p>
          </div>
          <SearchInput
            value={vm.search.q}
            onChange={(q) => vm.updateSearch({ q })}
            placeholder="Buscar serviço..."
          />
          <select
            aria-label="Situação dos serviços"
            value={vm.search.status}
            onChange={(e) =>
              vm.updateSearch({
                status:
                  e.target.value === 'all'
                    ? 'all'
                    : e.target.value === 'inactive'
                      ? 'inactive'
                      : 'active',
              })
            }
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos os status</option>
          </select>
        </div>
        <nav className="service-categories" aria-label="Categorias de serviços">
          <button
            className={!vm.search.category ? 'active' : ''}
            onClick={() => vm.updateSearch({ category: '' })}
          >
            Todos ({vm.total})
          </button>
          {vm.categories.map((c) => (
            <button
              key={c.name}
              className={vm.search.category === c.name ? 'active' : ''}
              onClick={() => vm.updateSearch({ category: c.name })}
            >
              {c.name} ({c.count})
            </button>
          ))}
        </nav>
        <Feedback success={vm.success} />
        <QueryState
          pending={vm.pending}
          error={vm.error}
          retry={vm.retry}
          empty={!vm.services.length}
        >
          <div className="table-scroll">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Procedimento</th>
                  <th>Categoria</th>
                  <th>Duração</th>
                  {vm.canEdit && <th>Repasse</th>}
                  <th>Valor base</th>
                  <th>Situação</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {vm.services.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button
                        className="service-name"
                        onClick={() => vm.open(s)}
                        disabled={!vm.canEdit}
                      >
                        {s.name}
                      </button>
                    </td>
                    <td>{s.category}</td>
                    <td>{s.durationMinutes} min</td>
                    {vm.canEdit && <td>{s.commissionRate}%</td>}
                    <td>
                      <strong>{money(s.priceCents)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${s.active ? 'badge-teal' : 'badge-slate'}`}>
                        {s.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => vm.open(s)}
                        disabled={!vm.canEdit}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
        <div className="table-footer">
          <span>
            {vm.services.length} de {vm.total} serviços
          </span>
          <span>Tabela oficial da clínica</span>
        </div>
      </section>
      {vm.editing && (
        <Dialog
          title={service ? 'Editar serviço' : 'Cadastrar novo serviço'}
          subtitle="Defina os parâmetros do procedimento."
          drawer
          onClose={vm.close}
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              vm.save(new FormData(e.currentTarget));
            }}
          >
            <Field label="Nome do procedimento">
              <input
                name="name"
                defaultValue={service?.name}
                minLength={3}
                maxLength={120}
                required
              />
            </Field>
            <Field label="Categoria">
              <select name="category" defaultValue={service?.category ?? 'Clínica Geral'}>
                {serviceCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Valor padrão (R$)">
                <input
                  name="price"
                  inputMode="decimal"
                  value={vm.price}
                  onChange={(e) => vm.setPrice(e.target.value)}
                  pattern="[0-9]+([.,][0-9]{1,2})?"
                  required
                />
              </Field>
              <Field label="Duração estimada">
                <select name="duration" defaultValue={service?.durationMinutes ?? 30}>
                  {Array.from({ length: 32 }, (_, i) => (i + 1) * 15).map((n) => (
                    <option key={n} value={n}>
                      {n} min
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Repasse ao dentista (%)">
              <input
                name="commissionRate"
                type="number"
                value={vm.rate}
                onChange={(e) => vm.setRate(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                required
              />
            </Field>
            <div className="cash-available">
              <span>Comissão por atendimento</span>
              <strong>{money(vm.commissionCents)}</strong>
            </div>
            <label className="checkbox-label">
              <input name="active" type="checkbox" defaultChecked={service?.active ?? true} />
              Serviço ativo para novos lançamentos
            </label>
            <p className="secondary-text">
              As alterações valem para novas seleções. Procedimentos e recibos anteriores preservam
              seus valores.
            </p>
            <Feedback error={vm.formError} />
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={vm.close}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={vm.saving}>
                {vm.saving ? 'Salvando...' : 'Salvar procedimento'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
