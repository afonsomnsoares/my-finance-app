import { useEffect, useMemo, useState } from 'react';
import { FiActivity, FiBarChart2, FiCalendar } from 'react-icons/fi';

import AppShell from '../components/AppShell';
import MetricCard from '../components/MetricCard';
import SkeletonCard from '../components/SkeletonCard';
import { Field } from '../components/ui';

import MonthlyTrend from './analytics/MonthlyTrend';
import CategoryTrends from './analytics/CategoryTrends';
import CategoryBreakdown from './dashboard/CategoryBreakdown';

import { api } from '../utils/api';
import { getMonthlyHistory, getCategoryTrends, getMonthlyAverage } from '../utils/analytics';
import { formatMoney, getCurrencySymbol, toLocalDateKey } from '../utils/format';
import { sumAmounts } from '../utils/money';
import './App.css';

const WINDOWS = [
  { value: 6, label: 'Últimos 6 meses' },
  { value: 12, label: 'Últimos 12 meses' },
  { value: 24, label: 'Últimos 24 meses' },
];

export default function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(12);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - months * 2, 1);
    const params = new URLSearchParams({ from: toLocalDateKey(from), to: toLocalDateKey(now) });
    Promise.all([
      api.get(`/api/transactions?${params}`),
      api.get('/api/me'),
    ])
      .then(([txRes, userRes]) => {
        setTransactions(txRes.data);
        setTruncated(String(txRes.headers?.['x-truncated'] || '') === '1');
        setUser(userRes.data);
      })
      .catch(() => setError('Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false));
  }, [months]);

  const symbol = getCurrencySymbol(user?.currency || 'EUR');
  const monthlyBudget = user?.monthlyExpenses || 0;

  const spending = useMemo(
    () => transactions.filter((tx) => tx.kind !== 'income'),
    [transactions]
  );
  const history = useMemo(() => getMonthlyHistory(spending, months), [spending, months]);
  const average = useMemo(() => getMonthlyAverage(history), [history]);
  const trendWindow = months >= 12 ? 3 : 2;
  const trends = useMemo(() => getCategoryTrends(spending, trendWindow), [spending, trendWindow]);

  const windowTotal = sumAmounts(history, 'total');
  const monthsWithData = history.filter((m) => m.count > 0).length;

  const completedMonths = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return spending.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= endOfLastMonth;
    });
  }, [spending, months]);

  if (loading) {
    return (
      <AppShell>
        <SkeletonCard height={44} style={{ borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-6)', maxWidth: 260 }} />
        <div className="stat-grid">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} height={140} style={{ borderRadius: 'var(--r-lg)' }} />)}
        </div>
        <SkeletonCard height={340} style={{ borderRadius: 'var(--r-lg)', marginBottom: 'var(--sp-4)' }} />
        <div className="ui-grid ui-grid--2">
          <SkeletonCard height={300} style={{ borderRadius: 'var(--r-lg)' }} />
          <SkeletonCard height={300} style={{ borderRadius: 'var(--r-lg)' }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {truncated && (
        <div className="ui-alert ui-alert--danger" role="status" style={{ marginBottom: 'var(--sp-4)' }}>
          Só estão carregadas as 10 000 despesas mais recentes. Tendências e médias podem estar incompletas.
        </div>
      )}
      <header className="page-head">
        <div>
          <span className="ui-eyebrow">Análises</span>
          <h1 className="page-title">Análises</h1>
          <p className="page-subtitle">
            {monthsWithData > 0
              ? `${formatMoney(windowTotal, symbol)} em ${monthsWithData} ${monthsWithData === 1 ? 'mês' : 'meses'} com registos`
              : 'Sem registos neste período'}
          </p>
        </div>
        <div className="page-head__actions">
          <div className="page-head__select">
            <Field
              label="Período"
              as="select"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </Field>
          </div>
        </div>
      </header>

      <div className="stat-grid">
        <MetricCard
          label="Total no período"
          value={formatMoney(windowTotal, symbol)}
          icon={<FiBarChart2 size={16} />}
          accent="blue"
          hint={`${months} meses analisados`}
        />
        <MetricCard
          label="Média mensal"
          value={formatMoney(average, symbol)}
          icon={<FiActivity size={16} />}
          accent="green"
          hint="gasto médio por mês"
        />
        <MetricCard
          label="Meses com registos"
          value={`${monthsWithData}`}
          icon={<FiCalendar size={16} />}
          accent="orange"
          hint={monthlyBudget > 0 ? `Orçamento: ${formatMoney(monthlyBudget, symbol)}` : 'Sem orçamento definido'}
        />
      </div>

      {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}

      <MonthlyTrend history={history} symbol={symbol} monthlyBudget={monthlyBudget} average={average} />

      <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
        <CategoryTrends trends={trends} symbol={symbol} window={trendWindow} />
        <CategoryBreakdown transactions={completedMonths} symbol={symbol} limit={8} />
      </div>
    </AppShell>
  );
}
