import { useEffect, useState } from 'react';
import { FiSave, FiSettings } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import AppShell from '../components/AppShell';
import BudgetSettings from '../components/BudgetSettings';
import PasswordChange from '../components/PasswordChange';
import StatementImport from '../components/StatementImport';
import { Button, Field } from '../components/ui';
import { api } from '../utils/api';
import { getCurrencySymbol } from '../utils/format';
import './App.css';

const CURRENCIES = [
  { value: 'EUR', label: 'EUR €' },
  { value: 'USD', label: 'USD $' },
  { value: 'GBP', label: 'GBP £' },
];

const EMPTY = {
  firstName: '', lastName: '', email: '', username: '',
  phoneNumber: '', birthday: '', currency: 'EUR', monthlyExpenses: '',
};

const fromUser = (u) => ({
  firstName: u.firstName ?? '',
  lastName: u.lastName ?? '',
  email: u.email ?? '',
  username: u.username ?? '',
  phoneNumber: u.phoneNumber ?? '',
  birthday: u.birthday ? String(u.birthday).slice(0, 10) : '',
  currency: u.currency || 'EUR',
  monthlyExpenses: u.monthlyExpenses ?? '',
});

function initials(form) {
  const first = form?.firstName || form?.username || '';
  const last = form?.lastName || '';
  return (`${first.charAt(0)}${last.charAt(0)}`.toUpperCase()) || 'PF';
}

export default function Profile() {
  const navigate = useNavigate();
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
      const payload = {
        ...form,
        monthlyExpenses: form.monthlyExpenses === '' ? undefined : Number(form.monthlyExpenses),
      };
      const { data } = await api.put('/api/profile', payload);
      setForm(fromUser(data.user));
      setSuccess('Definições guardadas.');
    } catch (err) {
      setError(
        err.response?.data?.details?.[0]
          ? `${err.response.data.details[0].field}: ${err.response.data.details[0].message}`
          : err.response?.data?.error || 'Não foi possível atualizar as definições.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form) {
    return (
      <AppShell>
        <div className="ui-card"><div className="ui-empty">A carregar…</div></div>
      </AppShell>
    );
  }

  const symbol = getCurrencySymbol(form.currency);
  const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ') || form.username || 'A minha conta';

  return (
    <AppShell>
      <header className="page-head">
        <div className="page-identity">
          <span
            className="avatar"
            aria-hidden="true"
            style={{ width: 54, height: 54, fontSize: 'var(--fs-base)' }}
          >
            {initials(form)}
          </span>
          <div>
            <span className="ui-eyebrow">
              <FiSettings size={12} style={{ marginRight: 4 }} aria-hidden="true" />Conta
            </span>
            <h1 className="page-title">{displayName}</h1>
            <p className="page-subtitle">
              {form.email || 'Sem email definido'} — perfil, orçamento e segurança
            </p>
          </div>
        </div>
      </header>

      {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}
      {success && <div className="ui-alert" role="status" style={{ marginBottom: 'var(--sp-4)', borderColor: 'var(--success)' }}>{success}</div>}

      <div className="profile-layout">
        <div className="profile-layout__main">
          <form onSubmit={handleSubmit} id="conta">
            <div className="ui-card">
              <h2 className="ui-card__title">Conta</h2>
              <p className="ui-card__subtitle">Dados pessoais e moeda da aplicação.</p>
              <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
                <Field label="Nome" value={form.firstName} onChange={change('firstName')} autoComplete="given-name" />
                <Field label="Apelido" value={form.lastName} onChange={change('lastName')} autoComplete="family-name" />
                <Field label="Email" type="email" value={form.email} onChange={change('email')} autoComplete="email" />
                <Field label="Utilizador" value={form.username} onChange={change('username')} hint="Usado para iniciar sessão" autoComplete="username" />
                <Field label="Telefone" type="tel" value={form.phoneNumber} onChange={change('phoneNumber')} autoComplete="tel" />
                <Field label="Data de nascimento" type="date" value={form.birthday} onChange={change('birthday')} />
                <Field label="Moeda" as="select" value={form.currency} onChange={change('currency')}>
                  {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Field>
              </div>
            </div>

            <div className="ui-card" style={{ marginTop: 'var(--sp-4)' }} id="orcamento-mensal">
              <h2 className="ui-card__title">Orçamento mensal</h2>
              <p className="ui-card__subtitle">
                Teto global de gastos do mês. Alimenta alertas e o “orçamento restante” — o saldo continua a usar só as entradas registadas.
              </p>
              <div className="ui-grid ui-grid--2" style={{ marginTop: 'var(--sp-4)' }}>
                <Field
                  label="Orçamento mensal"
                  type="number"
                  min="0"
                  step="0.01"
                  hint="Quanto planeias gastar este mês"
                  value={form.monthlyExpenses}
                  onChange={change('monthlyExpenses')}
                  placeholder="1400.00"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              block
              style={{ marginTop: 'var(--sp-5)' }}
              disabled={submitting}
              icon={<FiSave size={15} />}
            >
              {submitting ? 'A guardar…' : 'Guardar alterações'}
            </Button>
          </form>

          <div id="banco" className="ui-card" style={{ marginTop: 'var(--sp-5)' }}>
            <h2 className="ui-card__title">Banco</h2>
            <p className="ui-card__subtitle">
              Liga a conta através do extrato: PDF Santander ou CSV com colunas Data, Descrição e Montante (ou Débito/Crédito).
              Despesas e ordenados entram como movimentos reais.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
              <StatementImport
                symbol={symbol}
                variant="primary"
                label="Importar PDF ou CSV"
                onImported={() => navigate('/app/expenses')}
              />
            </div>
          </div>

          <div id="orcamentos" style={{ marginTop: 'var(--sp-5)' }}>
            <BudgetSettings symbol={symbol} />
          </div>
        </div>

        <div className="profile-layout__side" id="seguranca">
          <PasswordChange />
        </div>
      </div>
    </AppShell>
  );
}
