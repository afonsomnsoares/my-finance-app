const { securityEvent } = require('../lib/logger');

/*
 * Gate for every route that touches user data.
 *
 * It does two things, and the second is the one that matters: it puts the
 * user id on `req.userId` from the *session*, so route handlers have no way
 * to read it from the request body or a query parameter. Before this, every
 * handler called getDefaultUserId() and simply trusted whatever came back.
 */
function requireAuth(req, res, next) {
  const userId = req.session?.userId;

  if (!userId) {
    securityEvent(req, 'unauthenticated_request');
    return res.status(401).json({ error: 'Authentication required.' });
  }

  req.userId = userId;
  next();
}

/*
 * Scoping helper. Every Prisma `where` that reaches a user-owned table is
 * built through this, so "forgot to filter by user" stops being a thing a
 * handler can do by accident.
 */
function scopeToUser(req, where = {}) {
  if (!req.userId) {
    throw new Error('scopeToUser called on a request that never passed requireAuth.');
  }
  return { ...where, userId: req.userId };
}

module.exports = { requireAuth, scopeToUser };
