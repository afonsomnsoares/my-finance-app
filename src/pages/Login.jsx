import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiFileText, FiGrid, FiLogIn, FiRepeat, FiTrendingUp } from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { Button, Field } from '../components/ui';
import './App.css';

const AREAS = [
  { label: 'Painel', Icon: FiGrid },
  { label: 'Transações', Icon: FiRepeat },
  { label: 'Análises', Icon: FiBarChart2 },
  { label: 'Investimentos', Icon: FiTrendingUp },
  { label: 'Relatórios', Icon: FiFileText },
];

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
    <div className="login-page">
      <section className="login-intro">
        <p className="ui-eyebrow">Conta pessoal</p>
        <h1 className="login-intro__title">My Personal Finance</h1>
        <p className="login-intro__lead">
          Despesas, orçamentos e investimentos, no mesmo sítio em que os vês depois de entrar.
        </p>
        <ul className="login-intro__list">
          {AREAS.map(({ label, Icon }) => (
            <li key={label} className="login-intro__item">
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="login-main">
        <div className="login-panel">
          <header className="page-head">
            <div>
              <p className="ui-eyebrow">Sessão</p>
              <h2 className="page-title">Entrar</h2>
              <p className="page-subtitle">
                Utilizador e password da tua conta.
              </p>
            </div>
          </header>

          <div className="ui-card">
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
                  <div className="ui-alert ui-alert--danger mt-3" role="alert" style={{ marginBottom: 0 }}>
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
            </div>
        </div>
      </div>
    </div>
  );
}
