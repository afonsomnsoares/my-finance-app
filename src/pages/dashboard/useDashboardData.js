import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrencySymbol, toLocalDateKey } from '../../utils/format';
import { calcTrend } from '../../utils/analytics';
import { api } from '../../utils/api';
import { roundMoney, sumAmounts } from '../../utils/money';
import { getMonthDays } from './helpers';

export function useDashboardData(offset = 0) {

  const reference = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - offset, 1);
  }, [offset]);

  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!navigator.onLine) { setLoading(false); return; }
    const from = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    const to = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    const params = new URLSearchParams({ from: toLocalDateKey(from), to: toLocalDateKey(to) });
    try {
      const [userRes, txRes, insRes] = await Promise.all([
        api.get('/api/me'),
        api.get(`/api/transactions?${params}`),
        api.get('/api/insights').catch(() => null),
      ]);
      setUser(userRes.data);
      setTransactions(txRes.data);
      setTruncated(String(txRes.headers?.['x-truncated'] || '') === '1');
      setInsights(insRes?.data || null);
    } catch {
      setError('Erro ao carregar dados. Verifica se o servidor backend está a correr em http://127.0.0.1:5000.');
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const symbol = getCurrencySymbol(user?.currency || 'EUR');

  const inMonth = (date, ref) => {
    const d = new Date(date);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  };

  const inView = useMemo(
    () => transactions.filter((t) => inMonth(t.date, reference)),
    [transactions, reference]
  );
  const monthTransactions = useMemo(
    () => inView.filter((t) => t.kind !== 'income'),
    [inView]
  );
  const lastMonthTransactions = useMemo(() => {
    const prev = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    return transactions.filter((t) => inMonth(t.date, prev) && t.kind !== 'income');
  }, [transactions, reference]);
  const spentThisMonth = useMemo(() => sumAmounts(monthTransactions), [monthTransactions]);
  const spentLastMonth = useMemo(() => sumAmounts(lastMonthTransactions), [lastMonthTransactions]);
  const incomeThisMonth = useMemo(
    () => sumAmounts(inView.filter((t) => t.kind === 'income')),
    [inView]
  );
  const monthlyBudget = user?.monthlyExpenses || 0;
  const budgetUsedPercent = monthlyBudget > 0 ? Math.min(Math.round((spentThisMonth / monthlyBudget) * 100), 100) : 0;
  const balance = roundMoney(incomeThisMonth - spentThisMonth);
  const spendingTrend = calcTrend(spentThisMonth, spentLastMonth);

  const isCurrentMonth = offset === 0;
  const daysElapsed = isCurrentMonth
    ? new Date().getDate()
    : new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  const avgDaily = spentThisMonth / Math.max(daysElapsed, 1);
  const monthDays = useMemo(() => getMonthDays(monthTransactions, reference), [monthTransactions, reference]);
  const maxDaily = Math.max(...monthDays.filter(d => !d.isFuture).map(d => d.total), 1);
  const hasTransactions = transactions.length > 0;

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  return {
    user, transactions, insights, truncated, error, loading, fetchData, reference, isCurrentMonth,
    symbol, monthTransactions, lastMonthTransactions,
    spentThisMonth, spentLastMonth, incomeThisMonth, monthlyBudget, budgetUsedPercent,
    balance, spendingTrend, avgDaily, monthDays, maxDaily,
    hasTransactions, recentTransactions,
  };
}
