const express = require('express');

const prisma = require('../lib/prisma');
const { endOfLocalDay } = require('../lib/dates');
const { scopeToUser } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();

router.get('/', validate({ query: schemas.transactionQuery }), ah(async (req, res) => {
  const { from, to, category } = req.validatedQuery;
  const where = scopeToUser(req);

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = endOfLocalDay(to);
  }
  if (category) where.category = category;

  const transactions = await prisma.transaction.findMany({ where, orderBy: { date: 'desc' } });
  res.json(transactions);
}));

router.post('/', writeLimiter, validate({ body: schemas.transactionCreate }), ah(async (req, res) => {
  const { amount, category, description, date } = req.body;
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.userId,
      amount, category,
      description: description ?? null,
      date: date ?? new Date(),
    },
  });
  res.status(201).json(transaction);
}));

router.put('/:id',
  writeLimiter,
  validate({ params: schemas.idParam, body: schemas.transactionUpdate }),
  ah(async (req, res) => {
    /*
     * updateMany with a user-scoped where, rather than findFirst-then-update.
     * The two-step version wrote with `where: { id }` alone: correct only for
     * as long as nobody moved the ownership check. Here the ownership filter
     * is part of the write itself and cannot be separated from it.
     */
    const result = await prisma.transaction.updateMany({
      where: scopeToUser(req, { id: req.params.id }),
      data: req.body,
    });

    if (result.count === 0) return res.status(404).json({ error: 'Transaction not found.' });

    const transaction = await prisma.transaction.findFirst({
      where: scopeToUser(req, { id: req.params.id }),
    });
    res.json(transaction);
  })
);

router.delete('/:id', writeLimiter, validate({ params: schemas.idParam }), ah(async (req, res) => {
  const result = await prisma.transaction.deleteMany({
    where: scopeToUser(req, { id: req.params.id }),
  });
  if (result.count === 0) return res.status(404).json({ error: 'Transaction not found.' });
  res.json({ message: 'Transaction deleted.' });
}));

module.exports = router;
