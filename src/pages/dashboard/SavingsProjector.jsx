import { useMemo, useState } from 'react';
import { formatMoney } from '../../utils/format';

/*
 * Ferramenta interativa: quanto tenho daqui a N anos se poupar X por mês.
 *
 * O valor inicial passou a ser o que sobra realmente (rendimento − gasto)
 * em vez de 200 fixos, para a primeira leitura já dizer alguma coisa.
 */
export default function SavingsProjector({ monthlyIncome = 0, spentThisMonth = 0, symbol }) {
  const suggested = Math.max(50, Math.round(((monthlyIncome - spentThisMonth) || 200) / 50) * 50);
  const ceiling = Math.max(Math.round((monthlyIncome || 2500) * 0.8), 100);

  const [monthly, setMonthly] = useState(Math.min(suggested, ceiling));

  const projections = useMemo(() => ([
    { label: '1 ano', months: 12 },
    { label: '3 anos', months: 36 },
    { label: '5 anos', months: 60 },
    { label: '10 anos', months: 120 },
  ].map((p) => ({ ...p, total: monthly * p.months }))), [monthly]);

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title">Se poupares todos os meses…</h3>
          <p className="ui-card__subtitle">Sem juros — só o que acumulas.</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <label htmlFor="poupanca" className="ui-metric__label" style={{ margin: 0 }}>Poupar por mês</label>
        <input
          id="poupanca"
          type="range"
          className="ui-range"
          min={50}
          max={ceiling}
          step={25}
          value={monthly}
          onChange={(e) => setMonthly(Number(e.target.value))}
          style={{ flex: 1, minWidth: 140 }}
        />
        <output
          htmlFor="poupanca"
          style={{
            fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)',
            fontVariantNumeric: 'tabular-nums', minWidth: '5ch', textAlign: 'right',
          }}
        >
          {formatMoney(monthly, symbol, { decimals: 0 })}
        </output>
      </div>

      <div className="ui-metrics">
        {projections.map((p) => (
          <div key={p.label}>
            <span className="ui-metric__label">{p.label}</span>
            <span className="ui-metric__value">{formatMoney(p.total, symbol, { decimals: 0 })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
