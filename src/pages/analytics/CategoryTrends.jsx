import { FiArrowDown, FiArrowUp, FiPlus } from 'react-icons/fi';
import { formatMoney, formatPercent } from '../../utils/format';

export default function CategoryTrends({ trends, symbol, window }) {
  if (trends.length === 0) {
    return (
      <div className="ui-card">
        <h2 className="ui-card__title">Tendências por categoria</h2>
        <p className="ui-empty__text" style={{ marginTop: 'var(--sp-4)' }}>
          São precisos pelo menos dois meses completos de registos para comparar.
        </p>
      </div>
    );
  }

  const shown = trends.slice(0, 8);

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h2 className="ui-card__title">O que mudou</h2>
          <p className="ui-card__subtitle">
            Média mensal dos últimos {window} meses contra os {window} anteriores
          </p>
        </div>
      </div>

      <table className="ui-table ui-table--stack">
        <thead>
          <tr>
            <th>Categoria</th>
            <th className="num">Antes</th>
            <th className="num">Agora</th>
            <th className="num">Variação</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((t) => {
            const up = t.delta > 0;

            const flat = t.delta === 0 || (t.percent !== null && Math.abs(t.percent) < 1);
            const Icon = t.isNew ? FiPlus : up ? FiArrowUp : FiArrowDown;
            return (
              <tr key={t.category}>
                <td data-label="Categoria" style={{ fontWeight: 'var(--fw-medium)' }}>{t.category}</td>
                <td className="num muted" data-label="Antes">{formatMoney(t.previous, symbol)}</td>
                <td className="num" data-label="Agora">{formatMoney(t.current, symbol)}</td>
                <td className="num" data-label="Variação">
                  {flat ? (
                    <span className="muted">—</span>
                  ) : (

                    <span className={`ui-delta ui-delta--${up ? 'up' : 'down'}`}>
                      <Icon size={12} aria-hidden="true" />
                      {t.isNew
                        ? 'nova'
                        : t.percent !== null
                          ? formatPercent(Math.abs(t.percent))
                          : formatMoney(Math.abs(t.delta), symbol)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
