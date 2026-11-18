const { securityEvent } = require('../lib/logger');

function requireAuth(req, res, next) {
  const userId = req.session?.userId;

  if (!userId) {
    securityEvent(req, 'unauthenticated_request');
    return res.status(401).json({ error: 'Authentication required.' });
  }

  req.userId = userId;
  next();
}

function scopeToUser(req, where = {}) {
  if (!req.userId) {
    throw new Error('scopeToUser called on a request that never passed requireAuth.');
  }
  return { ...where, userId: req.userId };
}

module.exports = { requireAuth, scopeToUser };
