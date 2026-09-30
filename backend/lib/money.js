/*
 * Aggregation helpers. Amounts arrive as JS numbers (see lib/prisma.js), so
 * every total is rounded to the cent once, at the end, rather than carrying
 * float residue like 0.30000000000000004 into the response.
 */

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function sumAmounts(rows) {
  return roundMoney(rows.reduce((s, r) => s + r.amount, 0));
}

// { [category]: total }, each total rounded.
function totalsByCategory(rows) {
  const totals = {};
  for (const r of rows) totals[r.category] = (totals[r.category] || 0) + r.amount;
  for (const k of Object.keys(totals)) totals[k] = roundMoney(totals[k]);
  return totals;
}

module.exports = { roundMoney, sumAmounts, totalsByCategory };
