const express = require('express');

const prisma = require('../lib/prisma');
const { monthRange } = require('../lib/dates');
const { roundMoney, totalsByCategory } = require('../lib/money');
const { scopeToUser } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();

router.get('/', ah(async (req, res) => {
  const now = new Date();
  const { from, to } = monthRange(now.getFullYear(), now.getMonth());

  const [budgets, monthTransactions] = await Promise.all([
    prisma.categoryBudget.findMany({ where: scopeToUser(req), orderBy: { category: 'asc' } }),
    prisma.transaction.findMany({
      where: scopeToUser(req, { date: { gte: from, lte: to } }),
      select: { amount: true, category: true },
    }),
  ]);

  const spentByCategory = totalsByCategory(monthTransactions);

  const status = budgets.map((b) => {
    const spent = spentByCategory[b.category] || 0;
    const percent = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
    return {
      id: b.id, category: b.category, monthlyLimit: b.monthlyLimit, spent,
      remaining: roundMoney(b.monthlyLimit - spent), percent, exceeded: spent > b.monthlyLimit,
    };
  });

  res.json({ budgets: status });
}));

router.put('/', writeLimiter, validate({ body: schemas.budgetsUpdate }), ah(async (req, res) => {
  const { budgets } = req.body;

  await prisma.$transaction(
    budgets.map((item) =>
      prisma.categoryBudget.upsert({
        where: { userId_category: { userId: req.userId, category: item.category } },
        create: { userId: req.userId, category: item.category, monthlyLimit: item.monthlyLimit },
        update: { monthlyLimit: item.monthlyLimit },
      })
    )
  );

  const updated = await prisma.categoryBudget.findMany({
    where: scopeToUser(req), orderBy: { category: 'asc' },
  });
  res.json({ message: 'Budgets saved.', budgets: updated });
}));

router.delete('/:id', writeLimiter, validate({ params: schemas.idParam }), ah(async (req, res) => {
  const result = await prisma.categoryBudget.deleteMany({
    where: scopeToUser(req, { id: req.params.id }),
  });
  if (result.count === 0) return res.status(404).json({ error: 'Budget not found.' });
  res.json({ message: 'Budget deleted.' });
}));

module.exports = router;
