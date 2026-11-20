import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="auth-gate">
        <div className="auth-spinner" role="status" aria-label="A verificar sessão…" />
      </div>
    );
  }

  if (!isAuthenticated) {

    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
