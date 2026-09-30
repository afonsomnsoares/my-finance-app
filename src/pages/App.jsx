import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiPlus, FiTrendingUp } from 'react-icons/fi';

import DashboardNavbar from '../components/DashboardNavbar';
import BudgetAlerts from '../components/BudgetAlerts';
import { Button } from '../components/ui';

import DashboardSkeleton from './dashboard/DashboardSkeleton';
import SpendingHero from './dashboard/SpendingHero';
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
import { calcHealthScore } from './dashboard/helpers';
import { formatMonthYear } from '../utils/format';
import './App.css';

/*
 * O dashboard tinha nove blocos do mesmo peso visual empilhados, dois dos
 * quais desenhavam os mesmos dados (a grelha de dias e o gráfico de linha) e
 * quatro dos quais repetiam números já mostrados acima. No telemóvel dava
 * 4094px de scroll.
 *
 * Agora há uma hierarquia: um número herói, o contexto imediato à volta dele,
 * e depois detalhe em profundidade decrescente.
 */
export default function AppPage() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  // Quantos meses recuar. 0 = mês atual.
  const [monthOffset, setMonthOffset] = useState(0);
  const {
    user, error, loading, fetchData,
    symbol, monthTransactions, spentThisMonth, lastMonthTransactions,
    monthlyBudget, balance, spendingTrend, avgDaily,
    monthDays, hasTransactions, recentTransactions, reference, isCurrentMonth,
  } = useDashboardData(monthOffset);

  if (loading) {
    return (
      <div className="ui-page">
        <DashboardNavbar />
        <div className="ui-page__body"><DashboardSkeleton /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-page">
        <DashboardNavbar />
        <div className="ui-page__body">
          <div className="ui-card">
            <div className="ui-empty">
              <h2 className="ui-empty__title">Não foi possível carregar os dados</h2>
              <p className="ui-empty__text">{error}</p>
              <Button variant="secondary" onClick={fetchData}>Tentar novamente</Button>
            </div>
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
            <div className="monthnav">
              <button
                type="button"
                className="ui-iconbtn"
                onClick={() => setMonthOffset((o) => o + 1)}
                aria-label="Mês anterior"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="ui-eyebrow" style={{ margin: 0 }}>{formatMonthYear(reference)}</span>
              <button
                type="button"
                className="ui-iconbtn"
                onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
                disabled={isCurrentMonth}
                aria-label="Mês seguinte"
              >
                <FiChevronRight size={16} />
              </button>
              {!isCurrentMonth && (
                <button type="button" className="monthnav__today" onClick={() => setMonthOffset(0)}>
                  Voltar a hoje
                </button>
              )}
            </div>
            <h1 className="ui-page__title">
              {isCurrentMonth ? `Olá, ${user?.firstName}` : formatMonthYear(reference)}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Button variant="secondary" as={Link} to="/app/investments" icon={<FiTrendingUp size={15} />}>
              Investimentos
            </Button>
            <Button variant="primary" onClick={() => setShowQuickAdd(true)} icon={<FiPlus size={15} />}>
              Nova despesa
            </Button>
          </div>
        </header>

        {!hasTransactions ? (
          <EmptyState onAdd={() => setShowQuickAdd(true)} />
        ) : (
          <>
            {/* 1. A resposta principal, com o seu contexto imediato. */}
            <SpendingHero
              spent={spentThisMonth}
              budget={monthlyBudget}
              symbol={symbol}
              trend={spendingTrend}
              balance={balance}
              avgDaily={avgDaily}
              transactionCount={monthTransactions.length}
              healthScore={calcHealthScore(user, spentThisMonth)}
            />

            {isCurrentMonth && <BudgetAlerts symbol={symbol} />}

            {/* 2. Onde e quando foi gasto. */}
            <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
              <ExpenseChart monthDays={monthDays} symbol={symbol} />
              <CategoryBreakdown transactions={monthTransactions} symbol={symbol} />
            </div>

            {/* 3. Contexto mais alargado: histórico e património. */}
            <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
              <MonthComparison
                monthTransactions={monthTransactions}
                lastMonthTransactions={lastMonthTransactions}
                symbol={symbol}
              />
              <InvestmentSummary symbol={symbol} />
            </div>

            {/* 4. Detalhe. */}
            <RecentTransactions transactions={recentTransactions} symbol={symbol} />

            {/* 5. Ferramenta, não indicador — por isso vem no fim. E só faz
                sentido a olhar para o presente. */}
            {isCurrentMonth && (
              <>
                <section className="ui-section">
                  <SavingsProjector
                    monthlyIncome={user?.monthlyIncome || 0}
                    spentThisMonth={spentThisMonth}
                    symbol={symbol}
                  />
                </section>
                <MarketTicker />
              </>
            )}
          </>
        )}

        <QuickAddModal
          show={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          symbol={symbol}
          onSuccess={fetchData}
        />
      </main>
    </div>
  );
}
