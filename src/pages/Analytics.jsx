import { useEffect, useMemo, useState } from 'react';

import DashboardNavbar from '../components/DashboardNavbar';
import SkeletonCard from '../components/SkeletonCard';
import { Field } from '../components/ui';

import MonthlyTrend from './analytics/MonthlyTrend';
import CategoryTrends from './analytics/CategoryTrends';
import CategoryBreakdown from './dashboard/CategoryBreakdown';

import { api } from '../utils/api';
import { getMonthlyHistory, getCategoryTrends, getMonthlyAverage } from '../utils/analytics';
import { formatMoney, getCurrencySymbol } from '../utils/format';
import './App.css';

const WINDOWS = [
  { value: 6, label: 'Últimos 6 meses' },
  { value: 12, label: 'Últimos 12 meses' },
  { value: 24, label: 'Últimos 24 meses' },
];

/*
 * Esta página respondia às mesmas perguntas que o Painel e as Despesas — os
 * três gráficos existiam lá, a tabela existia aqui — e o gráfico de "6 meses"
 * recebia dados de um só mês, por isso cinco barras estavam sempre vazias.
 *
 * Passou a ter um trabalho que mais nenhuma faz: evolução ao longo do tempo.
 * O Painel mostra o mês corrente, os Relatórios um período escolhido, e esta
 * mostra a trajetória. Por isso vai buscar o histórico completo, sem filtro
 * de data — era precisamente esse filtro que esvaziava o gráfico.
 */
export default function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(12);

  useEffect(() => {
    Promise.all([
      // Sem query string: o histórico inteiro, que é o ponto da página.
      api.get('/api/transactions'),
      api.get('/api/me'),
    ])
      .then(([txRes, userRes]) => {
        setTransactions(txRes.data);
        setUser(userRes.data);
      })
      .catch(() => setError('Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false));
  }, []);

  const symbol = getCurrencySymbol(user?.currency || 'EUR');
  const monthlyBudget = user?.monthlyExpenses || 0;

  const history = useMemo(() => getMonthlyHistory(transactions, months), [transactions, months]);
  const average = useMemo(() => getMonthlyAverage(history), [history]);
  const trendWindow = months >= 12 ? 3 : 2;
  const trends = useMemo(() => getCategoryTrends(transactions, trendWindow), [transactions, trendWindow]);

  const windowTotal = history.reduce((s, m) => s + m.total, 0);
  const monthsWithData = history.filter((m) => m.count > 0).length;

  // Só os meses completos entram na distribuição: o mês em curso ainda está
  // a meio e distorceria as proporções.
  const completedMonths = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= endOfLastMonth;
    });
  }, [transactions, months]);

  if (loading) {
    return (
      <div className="ui-page">
        <DashboardNavbar />
        <div className="ui-page__body">
          <SkeletonCard height={44} style={{ borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-6)', maxWidth: 260 }} />
          <SkeletonCard height={340} style={{ borderRadius: 'var(--r-lg)', marginBottom: 'var(--sp-4)' }} />
          <div className="ui-grid ui-grid--2">
            <SkeletonCard height={300} style={{ borderRadius: 'var(--r-lg)' }} />
            <SkeletonCard height={300} style={{ borderRadius: 'var(--r-lg)' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <DashboardNavbar />

      <main className="ui-page__body">
        <header className="ui-page__head">
          <div>
            <span className="ui-eyebrow">Análises</span>
            <h1 className="ui-page__title">{formatMoney(windowTotal, symbol)}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 'var(--sp-1) 0 0' }}>
              {monthsWithData > 0
                ? `Em ${monthsWithData} ${monthsWithData === 1 ? 'mês' : 'meses'} com registos`
                : 'Sem registos neste período'}
            </p>
          </div>
          <div style={{ minWidth: 200 }}>
            <Field
              label="Período"
              as="select"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </Field>
          </div>
        </header>

        {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}

        <MonthlyTrend history={history} symbol={symbol} monthlyBudget={monthlyBudget} average={average} />

        <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
          <CategoryTrends trends={trends} symbol={symbol} window={trendWindow} />
          <CategoryBreakdown transactions={completedMonths} symbol={symbol} limit={8} />
        </div>
      </main>
    </div>
  );
}
