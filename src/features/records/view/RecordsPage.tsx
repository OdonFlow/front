import { Prescriptions } from './components/Prescriptions';
import { TreatmentPlan } from './components/TreatmentPlan';
import { AnamnesisForm } from './components/AnamnesisForm';
import { EvolutionHistory } from './components/EvolutionHistory';
import { Odontogram } from './components/Odontogram';
import { useRecordsViewModel } from '../viewmodel/useRecordsViewModel';
import { ServicePicker } from '../../services/view/components/ServicePicker';
import {
  Avatar,
  Dialog,
  Feedback,
  Field,
  PageHeading,
  QueryState,
} from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/Icon';
import { age, toothLabels } from '../../clinic/model/validation';
import type { ToothStatus } from '../../clinic/model/types';

const tabs = [
  { id: 'evolution', label: 'Evolução clínica' },
  { id: 'anamnesis', label: 'Anamnese' },
  { id: 'treatment', label: 'Plano de tratamento' },
  { id: 'prescriptions', label: 'Prescrições' },
] as const;

export function RecordsPage() {
  const vm = useRecordsViewModel();
  return (
    <>
      <PageHeading
        title="Prontuário Odontológico"
        subtitle="Um histórico completo. Um cuidado contínuo."
      >
        <button className="btn btn-secondary no-print" onClick={vm.print} disabled={!vm.record}>
          <Icon name="print" size={17} />
          Imprimir
        </button>
        <button
          className="btn btn-primary"
          onClick={() => vm.openModal('evolution')}
          disabled={!vm.record || !vm.canEdit}
        >
          <Icon name="plus" size={18} />
          Nova evolução
        </button>
      </PageHeading>
      {!vm.canEdit && (
        <p className="feedback" role="status">
          Prontuário somente para leitura. Seu perfil não pode alterar dados clínicos.
        </p>
      )}
      <div className="record-picker no-print">
        <Field label="Selecionar paciente">
          <select
            value={vm.patient?.id ?? ''}
            onChange={(e) => vm.updateSearch({ patient: e.target.value })}
          >
            <option value="" disabled>
              Selecione um paciente
            </option>
            {vm.patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <span className="secondary-text">
          <Icon name="file" size={16} />
          Histórico compartilhado entre os profissionais
        </span>
      </div>
      <QueryState
        pending={vm.pending}
        error={vm.error}
        retry={vm.retry}
        empty={!vm.patient || !vm.record}
      >
        {vm.patient && vm.record && (
          <div key={vm.patient.id} className="record-content">
            <section className="panel patient-summary">
              <div className="flex items-center gap-4">
                <Avatar name={vm.patient.name} large />
                <div>
                  <p className="secondary-text">Paciente · {age(vm.patient.birthDate)} anos</p>
                  <h2>{vm.patient.name}</h2>
                  <span className="secondary-text">
                    {vm.patient.insurance} · {vm.patient.phone}
                  </span>
                </div>
              </div>
              <div className="patient-alerts">
                {vm.patient.allergies && (
                  <span className="badge badge-red">
                    <Icon name="alert" size={14} />
                    Alergia: {vm.patient.allergies}
                  </span>
                )}
                {vm.patient.conditions && (
                  <span className="badge badge-amber">
                    <Icon name="heart" size={14} />
                    {vm.patient.conditions}
                  </span>
                )}
                {!vm.patient.allergies && !vm.patient.conditions && (
                  <span className="badge badge-teal">Sem alertas registrados</span>
                )}
              </div>
              <div className="primary-dentist">
                <span className="secondary-text">Dentista titular</span>
                <strong>{vm.dentist(vm.patient.dentistId)?.name ?? 'Sem responsável'}</strong>
              </div>
            </section>
            <Odontogram
              teeth={vm.record.teeth}
              upperTeeth={vm.upperTeeth}
              lowerTeeth={vm.lowerTeeth}
              pending={vm.mutation.isPending || !vm.canEdit}
              onSelect={vm.openTooth}
            />
            <nav className="record-tabs no-print" aria-label="Seções do prontuário">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={vm.search.tab === tab.id ? 'active' : ''}
                  aria-current={vm.search.tab === tab.id ? 'page' : undefined}
                  onClick={() => vm.updateSearch({ tab: tab.id })}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <Feedback error={vm.mutation.error} success={vm.success} />
            {vm.search.tab === 'evolution' && (
              <EvolutionHistory evolutions={vm.record.evolutions} dentist={vm.dentist} />
            )}
            {vm.search.tab === 'anamnesis' && (
              <fieldset disabled={!vm.canEdit}>
                <AnamnesisForm
                  anamnesis={vm.record.anamnesis}
                  pending={vm.mutation.isPending}
                  onSave={vm.saveAnamnesis}
                />
              </fieldset>
            )}
            {vm.search.tab === 'treatment' && (
              <TreatmentPlan
                treatments={vm.record.treatments}
                total={vm.total}
                pendingTotal={vm.pendingTotal}
                pending={vm.mutation.isPending || !vm.canEdit}
                readOnly={!vm.canEdit}
                onAdd={() => vm.openModal('treatment')}
                onToggle={vm.toggleTreatment}
              />
            )}
            {vm.search.tab === 'prescriptions' && (
              <Prescriptions
                readOnly={!vm.canEdit}
                prescriptions={vm.record.prescriptions}
                dentist={vm.dentist}
                onAdd={() => vm.openModal('prescriptions')}
              />
            )}
          </div>
        )}
      </QueryState>
      {vm.tooth && (
        <Dialog
          title={`Dente ${vm.tooth}`}
          subtitle="Selecione a condição para o odontograma."
          onClose={vm.closeTooth}
        >
          <div className="form-content tooth-options">
            {Object.entries(toothLabels).map(([status, label]) => (
              <button
                key={status}
                className={`tooth-option ${vm.record?.teeth[vm.tooth ?? 0] === status ? 'selected' : ''}`}
                disabled={vm.mutation.isPending}
                onClick={() => vm.saveTooth(status as ToothStatus)}
              >
                <i className={`tooth-dot tooth-${status}`} />
                {label}
                {vm.record?.teeth[vm.tooth ?? 0] === status && <Icon name="check" size={17} />}
              </button>
            ))}
            <Feedback error={vm.mutation.error} />
          </div>
        </Dialog>
      )}
      {vm.modal && (
        <Dialog
          title={
            vm.modal === 'evolution'
              ? 'Nova evolução clínica'
              : vm.modal === 'treatment'
                ? 'Adicionar procedimento'
                : 'Nova prescrição'
          }
          subtitle={vm.patient?.name}
          onClose={vm.closeModal}
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              vm.submit(new FormData(e.currentTarget));
            }}
          >
            {
              <Field label="Profissional responsável">
                <select name="dentistId" required defaultValue={vm.patient?.dentistId}>
                  {vm.dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.cro}
                    </option>
                  ))}
                </select>
              </Field>
            }
            {vm.modal === 'evolution' && (
              <Field label="Descrição do atendimento">
                <textarea
                  name="description"
                  rows={6}
                  required
                  maxLength={5000}
                  placeholder="Procedimentos realizados, observações e orientações..."
                />
              </Field>
            )}
            {vm.modal === 'treatment' && (
              <>
                <Feedback error={vm.serviceError} />
                {vm.serviceError && (
                  <button type="button" className="text-button" onClick={vm.retryServices}>
                    Tentar carregar catálogo novamente
                  </button>
                )}
                {vm.serviceLoading && (
                  <p className="secondary-text" role="status">
                    Carregando catálogo de serviços...
                  </p>
                )}
                <ServicePicker
                  services={vm.services}
                  value={vm.treatmentServiceId}
                  onChange={vm.setTreatmentServiceId}
                  label="Serviço do catálogo (opcional)"
                  optional
                />
                <Field label="Dente">
                  <select name="tooth">
                    {[...vm.upperTeeth, ...vm.lowerTeeth].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Procedimento">
                  <input
                    name="procedure"
                    key={`name-${vm.treatmentServiceId}`}
                    defaultValue={vm.treatmentService?.name ?? ''}
                    readOnly={Boolean(vm.treatmentService)}
                    required
                    maxLength={150}
                  />
                </Field>
                <Field label="Valor (R$)">
                  <input
                    name="price"
                    key={`price-${vm.treatmentServiceId}`}
                    defaultValue={vm.treatmentService ? vm.treatmentService.priceCents / 100 : ''}
                    readOnly={Boolean(vm.treatmentService)}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </Field>
              </>
            )}
            {vm.modal === 'prescriptions' && (
              <>
                <Field label="Medicamento / produto">
                  <input name="medication" required maxLength={200} />
                </Field>
                <Field label="Posologia e orientações">
                  <textarea name="instructions" rows={5} required maxLength={3000} />
                </Field>
              </>
            )}
            <Feedback error={vm.formError} />
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={vm.closeModal}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={vm.mutation.isPending}>
                {vm.mutation.isPending ? 'Salvando...' : 'Salvar registro'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
