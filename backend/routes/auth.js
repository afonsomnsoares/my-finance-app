const express = require('express');

const prisma = require('../lib/prisma');
const { plain } = prisma;
const { logger, securityEvent } = require('../lib/logger');
const { verifyPassword } = require('../lib/password');
const validate = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

// Mounted before requireAuth: these are the only routes reachable signed out.
const router = express.Router();

router.post('/login', loginLimiter, validate({ body: schemas.login }), ah(async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
  });

  /*
   * One message and one status for every failure mode — unknown account,
   * wrong password, account with no password set. Distinguishing them tells
   * an attacker which usernames exist.
   *
   * The password is still verified against a dummy hash when the account does
   * not exist, so the response time does not reveal the answer either.
   */
  const stored = user?.password ?? 'scrypt$16384$8$1$00$00';
  const ok = await verifyPassword(password, stored);

  if (!user || !user.password || !ok) {
    securityEvent(req, 'login_failed', { username });
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Prevents session fixation: the id the client held before authenticating
  // must not be the id that now carries a logged-in session.
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
    res.clearCookie('pf.sid', { path: '/' });
    if (userId) {
      logger.info({ security: true, event: 'logout', userId, ip: req.ip }, 'security.logout');
    }
    res.json({ message: 'Logged out.' });
  });
});

/*
 * Lets the frontend decide between the login screen and the app without
 * provoking a 401 on every page load. Returns no user data when signed out.
 */
router.get('/session', ah(async (req, res) => {
  if (!req.session?.userId) return res.json({ authenticated: false });

  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });

  // The session outlived the account it pointed at.
  if (!user) {
    return req.session.destroy(() => res.json({ authenticated: false }));
  }

  const { password, ...userWithoutPassword } = plain(user);
  res.json({ authenticated: true, user: userWithoutPassword });
}));

module.exports = router;
