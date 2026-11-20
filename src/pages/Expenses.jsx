import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiCalendar, FiCreditCard, FiPlus, FiTrendingDown,
} from 'react-icons/fi';

import AppShell from '../components/AppShell';
import ExpenseForm from '../components/ExpenseForm';
import StatementImport from '../components/StatementImport';
import ExpenseList from '../components/ExpenseList';
import FilterBar from '../components/FilterBar';
import MetricCard from '../components/MetricCard';
import SkeletonCard from '../components/SkeletonCard';
import { Button, Modal } from '../components/ui';

import { api, buildTransactionQuery, getDateRangeFromPreset, filterTransactions } from '../utils/api';
import { formatMoney, getCurrencySymbol } from '../utils/format';
import { sumAmounts } from '../utils/money';
import './App.css';

const PAGE_SIZE = 25;

export default function Expenses() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(1);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q === null) return;
    setSearch(q);
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setEditing(null);
    setShowModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const fetchData = useCallback(async () => {
    try {
      const query = buildTransactionQuery({ preset, customFrom: from, customTo: to, category });
      const [userRes, txRes, catRes] = await Promise.all([
        api.get('/api/me'),
        api.get(`/api/transactions${query}`),
        api.get('/api/categories'),
      ]);
      setUser(userRes.data);
      setTransactions(txRes.data);
      setTruncated(String(txRes.headers?.['x-truncated'] || '') === '1');
      setCategories(catRes.data);
      setError('');
    } catch {
      setError('Não foi possível carregar as despesas.');
    } finally {
      setLoading(false);
    }
  }, [preset, from, to, category]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const symbol = getCurrencySymbol(user?.currency || 'EUR');

  const dateRange = useMemo(
    () => getDateRangeFromPreset(preset, from, to),
    [preset, from, to]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = preset === 'custom'
      ? filterTransactions(transactions, { from: dateRange.from, to: dateRange.to, category })
      : transactions;
    if (!term) return list;

    return list.filter((tx) =>
      (tx.description || '').toLowerCase().includes(term)
      || tx.category.toLowerCase().includes(term)
      || String(tx.amount).includes(term)
    );
  }, [transactions, search, preset, dateRange, category]);

  const sorted = useMemo(() => {
    const list = [...visible];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = new Date(a.date) - new Date(b.date); break;
        case 'category': cmp = a.category.localeCompare(b.category, 'pt'); break;
        case 'description': cmp = (a.description || '').localeCompare(b.description || '', 'pt'); break;
        case 'amount': cmp = a.amount - b.amount; break;
        default: cmp = 0;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [visible, sortField, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  useEffect(() => { setPage(1); }, [preset, from, to, category, search, sortField, sortDirection]);

  const expenses = visible.filter((tx) => tx.kind !== 'income');
  const income = sumAmounts(visible.filter((tx) => tx.kind === 'income'));
  const total = sumAmounts(expenses);
  const activeDays = new Set(expenses.map((t) => new Date(t.date).toDateString())).size;
  const biggest = expenses.reduce((max, tx) => (!max || tx.amount > max.amount ? tx : max), null);

  const handleSort = (field) => {
    if (field === sortField) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection(field === 'date' ? 'desc' : 'asc'); }
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = async (formData) => {
    setError('');
    try {
      if (editing) await api.put(`/api/transactions/${editing.id}`, formData);
      else await api.post('/api/transactions', formData);
      closeModal();

      fetchData();
    } catch {
      setError(editing ? 'Não foi possível atualizar a despesa.' : 'Não foi possível criar a despesa.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apagar esta despesa?')) return;
    try {
      await api.delete(`/api/transactions/${id}`);
      setTransactions((list) => list.filter((tx) => tx.id !== id));
    } catch {
      setError('Não foi possível apagar a despesa.');
    }
  };

  return (
    <AppShell>
      {truncated && (
        <div className="ui-alert ui-alert--danger" role="status" style={{ marginBottom: 'var(--sp-4)' }}>
          Só estão carregadas as 10 000 despesas mais recentes. Totais do período podem estar incompletos.
        </div>
      )}
      <header className="page-head">
        <div>
          <span className="ui-eyebrow">Transações</span>
          <h1 className="page-title">Despesas</h1>
          <p className="page-subtitle">
            {visible.length} {visible.length === 1 ? 'movimento' : 'movimentos'} · {formatMoney(total, symbol)} gastos
            {income > 0 && ` · ${formatMoney(income, symbol)} em entradas`}
          </p>
        </div>
        <div className="page-head__actions">
          <StatementImport symbol={symbol} onImported={fetchData} />
          <Button variant="primary" onClick={() => { setEditing(null); setShowModal(true); }} icon={<FiPlus size={15} />}>
            Novo movimento
          </Button>
        </div>
      </header>

      <div className="stat-grid">
        <MetricCard
          label="Total gasto"
          value={formatMoney(total, symbol)}
          icon={<FiCreditCard size={16} />}
          accent="orange"
          hint="no período selecionado"
        />
        <MetricCard
          label="Média por dia ativo"
          value={formatMoney(activeDays ? total / activeDays : 0, symbol)}
          icon={<FiCalendar size={16} />}
          accent="blue"
          hint={`${activeDays} ${activeDays === 1 ? 'dia' : 'dias'} com despesas`}
        />
        <MetricCard
          label="Maior despesa"
          value={biggest ? formatMoney(biggest.amount, symbol) : '—'}
          icon={<FiTrendingDown size={16} />}
          accent="green"
          hint={biggest?.category || '—'}
        />
      </div>

      <div className="filter-panel">
        <FilterBar
          preset={preset} onPresetChange={setPreset}
          customFrom={from} customTo={to}
          onCustomFromChange={setFrom} onCustomToChange={setTo}
          category={category} onCategoryChange={setCategory}
          categories={categories}
          searchTerm={search} onSearchChange={setSearch}
        />
      </div>

      {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}

      <div className="ui-card ui-card--tight">
        {loading
          ? <SkeletonCard height={360} style={{ borderRadius: 'var(--r-md)' }} />
          : (
            <ExpenseList
              transactions={pageRows}
              symbol={symbol}
              onEdit={(tx) => { setEditing(tx); setShowModal(true); }}
              onDelete={handleDelete}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}
      </div>

      {!loading && pageCount > 1 && (
        <nav className="ui-pager" aria-label="Paginação">
          <Button
            variant="ghost" size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="ui-pager__status">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} de {sorted.length}
          </span>
          <Button
            variant="ghost" size="sm"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage === pageCount}
          >
            Seguinte
          </Button>
        </nav>
      )}

      {showModal && (
        <Modal title={editing ? 'Editar movimento' : 'Novo movimento'} onClose={closeModal} maxWidth={520}>
          <ExpenseForm
            categories={categories}
            initialData={editing}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            submitLabel={editing ? 'Guardar' : 'Adicionar'}
          />
        </Modal>
      )}
    </AppShell>
  );
}
