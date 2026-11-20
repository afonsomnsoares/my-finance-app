import axios from 'axios';

export const API_URL = '';

const CACHE_PREFIX = 'pf_cache_';

export const api = axios.create({
  baseURL: API_URL,

  withCredentials: true,
});

let onUnauthenticated = null;

export function setUnauthenticatedHandler(handler) {
  onUnauthenticated = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginAttempt = error.config?.url?.includes('/api/auth/login');

    if (status === 401 && !isLoginAttempt) {
      clearCache();
      onUnauthenticated?.();
    }
    return Promise.reject(error);
  }
);

export function clearCache() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(CACHE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
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

export { formatMoney, getCurrencySymbol } from './format';

import { toLocalDateKey } from './format';
