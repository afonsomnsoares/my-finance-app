const express = require('express');

const prisma = require('../lib/prisma');
const { plain } = prisma;
const { logger } = require('../lib/logger');
const { monthRange, resolvePeriod, previousPeriod, localDateKey } = require('../lib/dates');
const { sumAmounts, totalsByCategory } = require('../lib/money');
const { scopeToUser } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../schemas');
const { USER_FIELDS } = require('./profile');
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

function splitByRange(rows, from, to) {
  return rows.filter((t) => {
    const d = new Date(t.date);
    return d >= from && d <= to;
  });
}

router.get('/reports', validate({ query: schemas.reportQuery }), ah(async (req, res) => {
  const { from, to, label } = resolvePeriod(req.validatedQuery);
  const prev = previousPeriod({ type: req.validatedQuery.type, from });

  const windowFrom = prev.from < from ? prev.from : from;
  const windowTo = prev.to > to ? prev.to : to;
  const windowTx = await userTransactionsInRange(req, windowFrom, windowTo);
  if (windowTx.length === REPORT_TX_CAP) {
    res.setHeader('X-Truncated', '1');
  }

  const transactions = splitByRange(windowTx, from, to)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const previousTransactions = splitByRange(windowTx, prev.from, prev.to);

  const totals = totalsByCategory(transactions);
  const counts = {};
  for (const t of transactions) counts[t.category] = (counts[t.category] || 0) + 1;

  const previousByCategory = totalsByCategory(previousTransactions);

  res.json({
    label, type: req.validatedQuery.type,
    total: sumAmounts(transactions),
    transactionCount: transactions.length,
    previousTotal: sumAmounts(previousTransactions),
    previousByCategory,
    truncated: windowTx.length === REPORT_TX_CAP,
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

  const windowTx = await userTransactionsInRange(req, prevMonth.from, month.to);
  const monthTx = splitByRange(windowTx, month.from, month.to);
  const prevMonthTx = splitByRange(windowTx, prevMonth.from, prevMonth.to);

  const spentThisMonth = sumAmounts(monthTx);
  const spentPrevMonth = sumAmounts(prevMonthTx);
  const income = user.monthlyIncome || 0;
  const savingsRate = income > 0 ? Math.round(((income - spentThisMonth) / income) * 100) : 0;
  const daysInMonth = month.to.getDate();
  const dayOfMonth = now.getDate();
  const projectedEndOfMonth = (spentThisMonth / Math.max(dayOfMonth, 1)) * daysInMonth;

  const current = totalsByCategory(monthTx);
  const previous = totalsByCategory(prevMonthTx);
  const categoryGrowth = [...new Set([...Object.keys(current), ...Object.keys(previous)])]
    .map((category) => ({ category, current: current[category] || 0, previous: previous[category] || 0 }));

  res.json({
    month: now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
    spentThisMonth, spentPrevMonth, income,
    savingsRate: Math.max(0, savingsRate),
    projectedEndOfMonth: Math.round(projectedEndOfMonth),
    budgetRemaining: Math.round((user.monthlyExpenses || 0) - spentThisMonth),
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

router.get('/reports/export', validate({ query: schemas.exportQuery }), ah(async (req, res) => {
  const { format } = req.validatedQuery;
  const { from, to, label } = resolvePeriod(req.validatedQuery);

  const transactions = await userTransactionsInRange(req, from, to);

  logger.info({ userId: req.userId, format, count: transactions.length }, 'report_exported');

  if (format === 'csv') {
    const header = 'Data,Categoria,Descrição,Valor\n';
    const rows = transactions.map((t) => [
      csvCell(localDateKey(t.date)),
      csvCell(t.category),
      csvCell(t.description || ''),
      t.amount.toFixed(2),
    ].join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="despesas-${safeFilename(label)}.csv"`);
    return res.send('﻿' + header + rows);
  }

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-${safeFilename(label)}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).font('Helvetica-Bold').text('Personal Finance', 40, 40);
  doc.fontSize(14).font('Helvetica').fillColor('#64748b').text(`Relatório — ${label}`, 40, 68);
  doc.moveDown(2);

  const total = sumAmounts(transactions);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(`Total: €${total.toFixed(2)}`, 40, doc.y);
  doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`${transactions.length} transações`, 40, doc.y + 2);
  doc.moveDown(1.5);

  const byCat = totalsByCategory(transactions);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Por Categoria:', 40, doc.y);
  doc.moveDown(0.5);
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a').text(`  ${cat}: €${val.toFixed(2)}`, 40, doc.y);
  });
  doc.moveDown(1.5);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Transações:', 40, doc.y);
  doc.moveDown(0.5);

  transactions.forEach((t) => {
    const d = localDateKey(t.date);
    doc.fontSize(8).font('Helvetica').fillColor('#0f172a')
      .text(`  ${d}  |  ${t.category}  |  ${t.description || '-'}  |  €${t.amount.toFixed(2)}`, 40, doc.y);
  });

  doc.end();
}));

module.exports = { router, csvCell, safeFilename };
