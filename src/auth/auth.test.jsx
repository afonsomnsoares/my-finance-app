import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/*
 * The api module is mocked at the transport level only: `api.get`/`api.post`
 * are fakes, but the real cache helpers and formatters stay, so the pages
 * under test behave as they do in the app.
 */
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../utils/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: { get: mockGet, post: mockPost, defaults: { baseURL: '' } },
  };
});

const loggedOut = { data: { authenticated: false } };

/*
 * Once login succeeds the app navigates to the dashboard, which immediately
 * fetches its own data. Routing the mock by URL keeps those requests from
 * returning a session payload where the dashboard expects a list.
 */
function routeByUrl(sessionResponse) {
  return (url) => {
    if (url === '/api/auth/session') return Promise.resolve(sessionResponse);
    if (url.startsWith('/api/transactions')) return Promise.resolve({ data: [] });
    if (url.startsWith('/api/me')) return Promise.resolve({ data: { currency: 'EUR', firstName: 'Afonso' } });
    if (url.startsWith('/api/insights')) return Promise.resolve({ data: null });
    if (url.startsWith('/api/budgets')) return Promise.resolve({ data: { budgets: [] } });
    if (url.startsWith('/api/investments')) return Promise.resolve({ data: [] });
    if (url.startsWith('/api/market')) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.pushState({}, '', '/');
  mockGet.mockImplementation(routeByUrl(loggedOut));
});

describe('route protection', () => {
  test('a protected route sends a signed-out visitor to the login page', async () => {
    window.history.pushState({}, '', '/app/investments');

    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /personal finance/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/utilizador ou email/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  test('the session is confirmed with the server, not read from storage', async () => {
    window.history.pushState({}, '', '/app');

    const { default: App } = await import('../App');
    render(<App />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/auth/session'));
  });

  test('a failed session check is treated as signed out', async () => {
    mockGet.mockImplementation(() => Promise.reject(new Error('network down')));
    window.history.pushState({}, '', '/app');

    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
  });
});

describe('login form', () => {
  test('submits the typed credentials', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ data: { id: 1, username: 'afonso', firstName: 'Afonso' } });
    window.history.pushState({}, '', '/login');

    const { default: App } = await import('../App');
    render(<App />);

    await user.type(await screen.findByLabelText(/utilizador ou email/i), 'afonso');
    await user.type(screen.getByLabelText(/password/i), 'uma-password-longa');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
      username: 'afonso',
      password: 'uma-password-longa',
    }));
  });

  test('shows one generic message for rejected credentials', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue({ response: { status: 401 } });
    window.history.pushState({}, '', '/login');

    const { default: App } = await import('../App');
    render(<App />);

    await user.type(await screen.findByLabelText(/utilizador ou email/i), 'afonso');
    await user.type(screen.getByLabelText(/password/i), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Credenciais inválidas.');
    // Nothing that hints at whether the account exists.
    expect(alert).not.toHaveTextContent(/utilizador|conta|existe/i);
  });

  test('tells the user to wait when rate limited', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue({ response: { status: 429 } });
    window.history.pushState({}, '', '/login');

    const { default: App } = await import('../App');
    render(<App />);

    await user.type(await screen.findByLabelText(/utilizador ou email/i), 'afonso');
    await user.type(screen.getByLabelText(/password/i), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/15 minutos/);
  });

  test('the password field is a password input and is not autofilled into the URL', async () => {
    window.history.pushState({}, '', '/login');

    const { default: App } = await import('../App');
    render(<App />);

    const field = await screen.findByLabelText(/password/i);
    expect(field).toHaveAttribute('type', 'password');
    expect(field.closest('form')).not.toHaveAttribute('method', 'get');
  });
});

describe('cached data', () => {
  test('a 401 from any request clears locally cached financial data', async () => {
    const { clearCache, saveToCache, loadFromCache } = await import('../utils/api');

    saveToCache('/api/transactions', [{ id: 1, amount: 42 }]);
    expect(loadFromCache('/api/transactions')).toEqual([{ id: 1, amount: 42 }]);

    clearCache();
    expect(loadFromCache('/api/transactions')).toBeNull();
  });
});
