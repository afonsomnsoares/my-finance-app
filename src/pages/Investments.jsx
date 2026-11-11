import {
  FiEdit2, FiPieChart, FiPlus, FiRefreshCw, FiSearch, FiTarget,
  FiTrash2, FiTrendingUp,
} from 'react-icons/fi';

import AppShell from '../components/AppShell';
import MetricCard from '../components/MetricCard';
import { Button, Field, Modal } from '../components/ui';

import InvestmentsSkeleton from './investments/InvestmentsSkeleton';
import Empty from './investments/Empty';
import AllocationBar from './investments/AllocationBar';
import { useInvestments } from './investments/useInvestments';
import { TYPES, TYPE_COLORS, SORT_OPTIONS } from './investments/constants';

import { formatMoney, formatPercent, formatSignedMoney } from '../utils/format';
import './App.css';

const typeLabel = (v) => TYPES.find((t) => t.value === v)?.label || v;

/*
 * A página mostrava cada ativo DUAS vezes — uma tabela e, por baixo, um cartão
 * por ativo com exatamente os mesmos números — e repetia o valor da carteira
 * em duas filas de KPIs seguidas. Ficou uma tabela e um número herói.
 */
export default function Investments() {
  const {
    investments, loading, showModal, editing, sortBy, setSortBy,
    searchTerm, setSearchTerm, goalTarget, form, setForm, error, priceError,
    searchResults, searching, showDropdown, setShowDropdown, selectedSuggestion,
    setSelectedSuggestion, symbol, totalCost, totalCurrent, totalPL, totalPLPercent,
    hasLivePrices, goalProgress, filtered, sorted, pieData, bestPerformer,
    diversification, openAdd, openEdit, closeModal, handleSubmit, handleDelete,
    handleSelectSuggestion, handleGoalChange, refreshPrices,
  } = useInvestments();

  if (loading) {
    return (
      <AppShell>
        <InvestmentsSkeleton />
      </AppShell>
    );
  }

  const gain = totalPL >= 0;

  return (
    <AppShell>
      <header className="page-head">
        <div>
          <span className="ui-eyebrow">Carteira</span>
          <h1 className="page-title">
            {formatMoney(hasLivePrices ? totalCurrent : totalCost, symbol)}
          </h1>
          {investments.length > 0 && (
            <p className="page-subtitle">
              {hasLivePrices ? (
                <>
                  <span className={`ui-delta ui-delta--${gain ? 'gain' : 'loss'}`}>
                    {formatSignedMoney(totalPL, symbol)} ({formatPercent(totalPLPercent, { decimals: 1, signed: true })})
                  </span>
                  {' · '}{investments.length} ativos
                </>
              ) : (
                <>{investments.length} ativos · cotações indisponíveis</>
              )}
            </p>
          )}
        </div>
        <div className="page-head__actions">
          {investments.length > 0 && (
            <Button variant="secondary" onClick={refreshPrices} icon={<FiRefreshCw size={15} />}>
              Atualizar
            </Button>
          )}
          <Button variant="primary" onClick={openAdd} icon={<FiPlus size={15} />}>Adicionar</Button>
        </div>
      </header>

      {priceError && <div className="ui-alert ui-alert--warning" style={{ marginBottom: 'var(--sp-4)' }}>{priceError}</div>}
      {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}

      {investments.length === 0 ? (
        <Empty onAdd={openAdd} />
      ) : (
        <>
          <div className="stat-grid">
            <MetricCard
              label="Valor investido"
              value={formatMoney(totalCost, symbol)}
              icon={<FiTrendingUp size={16} />}
              accent="blue"
              hint="custo de aquisição"
            />
            <MetricCard
              label="Resultado"
              value={hasLivePrices ? formatSignedMoney(totalPL, symbol) : '—'}
              icon={<FiTarget size={16} />}
              accent={gain ? 'green' : 'orange'}
              badge={hasLivePrices ? formatPercent(totalPLPercent, { decimals: 1, signed: true }) : undefined}
              badgeTone={gain ? 'positive' : 'negative'}
              hint={hasLivePrices ? `Melhor ativo: ${bestPerformer?.name || '—'}` : 'sem cotações em tempo real'}
            />
            <MetricCard
              label="Diversificação"
              value={`${diversification.score}/100`}
              icon={<FiPieChart size={16} />}
              accent="purple"
              hint={diversification.hint}
            />
          </div>

          <div className="ui-grid ui-grid--sidebar" style={{ marginTop: 'var(--sp-4)' }}>
              <div className="ui-card ui-card--tight">
                <div className="ui-card__header asset-head" style={{ padding: 'var(--sp-2) 0 var(--sp-3)' }}>
                  <h3 className="ui-card__title">Ativos</h3>
                  <div className="asset-tools">
                    <div className="asset-tools__search">
                      <FiSearch size={13} aria-hidden="true" />
                      <input
                        className="ui-field__control"
                        placeholder="Filtrar…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Filtrar ativos"
                      />
                    </div>
                    <select
                      className="ui-field__control"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      aria-label="Ordenar ativos"
                    >
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="ui-empty">
                    <p className="ui-empty__text">Nenhum ativo corresponde a “{searchTerm}”.</p>
                  </div>
                ) : (
                  <div>
                    <table className="ui-table ui-table--stack">
                      <thead>
                        <tr>
                          <th>Ativo</th>
                          <th className="num">Unid.</th>
                          <th className="num">Compra</th>
                          <th className="num">Atual</th>
                          <th className="num">Dia</th>
                          <th className="num">P&amp;L</th>
                          <th className="num"><span className="sr-only">Ações</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((inv) => (
                          <tr key={inv.id}>
                            <td data-label="Ativo">
                              <span className="ui-chip">
                                <span className="ui-chip__dot" style={{ background: TYPE_COLORS[inv.type] || 'var(--text-muted)' }} />
                                <span>
                                  <strong>{inv.name}</strong>
                                  <span style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
                                    {typeLabel(inv.type)} · {formatPercent(inv.allocation)}
                                  </span>
                                </span>
                              </span>
                            </td>
                            <td className="num muted" data-label="Unid.">{inv.amount}</td>
                            <td className="num muted" data-label="Compra">{formatMoney(inv.buyPrice, symbol)}</td>
                            <td className="num" data-label="Atual">{inv.currentPrice ? formatMoney(inv.currentPrice, symbol) : <span className="muted">—</span>}</td>
                            <td className="num" data-label="Dia">
                              {inv.dailyChange != null ? (
                                <span className={`ui-delta ui-delta--${inv.dailyChange >= 0 ? 'gain' : 'loss'}`}>
                                  {formatPercent(inv.dailyChange, { decimals: 2, signed: true })}
                                </span>
                              ) : <span className="muted">—</span>}
                            </td>
                            <td className="num" data-label="P&L">
                              {inv.pl != null ? (
                                <span className={`ui-delta ui-delta--${inv.pl >= 0 ? 'gain' : 'loss'}`}>
                                  {formatSignedMoney(inv.pl, symbol)}
                                </span>
                              ) : <span className="muted">—</span>}
                            </td>
                            <td className="num" data-label="">
                              <div className="ui-rowactions">
                                <button type="button" className="ui-iconbtn" onClick={() => openEdit(inv)} aria-label={`Editar ${inv.name}`}><FiEdit2 size={14} /></button>
                                <button type="button" className="ui-iconbtn ui-iconbtn--danger" onClick={() => handleDelete(inv.id)} aria-label={`Apagar ${inv.name}`}><FiTrash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                <AllocationBar pieData={pieData} />

                <div className="ui-card">
                  <h3 className="ui-card__title">Meta da carteira</h3>
                  <p className="ui-card__subtitle" style={{ marginBottom: 'var(--sp-4)' }}>
                    Define um valor para acompanhares o progresso.
                  </p>
                  <Field
                    label="Valor da meta"
                    type="number"
                    min="0"
                    step="100"
                    value={goalTarget || ''}
                    onChange={(e) => handleGoalChange(e.target.value)}
                    placeholder="Ex: 25000"
                  />
                  {goalTarget > 0 && (
                    <div style={{ marginTop: 'var(--sp-4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', fontSize: 'var(--fs-sm)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Progresso</span>
                        <span style={{ fontWeight: 'var(--fw-semibold)' }}>{formatPercent(goalProgress)}</span>
                      </div>
                      <div className="ui-progress">
                        <div
                          className={`ui-progress__fill${goalProgress >= 100 ? ' ui-progress__fill--good' : ''}`}
                          style={{ width: `${Math.min(goalProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {showModal && (
          <Modal title={editing ? 'Editar ativo' : 'Novo ativo'} onClose={closeModal} maxWidth={520}>
            <form onSubmit={handleSubmit}>
              <div style={{ position: 'relative' }}>
                <Field
                  label="Ticker"
                  hint="Pesquisa ações, ETFs e cripto em tempo real."
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setSelectedSuggestion(null); }}
                  onFocus={() => { if (form.name && !selectedSuggestion) setShowDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="Ex: VOO, AAPL, BTC-USD"
                  required
                  autoComplete="off"
                />
                {showDropdown && !selectedSuggestion && form.name.length >= 1 && (
                  <div className="ui-suggest">
                    {searching ? (
                      <p className="ui-suggest__msg">A pesquisar…</p>
                    ) : searchResults.length === 0 ? (
                      <p className="ui-suggest__msg">Sem resultados</p>
                    ) : (
                      searchResults.slice(0, 8).map((item) => (
                        <button
                          type="button"
                          key={item.symbol}
                          className="ui-suggest__item"
                          onMouseDown={() => handleSelectSuggestion(item)}
                        >
                          <span>
                            <strong>{item.symbol}</strong>
                            <span style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>{item.name}</span>
                          </span>
                          <span className="ui-chip">
                            <span className="ui-chip__dot" style={{ background: TYPE_COLORS[item.type] || 'var(--text-muted)' }} />
                            <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>{item.exchange || typeLabel(item.type)}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
                <Field label="Tipo" as="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Field>
                <Field label="Moeda" as="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </Field>
                <Field label="Unidades" type="number" min="0" step="0.0001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <Field label="Preço de compra" type="number" min="0" step="0.01" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} required placeholder="0.00" />
              </div>

              <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-5)' }}>
                <Button type="submit" variant="primary" block>{editing ? 'Guardar' : 'Adicionar'}</Button>
                <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
              </div>
            </form>
          </Modal>
        )}
    </AppShell>
  );
}
