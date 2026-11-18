function toCents(value) {
  return Math.round(Number(value) * 100);
}

function roundMoney(value) {
  return toCents(value) / 100;
}

function sumAmounts(rows) {
  const cents = rows.reduce((sum, row) => sum + toCents(row.amount), 0);
  return cents / 100;
}

function totalsByCategory(rows) {
  const cents = {};
  for (const row of rows) {
    cents[row.category] = (cents[row.category] || 0) + toCents(row.amount);
  }
  const totals = {};
  for (const [category, totalCents] of Object.entries(cents)) {
    totals[category] = totalCents / 100;
  }
  return totals;
}

module.exports = { roundMoney, sumAmounts, totalsByCategory, toCents };
