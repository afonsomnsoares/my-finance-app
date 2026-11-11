const express = require('express');

const prisma = require('../lib/prisma');
const { plain } = prisma;
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

  const budgets = plain(await prisma.categoryBudget.findMany({ where: scopeToUser(req) }));
  const monthTransactions = plain(await prisma.transaction.findMany({
    where: { ...scopeToUser(req), date: { gte: from, lte: to } },
  }));

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

  const saved = await prisma.$transaction(async (tx) => {
    const categories = budgets.map((item) => item.category);
    await tx.categoryBudget.deleteMany({
      where: { ...scopeToUser(req), category: { notIn: categories } },
    });
    const rows = [];
    for (const item of budgets) {
      rows.push(await tx.categoryBudget.upsert({
        where: { userId_category: { userId: req.userId, category: item.category } },
        update: { monthlyLimit: item.monthlyLimit },
        create: { userId: req.userId, category: item.category, monthlyLimit: item.monthlyLimit },
      }));
    }
    return rows;
  });

  res.json({ message: 'Budgets saved.', budgets: plain(saved) });
}));

router.delete('/:id', writeLimiter, validate({ params: schemas.idParam }), ah(async (req, res) => {
  const existing = await prisma.categoryBudget.findFirst({
    where: scopeToUser(req, { id: Number(req.params.id) }),
  });
  if (!existing) return res.status(404).json({ error: 'Budget not found.' });
  await prisma.categoryBudget.delete({ where: { id: existing.id } });
  res.json({ message: 'Budget deleted.' });
}));

module.exports = router;
