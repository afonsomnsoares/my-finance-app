import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import { formatCompactMoney, formatMoney } from '../../utils/format';

/*
 * Evolução do gasto ao longo do mês.
 *
 * Substitui o par calendário-de-30-células + gráfico de linha que mostravam
 * exatamente os mesmos dados, um por cima do outro. Ficou o gráfico: responde
 * "onde é que gastei mais" de relance, coisa que uma grelha de números não faz.
 */
export default function ExpenseChart({ monthDays, symbol }) {
  const data = monthDays
    .filter((d) => !d.isFuture)
    .map((d) => ({ dia: d.day, valor: Math.round(d.total * 100) / 100 }));

  const total = data.reduce((s, d) => s + d.valor, 0);
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
            {/* Grelha recessiva: só horizontais, sem tracejado a competir. */}
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
              /* O formatador anterior fazia (v/1000).toFixed(0)+'k', por isso
                 um eixo de 0 a 1000 imprimia "0k 0k 0k 1k 1k". */
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
              /* Um ponto só aparece quando se lá passa por cima: 30 marcas
                 permanentes tornariam a linha ilegível. */
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
