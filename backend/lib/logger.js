const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

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
      'body.currentPassword',
      'body.newPassword',
      '*.currentPassword',
      '*.newPassword',
      'DATABASE_URL',
      'DATABASE_URL_UNPOOLED',
      'SESSION_SECRET',
      'XAI_API_KEY',
      '*.XAI_API_KEY',
    ],
    censor: '[redacted]',
  },
  transport: prettyTransport(),
});

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
