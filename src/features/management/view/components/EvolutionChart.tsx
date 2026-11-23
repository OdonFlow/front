import { useState } from 'react';
import type { TrendPoint } from '../../model/types';
import { money } from '../../../finance/model/finance.rules';

export function EvolutionChart({ points }: { points: TrendPoint[] }) {
  const [selectedKey, setSelectedKey] = useState('');
  const selected =
    points.find((p) => p.key === selectedKey) ??
    points.find((p) => p.revenueCents || p.expensesCents) ??
    points[0];
  const min = Math.min(0, ...points.map((p) => p.profitCents));
  const max = Math.max(
    100,
    ...points.flatMap((p) => [p.revenueCents, p.expensesCents, p.profitCents]),
  );
  const y = (n: number) => 215 - ((n - min) / (max - min)) * 185;
  const width = Math.max(600, points.length * 28);
  const step = (width - 90) / Math.max(1, points.length);
  return (
    <>
      <div className="management-chart-scroll">
        <svg
          viewBox={`0 0 ${width} 255`}
          style={{ minWidth: Math.min(width, 600) }}
          role="img"
          aria-label="Gráfico de receita, saídas e lucro. Valores detalhados na tabela abaixo."
        >
          {[0, 0.5, 1].map((ratio) => {
            const value = min + (max - min) * ratio;
            return (
              <g key={ratio}>
                <line x1="70" x2={width - 15} y1={y(value)} y2={y(value)} className="chart-grid" />
                <text x="62" y={y(value) + 4} textAnchor="end" className="chart-label">
                  {(value / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}
          {points.map((p, i) => {
            const x = 78 + i * step;
            const bar = Math.min(14, step / 3);
            return (
              <g key={p.key}>
                <title>
                  {p.key}: receita {money(p.revenueCents)}, saídas {money(p.expensesCents)}, lucro{' '}
                  {money(p.profitCents)}
                </title>
                <rect
                  x={x}
                  y={y(p.revenueCents)}
                  width={bar}
                  height={Math.max(0, y(0) - y(p.revenueCents))}
                  className="chart-revenue"
                  rx="2"
                />
                <rect
                  x={x + bar + 2}
                  y={y(p.expensesCents)}
                  width={bar}
                  height={Math.max(0, y(0) - y(p.expensesCents))}
                  className="chart-expense"
                  rx="2"
                />
                {(i % Math.max(1, Math.ceil(points.length / 12)) === 0 || points.length === 1) && (
                  <text x={x + bar} y="243" textAnchor="middle" className="chart-label">
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
          <polyline
            points={points
              .map((p, i) => `${78 + i * step + Math.min(14, step / 3)},${y(p.profitCents)}`)
              .join(' ')}
            className="chart-profit"
          />
          {points.map((p, i) => (
            <circle
              key={p.key}
              cx={78 + i * step + Math.min(14, step / 3)}
              cy={y(p.profitCents)}
              r="3"
              className="chart-profit-dot"
            />
          ))}
          <line x1="70" x2={width - 15} y1={y(0)} y2={y(0)} className="chart-zero" />
        </svg>
      </div>
      <div className="management-legend">
        <span>
          <i className="chart-revenue" />
          Receita
        </span>
        <span>
          <i className="chart-expense" />
          Saídas (repasses + despesas + taxas)
        </span>
        <span>
          <i className="chart-profit-dot" />
          Lucro
        </span>
      </div>
      {selected && (
        <div className="management-chart-detail">
          <label>
            Detalhar{' '}
            <select
              aria-label="Detalhar evolução"
              value={selected.key}
              onChange={(e) => setSelectedKey(e.target.value)}
            >
              {points.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key}
                </option>
              ))}
            </select>
          </label>
          <span>
            Receita <strong>{money(selected.revenueCents)}</strong>
          </span>
          <span>
            Saídas <strong>{money(selected.expensesCents)}</strong>
          </span>
          <span>
            Lucro <strong>{money(selected.profitCents)}</strong>
          </span>
        </div>
      )}
      <details className="management-chart-table">
        <summary>Ver dados da evolução em tabela</summary>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Receita</th>
                <th>Saídas</th>
                <th>Lucro</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <td>{p.key}</td>
                  <td>{money(p.revenueCents)}</td>
                  <td>{money(p.expensesCents)}</td>
                  <td>{money(p.profitCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
