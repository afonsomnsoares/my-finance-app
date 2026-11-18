import { TYPES, TYPE_COLORS } from './constants';
import { formatPercent } from '../../utils/format';
import { sumNumbers } from '../../utils/money';

export default function AllocationBar({ pieData }) {
  if (!pieData || pieData.length === 0) return null;

  const byType = pieData.filter((d) => d.value > 0);
  const total = sumNumbers(byType.map((d) => d.value)) || 1;

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title">Alocação</h3>
          <p className="ui-card__subtitle">Por tipo de ativo, sobre o investido</p>
        </div>
      </div>

      <div className="alloc-bar" role="img" aria-label={
        byType.map((d) => `${d.name} ${formatPercent(d.value)}`).join(', ')
      }>
        {byType.map((d) => (
          <div
            key={d.type}
            className="alloc-bar__seg"
            style={{ width: `${(d.value / total) * 100}%`, background: TYPE_COLORS[d.type] || 'var(--text-muted)' }}
          />
        ))}
      </div>

      <ul className="alloc-legend">
        {byType.map((d) => (
          <li key={d.type}>
            <span className="ui-chip__dot" style={{ background: TYPE_COLORS[d.type] || 'var(--text-muted)' }} />
            <span className="alloc-legend__name">{d.name}</span>
            <span className="alloc-legend__value">{formatPercent(d.value, { decimals: 1 })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
