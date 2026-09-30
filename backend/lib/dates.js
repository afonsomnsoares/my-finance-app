/*
 * Calendar arithmetic for reports, budgets and insights.
 *
 * Everything here uses the process's local time zone, which lib/env.js pins
 * to APP_TIMEZONE at boot. Without that pin, "September" meant September in
 * whatever zone the server happened to run in: on a UTC host, an expense
 * logged at 00:30 on 1 October in Lisbon (23:30 UTC on 30 September) was
 * counted in the wrong month.
 */

const endOfDay = (y, m, d) => new Date(y, m, d, 23, 59, 59, 999);

// `monthIndex` is 0-based, like Date. Overflow is fine: (2026, -1) is Dec 2025.
function monthRange(year, monthIndex) {
  const from = new Date(year, monthIndex, 1);
  return { from, to: endOfDay(from.getFullYear(), from.getMonth() + 1, 0) };
}

function yearRange(year) {
  return { from: new Date(year, 0, 1), to: endOfDay(year, 11, 31) };
}

function resolvePeriod({ type, year, month }, now = new Date()) {
  const y = year ?? now.getFullYear();

  if (type === 'year') {
    return { ...yearRange(y), label: `Ano ${y}` };
  }

  const range = monthRange(y, month ? month - 1 : now.getMonth());
  return {
    ...range,
    label: range.from.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
  };
}

/*
 * O período imediatamente anterior ao pedido, para o relatório poder dizer
 * "mais 12% do que em agosto" em vez de apresentar um número sem referência.
 */
function previousPeriod({ type, from }) {
  if (type === 'year') return yearRange(from.getFullYear() - 1);
  return monthRange(from.getFullYear(), from.getMonth() - 1);
}

/*
 * Data local em "AAAA-MM-DD".
 *
 * `toISOString().split('T')[0]` converte para UTC primeiro, por isso uma
 * transação registada às 00:30 de 2 de setembro em Lisboa (UTC+1) saía no CSV
 * como 1 de setembro. O ficheiro exportado tem de mostrar a mesma data que o
 * ecrã mostra.
 */
function localDateKey(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The last millisecond of the local day `date` falls on.
function endOfLocalDay(date) {
  const d = new Date(date);
  return endOfDay(d.getFullYear(), d.getMonth(), d.getDate());
}

module.exports = { monthRange, yearRange, resolvePeriod, previousPeriod, localDateKey, endOfLocalDay };
