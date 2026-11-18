import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import { formatCompactMoney, formatMoney } from '../../utils/format';
import { roundMoney, sumNumbers } from '../../utils/money';

export default function ExpenseChart({ monthDays, symbol }) {
  const data = monthDays
    .filter((d) => !d.isFuture)
    .map((d) => ({ dia: d.day, valor: roundMoney(d.total) }));

  const total = sumNumbers(data.map((d) => d.valor));
  const peak = data.reduce((m, d) => (d.valor > (m?.valor ?? 0) ? d : m), null);

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title">Evolução do mês</h3>
          <p className="ui-card__subtitle">
            {peak && peak.valor > 0
              ? `Maior gasto no dia ${peak.dia} · ${formatMoney(peak.valor, symbol)}`
              : 'Sem despesas registadas'}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <p className="ui-empty__text">Sem despesas este mês.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGasto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cat-1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--cat-1)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              width={48}

              tickFormatter={(v) => formatCompactMoney(v, symbol)}
            />
            <Tooltip
              content={<ChartTooltip symbol={symbol} />}
              cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
              labelFormatter={(d) => `Dia ${d}`}
            />
            <Area
              type="monotone"
              dataKey="valor"
              name="Gasto"
              stroke="var(--cat-1)"
              strokeWidth={2}
              fill="url(#gradGasto)"

              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
