import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import ChartTooltip from '../dashboard/ChartTooltip';
import { formatCompactMoney, formatMoney } from '../../utils/format';

/*
 * Gasto mês a mês. É o gráfico principal desta página.
 *
 * O anterior prometia "os últimos 6 meses" mas era alimentado com transações
 * que a API já tinha filtrado para um único mês — cinco das seis barras
 * estavam sempre vazias. Agora recebe o histórico completo.
 *
 * Uma só cor com o mês corrente destacado: as barras comparam magnitude ao
 * longo do tempo, não identidades diferentes.
 */
export default function MonthlyTrend({ history, symbol, monthlyBudget, average }) {
  const hasData = history.some((m) => m.total > 0);

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h2 className="ui-card__title">Gasto mês a mês</h2>
          <p className="ui-card__subtitle">
            {hasData
              ? `Média de ${formatMoney(average, symbol)} nos meses com registos`
              : 'Ainda sem histórico suficiente'}
          </p>
        </div>
      </div>

      {!hasData ? (
        <p className="ui-empty__text">Regista despesas ao longo de alguns meses para veres a evolução.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={history} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => formatCompactMoney(v, symbol)}
              />
              <Tooltip
                content={<ChartTooltip symbol={symbol} />}
                cursor={{ fill: 'var(--surface-2)' }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel || label}
              />
              {monthlyBudget > 0 && (
                <ReferenceLine y={monthlyBudget} stroke="var(--danger)" strokeDasharray="4 4" strokeWidth={1.5} />
              )}
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {history.map((m) => (
                  /* O mês em curso está incompleto: fica mais claro para não
                     ser lido como uma queda real. */
                  <Cell key={m.key} fill={m.isCurrent ? 'var(--border-strong)' : 'var(--cat-1)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', marginTop: 'var(--sp-3)' }}>
            <span className="ui-chip">
              <span className="ui-chip__dot" style={{ background: 'var(--cat-1)' }} />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Meses completos</span>
            </span>
            <span className="ui-chip">
              <span className="ui-chip__dot" style={{ background: 'var(--border-strong)' }} />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Mês em curso (incompleto)</span>
            </span>
            {monthlyBudget > 0 && (
              <span className="ui-chip">
                <span style={{ width: 14, borderTop: '2px dashed var(--danger)', display: 'inline-block' }} />
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  Orçamento ({formatMoney(monthlyBudget, symbol)})
                </span>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
