const express = require('express');
const multer = require('multer');

const prisma = require('../lib/prisma');
const { plain } = prisma;
const { endOfLocalDay, localDateKey } = require('../lib/dates');
const { scopeToUser } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const { parseStatement } = require('../lib/statement');
const { extractPdfItems } = require('../lib/pdfText');
const ah = require('./asyncHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

function receivePdf(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'O PDF é demasiado grande. O máximo é 8 MB.' });
    }
    return res.status(400).json({ error: 'Não foi possível ler o ficheiro.' });
  });
}

const router = express.Router();
router.get('/', validate({ query: schemas.transactionQuery }), ah(async (req, res) => {
  const { from, to, category } = req.validatedQuery;
  const where = scopeToUser(req);
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = endOfLocalDay(to);
  }
  if (category) where.category = category;

  const TRANSACTION_CAP = 10_000;
  const rows = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: TRANSACTION_CAP,
  });
  if (rows.length === TRANSACTION_CAP) {
    res.setHeader('X-Truncated', '1');
  }
  res.json(plain(rows));
}));

router.post('/import', writeLimiter, receivePdf, ah(async (req, res) => {
  const file = req.file;
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length < 5) {
    return res.status(400).json({ error: 'Escolhe o PDF da lista de movimentos.' });
  }
  if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return res.status(400).json({ error: 'O ficheiro tem de ser um PDF.' });
  }

  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 100) : '';
  let items;
  try {
    items = await extractPdfItems(file.buffer, password);
  } catch (error) {
    if (error.code === 'password_required') {
      return res.status(400).json({
        error: 'Este PDF pede uma palavra-passe.',
        code: 'password_required',
      });
    }
    if (error.code === 'password_incorrect') {
      return res.status(400).json({
        error: 'A palavra-passe do PDF está incorreta.',
        code: 'password_incorrect',
      });
    }
    if (error.code === 'pdf_too_large') {
      return res.status(422).json({
        error: 'Este PDF tem demasiadas páginas. O máximo é 50.',
        code: 'pdf_too_large',
      });
    }
    return res.status(400).json({ error: 'Não foi possível ler este PDF.' });
  }

  const { expenses, income } = parseStatement(items);
  const movements = [
    ...expenses.map((row) => ({ ...row, kind: 'expense' })),
    ...income.map((row) => ({ ...row, kind: 'income' })),
  ];
  if (movements.length === 0) {
    return res.status(422).json({
      error: 'Não encontrei movimentos. Na app Santander, em Contas, descarrega o PDF junto à lista de movimentos.',
    });
  }
  if (movements.length > 400) {
    return res.status(422).json({ error: 'Este extrato tem demasiados movimentos para importar de uma vez.' });
  }

  const validated = [];
  for (const movement of movements) {
    const parsed = schemas.transactionCreate.safeParse({
      amount: movement.amount,
      category: movement.category,
      description: movement.description,
      date: `${movement.date}T00:00:00.000Z`,
      kind: movement.kind,
    });
    if (!parsed.success) {
      return res.status(422).json({
        error: 'O extrato tem um movimento com valor ou descrição inválidos.',
      });
    }
    validated.push({
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      date: movement.date,
      kind: parsed.data.kind,
    });
  }

  const fresh = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${req.userId})`;

    const dates = validated.map((expense) => new Date(`${expense.date}T00:00:00.000Z`));
    const existing = await tx.transaction.findMany({
      where: scopeToUser(req, {
        date: { gte: new Date(Math.min(...dates)), lte: endOfLocalDay(new Date(Math.max(...dates))) },
      }),
      select: { date: true, amount: true, description: true, kind: true },
    });
    const known = new Set(existing.map((row) => movementKey(row.date, Number(row.amount), row.description, row.kind)));

    const toCreate = [];
    for (const expense of validated) {
      const key = movementKey(expense.date, expense.amount, expense.description, expense.kind);
      if (known.has(key)) continue;
      known.add(key);
      toCreate.push(expense);
    }

    if (toCreate.length > 0) {
      await tx.transaction.createMany({
        data: toCreate.map((expense) => ({
          userId: req.userId,
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          kind: expense.kind,
          date: new Date(`${expense.date}T00:00:00.000Z`),
        })),
      });
    }
    return toCreate;
  });

  res.json({
    created: fresh.length,
    createdExpenses: fresh.filter((row) => row.kind !== 'income').length,
    createdIncome: fresh.filter((row) => row.kind === 'income').length,
    skippedDuplicates: validated.length - fresh.length,
    expenses: fresh,
  });
}));

function movementKey(date, amount, description, kind = 'expense') {
  const day = typeof date === 'string' ? date : localDateKey(date);
  const text = String(description || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const base = `${day}|${Number(amount).toFixed(2)}|${text}`;
  return kind === 'income' ? `${base}|income` : base;
}

router.post('/', writeLimiter, validate({ body: schemas.transactionCreate }), ah(async (req, res) => {
  const { amount, category, description, date } = req.body;
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.userId,
      amount,
      category,
      description: description ?? null,
      ...(date ? { date } : {}),
    },
  });
  res.status(201).json(plain(transaction));
}));

router.put('/:id',
  writeLimiter,
  validate({ params: schemas.idParam, body: schemas.transactionUpdate }),
  ah(async (req, res) => {
    const existing = await prisma.transaction.findFirst({
      where: scopeToUser(req, { id: Number(req.params.id) }),
    });
    if (!existing) return res.status(404).json({ error: 'Transaction not found.' });

    const updated = await prisma.transaction.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json(plain(updated));
  })
);

router.delete('/:id', writeLimiter, validate({ params: schemas.idParam }), ah(async (req, res) => {
  const existing = await prisma.transaction.findFirst({
    where: scopeToUser(req, { id: Number(req.params.id) }),
  });
  if (!existing) return res.status(404).json({ error: 'Transaction not found.' });
  await prisma.transaction.delete({ where: { id: existing.id } });
  res.json({ message: 'Transaction deleted.' });
}));

module.exports = router;
