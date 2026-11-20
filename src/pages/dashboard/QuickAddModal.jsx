import { useState } from 'react';
import { api } from '../../utils/api';
import { toLocalDateKey } from '../../utils/format';
import { Button, Field, Modal } from '../../components/ui';
import { CATEGORIES, CATEGORY_ICONS } from './constants';

export default function QuickAddModal({ show, onClose, symbol, onSuccess }) {
  const [form, setForm] = useState({ amount: '', category: CATEGORIES[0], kind: 'expense', description: '', date: toLocalDateKey(new Date()) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

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
      setForm({ amount: '', category: CATEGORIES[0], kind: 'expense', description: '', date: toLocalDateKey(new Date()) });
      onSuccess();
      onClose();
    } catch {
      setError('Erro ao adicionar despesa.');
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
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        >
          <option value="expense">Despesa</option>
          <option value="income">Entrada</option>
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
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c] || ''} {c}</option>)}
        </Field>
        <Field
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Opcional"
        />
        <Field
          label="Data"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        {error && <div className="ui-alert ui-alert--danger" role="alert">{error}</div>}
        <Button type="submit" variant="primary" block disabled={saving}>
          {saving ? 'A adicionar...' : 'Adicionar Despesa'}
        </Button>
      </form>
    </Modal>
  );
}
