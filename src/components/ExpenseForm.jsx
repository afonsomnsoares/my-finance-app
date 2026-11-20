import React, { useEffect, useState } from 'react';
import { FiEdit2, FiX } from 'react-icons/fi';
import { toLocalDateKey } from '../utils/format';
import { Button, Field } from './ui';

const emptyForm = () => ({
  amount: '',
  category: '',
  kind: 'expense',
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
        kind: initialData.kind === 'income' ? 'income' : 'expense',
        date: toLocalDateKey(initialData.date),
        description: initialData.description || '',
      });
    } else {
      setFormData(emptyForm());
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'kind') {
      setFormData((prev) => ({
        ...prev,
        kind: value,
        category: value === 'income'
          ? (categories.includes('Rendimento') ? 'Rendimento' : prev.category)
          : (prev.category === 'Rendimento'
            ? (categories.find((c) => c !== 'Rendimento') || prev.category)
            : prev.category),
      }));
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <div className="ui-grid ui-grid--2">
        <Field
          label="Tipo"
          as="select"
          name="kind"
          value={formData.kind}
          onChange={handleChange}
        >
          <option value="expense">Despesa</option>
          <option value="income">Entrada (salário, etc.)</option>
        </Field>
        <Field
          label="Valor"
          id="amount"
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="Ex: 25.50"
          min="0"
          step="0.01"
          required
        />
        <Field
          label="Categoria"
          id="category"
          as="select"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">Seleciona uma categoria</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Field>
        <Field
          label="Data"
          id="date"
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
        <Field
          label="Descrição"
          id="description"
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Ex: Supermercado"
        />
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary" icon={<FiEdit2 size={15} />}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} icon={<FiX size={15} />}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
