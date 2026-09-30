import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiGrid, FiBarChart2, FiDollarSign, FiFileText, FiTrendingUp, FiUser, FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';

const LINKS = [
  { to: '/app', label: 'Painel', Icon: FiGrid },
  { to: '/app/expenses', label: 'Despesas', Icon: FiDollarSign },
  { to: '/app/analytics', label: 'Análises', Icon: FiBarChart2 },
  { to: '/app/investments', label: 'Investimentos', Icon: FiTrendingUp },
  { to: '/app/reports', label: 'Relatórios', Icon: FiFileText },
  { to: '/app/profile', label: 'Perfil', Icon: FiUser },
];

/*
 * Era `navbar-light bg-white` numa app inteiramente escura, e os seis links
 * quebravam para três linhas no telemóvel. Passa a ser uma barra própria que
 * desliza horizontalmente em ecrãs estreitos.
 */
export default function DashboardNavbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="appbar">
      <div className="appbar__inner">
        <Link to="/app" className="appbar__brand">Personal&nbsp;Finance</Link>

        <nav className="appbar__nav" aria-label="Navegação principal">
          {LINKS.map(({ to, label, Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`appbar__link${active ? ' appbar__link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <button type="button" onClick={handleLogout} className="appbar__logout" title="Terminar sessão">
          <FiLogOut size={15} aria-hidden="true" />
          <span className="appbar__logout-text">Sair</span>
        </button>
      </div>
    </header>
  );
}
