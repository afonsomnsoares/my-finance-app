import { useState } from 'react';
import { api } from '../../utils/api';
import { toLocalDateKey } from '../../utils/format';
import { Modal } from '../../components/ui';
import { CATEGORIES, CATEGORY_ICONS } from './constants';

export default function QuickAddModal({ show, onClose, symbol, onSuccess }) {
  const [form, setForm] = useState({ amount: '', category: CATEGORIES[0], description: '', date: toLocalDateKey(new Date()) });
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
        description: form.description || null,
        date: form.date || toLocalDateKey(new Date()),
      });
      setForm({ amount: '', category: CATEGORIES[0], description: '', date: toLocalDateKey(new Date()) });
      onSuccess();
      onClose();
    } catch {
      setError('Erro ao adicionar despesa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nova Despesa" onClose={onClose} maxWidth={420}>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Valor</label>
            <div className="input-group">
              <span className="input-group-text" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>{symbol}</span>
              <input className="form-control" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" style={{ border: '1px solid var(--border)' }} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Categoria</label>
            <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ border: '1px solid var(--border)' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c] || '📌'} {c}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Descrição</label>
            <input className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" style={{ border: '1px solid var(--border)' }} />
          </div>
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Data</label>
            <input className="form-control" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ border: '1px solid var(--border)' }} />
          </div>
          {error && <div className="alert alert-danger py-2" style={{ fontSize: 'var(--fs-sm)' }}>{error}</div>}
          <button type="submit" className="btn btn-primary w-100" disabled={saving} style={{ fontWeight: 600, borderRadius: 8, padding: '0.6rem' }}>
            {saving ? 'A adicionar...' : 'Adicionar Despesa'}
          </button>
    </form>
    </Modal>
  );
}
