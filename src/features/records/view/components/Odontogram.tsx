import type { ToothStatus } from '../../../clinic/model/types';
import { toothLabels } from '../../../clinic/model/validation';

interface OdontogramProps {
  teeth: Record<string, ToothStatus>;
  upperTeeth: number[];
  lowerTeeth: number[];
  pending: boolean;
  onSelect: (tooth: number) => void;
}

function ToothIllustration({ status }: { status: ToothStatus }) {
  return (
    <svg viewBox="0 0 40 48" fill="none" aria-hidden="true">
      {status === 'implant' ? (
        <>
          <path
            d="M9 6C5 8 6 18 9 22h22c3-4 4-14 0-16-4-2-8 0-11 0S13 4 9 6Z"
            className="tooth-shape"
          />
          <path
            d="M16 24h8l-1 18h-6l-1-18Z"
            fill="currentColor"
            opacity=".25"
            stroke="currentColor"
          />
          <path d="m14 26 12 3m-12 3 12 3m-11 3 10 3" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        <>
          <path
            className="tooth-shape"
            d="M9 6C3 9 4 20 7 29c1 4 2 13 6 14 4 1 2-13 7-13s3 14 7 13c4-1 5-10 6-14 3-9 4-20-2-23-4-2-8 0-11 0S13 4 9 6Z"
          />
          {status === 'restoration' && (
            <path d="m11 10 9 4 9-4v12l-9 5-9-5V10Z" fill="currentColor" opacity=".7" />
          )}
          {status === 'crown' && (
            <path
              d="M9 7c-4 2-4 11-1 18h24c3-7 3-16-1-18-4-2-8 0-11 0S13 5 9 7Z"
              fill="currentColor"
              opacity=".7"
            />
          )}
          <path className="tooth-detail" d="m10 12 10 4 10-4M20 16v8" />
          {status === 'extraction' && (
            <path d="m8 8 24 30M8 38 32 8" stroke="currentColor" strokeWidth="3" />
          )}
          {status === 'endo' && (
            <path d="m16 22-3 15m11-15 3 15" stroke="currentColor" strokeWidth="3" />
          )}
        </>
      )}
    </svg>
  );
}

export function Odontogram({ teeth, upperTeeth, lowerTeeth, pending, onSelect }: OdontogramProps) {
  return (
    <section className="panel odontogram">
      <div className="section-heading">
        <div>
          <h2>Odontograma</h2>
          <p className="secondary-text">Selecione um dente para atualizar sua condição clínica.</p>
        </div>
        <span className="badge badge-slate">Notação FDI · Permanente</span>
      </div>
      <div className="tooth-legend">
        {Object.entries(toothLabels).map(([status, label]) => (
          <span key={status}>
            <i className={`tooth-dot tooth-${status}`} />
            {label}
          </span>
        ))}
      </div>
      <div className="odontogram-scroll">
        <div className="dental-chart">
          {[upperTeeth, lowerTeeth].map((row, index) => (
            <div
              className={`teeth-row ${index ? 'lower-teeth' : ''}`}
              key={index ? 'lower' : 'upper'}
            >
              {row.map((tooth, i) => {
                const status = teeth[tooth] ?? 'healthy';
                return (
                  <button
                    key={tooth}
                    disabled={pending}
                    className={`tooth-button tooth-${status} ${i === 8 ? 'tooth-midline' : ''}`}
                    onClick={() => onSelect(tooth)}
                    aria-label={`Dente ${tooth}: ${toothLabels[status]}. Editar condição.`}
                  >
                    <span className="tooth-number">{tooth}</span>
                    <ToothIllustration status={status} />
                  </button>
                );
              })}
            </div>
          ))}
          <div className="dental-orientation">
            <span>Direito</span>
            <span>Arcadas superior e inferior</span>
            <span>Esquerdo</span>
          </div>
        </div>
      </div>
    </section>
  );
}
