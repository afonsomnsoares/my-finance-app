const express = require('express');

const prisma = require('../lib/prisma');
const { plain } = prisma;
const { logger } = require('../lib/logger');
const { monthRange, resolvePeriod, previousPeriod, localDateKey } = require('../lib/dates');
const { sumExpenses, sumIncome, savingsRate, totalsByCategory, roundMoney } = require('../lib/money');
const { scopeToUser } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();

const REPORT_TX_CAP = 10_000;

async function userTransactionsInRange(req, from, to) {
  return plain(await prisma.transaction.findMany({
    where: scopeToUser(req, { date: { gte: from, lte: to } }),
    orderBy: { date: 'desc' },
    take: REPORT_TX_CAP,
  }));
}

router.get('/reports', validate({ query: schemas.reportQuery }), ah(async (req, res) => {
  const { from, to, label } = resolvePeriod(req.validatedQuery);
  const prev = previousPeriod({ type: req.validatedQuery.type, from });

  const [transactions, previousTransactions] = await Promise.all([
    userTransactionsInRange(req, from, to),
    userTransactionsInRange(req, prev.from, prev.to),
  ]);
  const truncated = transactions.length === REPORT_TX_CAP || previousTransactions.length === REPORT_TX_CAP;
  if (truncated) res.setHeader('X-Truncated', '1');

  const spending = transactions.filter((row) => row.kind !== 'income');
  const previousSpending = previousTransactions.filter((row) => row.kind !== 'income');

  const totals = totalsByCategory(spending);
  const counts = {};
  for (const t of spending) counts[t.category] = (counts[t.category] || 0) + 1;

  const previousByCategory = totalsByCategory(previousSpending);

  res.json({
    label, type: req.validatedQuery.type,
    total: sumExpenses(transactions),
    income: sumIncome(transactions),
    transactionCount: transactions.length,
    expenseCount: spending.length,
    previousTotal: sumExpenses(previousTransactions),
    previousByCategory,
    truncated,
    byCategory: Object.keys(totals)
      .map((category) => ({
        category, total: totals[category], count: counts[category],
        previous: previousByCategory[category] || 0,
      }))
      .sort((a, b) => b.total - a.total),
    transactions,
  });
}));

router.get('/insights', ah(async (req, res) => {
  const user = plain(await prisma.user.findUnique({ where: { id: req.userId } }));
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const now = new Date();
  const month = monthRange(now.getFullYear(), now.getMonth());
  const prevMonth = monthRange(now.getFullYear(), now.getMonth() - 1);

  const [monthTx, prevMonthTx] = await Promise.all([
    userTransactionsInRange(req, month.from, month.to),
    userTransactionsInRange(req, prevMonth.from, prevMonth.to),
  ]);

  const spentThisMonth = sumExpenses(monthTx);
  const spentPrevMonth = sumExpenses(prevMonthTx);
  const income = sumIncome(monthTx);
  const daysInMonth = month.to.getDate();
  const dayOfMonth = now.getDate();
  const projectedEndOfMonth = (spentThisMonth / Math.max(dayOfMonth, 1)) * daysInMonth;

  const current = totalsByCategory(monthTx.filter((row) => row.kind !== 'income'));
  const previous = totalsByCategory(prevMonthTx.filter((row) => row.kind !== 'income'));
  const categoryGrowth = [...new Set([...Object.keys(current), ...Object.keys(previous)])]
    .map((category) => ({ category, current: current[category] || 0, previous: previous[category] || 0 }));

  res.json({
    month: now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
    spentThisMonth, spentPrevMonth, income,
    savingsRate: savingsRate(income, spentThisMonth),
    projectedEndOfMonth: roundMoney(projectedEndOfMonth),
    budgetRemaining: roundMoney((user.monthlyExpenses || 0) - spentThisMonth),
    transactionCount: monthTx.length,
    daysUntilEnd: daysInMonth - dayOfMonth,
    topCategory: categoryGrowth.sort((a, b) => b.current - a.current)[0] || null,
  });
}));

function csvCell(value) {
  const text = String(value ?? '');
  const escaped = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${escaped.replace(/"/g, '""')}"`;
}

function safeFilename(label) {
  return label.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'relatorio';
}

router.get('/reports/export', validate({ query: schemas.reportQuery }), ah(async (req, res) => {
  const { from, to, label } = resolvePeriod(req.validatedQuery);

  const transactions = await userTransactionsInRange(req, from, to);

  logger.info({ userId: req.userId, format: 'csv', count: transactions.length }, 'report_exported');

    const header = 'Data,Categoria,Descrição,Valor,Tipo\n';
    const rows = transactions.map((t) => [
      csvCell(localDateKey(t.date)),
      csvCell(t.category),
      csvCell(t.description || ''),
      t.amount.toFixed(2),
      csvCell(t.kind === 'income' ? 'Entrada' : 'Despesa'),
    ].join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="despesas-${safeFilename(label)}.csv"`);
  res.send('﻿' + header + rows);
}));

module.exports = { router, csvCell, safeFilename };
