import { formatMoney } from '../../utils/format';

/*
 * Tooltip partilhado por todos os gráficos.
 *
 * O texto usa sempre tokens de texto; a identidade da série é dada por um
 * ponto colorido ao lado. Antes o valor era pintado com a cor da série
 * (`style={{ color: p.color }}`), o que punha texto amarelo ou verde-escuro
 * sobre fundo escuro e falhava contraste.
 */
export default function ChartTooltip({ active, payload, label, symbol = '€' }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="ui-tooltip">
      {label && <span className="ui-tooltip__label">{label}</span>}
      {payload.map((entry) => (
        <div
          key={entry.dataKey ?? entry.name}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', whiteSpace: 'nowrap' }}
        >
          {payload.length > 1 && (
            <span className="ui-chip__dot" style={{ background: entry.color }} aria-hidden="true" />
          )}
          {payload.length > 1 && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{entry.name}</span>
          )}
          <span className="ui-tooltip__value">{formatMoney(entry.value, symbol)}</span>
        </div>
      ))}
    </div>
  );
}
