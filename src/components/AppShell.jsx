import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiBarChart2, FiChevronDown, FiChevronRight, FiDownload, FiFileText,
  FiGrid, FiLogOut, FiMenu, FiPlus, FiRepeat, FiSearch, FiSettings,
  FiTrendingUp,
} from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';

const PRIMARY = [
  { to: '/app', label: 'Painel', Icon: FiGrid },
  { to: '/app/analytics', label: 'Análises', Icon: FiBarChart2 },
];

const TRANSACTIONS = [
  { to: '/app/expenses', label: 'Todas as transações' },
  { to: '/app/expenses?new=1', label: 'Nova despesa' },
];

const MANAGEMENT = [
  { to: '/app/investments', label: 'Investimentos', Icon: FiTrendingUp },
  { to: '/app/reports', label: 'Relatórios', Icon: FiFileText },
];

const CRUMBS = {
  '/app': 'Visão geral',
  '/app/expenses': 'Transações',
  '/app/analytics': 'Análises',
  '/app/investments': 'Investimentos',
  '/app/reports': 'Relatórios',
  '/app/profile': 'Perfil',
};

function initials(user) {
  const first = user?.firstName || user?.username || '';
  const last = user?.lastName || '';
  const letters = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return letters || 'PF';
}

/*
 * Moldura comum a todas as páginas autenticadas.
 *
 * Substitui a barra horizontal antiga por uma barra lateral fixa dentro de uma
 * moldura arredondada — a estrutura do design de referência. Em ecrãs estreitos
 * a barra lateral passa a painel deslizante.
 */
export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(true);
  const [term, setTerm] = useState('');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const crumb = CRUMBS[pathname] || 'Visão geral';
  const onExpenses = pathname === '/app/expenses';

  const handleSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/app/expenses?q=${encodeURIComponent(q)}` : '/app/expenses');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const linkClass = (to, exact = true) => {
    const active = exact ? pathname === to : pathname.startsWith(to);
    return `sidebar__link${active ? ' sidebar__link--active' : ''}`;
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        <aside className={`sidebar${menuOpen ? ' sidebar--open' : ''}`} aria-label="Navegação principal">
          <div className="sidebar__brand">
            <Link to="/app" className="sidebar__wordmark">My Personal Finance</Link>
            <button
              type="button"
              className="sidebar__collapse"
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          <nav className="sidebar__nav">
            <span className="sidebar__section">Principal</span>
            {PRIMARY.map(({ to, label, Icon }) => (
              <Link key={to} to={to} className={linkClass(to)} aria-current={pathname === to ? 'page' : undefined}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}

            <button
              type="button"
              className={`sidebar__link${onExpenses ? ' sidebar__link--active' : ''}`}
              onClick={() => setTxOpen((open) => !open)}
              aria-expanded={txOpen}
            >
              <FiRepeat size={17} aria-hidden="true" />
              <span>Transações</span>
              <FiChevronDown size={14} className={`sidebar__chevron${txOpen ? ' sidebar__chevron--open' : ''}`} aria-hidden="true" />
            </button>

            {txOpen && (
              <div className="sidebar__sub">
                {TRANSACTIONS.map(({ to, label }) => (
                  <Link
                    key={label}
                    to={to}
                    className={`sidebar__sublink${to === '/app/expenses' && onExpenses ? ' sidebar__sublink--active' : ''}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}

            <span className="sidebar__section">Gestão</span>
            {MANAGEMENT.map(({ to, label, Icon }) => (
              <Link key={to} to={to} className={linkClass(to)} aria-current={pathname === to ? 'page' : undefined}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}

            <span className="sidebar__section">Conta</span>
            <Link to="/app/profile" className={linkClass('/app/profile')} aria-current={pathname === '/app/profile' ? 'page' : undefined}>
              <FiSettings size={17} aria-hidden="true" />
              <span>Definições</span>
              <span className="sidebar__dot" aria-hidden="true" />
            </Link>
          </nav>

          <div className="sidebar__user">
            <Link to="/app/profile" className="sidebar__user-link">
              <span className="avatar" aria-hidden="true">{initials(user)}</span>
              <span className="sidebar__user-body">
                <span className="sidebar__user-name">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'A minha conta'}
                </span>
                <span className="sidebar__user-email">{user?.email || 'Sessão iniciada'}</span>
              </span>
            </Link>
            <button
              type="button"
              className="sidebar__logout"
              onClick={handleLogout}
              aria-label="Terminar sessão"
              title="Terminar sessão"
            >
              <FiLogOut size={15} />
            </button>
          </div>
        </aside>

        <div
          className={`shell-overlay${menuOpen ? ' shell-overlay--open' : ''}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        <div className="shell-main">
          <header className="topbar">
            <button
              type="button"
              className="topbar__menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <FiMenu size={18} />
            </button>

            <div className="topbar__crumbs">
              <span>Finanças</span>
              <FiChevronRight size={12} aria-hidden="true" />
              <strong>{crumb}</strong>
            </div>

            <span className="topbar__spacer" />

            <form className="topbar__search" onSubmit={handleSearch} role="search">
              <FiSearch size={14} aria-hidden="true" />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Pesquisar transações…"
                aria-label="Pesquisar transações"
              />
            </form>

            <Link to="/app/reports" className="topbar__action">
              <FiDownload size={15} aria-hidden="true" />
              <span>Exportar</span>
            </Link>

            <Link to="/app/expenses?new=1" className="topbar__cta">
              <FiPlus size={15} aria-hidden="true" />
              <span>Nova transação</span>
            </Link>

            <div className="topbar__avatars">
              <Link to="/app/profile" className="avatar" title="Perfil" aria-label="Abrir perfil">
                {initials(user)}
              </Link>
              <Link to="/app/profile" className="topbar__more" title="Conta" aria-label="Conta">
                <FiSettings size={14} />
              </Link>
            </div>
          </header>

          <main className="shell-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
