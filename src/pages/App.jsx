import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity, FiCalendar, FiChevronLeft, FiChevronRight, FiCreditCard,
  FiDollarSign, FiFilter, FiGrid, FiList, FiPieChart, FiPlus,
} from 'react-icons/fi';

import AppShell from '../components/AppShell';
import BudgetAlerts from '../components/BudgetAlerts';
import MetricCard, { Sparkline, MiniBars } from '../components/MetricCard';
import { Button } from '../components/ui';

import DashboardSkeleton from './dashboard/DashboardSkeleton';
import CategoryBreakdown from './dashboard/CategoryBreakdown';
import ExpenseChart from './dashboard/ExpenseChart';
import MonthComparison from './dashboard/MonthComparison';
import InvestmentSummary from './dashboard/InvestmentSummary';
import SavingsProjector from './dashboard/SavingsProjector';
import RecentTransactions from './dashboard/RecentTransactions';
import EmptyState from './dashboard/EmptyState';
import QuickAddModal from './dashboard/QuickAddModal';
import MarketTicker from './dashboard/MarketTicker';

import { useDashboardData } from './dashboard/useDashboardData';
import { formatMonthYear, formatMoney, formatPercent } from '../utils/format';
import './App.css';

/*
 * Painel principal, agora alinhado com o design de referência: três cartões de
 * destaque no topo, uma barra de secção com filtros e uma grelha de quatro
 * colunas com o detalhe. O número herói antigo foi distribuído por esses três
 * cartões, que respondem às mesmas perguntas sem repetir valores.
 */
