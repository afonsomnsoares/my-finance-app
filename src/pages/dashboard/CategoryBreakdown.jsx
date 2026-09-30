import { formatMoney, formatPercent } from '../../utils/format';

/*
 * Distribuição por categoria em barras horizontais, não em donut.
 *
 * Com 8 categorias um donut obriga a saltar entre fatia e legenda para ler
 * cada valor. Barras alinhadas à esquerda leem-se de cima para baixo, já
 * ordenadas, e cabe o valor e a percentagem em cada linha sem tooltip.
 *
 * Uma só cor, de propósito. Oito cores aqui não codificavam nada — o nome da
 * categoria está escrito em cada linha — e a ordem em que a lista aparece
 * (por valor) punha lado a lado pares indistinguíveis para quem tem
 * daltonismo: aqua vs magenta mediam ΔE 1,6. O comprimento da barra é que
 * carrega a informação; a cor fica reservada para significado (vermelho =
 * acima do orçamento, verde = ganho).
 */
export default function CategoryBreakdown({ transactions, symbol, limit = 6 }) {
  const totals = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  const rows = Object.entries(totals)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  /*
   * O excedente agrupa-se numa linha só.
   *
   * Chamava-se "Outros" — que é também o nome de uma categoria real. Quando
   * "Outros" ficava entre as mais gastas, apareciam duas linhas com a mesma
   * chave: o React avisava, e o utilizador via a mesma etiqueta duas vezes com
   * valores diferentes. O grupo passa a ter chave e nome próprios.
   */
  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit);
  if (rest.length > 0) {
    shown.push({
      key: '__resto__',
      category: `Outras ${rest.length} categorias`,
      value: rest.reduce((s, r) => s + r.value, 0),
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
            {/* Marca fina, ancorada à linha de base, extremidade arredondada. */}
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
