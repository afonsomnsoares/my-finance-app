import { formatMoney, formatPercent } from '../../utils/format';
import { fromCents, sumAmounts, sumNumbers, toCents } from '../../utils/money';

export default function CategoryBreakdown({ transactions, symbol, limit = 6 }) {
  const centsByCategory = {};
  for (const t of transactions) {
    centsByCategory[t.category] = (centsByCategory[t.category] || 0) + toCents(t.amount);
  }
  const totals = Object.fromEntries(
    Object.entries(centsByCategory).map(([category, cents]) => [category, fromCents(cents)])
  );

  const total = sumAmounts(transactions);
  const rows = Object.entries(totals)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit);
  if (rest.length > 0) {
    shown.push({
      key: '__resto__',
      category: `Outras ${rest.length} categorias`,
      value: sumNumbers(rest.map((r) => r.value)),
      grouped: rest.length,
    });
  }

  if (total === 0) {
    return (
      <div className="ui-card">
        <h3 className="ui-card__title">Por categoria</h3>
        <p className="ui-empty__text" style={{ marginTop: 'var(--sp-4)' }}>Sem despesas neste período.</p>
      </div>
    );
  }

  const max = shown[0]?.value || 1;

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title">Por categoria</h3>
          <p className="ui-card__subtitle">{formatMoney(total, symbol)} no total</p>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-4)' }}>
        {shown.map((row) => (
          <li key={row.key || row.category}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
              <span className="ui-chip">
                {row.category}
              </span>
              <span style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(row.value, symbol)}
                </span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: '2.5em', textAlign: 'right' }}>
                  {formatPercent((row.value / total) * 100)}
                </span>
              </span>
            </div>

            <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(row.value / max) * 100}%`,
                background: 'var(--cat-1)',
                borderRadius: 'var(--r-full)',
              }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
