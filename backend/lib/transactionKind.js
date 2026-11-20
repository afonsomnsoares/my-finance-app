function resolveTransactionKind(kind, category, fallback = 'expense') {
  if (kind === 'income' || category === 'Rendimento') return 'income';
  if (kind === 'expense') return 'expense';
  return fallback === 'income' ? 'income' : 'expense';
}

module.exports = { resolveTransactionKind };
