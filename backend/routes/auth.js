const express = require('express');

const prisma = require('../lib/prisma');
const { plain } = prisma;
const env = require('../lib/env');
const { logger, securityEvent } = require('../lib/logger');
const { verifyPassword } = require('../lib/password');
const validate = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();

router.post('/login', loginLimiter, validate({ body: schemas.login }), ah(async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
  });

  const DUMMY_HASH = 'scrypt$16384$8$1$'
    + '00000000000000000000000000000000$'
    + '0000000000000000000000000000000000000000000000000000000000000000'
    + '0000000000000000000000000000000000000000000000000000000000000000';
  const stored = user?.password ?? DUMMY_HASH;
  const ok = await verifyPassword(password, stored);

  if (!user || !user.password || !ok) {
    securityEvent(req, 'login_failed', { username });
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not start session.' });

    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) return res.status(500).json({ error: 'Could not start session.' });

      logger.info({ security: true, event: 'login_success', userId: user.id, ip: req.ip }, 'security.login_success');
      res.json({ id: user.id, username: user.username, firstName: user.firstName });
    });
  });
}));

router.post('/logout', (req, res) => {
  const userId = req.session?.userId;
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, 'logout_failed');
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.clearCookie('pf.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd,
    });
    if (userId) {
      logger.info({ security: true, event: 'logout', userId, ip: req.ip }, 'security.logout');
    }
    res.json({ message: 'Logged out.' });
  });
});

router.get('/session', ah(async (req, res) => {
  if (!req.session?.userId) return res.json({ authenticated: false });

  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });

  if (!user) {
    return req.session.destroy(() => res.json({ authenticated: false }));
  }

  const { password, ...userWithoutPassword } = plain(user);
  res.json({ authenticated: true, user: userWithoutPassword });
}));

module.exports = router;
