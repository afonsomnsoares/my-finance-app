const express = require('express');

const prisma = require('../lib/prisma');
const { plain } = prisma;
const { logger, securityEvent } = require('../lib/logger');
const { verifyPassword, hashPassword } = require('../lib/password');
const { destroyOtherSessions } = require('../lib/session');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();

const USER_FIELDS = [
  'id', 'firstName', 'lastName', 'birthday', 'phoneNumber', 'email', 'username',
  'monthlyIncome', 'currency', 'financialGoal',
  'monthlyExpenses', 'fixedExpenses', 'savingsTarget', 'createdAt',
];

function stripPassword(user) {
  const { password, ...rest } = user;
  return rest;
}

router.get('/me', ah(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(stripPassword(plain(user)));
}));

router.put('/profile', writeLimiter, validate({ body: schemas.profileUpdate }), ah(async (req, res) => {

  const data = Object.fromEntries(
    Object.entries(req.body).filter(([, value]) => value !== undefined)
  );

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const existing = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!existing) return res.status(404).json({ error: 'User not found.' });

  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json({ message: 'Profile updated.', user: stripPassword(plain(user)) });
}));

router.put('/profile/password',
  writeLimiter,
  validate({ body: schemas.passwordChange }),
  ah(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.password || !(await verifyPassword(currentPassword, user.password))) {
      securityEvent(req, 'password_change_failed', { userId: req.userId });
      return res.status(400).json({ error: 'A password atual está incorreta.' });
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { password: await hashPassword(newPassword) },
    });

    const revoked = await destroyOtherSessions(req.userId, req.sessionID);

    logger.info(
      {
        security: true,
        event: 'password_changed',
        userId: req.userId,
        ip: req.ip,
        sessionsRevoked: revoked,
      },
      'security.password_changed'
    );

    res.json({ message: 'Password alterada. As outras sessões foram terminadas.' });
  })
);

module.exports = { router, USER_FIELDS };
