import { useState } from 'react';
import { api } from '../../utils/api';
import { toLocalDateKey } from '../../utils/format';
import { Button, Field, Modal } from '../../components/ui';
import { CATEGORIES, CATEGORY_ICONS } from './constants';

const EXPENSE_CATEGORY = CATEGORIES.find((c) => c !== 'Rendimento') || CATEGORIES[0];

export default function QuickAddModal({ show, onClose, symbol, onSuccess }) {
  const [form, setForm] = useState({
    amount: '',
    category: EXPENSE_CATEGORY,
    kind: 'expense',
    description: '',
    date: toLocalDateKey(new Date()),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const isIncome = form.kind === 'income';

  const setKind = (kind) => {
    setForm((prev) => ({
      ...prev,
      kind,
      category: kind === 'income'
        ? 'Rendimento'
        : (prev.category === 'Rendimento' ? EXPENSE_CATEGORY : prev.category),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/transactions', {
        amount: parseFloat(form.amount),
        category: form.category,
        kind: form.kind,
        description: form.description || null,
        date: form.date || toLocalDateKey(new Date()),
      });
      setForm({
        amount: '',
        category: EXPENSE_CATEGORY,
        kind: 'expense',
        description: '',
        date: toLocalDateKey(new Date()),
      });
      onSuccess();
      onClose();
    } catch {
      setError(isIncome ? 'Erro ao adicionar entrada.' : 'Erro ao adicionar despesa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Novo movimento" onClose={onClose} maxWidth={420}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <Field
          label="Tipo"
          as="select"
          value={form.kind}
          onChange={(e) => setKind(e.target.value)}
          hint={isIncome ? 'Conta para o saldo e para “Entradas do mês”.' : 'Sai do saldo como gasto.'}
        >
          <option value="expense">Despesa</option>
          <option value="income">Entrada (salário, etc.)</option>
        </Field>
        <Field
          label={`Valor (${symbol})`}
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          placeholder="0.00"
        />
        <Field
          label="Categoria"
          as="select"
          value={form.category}
          onChange={(e) => {
            const category = e.target.value;
            setForm((prev) => ({
              ...prev,
              category,
              kind: category === 'Rendimento' ? 'income' : (prev.kind === 'income' ? 'expense' : prev.kind),
            }));
          }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c] || ''} {c}</option>)}
        </Field>
        <Field
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={isIncome ? 'Ex: Ordenado novembro' : 'Opcional'}
        />
        <Field
          label="Data"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        {error && <div className="ui-alert ui-alert--danger" role="alert">{error}</div>}
        <Button type="submit" variant="primary" block disabled={saving}>
          {saving ? 'A adicionar…' : (isIncome ? 'Adicionar entrada' : 'Adicionar despesa')}
        </Button>
      </form>
    </Modal>
  );
}
