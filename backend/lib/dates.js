const endOfDay = (y, m, d) => new Date(y, m, d, 23, 59, 59, 999);

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

function previousPeriod({ type, from }) {
  if (type === 'year') return yearRange(from.getFullYear() - 1);
  return monthRange(from.getFullYear(), from.getMonth() - 1);
}

function localDateKey(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function endOfLocalDay(date) {
  const d = new Date(date);
  return endOfDay(d.getFullYear(), d.getMonth(), d.getDate());
}

module.exports = { monthRange, yearRange, resolvePeriod, previousPeriod, localDateKey, endOfLocalDay };
