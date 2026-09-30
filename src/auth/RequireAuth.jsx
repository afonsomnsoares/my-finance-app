import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/*
 * Route guard. Renders nothing decisive until the session check has finished,
 * so a slow check does not flash the login page at someone who is signed in.
 *
 * This is convenience, not security: the server rejects every unauthenticated
 * request regardless of what the router decides to render.
 */
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
    // `state.from` lets the login page send the user back where they meant to go.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
