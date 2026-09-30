import { useEffect, useState } from 'react';
import { FiUser } from 'react-icons/fi';

import DashboardNavbar from '../components/DashboardNavbar';
import BudgetSettings from '../components/BudgetSettings';
import PasswordChange from '../components/PasswordChange';
import { Button, Field } from '../components/ui';
import { EMPLOYMENT_OPTIONS, EXPERIENCE_OPTIONS, GOAL_OPTIONS } from '../utils/profileOptions';
import { api } from '../utils/api';
import { getCurrencySymbol } from '../utils/format';
import './App.css';

const CURRENCIES = [
  { value: 'EUR', label: 'EUR €' },
  { value: 'USD', label: 'USD $' },
  { value: 'GBP', label: 'GBP £' },
];

// Todos os campos que o PUT /api/profile aceita. Antes a página editava
// quatro deles, e os outros dez só eram alcançáveis pela API.
const EMPTY = {
  firstName: '', lastName: '', email: '', username: '',
  phoneNumber: '', birthday: '',
  monthlyIncome: '', monthlyExpenses: '', fixedExpenses: '', savingsTarget: '',
  currency: 'EUR', financialGoal: '', employmentStatus: '', budgetingExperience: '',
};

const fromUser = (u) => ({
  firstName: u.firstName ?? '',
  lastName: u.lastName ?? '',
  email: u.email ?? '',
  username: u.username ?? '',
  phoneNumber: u.phoneNumber ?? '',
  // <input type="date"> exige exatamente AAAA-MM-DD.
  birthday: u.birthday ? String(u.birthday).slice(0, 10) : '',
  monthlyIncome: u.monthlyIncome ?? '',
  monthlyExpenses: u.monthlyExpenses ?? '',
  fixedExpenses: u.fixedExpenses ?? '',
  savingsTarget: u.savingsTarget ?? '',
  currency: u.currency || 'EUR',
  financialGoal: u.financialGoal || '',
  employmentStatus: u.employmentStatus || '',
  budgetingExperience: u.budgetingExperience || '',
});

export default function Profile() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/api/me')
      .then(({ data }) => setForm(fromUser(data)))
      .catch(() => { setForm(EMPTY); setError('Não foi possível carregar o perfil.'); })
      .finally(() => setLoading(false));
  }, []);

  const change = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const { data } = await api.put('/api/profile', form);
      setForm(fromUser(data.user));
      setSuccess('Perfil atualizado.');
    } catch (err) {
      setError(
        err.response?.data?.details?.[0]
          ? `${err.response.data.details[0].field}: ${err.response.data.details[0].message}`
          : err.response?.data?.error || 'Não foi possível atualizar o perfil.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="ui-page">
        <DashboardNavbar />
        <div className="ui-page__body">
          <div className="ui-card"><div className="ui-empty">A carregar…</div></div>
        </div>
      </div>
    );
  }

  const symbol = getCurrencySymbol(form.currency);

  return (
    <div className="ui-page">
      <DashboardNavbar />

      <main className="ui-page__body" style={{ maxWidth: 680 }}>
        <header className="ui-page__head">
          <div>
            <span className="ui-eyebrow">
              <FiUser size={12} style={{ marginRight: 4 }} aria-hidden="true" />Perfil
            </span>
            <h1 className="ui-page__title">{form.firstName} {form.lastName}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 'var(--sp-1) 0 0' }}>
              {form.email}
            </p>
          </div>
        </header>

        {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}
        {success && <div className="ui-alert" role="status" style={{ marginBottom: 'var(--sp-4)', borderColor: 'var(--success)' }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="ui-card">
            <h2 className="ui-card__title">Dados pessoais</h2>
            <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
              <Field label="Nome" value={form.firstName} onChange={change('firstName')} autoComplete="given-name" />
              <Field label="Apelido" value={form.lastName} onChange={change('lastName')} autoComplete="family-name" />
              <Field label="Email" type="email" value={form.email} onChange={change('email')} autoComplete="email" />
              <Field label="Utilizador" value={form.username} onChange={change('username')} hint="Usado para iniciar sessão" autoComplete="username" />
              <Field label="Telefone" type="tel" value={form.phoneNumber} onChange={change('phoneNumber')} autoComplete="tel" />
              <Field label="Data de nascimento" type="date" value={form.birthday} onChange={change('birthday')} />
            </div>
          </div>

          <div className="ui-card" style={{ marginTop: 'var(--sp-4)' }}>
            <h2 className="ui-card__title">Dados financeiros</h2>
            <p className="ui-card__subtitle">Alimentam o saldo, o orçamento e os alertas do painel.</p>
            <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
              <Field label="Rendimento mensal" type="number" min="0" step="0.01" hint={`Em ${symbol}`} value={form.monthlyIncome} onChange={change('monthlyIncome')} placeholder="2500.00" />
              <Field label="Orçamento mensal" type="number" min="0" step="0.01" hint="Quanto planeias gastar" value={form.monthlyExpenses} onChange={change('monthlyExpenses')} placeholder="1400.00" />
              <Field label="Despesas fixas" type="number" min="0" step="0.01" hint="Renda, contas, seguros" value={form.fixedExpenses} onChange={change('fixedExpenses')} placeholder="900.00" />
              <Field label="Meta de poupança" type="number" min="0" step="0.01" hint="Por mês" value={form.savingsTarget} onChange={change('savingsTarget')} placeholder="300.00" />
              <Field label="Moeda" as="select" value={form.currency} onChange={change('currency')}>
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Field>
              <Field label="Objetivo financeiro" as="select" value={form.financialGoal} onChange={change('financialGoal')}>
                <option value="">Sem objetivo definido</option>
                {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Field>
              <Field label="Situação profissional" as="select" value={form.employmentStatus} onChange={change('employmentStatus')}>
                <option value="">Não indicada</option>
                {EMPLOYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Field>
              <Field label="Experiência com orçamentos" as="select" value={form.budgetingExperience} onChange={change('budgetingExperience')}>
                <option value="">Não indicada</option>
                {EXPERIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Field>
            </div>
          </div>

          <Button type="submit" variant="primary" block className="mt-4" disabled={submitting}>
            {submitting ? 'A guardar…' : 'Guardar alterações'}
          </Button>
        </form>

        <section className="ui-section">
          <BudgetSettings symbol={symbol} />
        </section>

        <section className="ui-section">
          <PasswordChange />
        </section>
      </main>
    </div>
  );
}
