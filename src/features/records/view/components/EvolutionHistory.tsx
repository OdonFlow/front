import type { Evolution, User } from '../../../clinic/model/types';
import { formatDate } from '../../../clinic/model/validation';
import { Avatar } from '../../../../shared/components/ui';
import { Icon } from '../../../../shared/components/Icon';
interface Props {
  evolutions: Evolution[];
  dentist: (id: string) => User | undefined;
}
export function EvolutionHistory({ evolutions, dentist }: Props) {
  return (
    <section aria-label="Evolução clínica">
      <div className="section-heading mb-4">
        <h2>
          Histórico de atendimentos <span className="muted-count">{evolutions.length}</span>
        </h2>
        <span className="secondary-text">Mais recentes primeiro</span>
      </div>
      {!evolutions.length ? (
        <div className="panel empty-state">
          <Icon name="file" size={32} />
          <h3>O cuidado começa aqui</h3>
          <p>Adicione a primeira evolução deste paciente.</p>
        </div>
      ) : (
        <div className="evolution-list">
          {evolutions.map((e) => (
            <article key={e.id} className="panel evolution-card">
              <div className="evolution-date">
                <span className="timeline-dot" />
                {formatDate(e.date)}
              </div>
              <div className="evolution-dentist">
                <Avatar name={dentist(e.dentistId)?.name ?? 'Profissional'} />
                <div>
                  <strong>{e.signature?.name ?? dentist(e.dentistId)?.name}</strong>
                  <span>{e.signature?.cro ?? dentist(e.dentistId)?.cro}</span>
                </div>
              </div>
              <p>{e.description}</p>
              <span className="badge badge-teal">
                <Icon name="check" size={13} />
                {e.signature
                  ? `Assinado em ${new Date(e.signature.at).toLocaleString('pt-BR')}`
                  : 'Registrado'}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
