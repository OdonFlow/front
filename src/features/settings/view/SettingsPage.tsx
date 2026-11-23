import { useSettingsViewModel } from '../viewmodel/useSettingsViewModel';
import { Feedback, Field, PageHeading, QueryState } from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/Icon';
export function SettingsPage() {
  const vm = useSettingsViewModel();
  return (
    <>
      <PageHeading
        title="Configurações"
        subtitle="Deixe o OdontoFlow com o jeito da sua clínica."
      />
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry}>
        {vm.settings && (
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              vm.save(new FormData(e.currentTarget));
            }}
          >
            <section className="panel settings-panel">
              <div className="settings-section-intro">
                <span className="feature-icon">
                  <Icon name="tooth" size={24} />
                </span>
                <div>
                  <h2>Informações da clínica</h2>
                  <p>Dados de identificação e contato.</p>
                </div>
              </div>
              <div className="settings-fields">
                <Field label="Nome da clínica">
                  <input name="name" defaultValue={vm.settings.name} required maxLength={60} />
                </Field>
                <div className="form-grid">
                  <Field label="Telefone">
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={vm.settings.phone}
                      required
                      maxLength={25}
                    />
                  </Field>
                  <Field label="E-mail">
                    <input
                      name="email"
                      type="email"
                      defaultValue={vm.settings.email}
                      required
                      maxLength={150}
                    />
                  </Field>
                </div>
                <Field label="Endereço">
                  <input name="address" defaultValue={vm.settings.address} maxLength={250} />
                </Field>
              </div>
            </section>
            <section className="panel settings-panel">
              <div className="settings-section-intro">
                <span className="feature-icon">
                  <Icon name="clock" size={24} />
                </span>
                <div>
                  <h2>Agenda e funcionamento</h2>
                  <p>Configure o expediente e os intervalos de agendamento.</p>
                </div>
              </div>
              <div className="settings-fields">
                <div className="form-grid">
                  <Field label="Início do expediente">
                    <input
                      name="openingTime"
                      type="time"
                      defaultValue={vm.settings.openingTime}
                      required
                    />
                  </Field>
                  <Field label="Fim do expediente">
                    <input
                      name="closingTime"
                      type="time"
                      defaultValue={vm.settings.closingTime}
                      required
                    />
                  </Field>
                </div>
                <Field label="Intervalo padrão para novos horários">
                  <select name="slotDuration" defaultValue={vm.settings.slotDuration}>
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="60">1 hora</option>
                  </select>
                </Field>
              </div>
            </section>
            <Feedback
              error={vm.mutation.error}
              success={vm.mutation.isSuccess ? 'Configurações salvas com sucesso.' : undefined}
            />
            <div className="form-actions">
              <button className="btn btn-primary" disabled={vm.mutation.isPending}>
                <Icon name="check" size={18} />
                {vm.mutation.isPending ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </div>
          </form>
        )}
      </QueryState>
    </>
  );
}
