import type { Prescription, User } from '../../../clinic/model/types';
import { formatDate } from '../../../clinic/model/validation';
import { Icon } from '../../../../shared/components/Icon';
import { ClinicBrand } from '../../../branding/view/ClinicBrand';
interface Props {
  prescriptions: Prescription[];
  dentist: (id: string) => User | undefined;
  onAdd: () => void;
  readOnly?: boolean;
}
export function Prescriptions({ prescriptions, dentist, onAdd, readOnly = false }: Props) {
  return (
    <section>
      <div className="section-heading mb-4">
        <h2>Prescrições</h2>
        <button className="btn btn-secondary" onClick={onAdd} disabled={readOnly}>
          <Icon name="plus" size={17} />
          Nova prescrição
        </button>
      </div>
      {!prescriptions.length ? (
        <div className="panel empty-state">
          <Icon name="file" size={30} />
          <p>Nenhuma prescrição registrada.</p>
        </div>
      ) : (
        <div className="prescription-list">
          {prescriptions.map((rx) => (
            <article className="panel prescription-card" key={rx.id}>
              <div className="prescription-clinic-brand">
                <ClinicBrand />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="feature-icon">
                    <Icon name="file" size={23} />
                  </span>
                  <div>
                    <h3>{rx.medication}</h3>
                    <span className="secondary-text">
                      {formatDate(rx.date)} · {dentist(rx.dentistId)?.name}
                    </span>
                  </div>
                </div>
                <span className="badge badge-slate">Prescrição</span>
              </div>
              <p>{rx.instructions}</p>
              <div className="prescription-signature">
                {dentist(rx.dentistId)?.name} · {dentist(rx.dentistId)?.cro}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
