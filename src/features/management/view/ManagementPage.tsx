import { PageHeading, QueryState, Feedback, Field } from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/Icon';
import { formatDate } from '../../clinic/model/validation';
import { money, methodLabels, methodKeys } from '../../finance/model/finance.rules';
import { useManagementViewModel } from '../viewmodel/useManagementViewModel';
import type { DashboardData, PeriodKey } from '../model/types';
import { ManagementDialogs } from './components/ManagementDialogs';
import { EvolutionChart } from './components/EvolutionChart';

const periods: { key: PeriodKey; name: string }[] = [
  { key: 'day', name: 'Dia' },
  { key: 'week', name: 'Semana' },
  { key: 'month', name: 'Mês' },
  { key: 'year', name: 'Ano' },
  { key: 'custom', name: 'Personalizado' },
];
const percentage = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
function DimensionFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <details className="management-filter">
      <summary>
        {label} <span>{selected.length || 'Todos'}</span>
      </summary>
      <div className="management-filter-options">
        <button className="text-button" onClick={() => onChange([])}>
          Selecionar todos
        </button>
        {options.map((option) => (
          <label key={option.id}>
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }
            />
            {option.name}
          </label>
        ))}
      </div>
    </details>
  );
}
export function ManagementPage() {
  const vm = useManagementViewModel();
  const data = vm.data;
  return (
    <>
      <PageHeading
        title="Gestão financeira"
        subtitle="Visão estratégica da clínica · receitas, repasses e resultado real"
      >
        <button className="btn btn-secondary" onClick={() => vm.open('expenses')}>
          Despesas
        </button>
        <button className="btn btn-secondary" onClick={() => vm.open('goal')} disabled={!data}>
          Configurar meta
        </button>
        <button
          className="btn btn-primary"
          onClick={() => vm.open('export')}
          disabled={!data || Boolean(vm.error)}
        >
          <Icon name="file" size={17} />
          Exportar DRE
        </button>
      </PageHeading>
      <Feedback success={vm.success} />
      <section className="panel management-toolbar" aria-label="Filtros de gestão financeira">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
          {periods.map((p) => (
            <button
              key={p.key}
              className={`btn ${vm.search.period === p.key ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={vm.search.period === p.key}
              onClick={() => vm.updateSearch({ period: p.key })}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="management-date-controls">
          <button
            className="icon-button"
            aria-label="Período anterior"
            onClick={() => vm.shift(-1)}
          >
            <Icon name="left" />
          </button>
          {vm.search.period === 'custom' ? (
            <>
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
            </>
          ) : (
            <Field label="Data de referência">
              <input
                type="date"
                value={vm.search.date}
                onChange={(e) => {
                  if (e.target.value) vm.updateSearch({ date: e.target.value });
                }}
              />
            </Field>
          )}
          <button className="icon-button" aria-label="Próximo período" onClick={() => vm.shift(1)}>
            <Icon name="right" />
          </button>
          <button className="text-button" onClick={vm.today}>
            Hoje
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <DimensionFilter
            label="Dentistas"
            options={data?.options.dentists ?? []}
            selected={vm.search.dentists}
            onChange={(dentists) => vm.updateSearch({ dentists })}
          />
          <DimensionFilter
            label="Serviços"
            options={data?.options.services ?? []}
            selected={vm.search.services}
            onChange={(services) => vm.updateSearch({ services })}
          />
          <DimensionFilter
            label="Canais"
            options={methodKeys.map((id) => ({ id, name: methodLabels[id] }))}
            selected={vm.search.methods}
            onChange={(ids) =>
              vm.updateSearch({ methods: methodKeys.filter((m) => ids.includes(m)) })
            }
          />
          <button
            className="text-button"
            onClick={() => vm.updateSearch({ dentists: [], services: [], methods: [] })}
          >
            Limpar filtros
          </button>
        </div>
      </section>
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry}>
        {data && (
          <>
            <div className="management-period">
              <span>
                {formatDate(data.range.from)} a {formatDate(data.range.to)}
              </span>
              <span>
                Comparado a {formatDate(data.previousRange.from)} a{' '}
                {formatDate(data.previousRange.to)}
                {vm.refreshing && ' · Atualizando…'}
              </span>
            </div>
            <section className="management-kpis" aria-label="Indicadores financeiros">
              <Kpi
                label="Receita recebida"
                value={money(data.totals.revenueCents)}
                note={
                  data.growthPercent === null
                    ? 'Sem receita no período anterior'
                    : `${data.growthPercent >= 0 ? '+' : ''}${percentage(data.growthPercent)} versus período anterior`
                }
                icon="wallet"
              />
              <Kpi
                label="Repasses aos dentistas"
                value={money(data.totals.commissionCents)}
                note={`${percentage(data.totals.commissionPercent)} da receita · apurado`}
                icon="users"
              />
              <Kpi
                label="Despesas + taxas"
                value={money(data.totals.totalExpensesCents)}
                note={`${money(data.totals.operatingExpensesCents)} operacionais + ${money(data.totals.feesCents)} taxas`}
                icon="card"
              />
              <Kpi
                label="Lucro líquido gerencial"
                value={money(data.totals.profitCents)}
                note={
                  data.totals.revenueCents
                    ? `Margem de ${percentage(data.totals.marginPercent)}`
                    : 'Sem receita no período'
                }
                icon="grid"
                profit={data.totals.profitCents >= 0}
              />
            </section>
            {!data.totals.attendances && (
              <p className="feedback" role="status">
                Nenhum recebimento no período com estes filtros. Despesas lançadas continuam
                compondo o resultado.
              </p>
            )}
            <section className="panel management-goal" aria-label="Meta de faturamento">
              <div>
                <strong>Meta do período: {money(data.goalCents)}</strong>
                <p>
                  {money(data.settings.dailyGoalCents)} por dia útil (segunda a sexta) · meta da
                  clínica inteira
                </p>
              </div>
              <div className="management-goal-progress">
                <progress
                  value={Math.min(100, Math.max(0, data.goalPercent))}
                  max="100"
                  aria-label="Progresso da meta"
                />
                <strong>
                  {data.goalCents ? `${percentage(data.goalPercent)} atingida` : 'Meta desativada'}
                </strong>
              </div>
            </section>
            <div className="management-grid">
              <section className="panel management-chart-panel">
                <div className="management-section-heading">
                  <div>
                    <h2>Evolução financeira</h2>
                    <p>Receita, saídas totais e lucro no período</p>
                  </div>
                  <span className="badge badge-teal">Regime de caixa</span>
                </div>
                <EvolutionChart points={data.trend} />
                <div className="management-mini-stats">
                  <span>
                    Ticket médio<strong>{money(data.totals.ticketCents)}</strong>
                  </span>
                  <span>
                    Atendimentos quitados<strong>{data.totals.attendances}</strong>
                  </span>
                  <span>
                    Pacientes atendidos<strong>{data.totals.patients}</strong>
                  </span>
                </div>
              </section>
              <PaymentMix data={data} />
            </div>
            <div className="management-grid management-bottom-grid">
              <section className="panel">
                <div className="management-section-heading">
                  <div>
                    <h2>Desempenho por dentista</h2>
                    <p>Selecione um profissional para apurar seu extrato</p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Dentista</th>
                        <th>Atend.</th>
                        <th>Receita</th>
                        <th>Repasse</th>
                        <th>Margem clínica¹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dentists.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <button className="text-button" onClick={() => vm.openDentist(d.id)}>
                              {d.name}
                            </button>
                          </td>
                          <td>{d.attendances}</td>
                          <td>{money(d.revenueCents)}</td>
                          <td>
                            {money(d.commissionCents)}
                            <small className="block secondary-text">
                              {percentage(d.commissionPercent)}
                            </small>
                          </td>
                          <td>{money(d.clinicMarginCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.dentists.length && (
                    <p className="empty-state">Sem produção financeira neste período.</p>
                  )}
                </div>
                <p className="management-footnote">
                  ¹ Receita menos repasses, antes de taxas e despesas. Repasse apurado não significa
                  transferência efetuada.
                </p>
              </section>
              <section className="panel">
                <div className="management-section-heading">
                  <div>
                    <h2>Ranking de serviços</h2>
                    <p>Rentabilidade após taxas e rateio das despesas</p>
                  </div>
                  <Field label="Ordenar por">
                    <select
                      value={vm.search.ranking}
                      onChange={(e) =>
                        vm.updateSearch({
                          ranking: e.target.value === 'revenue' ? 'revenue' : 'profit',
                        })
                      }
                    >
                      <option value="profit">Lucro</option>
                      <option value="revenue">Receita</option>
                    </select>
                  </Field>
                </div>
                <ol className="management-ranking">
                  {data.services.map((s, i) => (
                    <li key={s.key}>
                      <span className="management-rank">{i + 1}</span>
                      <div>
                        <strong>{s.name}</strong>
                        <span>
                          {s.quantity} procedimento(s) · {percentage(s.revenuePercent)} da receita
                        </span>
                        <progress
                          value={s.revenuePercent}
                          max="100"
                          aria-label={`Participação de ${s.name}`}
                        />
                      </div>
                      <div className="management-rank-value">
                        <strong>
                          {money(vm.search.ranking === 'profit' ? s.profitCents : s.revenueCents)}
                        </strong>
                        <span>Receita {money(s.revenueCents)}</span>
                      </div>
                    </li>
                  ))}
                </ol>
                {!data.services.length && (
                  <p className="empty-state">Sem serviços quitados no período.</p>
                )}
              </section>
            </div>
            <p className="management-footnote">
              Descontos e cortesias reduzem a receita; estornos são excluídos. Despesas são rateadas
              proporcionalmente à receita do período, respeitando vínculos com dentista/serviço.
              Sangrias não são despesas.
              {data.unallocatedExpensesCents > 0 &&
                ` Há ${money(data.unallocatedExpensesCents)} sem base de rateio para as dimensões selecionadas.`}
            </p>
          </>
        )}
      </QueryState>
      <ManagementDialogs vm={vm} />
    </>
  );
}
function Kpi({
  label,
  value,
  note,
  icon,
  profit,
}: {
  label: string;
  value: string;
  note: string;
  icon: 'wallet' | 'users' | 'card' | 'grid';
  profit?: boolean;
}) {
  return (
    <article
      className={`panel management-kpi ${profit === true ? 'management-kpi-profit' : profit === false ? 'management-kpi-loss' : ''}`}
    >
      <div>
        <span>{label}</span>
        <Icon name={icon} size={20} />
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}
function PaymentMix({ data }: { data: DashboardData }) {
  return (
    <section className="panel management-payments">
      <div className="management-section-heading">
        <div>
          <h2>Mix de recebimentos</h2>
          <p>Participação por canal de pagamento</p>
        </div>
      </div>
      <div className="management-mix" aria-label="Distribuição da receita">
        {data.channels.map((c) => (
          <span
            key={c.method}
            className={`channel-${c.method}`}
            style={{ width: `${c.percent}%` }}
            title={`${methodLabels[c.method]}: ${percentage(c.percent)}`}
          />
        ))}
      </div>
      <ul>
        {data.channels.map((c) => (
          <li key={c.method}>
            <span>
              <i className={`channel-${c.method}`} />
              {methodLabels[c.method]}
              <small>{c.transactions} recebimento(s)</small>
            </span>
            <span>
              <strong>{money(c.revenueCents)}</strong>
              <small>{percentage(c.percent)}</small>
            </span>
          </li>
        ))}
      </ul>
      <div className="management-fees">
        <span>
          Taxas provisionadas<strong>{money(data.totals.feesCents)}</strong>
        </span>
        <p>
          Taxas históricas registradas em cada recebimento. Valores antes da liquidação da
          operadora.
        </p>
      </div>
    </section>
  );
}
