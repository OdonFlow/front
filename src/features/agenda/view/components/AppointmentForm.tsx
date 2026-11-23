import type { Patient, User } from '../../../clinic/model/types';
import type { ClinicalService } from '../../../services/model/types';
import { ServicePicker } from '../../../services/view/components/ServicePicker';
import { Dialog, Feedback, Field } from '../../../../shared/components/ui';
import { useAppointmentFormViewModel } from '../../viewmodel/useAppointmentFormViewModel';

export function AppointmentForm({
  patients,
  dentists,
  services,
  dentistId,
  time,
  date,
  step,
  saving,
  error,
  onSave,
  onClose,
}: {
  patients: Patient[];
  dentists: User[];
  services: ClinicalService[];
  dentistId: string;
  time: string;
  date: string;
  step: number;
  saving: boolean;
  error: Error | null;
  onSave: (form: FormData) => void;
  onClose: () => void;
}) {
  const vm = useAppointmentFormViewModel(services, time);
  return (
    <Dialog
      title="Novo agendamento"
      subtitle="Marque a consulta mesmo sem um procedimento definido."
      onClose={onClose}
    >
      <form
        className="form-content"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(new FormData(e.currentTarget));
        }}
      >
        <Field label="Profissional">
          <select name="dentistId" defaultValue={dentistId} required>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.cro}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Paciente">
          <select name="patientId" defaultValue="" required>
            <option value="" disabled>
              Selecione um paciente
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.phone}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Data">
            <input name="date" type="date" defaultValue={date} required />
          </Field>
          <Field label="Horário de início">
            <input
              name="time"
              type="time"
              step={step}
              value={vm.time}
              onChange={(e) => vm.setTime(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="appointment-service">
          <span className="badge badge-teal">Opcional</span>
          <ServicePicker
            services={services}
            value={vm.serviceId}
            onChange={vm.selectService}
            label="Serviço / procedimento"
            optional
          />
          <input name="serviceId" type="hidden" value={vm.serviceId} />
          <input name="procedure" type="hidden" value={vm.service?.name ?? ''} />
          <p>
            Se ainda não souber o procedimento, deixe em branco para o dentista definir no
            atendimento.
          </p>
        </div>
        <div className="form-grid">
          <Field label="Tempo reservado">
            <select
              name="duration"
              value={vm.duration}
              onChange={(e) => vm.setDuration(Number(e.target.value))}
            >
              {Array.from({ length: 32 }, (_, i) => (i + 1) * 15).map((n) => (
                <option key={n} value={n}>
                  {n} minutos
                </option>
              ))}
            </select>
          </Field>
          <Field label="Término previsto">
            <output className="change-output">{vm.endTime}</output>
          </Field>
        </div>
        <Field label="Motivo / queixa principal">
          <textarea
            name="reason"
            rows={3}
            maxLength={1000}
            placeholder="O que o paciente relatou ao marcar a consulta?"
          />
        </Field>
        <Feedback error={error} />
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Confirmar agendamento'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
