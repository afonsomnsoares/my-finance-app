const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

/*
 * Structured logger. Two rules here that matter for security:
 *
 * 1. `redact` strips anything that could carry a credential or personal
 *    detail out of the log line, even if a future route hands the logger a
 *    whole request or body by accident.
 * 2. In production we emit JSON (parseable by any log shipper); in
 *    development we stay human-readable.
 */
/*
 * pino-pretty is a dev-only dependency, so a production install will not have
 * it. Resolve it defensively: a missing formatter must never stop the server
 * from booting.
 */
function prettyTransport() {
  if (isProd) return undefined;
  try {
    require.resolve('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };
  } catch {
    return undefined;
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'body.password',
      'DATABASE_URL',
      'SESSION_SECRET',
    ],
    censor: '[redacted]',
  },
  transport: prettyTransport(),
});

/*
 * Security-relevant events go through one function so they are easy to grep
 * and easy to ship to an alerting rule later. Every entry carries the client
 * IP, because the whole point is spotting a pattern from one source.
 */
function securityEvent(req, event, extra = {}) {
  logger.warn({
    security: true,
    event,
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
    userAgent: req.get('user-agent'),
    ...extra,
  }, `security.${event}`);
}

module.exports = { logger, securityEvent };
