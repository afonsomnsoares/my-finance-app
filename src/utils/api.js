import axios from 'axios';

/*
 * Always same-origin. In production Express serves the built frontend; in
 * development Vite proxies /api to the backend (see vite.config.js). Pointing
 * the browser at a second origin would break the session cookie.
 */
export const API_URL = '';

const CACHE_PREFIX = 'pf_cache_';
const CACHE_TTL = 5 * 60 * 1000;

export const api = axios.create({
  baseURL: API_URL,
  // The session lives in an httpOnly cookie, which the browser only attaches
  // to cross-origin requests when explicitly asked. In development the app
  // runs on :3000 and the API on :5000, so without this every request would
  // arrive unauthenticated.
  withCredentials: true,
});

/*
 * Anything the app renders while offline is cached here, which means the
 * cache holds the same financial data the API does. It must not outlive the
 * session — see clearCache(), called on logout and on any 401.
 */
let onUnauthenticated = null;

export function setUnauthenticatedHandler(handler) {
  onUnauthenticated = handler;
}

/*
 * O cache offline só cobre o que faz sentido ler sem rede: o perfil, as
 * transações e os insights. As cotações de mercado ficavam também em
 * localStorage, onde envelheciam ao minuto — mostrar um preço de bolsa de há
 * uma hora como se fosse atual é pior do que não mostrar preço nenhum.
 */
const CACHEABLE = ['/api/me', '/api/transactions', '/api/insights', '/api/investments', '/api/budgets'];

const isCacheable = (url = '') => CACHEABLE.some((prefix) => url.startsWith(prefix));

api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get' && isCacheable(response.config.url)) {
      saveToCache(response.config.url, response.data);
    }
    return response;
  },
  (error) => {
    /*
     * A 401 means the session expired or was revoked server-side. Drop the
     * cached copy of the data it protected and let the app show the login
     * screen — otherwise the UI keeps rendering stale private data from
     * localStorage against a session that no longer exists.
     *
     * The login request itself is exempt: a wrong password is a 401 the form
     * needs to handle, not a session expiry.
     */
    const status = error.response?.status;
    const isLoginAttempt = error.config?.url?.includes('/api/auth/login');

    if (status === 401 && !isLoginAttempt) {
      clearCache();
      onUnauthenticated?.();
    }
    return Promise.reject(error);
  }
);

export function saveToCache(url, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + url, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore */ }
}

export function loadFromCache(url) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + url);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function clearCache() {
  Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => localStorage.removeItem(k));
}

export async function fetchWithCache(url) {
  if (!navigator.onLine) {
    const cached = loadFromCache(url);
    if (cached) return cached;
  }
  try {
    const { data } = await api.get(url);
    return data;
  } catch {
    const cached = loadFromCache(url);
    if (cached) return cached;
    throw new Error('No data available offline.');
  }
}

export const PERIOD_PRESETS = [
  { value: 'month', label: 'Este mês' },
  { value: 'year', label: 'Este ano' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: 'custom', label: 'Intervalo customizado' },
];

export function getDateRangeFromPreset(preset, customFrom, customTo) {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  switch (preset) {
    case 'month':
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    case 'year':
      return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
    case '30days': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 29);
      return { from, to: endOfDay(now) };
    }
    case 'custom':
      return { from: customFrom ? startOfDay(new Date(customFrom)) : null, to: customTo ? endOfDay(new Date(customTo)) : null };
    default:
      return { from: null, to: null };
  }
}

export function toDateParam(date) {
  if (!date) return '';
  // Ver toLocalDateKey: toISOString() converteria para UTC e recuaria um dia
  // em qualquer fuso a leste de Greenwich.
  return toLocalDateKey(date);
}

export function filterTransactions(transactions, { from, to, category }) {
  return transactions.filter((tx) => {
    const d = new Date(tx.date);
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (category && tx.category !== category) return false;
    return true;
  });
}

export function buildTransactionQuery({ preset, customFrom, customTo, category }) {
  const { from, to } = getDateRangeFromPreset(preset, customFrom, customTo);
  const params = new URLSearchParams();
  if (from) params.set('from', toDateParam(from));
  if (to) params.set('to', toDateParam(to));
  if (category) params.set('category', category);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/*
 * Re-exported so the many existing `import { formatMoney } from '../utils/api'`
 * keep working. The implementation lives in format.js — there is exactly one.
 */
export { formatMoney, getCurrencySymbol } from './format';

import { toLocalDateKey } from './format';
