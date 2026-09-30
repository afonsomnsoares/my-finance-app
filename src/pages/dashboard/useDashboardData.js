import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrencySymbol } from '../../utils/format';
import { calcTrend } from '../../utils/analytics';
import { api, loadFromCache } from '../../utils/api';
import { getMonthDays } from './helpers';

/**
 * Loads the current user, transactions and insights, and derives every
 * value the dashboard needs from them (totals, trends, daily breakdown).
 */
export function useDashboardData(offset = 0) {
  /*
   * `offset` é quantos meses recuar: 0 = mês atual, 1 = mês passado.
   * O painel só sabia olhar para o mês corrente; para ver agosto era preciso
   * ir aos Relatórios.
   */
  const reference = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - offset, 1);
  }, [offset]);

  const [user, setUser] = useState(() => loadFromCache('/api/me') || null);
  const [transactions, setTransactions] = useState(() => loadFromCache('/api/transactions') || []);
  const [insights, setInsights] = useState(() => loadFromCache('/api/insights') || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!navigator.onLine) { setLoading(false); return; }
    try {
      const [userRes, txRes, insRes] = await Promise.all([
        api.get('/api/me'),
        api.get('/api/transactions'),
        api.get('/api/insights').catch(() => null),
      ]);
      setUser(userRes.data);
      setTransactions(txRes.data);
      setInsights(insRes?.data || null);
    } catch {
      setError('Erro ao carregar dados. Verifica se o servidor backend está a correr em http://127.0.0.1:5000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const symbol = getCurrencySymbol(user?.currency || 'EUR');

  const inMonth = (date, ref) => {
    const d = new Date(date);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  };

  const monthTransactions = useMemo(
    () => transactions.filter((t) => inMonth(t.date, reference)),
    [transactions, reference]
  );
  const lastMonthTransactions = useMemo(() => {
    const prev = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    return transactions.filter((t) => inMonth(t.date, prev));
  }, [transactions, reference]);
  const spentThisMonth = useMemo(() => monthTransactions.reduce((s, t) => s + t.amount, 0), [monthTransactions]);
  const spentLastMonth = useMemo(() => lastMonthTransactions.reduce((s, t) => s + t.amount, 0), [lastMonthTransactions]);
  const monthlyBudget = user?.monthlyExpenses || 0;
  const budgetUsedPercent = monthlyBudget > 0 ? Math.min(Math.round((spentThisMonth / monthlyBudget) * 100), 100) : 0;
  const balance = (user?.monthlyIncome || 0) - spentThisMonth;
  const spendingTrend = calcTrend(spentThisMonth, spentLastMonth);
  // Num mês passado a média é sobre o mês inteiro, não sobre o dia de hoje.
  const isCurrentMonth = offset === 0;
  const daysElapsed = isCurrentMonth
    ? new Date().getDate()
    : new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  const avgDaily = spentThisMonth / Math.max(daysElapsed, 1);
  const monthDays = useMemo(() => getMonthDays(transactions, reference), [transactions, reference]);
  const maxDaily = Math.max(...monthDays.filter(d => !d.isFuture).map(d => d.total), 1);
  const hasTransactions = transactions.length > 0;

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  return {
    user, transactions, insights, error, loading, fetchData, reference, isCurrentMonth,
    symbol, monthTransactions, lastMonthTransactions,
    spentThisMonth, spentLastMonth, monthlyBudget, budgetUsedPercent,
    balance, spendingTrend, avgDaily, monthDays, maxDaily,
    hasTransactions, recentTransactions,
  };
}
