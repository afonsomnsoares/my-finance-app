const crypto = require('crypto');
const { logger } = require('../lib/logger');

/*
 * The single place an unhandled error becomes a response.
 *
 * The client gets a generic message and a correlation id. The stack trace,
 * the Prisma error code, the SQL — all of it stays in the server log, where
 * the id makes it findable. Previously each route caught its own error and
 * logged it; a route that forgot to catch would have handed Express's default
 * handler the full stack, and in a non-production process Express sends that
 * stack to the client.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars -- Express identifies the error
// handler by its four-argument signature.
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

  // A body that failed JSON.parse is the client's mistake, not ours.
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
