import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FiLock, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Field } from '../components/ui';

export default function Login() {
  const { login, isAuthenticated, checking } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/app';

  if (!checking && isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      /*
       * The server deliberately returns one message for every kind of failed
       * login, and the UI must not add detail it does not have. The only case
       * worth distinguishing is being rate limited, because the user needs to
       * know that waiting is the fix.
       */
      if (err.response?.status === 429) {
        setError('Demasiadas tentativas. Tenta novamente dentro de 15 minutos.');
      } else if (err.response?.status === 401) {
        setError('Credenciais inválidas.');
      } else {
        setError('Não foi possível iniciar sessão. Verifica se o servidor está a correr.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3" style={{ background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-soft)' }}
          >
            <FiLock size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="fw-bold mb-1" style={{ fontSize: 'var(--fs-xl)' }}>Personal Finance</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginBottom: 0 }}>
            Inicia sessão para continuar.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} noValidate>
            <Field
              label="Utilizador ou email"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />

            <div className="mt-3">
              <Field
                label="Password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="alert alert-danger mt-3 mb-0 py-2" role="alert" style={{ fontSize: 'var(--fs-sm)' }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              block
              className="mt-4"
              disabled={submitting || !username || !password}
              icon={<FiLogIn size={16} />}
            >
              {submitting ? 'A entrar…' : 'Entrar'}
            </Button>
          </form>
        </Card>

        <p className="text-center mt-3 mb-0" style={{ color: 'var(--text-subtle)', fontSize: 'var(--fs-2xs)', lineHeight: 1.6 }}>
          Primeira vez? Corre <code>npm run set-password</code> na pasta do projeto
          para criares a tua password.
        </p>
      </div>
    </div>
  );
}
