import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg)' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">A verificar sessão…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {

    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
