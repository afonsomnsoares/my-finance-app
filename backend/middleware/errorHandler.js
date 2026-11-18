const crypto = require('crypto');
const { logger } = require('../lib/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

function errorHandler(err, req, res, next) {
  const errorId = crypto.randomUUID();

  logger.error({
    errorId,
    err,
    method: req.method,
    path: req.originalUrl,
    userId: req.userId,
  }, 'unhandled_error');

  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Malformed JSON body.', errorId });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.', errorId });
  }

  res.status(500).json({
    error: 'Something went wrong. Please try again.',
    errorId,
  });
}

module.exports = { errorHandler, notFoundHandler };
