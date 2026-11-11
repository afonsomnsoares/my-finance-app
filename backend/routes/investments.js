const express = require('express');

const prisma = require('../lib/prisma');
const { plain } = prisma;
const { scopeToUser } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();
router.get('/', ah(async (req, res) => {
  const investments = await prisma.investment.findMany({
    where: scopeToUser(req),
    orderBy: { createdAt: 'desc' },
  });
  res.json(plain(investments));
}));

router.post('/', writeLimiter, validate({ body: schemas.investmentCreate }), ah(async (req, res) => {
  const investment = await prisma.investment.create({
    data: { ...req.body, userId: req.userId },
  });
  res.status(201).json(plain(investment));
}));

router.put('/:id',
  writeLimiter,
  validate({ params: schemas.idParam, body: schemas.investmentUpdate }),
  ah(async (req, res) => {
    const existing = await prisma.investment.findFirst({
      where: scopeToUser(req, { id: Number(req.params.id) }),
    });
    if (!existing) return res.status(404).json({ error: 'Investment not found.' });

    const updated = await prisma.investment.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json(plain(updated));
  })
);

router.delete('/:id', writeLimiter, validate({ params: schemas.idParam }), ah(async (req, res) => {
  const existing = await prisma.investment.findFirst({
    where: scopeToUser(req, { id: Number(req.params.id) }),
  });
  if (!existing) return res.status(404).json({ error: 'Investment not found.' });
  await prisma.investment.delete({ where: { id: existing.id } });
  res.json({ message: 'Investment deleted.' });
}));

module.exports = router;
