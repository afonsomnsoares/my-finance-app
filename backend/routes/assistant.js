const express = require('express');

const prisma = require('../lib/prisma');
const { plain } = prisma;
const { monthRange } = require('../lib/dates');
const { complete, GrokError } = require('../lib/grok');
const { buildSnapshot, systemPrompt, RECENT_LIMIT, HOLDING_LIMIT } = require('../lib/assistantContext');
const { scopeToUser } = require('../middleware/auth');
const { assistantLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();

router.post('/assistant', assistantLimiter, validate({ body: schemas.assistantChat }), ah(async (req, res) => {
  const user = plain(await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      currency: true,
      monthlyIncome: true,
      monthlyExpenses: true,
      savingsTarget: true,
      financialGoal: true,
    },
  }));
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const now = new Date();
  const previous = monthRange(now.getFullYear(), now.getMonth() - 1);

  // Bound the ledger load: two months for totals + a short recent list.
  // Hard cap on the two-month window so a stuffed ledger cannot blow memory
  // on every chat turn. Snapshot output to xAI stays smaller still.
  const MONTH_WINDOW_CAP = 2000;

  const [monthWindow, recent, investments] = await Promise.all([
    plain(await prisma.transaction.findMany({
      where: scopeToUser(req, { date: { gte: previous.from } }),
      orderBy: { date: 'desc' },
      take: MONTH_WINDOW_CAP,
    })),
    plain(await prisma.transaction.findMany({
      where: scopeToUser(req),
      orderBy: { date: 'desc' },
      take: RECENT_LIMIT,
    })),
    plain(await prisma.investment.findMany({
      where: scopeToUser(req),
      take: HOLDING_LIMIT,
      orderBy: { updatedAt: 'desc' },
    })),
  ]);

  const byId = new Map();
  for (const row of [...monthWindow, ...recent]) byId.set(row.id, row);
  const transactions = [...byId.values()];

  try {
    const reply = await complete({
      system: systemPrompt(buildSnapshot({ user, transactions, investments, now })),
      messages: req.body.messages,
    });
    res.json({ reply });
  } catch (err) {
    if (err instanceof GrokError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
}));

module.exports = router;
