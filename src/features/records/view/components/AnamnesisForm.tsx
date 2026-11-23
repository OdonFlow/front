import type { Anamnesis } from '../../../clinic/model/types';
import { Field } from '../../../../shared/components/ui';
import { Icon } from '../../../../shared/components/Icon';
interface Props {
  anamnesis: Anamnesis;
  pending: boolean;
  onSave: (form: FormData) => void;
}
export function AnamnesisForm({ anamnesis, pending, onSave }: Props) {
  return (
    <section className="panel anamnesis-panel">
      <div className="section-heading">
        <div>
          <h2>Anamnese</h2>
          <p className="secondary-text">Informações relatadas pelo paciente.</p>
        </div>
        <Icon name="heart" />
      </div>
      <form
        className="form-content"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(new FormData(e.currentTarget));
        }}
      >
        <Field label="Queixa principal">
          <textarea name="complaint" defaultValue={anamnesis.complaint} rows={2} maxLength={2000} />
        </Field>
        <div className="form-grid">
          <Field label="Medicamentos em uso">
            <textarea
              name="medications"
              defaultValue={anamnesis.medications}
              rows={3}
              maxLength={2000}
            />
          </Field>
          <Field label="Cirurgias e tratamentos anteriores">
            <textarea
              name="previousSurgery"
              defaultValue={anamnesis.previousSurgery}
              rows={3}
              maxLength={2000}
            />
          </Field>
        </div>
        <Field label="Observações clínicas">
          <textarea name="notes" defaultValue={anamnesis.notes} rows={3} maxLength={3000} />
        </Field>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={pending}>
            {pending ? 'Salvando...' : 'Salvar anamnese'}
          </button>
        </div>
      </form>
    </section>
  );
}
