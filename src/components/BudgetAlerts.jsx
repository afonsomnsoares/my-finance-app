import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiChevronRight } from 'react-icons/fi';
import { api } from '../utils/api';
import { formatMoney, formatPercent } from '../utils/format';

/*
 * Um único aviso compacto em vez de um painel com uma lista repetida.
 * Só aparece quando há mesmo algo excedido.
 */
export default function BudgetAlerts({ symbol = '€' }) {
  const [exceeded, setExceeded] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/budgets')
      .then(({ data }) => { if (!cancelled) setExceeded(data.budgets.filter((b) => b.exceeded)); })
      .catch(() => { /* o dashboard funciona sem isto */ });
    return () => { cancelled = true; };
  }, []);

  if (exceeded.length === 0) return null;

  return (
    <div className="ui-alert ui-alert--warning" style={{ marginTop: 'var(--sp-4)' }}>
      <FiAlertTriangle className="ui-alert__icon" size={18} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
          {exceeded.length} {exceeded.length === 1 ? 'categoria acima do limite' : 'categorias acima do limite'}
        </strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2) var(--sp-4)' }}>
          {exceeded.map((b) => (
            <span key={b.id} className="ui-chip" style={{ fontSize: 'var(--fs-xs)' }}>
              <strong>{b.category}</strong>
              <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(b.spent, symbol)} / {formatMoney(b.monthlyLimit, symbol)} ({formatPercent(b.percent)})
              </span>
            </span>
          ))}
        </div>
      </div>
      <Link to="/app/expenses" className="ui-section__link">
        Ver <FiChevronRight size={14} />
      </Link>
    </div>
  );
}
