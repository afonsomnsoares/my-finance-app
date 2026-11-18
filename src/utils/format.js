const LOCALE = 'pt-PT';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£' };

export function getCurrencySymbol(currency = 'EUR') {
  return CURRENCY_SYMBOLS[currency] || '€';
}

export function formatMoney(amount, symbol = '€', { decimals = 2 } = {}) {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  return `${symbol}${safe.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,

    useGrouping: 'always',
  })}`;
}

export function formatSignedMoney(amount, symbol = '€', options) {
  const n = Number(amount) || 0;
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatMoney(Math.abs(n), symbol, options)}`;
}

export function formatCompactMoney(value, symbol = '') {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';

  if (abs >= 1_000_000) return `${sign}${symbol}${trimZero(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${trimZero(abs / 1_000)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

function trimZero(n) {
  const rounded = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return rounded.toLocaleString(LOCALE, { maximumFractionDigits: 1 });
}

export function formatPercent(value, { decimals = 0, signed = false } = {}) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const sign = signed && safe > 0 ? '+' : signed && safe < 0 ? '−' : '';
  return `${sign}${Math.abs(safe).toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatDate(date, style = 'short') {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  const options = {
    short: { day: '2-digit', month: 'short' },
    full: { day: '2-digit', month: '2-digit', year: 'numeric' },
    monthYear: { month: 'long', year: 'numeric' },
    weekday: { weekday: 'short' },
    dayMonth: { day: '2-digit', month: 'short' },
  }[style];

  return d.toLocaleDateString(LOCALE, options);
}

export function formatMonthYear(date) {
  const text = formatDate(date, 'monthYear');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toLocalDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
