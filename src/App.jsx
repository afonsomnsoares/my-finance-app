import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center" style={{ background: 'var(--surface-2)' }}>
      <h1 className="fw-bold" style={{ fontSize: 'var(--fs-3xl)', color: 'var(--text)' }}>404</h1>
      <p className="text-muted mb-4">Página não encontrada.</p>
      <a href="/app" className="btn btn-primary">Voltar ao Painel</a>
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
