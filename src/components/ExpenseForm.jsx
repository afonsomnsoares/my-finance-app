import React, { useEffect, useState } from 'react';
import { FiDollarSign, FiCalendar, FiEdit2, FiType, FiX } from 'react-icons/fi';
import { toLocalDateKey } from '../utils/format';

// A function, not a constant: a module-level date was computed once at load
// and went stale in a tab left open past midnight.
const emptyForm = () => ({
  amount: '',
  category: '',
  date: toLocalDateKey(new Date()),
  description: '',
});

export default function ExpenseForm({
  categories,
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
}) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount,
        category: initialData.category,
        date: toLocalDateKey(initialData.date),
        description: initialData.description || '',
      });
    } else {
      setFormData(emptyForm());
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="amount" className="form-label">
            <FiDollarSign className="me-1" />Valor
          </label>
          <input
            id="amount"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="form-control"
            placeholder="Ex: 25.50"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="category" className="form-label">Categoria</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="">Seleciona uma categoria</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label htmlFor="date" className="form-label">
            <FiCalendar className="me-1" />Data
          </label>
          <input
            id="date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="description" className="form-label">
            <FiType className="me-1" />Descrição
          </label>
          <input
            id="description"
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-control"
            placeholder="Ex: Supermercado"
          />
        </div>
      </div>

      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-primary flex-grow-1">
          <FiEdit2 className="me-1" />{submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
            <FiX className="me-1" />Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
