import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the app without crashing', () => {
  render(<App />);

  expect(document.body).toBeInTheDocument();
});

test('shows a 404 page for an unknown route', () => {
  window.history.pushState({}, '', '/rota-que-nao-existe');
  render(<App />);
  expect(screen.getByText('Erro 404')).toBeInTheDocument();
  expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
});
