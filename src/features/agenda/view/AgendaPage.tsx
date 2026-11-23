import { AccessGate } from '../../access/view/AccessGate';
import { AppointmentForm } from './components/AppointmentForm';
import { Link } from '@tanstack/react-router';
import { useAgendaViewModel } from '../viewmodel/useAgendaViewModel';
import {
  Avatar,
  Dialog,
  Feedback,
  Field,
  PageHeading,
  QueryState,
} from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/Icon';
import { minutes, statusLabels } from '../../clinic/model/validation';
import type { AppointmentStatus } from '../../clinic/model/types';

export function AgendaPage() {
  const vm = useAgendaViewModel();
  return (
    <>
      <PageHeading title="Agenda da Clínica" subtitle={vm.dateLabel}>
        <div className="segmented" aria-label="Visualização da agenda">
          <button
            className={vm.search.view === 'all' ? 'selected' : ''}
            onClick={() => vm.updateSearch({ view: 'all' })}
          >
            Visão geral
          </button>
          <button
            className={vm.search.view === 'individual' ? 'selected' : ''}
            onClick={() => vm.updateSearch({ view: 'individual' })}
          >
            Individual
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => vm.openForm()} disabled={!vm.canEdit}>
          <Icon name="plus" size={18} />
          Novo agendamento
        </button>
      </PageHeading>
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry}>
        <div className="stat-grid">
          {['Consultas no dia', 'Aguardando na recepção', 'Em atendimento', 'Concluídas'].map(
            (label, i) => (
              <div key={label} className={`stat-card ${i === 0 ? 'stat-primary' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="stat-value">{vm.stats[i]}</span>
                  <span className={`stat-icon stat-icon-${i}`}>
                    <Icon
                      name={i === 0 ? 'calendar' : i === 1 ? 'clock' : i === 2 ? 'tooth' : 'check'}
                      size={20}
                    />
                  </span>
                </div>
                <span className="stat-label">{label}</span>
              </div>
            ),
          )}
        </div>
        <div className="agenda-layout">
          <section className="panel calendar-panel" aria-label="Agenda dos profissionais">
            <div className="calendar-toolbar">
              <div className="flex items-center gap-1">
                <button
                  className="icon-button"
                  aria-label="Dia anterior"
                  onClick={() => vm.shiftDate(-1)}
                >
                  <Icon name="left" size={18} />
                </button>
                <button className="btn btn-quiet" onClick={vm.today}>
                  Hoje
                </button>
                <button
                  className="icon-button"
                  aria-label="Próximo dia"
                  onClick={() => vm.shiftDate(1)}
                >
                  <Icon name="right" size={18} />
                </button>
                <input
                  type="date"
                  aria-label="Data da agenda"
                  value={vm.search.date}
                  onChange={(e) => {
                    if (e.target.value) vm.updateSearch({ date: e.target.value });
                  }}
                />
              </div>
              {vm.search.view === 'individual' ? (
                <select
                  aria-label="Dentista da agenda"
                  value={vm.selectedDentist}
                  onChange={(e) => vm.updateSearch({ dentist: e.target.value })}
                >
                  {vm.dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="secondary-text hidden sm:inline">
                  {vm.dentists.length} profissionais
                </span>
              )}
            </div>
            <div className="calendar-scroll">
              <div
                className="calendar-grid"
                style={{ minWidth: vm.visibleDentists.length > 1 ? 650 : 300 }}
              >
                <div className="calendar-columns-heading">
                  <div className="time-zone">GMT-3</div>
                  {vm.visibleDentists.map((d) => (
                    <div className="dentist-column-title" key={d.id}>
                      <span className="dentist-dot" />
                      <div>
                        <strong>{d.name}</strong>
                        <span>{d.specialty}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="calendar-body" style={{ height: vm.gridHeight }}>
                  <div className="time-column">
                    {vm.hours.map((hour) => (
                      <span key={hour} style={{ top: (hour - vm.opening) * 1.2 }}>
                        {vm.timeLabel(hour)}
                      </span>
                    ))}
                  </div>
                  {vm.visibleDentists.map((dentist) => (
                    <div className="day-column" key={dentist.id}>
                      {vm.hours.map((hour) => (
                        <button
                          key={hour}
                          className="calendar-slot"
                          style={{
                            top: (hour - vm.opening) * 1.2,
                            height: Math.min(60, vm.closing - hour) * 1.2,
                          }}
                          aria-label={`Agendar com ${dentist.name} às ${vm.timeLabel(hour)}`}
                          onClick={() => vm.openForm(dentist.id, vm.timeLabel(hour))}
                        />
                      ))}
                      {vm.visibleAppointments
                        .filter((a) => a.dentistId === dentist.id && a.status !== 'cancelled')
                        .map((appointment) => (
                          <button
                            key={appointment.id}
                            className={`appointment appointment-${appointment.status}`}
                            style={{
                              top: Math.max(0, minutes(appointment.time) - vm.opening) * 1.2 + 3,
                              height: Math.max(
                                36,
                                Math.min(
                                  appointment.duration,
                                  vm.closing - minutes(appointment.time),
                                ) *
                                  1.2 -
                                  6,
                              ),
                            }}
                            onClick={() => vm.openDetail(appointment.id)}
                          >
                            <span className="appointment-top">
                              <strong>{vm.patientName(appointment.patientId)}</strong>
                              <span>{statusLabels[appointment.status]}</span>
                            </span>
                            <span className="appointment-description">
                              {appointment.time} · {appointment.procedure}
                            </span>
                          </button>
                        ))}
                    </div>
                  ))}
                  {vm.nowPosition !== null && (
                    <div className="now-line" style={{ top: vm.nowPosition }}>
                      <span />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="calendar-footer">
              <span>
                <i className="legend-dot bg-teal-600" />
                Confirmado
              </span>
              <span>
                <i className="legend-dot bg-amber-500" />
                Aguardando
              </span>
              <span>
                <i className="legend-dot bg-teal-400" />
                Em cadeira
              </span>
              <span>
                <i className="legend-dot bg-slate-400" />
                Concluído
              </span>
            </div>
          </section>
          <aside className="panel waiting-panel">
            <div className="flex items-center justify-between">
              <h2>Fila de espera</h2>
              <span className="count-badge">{vm.waiting.length}</span>
            </div>
            <p className="secondary-text mt-1">Pacientes aguardando atendimento</p>
            <div className="waiting-list">
              {vm.waiting.length === 0 ? (
                <div className="empty-state compact">
                  <Icon name="check" size={28} />
                  <p>Nenhum paciente aguardando.</p>
                </div>
              ) : (
                vm.waiting.map((a) => (
                  <button
                    key={a.id}
                    className={`waiting-item ${vm.selectedWaiting?.id === a.id ? 'selected' : ''}`}
                    onClick={() => vm.setWaitingId(a.id)}
                    aria-pressed={vm.selectedWaiting?.id === a.id}
                  >
                    <Avatar name={vm.patientName(a.patientId)} />
                    <span className="waiting-person">
                      <strong>{vm.patientName(a.patientId)}</strong>
                      <span>{vm.dentistName(a.dentistId)}</span>
                    </span>
                    <span className="wait-duration">{vm.waited(a)} min</span>
                  </button>
                ))
              )}
            </div>
            <Feedback error={vm.change.error} />

            <button
              className="btn btn-primary w-full"
              disabled={!vm.selectedWaiting || vm.change.isPending || !vm.canEdit}
              onClick={vm.callPatient}
            >
              <Icon name="user" size={17} />
              {vm.change.isPending ? 'Chamando...' : 'Chamar paciente'}
            </button>
            <div className="waiting-note">
              <Icon name="clock" size={15} />O tempo é contado desde a chegada.
            </div>
          </aside>
        </div>
      </QueryState>
      {vm.form && (
        <AppointmentForm
          patients={vm.patients}
          dentists={vm.dentists}
          services={vm.services}
          dentistId={vm.form.dentistId}
          time={vm.form.time}
          date={vm.search.date}
          step={vm.step}
          saving={vm.create.isPending}
          error={vm.create.error}
          onSave={vm.save}
          onClose={vm.closeForm}
        />
      )}
      {vm.detail && (
        <Dialog
          title={vm.patientName(vm.detail.patientId)}
          subtitle={`${vm.detail.time} · ${vm.detail.procedure}`}
          onClose={vm.closeDetail}
        >
          <div className="form-content">
            <p className="secondary-text">
              {vm.dentistName(vm.detail.dentistId)} · {vm.detail.duration} minutos
            </p>
            {vm.detail.reason && <p className="secondary-text">Motivo: {vm.detail.reason}</p>}
            {vm.detail.status !== 'cancelled' && (
              <AccessGate permission="finance.receive">
                <Link
                  className="btn btn-secondary"
                  to="/financeiro/recebimentos"
                  search={{
                    q: '',
                    patient: vm.detail.patientId,
                    treatment: '',
                    appointment: vm.detail.id,
                  }}
                >
                  Acertar atendimento no caixa
                </Link>
              </AccessGate>
            )}
            <Field label="Status da consulta">
              <select
                value={vm.detail.status}
                disabled={vm.change.isPending || (!vm.canEdit && !vm.canCancel)}
                onChange={(e) => {
                  if (vm.detail)
                    vm.change.mutate({
                      id: vm.detail.id,
                      status: e.target.value as AppointmentStatus,
                    });
                }}
              >
                {Object.entries(statusLabels).map(([status, label]) => (
                  <option
                    key={status}
                    value={status}
                    disabled={
                      status === 'cancelled' || status === 'no-show' ? !vm.canCancel : !vm.canEdit
                    }
                  >
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Feedback error={vm.change.error} />
            {vm.canEdit && (
              <details>
                <summary className="text-button">Remarcar consulta</summary>
                <form
                  className="grid gap-3 mt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    vm.reschedule(new FormData(e.currentTarget));
                  }}
                >
                  <Field label="Nova data">
                    <input type="date" name="date" required defaultValue={vm.detail.date} />
                  </Field>
                  <Field label="Novo horário">
                    <input type="time" name="time" required defaultValue={vm.detail.time} />
                  </Field>
                  <Field label="Duração (minutos)">
                    <input
                      type="number"
                      name="duration"
                      min="15"
                      step="15"
                      required
                      defaultValue={vm.detail.duration}
                    />
                  </Field>
                  <Feedback error={vm.rescheduleError} />
                  <button className="btn btn-secondary" disabled={vm.rescheduling}>
                    Salvar remarcação
                  </button>
                </form>
              </details>
            )}
            <AccessGate permission="records.view">
              <Link
                className="btn btn-primary"
                to="/prontuarios"
                search={{ patient: vm.detail.patientId, tab: 'evolution' }}
              >
                Abrir prontuário
              </Link>
            </AccessGate>
          </div>
        </Dialog>
      )}
    </>
  );
}
