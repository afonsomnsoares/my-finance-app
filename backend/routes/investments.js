const express = require('express');

const prisma = require('../lib/prisma');
const { scopeToUser } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();

router.get('/', ah(async (req, res) => {
  const investments = await prisma.investment.findMany({
    where: scopeToUser(req), orderBy: { createdAt: 'desc' },
  });
  res.json(investments);
}));

router.post('/', writeLimiter, validate({ body: schemas.investmentCreate }), ah(async (req, res) => {
  const investment = await prisma.investment.create({
    data: { ...req.body, userId: req.userId },
  });
  res.status(201).json(investment);
}));

router.put('/:id',
  writeLimiter,
  validate({ params: schemas.idParam, body: schemas.investmentUpdate }),
  ah(async (req, res) => {
    const result = await prisma.investment.updateMany({
      where: scopeToUser(req, { id: req.params.id }),
      data: req.body,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Investment not found.' });

    const investment = await prisma.investment.findFirst({
      where: scopeToUser(req, { id: req.params.id }),
    });
    res.json(investment);
  })
);

router.delete('/:id', writeLimiter, validate({ params: schemas.idParam }), ah(async (req, res) => {
  const result = await prisma.investment.deleteMany({
    where: scopeToUser(req, { id: req.params.id }),
  });
  if (result.count === 0) return res.status(404).json({ error: 'Investment not found.' });
  res.json({ message: 'Investment deleted.' });
}));

module.exports = router;
