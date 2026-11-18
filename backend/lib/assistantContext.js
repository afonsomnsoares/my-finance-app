const { monthRange, localDateKey } = require('./dates');
const { sumAmounts, totalsByCategory } = require('./money');

const RECENT_LIMIT = 12;
const CATEGORY_LIMIT = 8;
const HOLDING_LIMIT = 20;

function inRange(rows, range) {
  return rows.filter((row) => {
    const date = new Date(row.date);
    return date >= range.from && date <= range.to;
  });
}

function buildSnapshot({ user, transactions, investments, now = new Date() }) {
  const month = monthRange(now.getFullYear(), now.getMonth());
  const previous = monthRange(now.getFullYear(), now.getMonth() - 1);
  const monthTx = inRange(transactions, month);
  const previousTx = inRange(transactions, previous);
  const byCategory = totalsByCategory(monthTx);

  return {
    currency: user.currency || 'EUR',
    month: month.from.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
    monthlyIncome: user.monthlyIncome ?? null,
    monthlyBudget: user.monthlyExpenses ?? null,
    savingsTarget: user.savingsTarget ?? null,
    financialGoal: user.financialGoal || null,
    spentThisMonth: sumAmounts(monthTx),
    spentPreviousMonth: sumAmounts(previousTx),
    transactionCountThisMonth: monthTx.length,
    spendingByCategory: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, CATEGORY_LIMIT)
      .map(([category, total]) => ({ category, total })),
    recentTransactions: [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, RECENT_LIMIT)
      .map((row) => ({
        date: localDateKey(row.date),
        category: row.category,
        amount: row.amount,
        description: String(row.description || '').slice(0, 80),
      })),
    investments: investments.slice(0, HOLDING_LIMIT).map((row) => ({
      name: row.name,
      type: row.type,
      quantity: row.amount,
      buyPrice: row.buyPrice,
      currency: row.currency,
    })),
  };
}

function systemPrompt(snapshot) {
  return [
    'És o Grok dentro da aplicação My Personal Finance.',
    'Responde em português, de forma curta e concreta.',
    'Usa apenas o JSON de factos abaixo. Se a resposta não estiver nesses factos, diz que não tens esse dado.',
    'Não inventes totais, percentagens nem preços de mercado.',
    'Não recomendes comprar ou vender ativos.',
    'Os montantes já estão na moeda indicada.',
    '',
    JSON.stringify(snapshot),
  ].join('\n');
}

module.exports = {
  buildSnapshot,
  systemPrompt,
  RECENT_LIMIT,
  CATEGORY_LIMIT,
  HOLDING_LIMIT,
};
