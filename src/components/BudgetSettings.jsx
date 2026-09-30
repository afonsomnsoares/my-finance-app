import { useEffect, useState } from 'react';
import { FiSave, FiTrash2 } from 'react-icons/fi';
import { api } from '../utils/api';
import { formatMoney, formatPercent } from '../utils/format';
import { Button } from './ui';

/*
 * Gestão dos limites mensais por categoria.
 *
 * O backend já tinha PUT /api/budgets e DELETE /api/budgets/:id, e o painel já
 * avisava quando um limite era excedido — mas não existia nenhum ecrã para o
 * definir. Ou seja, o aviso só podia disparar para quem chamasse a API à mão.
 */
export default function BudgetSettings({ symbol }) {
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([api.get('/api/categories'), api.get('/api/budgets')])
      .then(([catRes, budgetRes]) => {
        setCategories(catRes.data);
        const current = {};
        const spentByCategory = {};
        budgetRes.data.budgets.forEach((b) => {
          current[b.category] = String(b.monthlyLimit);
          spentByCategory[b.category] = b;
        });
        setBudgets(current);
        setSaved(spentByCategory);
      })
      .catch(() => setError('Não foi possível carregar os orçamentos.'))
      .finally(() => setLoading(false));
  }, []);

  const change = (category) => (e) => {
    setBudgets((b) => ({ ...b, [category]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = Object.entries(budgets)
        .filter(([, value]) => value !== '' && Number(value) > 0)
        .map(([category, value]) => ({ category, monthlyLimit: Number(value) }));

      if (payload.length === 0) {
        setError('Define pelo menos um limite maior que zero.');
        return;
      }

      await api.put('/api/budgets', { budgets: payload });
      const { data } = await api.get('/api/budgets');
      const refreshed = {};
      data.budgets.forEach((b) => { refreshed[b.category] = b; });
      setSaved(refreshed);
      setSuccess('Orçamentos guardados.');
    } catch (err) {
      setError(err.response?.data?.details?.[0]?.message || 'Não foi possível guardar os orçamentos.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (category) => {
    const existing = saved[category];
    if (!existing) {
      setBudgets((b) => ({ ...b, [category]: '' }));
      return;
    }
    if (!window.confirm(`Remover o limite de ${category}?`)) return;
    try {
      await api.delete(`/api/budgets/${existing.id}`);
      setBudgets((b) => ({ ...b, [category]: '' }));
      setSaved((s) => { const next = { ...s }; delete next[category]; return next; });
    } catch {
      setError('Não foi possível remover o limite.');
    }
  };

  if (loading) return <div className="ui-card"><div className="ui-empty">A carregar orçamentos…</div></div>;

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h2 className="ui-card__title">Limites mensais</h2>
          <p className="ui-card__subtitle">
            Define um teto por categoria. O painel avisa quando o ultrapassas.
          </p>
        </div>
      </div>

      {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}
      {success && <div className="ui-alert" role="status" style={{ marginBottom: 'var(--sp-4)', borderColor: 'var(--success)' }}>{success}</div>}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-3)' }}>
        {categories.map((category) => {
          const status = saved[category];
          const value = budgets[category] ?? '';
          return (
            <li key={category} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--sp-3)', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <label htmlFor={`budget-${category}`} style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                  {category}
                </label>
                {status && (
                  <span style={{ fontSize: 'var(--fs-2xs)', color: status.exceeded ? 'var(--danger)' : 'var(--text-subtle)' }}>
                    {formatMoney(status.spent, symbol)} gastos · {formatPercent(status.percent)}
                  </span>
                )}
              </div>
              <input
                id={`budget-${category}`}
                className="ui-field__control"
                type="number"
                min="0"
                step="10"
                inputMode="decimal"
                value={value}
                onChange={change(category)}
                placeholder="Sem limite"
                style={{ width: 130, padding: 'var(--sp-2) var(--sp-3)', textAlign: 'right' }}
              />
              <button
                type="button"
                className="ui-iconbtn ui-iconbtn--danger"
                onClick={() => handleRemove(category)}
                disabled={!value && !status}
                aria-label={`Remover limite de ${category}`}
                style={{ opacity: value || status ? 1 : 0.25 }}
              >
                <FiTrash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        variant="secondary"
        block
        className="mt-4"
        onClick={handleSave}
        disabled={saving}
        icon={<FiSave size={15} />}
      >
        {saving ? 'A guardar…' : 'Guardar limites'}
      </Button>
    </div>
  );
}
