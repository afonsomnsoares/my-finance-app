import { useState } from 'react';
import { FiKey } from 'react-icons/fi';
import { api } from '../utils/api';
import { Button, Field } from './ui';

/*
 * Mudar a password sem sair da aplicação.
 *
 * Até aqui só existia `npm run set-password`, um comando de terminal — o que
 * significava que mudar a password implicava ter acesso à shell do servidor.
 * Para uma app de utilizador único isso é um obstáculo desnecessário.
 */
export default function PasswordChange() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const change = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirm) {
      setError('As passwords novas não coincidem.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put('/api/profile/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(data.message);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(
        err.response?.data?.details?.[0]?.message
        || err.response?.data?.error
        || 'Não foi possível alterar a password.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="ui-card">
        <div className="ui-card__header">
          <div>
            <h2 className="ui-card__title">
              <FiKey size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} aria-hidden="true" />
              Password
            </h2>
            <p className="ui-card__subtitle">
              Mudar a password termina as sessões abertas noutros dispositivos.
            </p>
          </div>
        </div>

        {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}
        {success && <div className="ui-alert" role="status" style={{ marginBottom: 'var(--sp-4)', borderColor: 'var(--success)' }}>{success}</div>}

        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <Field
            label="Password atual"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={change('currentPassword')}
            required
          />
          <div className="ui-grid ui-grid--2">
            <Field
              label="Nova password"
              type="password"
              autoComplete="new-password"
              hint="Mínimo 12 caracteres"
              value={form.newPassword}
              onChange={change('newPassword')}
              required
            />
            <Field
              label="Confirmar nova password"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={change('confirm')}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="secondary"
          block
          className="mt-4"
          disabled={saving || !form.currentPassword || !form.newPassword || !form.confirm}
        >
          {saving ? 'A alterar…' : 'Alterar password'}
        </Button>
      </div>
    </form>
  );
}