export default function AppPage() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const {
    user, error, loading, fetchData,
    symbol, monthTransactions, spentThisMonth, lastMonthTransactions,
    monthlyBudget, balance, spendingTrend, avgDaily,
    monthDays, hasTransactions, recentTransactions, reference, isCurrentMonth,
  } = useDashboardData(monthOffset);

  const income = user?.monthlyIncome || 0;
  const spentPercent = income > 0 ? Math.round((spentThisMonth / income) * 100) : 0;
  const trendTone = spendingTrend.direction === 'up'
    ? 'negative'
    : spendingTrend.direction === 'down' ? 'positive' : 'neutral';
  const trendBadge = spendingTrend.direction === 'neutral'
    ? '—'
    : `${spendingTrend.direction === 'up' ? '↑' : '↓'} ${formatPercent(Math.abs(spendingTrend.percent))}`;

  const cumulative = useMemo(() => {
    let sum = 0;
    return monthDays
      .filter((day) => !day.isFuture)
      .map((day) => { sum += day.total; return sum; });
  }, [monthDays]);

  // O saldo ao longo do mês: rendimento menos o acumulado de despesas.
  const balanceSeries = useMemo(
    () => cumulative.map((spent) => income - spent),
    [cumulative, income]
  );

  if (loading) {
    return (
      <AppShell>
        <DashboardSkeleton />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="ui-card">
          <div className="ui-empty">
            <h2 className="ui-empty__title">Não foi possível carregar os dados</h2>
            <p className="ui-empty__text">{error}</p>
            <Button variant="secondary" onClick={fetchData}>Tentar novamente</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="page-head">
        <div>
          <span className="ui-eyebrow">Finanças pessoais</span>
          <h1 className="page-title">Visão geral</h1>
          <p className="page-subtitle">
            {formatMonthYear(reference)} · rendimento, despesas, poupança e objetivos
          </p>
        </div>

        <div className="page-head__actions">
          <div className="month-switch" aria-label="Navegação entre meses">
            <button
              type="button"
              className="month-switch__btn"
              onClick={() => setMonthOffset((offset) => offset + 1)}
              aria-label="Mês anterior"
            >
              <FiChevronLeft size={15} />
            </button>
            <span className="month-switch__label">{formatMonthYear(reference)}</span>
            <button
              type="button"
              className="month-switch__btn"
              onClick={() => setMonthOffset((offset) => Math.max(0, offset - 1))}
              disabled={isCurrentMonth}
              aria-label="Mês seguinte"
            >
              <FiChevronRight size={15} />
            </button>
          </div>

          <Button variant="primary" onClick={() => setShowQuickAdd(true)} icon={<FiPlus size={15} />}>
            Nova despesa
          </Button>
        </div>
      </header>

      {!hasTransactions ? (
        <EmptyState onAdd={() => setShowQuickAdd(true)} />
      ) : (
        <>
          <div className="stat-grid">
            <MetricCard
              label="Saldo"
              value={formatMoney(balance, symbol)}
              icon={<FiDollarSign size={16} />}
              accent="orange"
              badge={trendBadge}
              badgeTone={trendTone}
              hint="Rendimento mensal menos despesas"
            >
              <Sparkline values={balanceSeries} color="var(--orange)" />
            </MetricCard>

            <MetricCard
              label="Rendimento mensal"
              value={formatMoney(income, symbol)}
              icon={<FiCalendar size={16} />}
              accent="blue"
              hint={monthlyBudget > 0
                ? `Orçamento definido: ${formatMoney(monthlyBudget, symbol)}`
                : 'Define um orçamento no perfil'}
            >
              <MiniBars values={[income, monthlyBudget, spentThisMonth]} color="var(--accent)" />
            </MetricCard>

            <MetricCard
              label="Gastos"
              value={formatMoney(spentThisMonth, symbol)}
              icon={<FiCreditCard size={16} />}
              accent="green"
              hint={`${spentPercent}% do rendimento gasto · média diária ${formatMoney(avgDaily, symbol)}`}
            >
              <div className="metric-card__progress">
                <div
                  className="ui-progress"
                  role="progressbar"
                  aria-valuenow={spentPercent}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(spentPercent, 100)}
                  aria-label={`${spentPercent}% do rendimento gasto`}
                >
                  <div
                    className={`ui-progress__fill${spentPercent > 100 ? ' ui-progress__fill--over' : spentPercent >= 85 ? ' ui-progress__fill--near' : ' ui-progress__fill--good'}`}
                    style={{ width: `${Math.min(spentPercent, 100)}%` }}
                  />
                </div>
              </div>
            </MetricCard>
          </div>

          {isCurrentMonth && <BudgetAlerts symbol={symbol} />}

          <div className="section-bar" id="resumo">
            <div className="section-bar__title">
              As minhas finanças
              <span className="section-bar__divider" aria-hidden="true" />
            </div>

            <div className="section-bar__chips" aria-label="Atalhos do painel">
              <a href="#resumo" className="pill pill--active"><FiGrid size={13} /> Resumo</a>
              <a href="#categorias" className="pill"><FiPieChart size={13} /> Categorias</a>
              <a href="#evolucao" className="pill"><FiActivity size={13} /> Evolução</a>
              <a href="#transacoes" className="pill"><FiList size={13} /> Transações</a>
            </div>

            <div className="section-bar__actions">
              <Link to="/app/expenses" className="pill">
                <FiFilter size={13} /> Filtrar
              </Link>
              <span className="pill">{reference.getFullYear()}</span>
            </div>
          </div>

          <div className="finance-grid">
            <div id="categorias">
              <CategoryBreakdown transactions={monthTransactions} symbol={symbol} />
            </div>
            <div id="evolucao">
              <ExpenseChart monthDays={monthDays} symbol={symbol} />
            </div>
            <div id="poupanca">
              <SavingsProjector
                monthlyIncome={income}
                spentThisMonth={spentThisMonth}
                symbol={symbol}
              />
            </div>
            <div id="investimentos">
              <InvestmentSummary symbol={symbol} />
            </div>
          </div>

          <div className="finance-grid finance-grid--wide" style={{ marginTop: 'var(--sp-4)' }}>
            <MonthComparison
              monthTransactions={monthTransactions}
              lastMonthTransactions={lastMonthTransactions}
              symbol={symbol}
            />
          </div>

          <div id="transacoes">
            <RecentTransactions transactions={recentTransactions} symbol={symbol} />
          </div>

          <MarketTicker />
        </>
      )}

      <QuickAddModal
        show={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        symbol={symbol}
        onSuccess={fetchData}
      />
    </AppShell>
  );
}
