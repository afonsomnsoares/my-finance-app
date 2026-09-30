/*
 * Every number the user reads is formatted here.
 *
 * Before this, the dashboard rendered "€1963.58" (toFixed, decimal point)
 * directly above "€177,99" (toLocaleString pt-PT, decimal comma) — the same
 * currency, two notations, one screen. Six different call sites each did their
 * own thing. One module, one set of rules.
 */

const LOCALE = 'pt-PT';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£' };

export function getCurrencySymbol(currency = 'EUR') {
  return CURRENCY_SYMBOLS[currency] || '€';
}

/*
 * Money, always with both decimals: "€1 963,58".
 *
 * The space before the symbol is what pt-PT uses for thousands (U+00A0), so
 * the group separator never looks like a second decimal mark.
 */
export function formatMoney(amount, symbol = '€', { decimals = 2 } = {}) {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  return `${symbol}${safe.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    // pt-PT groups only from five digits by default, which would print
    // "€1963,58" beside "€13 324,20". In a column of money that reads as a
    // mistake, so grouping is forced on.
    useGrouping: 'always',
  })}`;
}

/*
 * Money with an explicit sign, for gains and losses where "+" carries meaning.
 */
export function formatSignedMoney(amount, symbol = '€', options) {
  const n = Number(amount) || 0;
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatMoney(Math.abs(n), symbol, options)}`;
}

/*
 * Compact money for axis ticks, where the full number never fits:
 * 1 963 → "2k", 13 324 → "13k", 850 → "850".
 *
 * The old tick formatter divided by 1000 and rounded, so an axis running
 * 0–1000 printed "0k, 0k, 0k, 1k, 1k" — five ticks, two distinct labels.
 * Below 1000 the value is shown as-is instead.
 */
export function formatCompactMoney(value, symbol = '') {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';

  if (abs >= 1_000_000) return `${sign}${symbol}${trimZero(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${trimZero(abs / 1_000)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

// 1.0 → "1", 1.4 → "1,4"
function trimZero(n) {
  const rounded = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return rounded.toLocaleString(LOCALE, { maximumFractionDigits: 1 });
}

/*
 * Percentages. `decimals` defaults to 0 because a dashboard almost never
 * needs "34,7%" where "35%" says the same thing.
 */
export function formatPercent(value, { decimals = 0, signed = false } = {}) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const sign = signed && safe > 0 ? '+' : signed && safe < 0 ? '−' : '';
  return `${sign}${Math.abs(safe).toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/* ───────── Dates ───────── */

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

/*
 * "setembro de 2026" → "Setembro de 2026". Intl lowercases month names in
 * pt-PT; CSS text-transform: capitalize would also capitalise "De".
 */
export function formatMonthYear(date) {
  const text = formatDate(date, 'monthYear');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/*
 * Data local no formato "AAAA-MM-DD", sem passar pelo UTC.
 *
 * `date.toISOString().split('T')[0]` parece fazer isto, mas converte para UTC
 * primeiro. Em Portugal no horário de verão (UTC+1), a meia-noite local de
 * 1 de setembro é 31 de agosto às 23:00 em UTC — e o filtro "Este mês" passava
 * a incluir o último dia do mês anterior. Aqui os componentes são lidos no
 * fuso local, que é onde a data foi construída.
 */
export function toLocalDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
