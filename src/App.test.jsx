import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the app without crashing', () => {
  render(<App />);
  // The router should redirect "/" to "/app", which shows the dashboard shell.
  // We don't assert on live data (no backend in the test environment) — just
  // that the app mounts and the router renders something.
  expect(document.body).toBeInTheDocument();
});

test('shows a 404 page for an unknown route', () => {
  window.history.pushState({}, '', '/rota-que-nao-existe');
  render(<App />);
  expect(screen.getByText('404')).toBeInTheDocument();
  expect(screen.getByText('Página não encontrada.')).toBeInTheDocument();
});
