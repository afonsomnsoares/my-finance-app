import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import { formatCompactMoney, formatMoney } from '../../utils/format';

const WEEKS = [
  { label: '1–7', from: 1, to: 7 },
  { label: '8–14', from: 8, to: 14 },
  { label: '15–21', from: 15, to: 21 },
  { label: '22+', from: 22, to: 31 },
];

/*
 * Este mês contra o anterior, por semana.
 *
 * As etiquetas eram "S1 S2 S3 S4" — que não dizem a ninguém que são intervalos
 * de dias. Passam a ser os próprios dias. E as duas séries, que antes só se
 * distinguiam pela cor, passam a ter legenda.
 */
export default function MonthComparison({ monthTransactions, lastMonthTransactions, symbol }) {
  const now = new Date();
  const thisLabel = capitalize(now.toLocaleDateString('pt-PT', { month: 'long' }));
  const prevLabel = capitalize(
    new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('pt-PT', { month: 'long' })
  );

  const byWeek = (transactions) =>
    WEEKS.map(({ from, to }) =>
      transactions
        .filter((t) => { const d = new Date(t.date).getDate(); return d >= from && d <= to; })
        .reduce((s, t) => s + t.amount, 0)
    );

  const thisMonth = byWeek(monthTransactions);
  const prevMonth = byWeek(lastMonthTransactions);

  const data = WEEKS.map((w, i) => ({
    name: w.label,
    [thisLabel]: Math.round(thisMonth[i] * 100) / 100,
    [prevLabel]: Math.round(prevMonth[i] * 100) / 100,
  }));

  const thisTotal = thisMonth.reduce((s, v) => s + v, 0);
  const prevTotal = prevMonth.reduce((s, v) => s + v, 0);
  const diff = thisTotal - prevTotal;

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title">Comparação com o mês anterior</h3>
          <p className="ui-card__subtitle">
            {prevTotal === 0
              ? 'Sem histórico para comparar'
              : `${diff >= 0 ? 'Mais' : 'Menos'} ${formatMoney(Math.abs(diff), symbol)} do que em ${prevLabel.toLowerCase()}`}
          </p>
        </div>
      </div>

      {/* Legenda própria: com duas séries a identidade nunca pode depender só
          da cor, e a do Recharts não herda os tokens de texto. */}
      <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <span className="ui-chip">
          <span className="ui-chip__dot" style={{ background: 'var(--cat-1)' }} />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{thisLabel}</span>
        </span>
        <span className="ui-chip">
          <span className="ui-chip__dot" style={{ background: 'var(--border-strong)' }} />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{prevLabel}</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => formatCompactMoney(v, symbol)}
          />
          <Tooltip
            content={<ChartTooltip symbol={symbol} />}
            cursor={{ fill: 'var(--surface-2)' }}
            labelFormatter={(l) => `Dias ${l}`}
          />
          {/* Extremidade arredondada só no topo, ancorada à linha de base. */}
          <Bar dataKey={thisLabel} fill="var(--cat-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey={prevLabel} fill="var(--border-strong)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
