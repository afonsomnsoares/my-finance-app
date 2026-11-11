import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import Login from './pages/Login';
import AppPage from './pages/App';
import Analytics from './pages/Analytics';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Investments from './pages/Investments';
import Profile from './pages/Profile';

function NotFound() {
  return (
    <div className="login-page login-page--center">
      <div className="ui-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <span className="ui-eyebrow">Erro 404</span>
        <h1 className="page-title" style={{ fontSize: 'var(--fs-3xl)' }}>Página não encontrada</h1>
        <p className="page-subtitle" style={{ marginBottom: 'var(--sp-5)' }}>
          O endereço que abriste não existe nesta aplicação.
        </p>
        <Link to="/app" className="ui-btn ui-btn--primary ui-btn--block">Voltar ao painel</Link>
      </div>
    </div>
  );
}

/*
 * Every route that renders financial data sits behind <RequireAuth>. The
 * guard only decides what to render — the API rejects unauthenticated
 * requests on its own, so a tampered-with router gains nothing.
 */
const protectedRoutes = [
  { path: '/app', element: <AppPage /> },
  { path: '/app/analytics', element: <Analytics /> },
  { path: '/app/expenses', element: <Expenses /> },
  { path: '/app/reports', element: <Reports /> },
  { path: '/app/investments', element: <Investments /> },
  { path: '/app/profile', element: <Profile /> },
];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<Login />} />

          {protectedRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={<RequireAuth>{element}</RequireAuth>} />
          ))}

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
