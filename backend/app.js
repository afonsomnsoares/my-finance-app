const path = require('path');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const env = require('./lib/env');
const { logger } = require('./lib/logger');
const sessionMiddleware = require('./lib/session');
const categories = require('./constants/categories');

const { requireAuth } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const reportRoutes = require('./routes/reports');
const investmentRoutes = require('./routes/investments');
const marketRoutes = require('./routes/market');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({

  contentSecurityPolicy: env.isProd
    ? {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // React sets many style="" attributes; block those and charts/layout break in production.
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'style-src-attr': ["'unsafe-inline'"],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
      },
    }
    : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(pinoHttp({
  logger,

  autoLogging: { ignore: (req) => req.url === '/api/health' },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, ip: req.raw?.ip }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

app.use(cors({

  origin(origin, callback) {

    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) return callback(null, true);

    try {
      const url = new URL(origin);
      const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (local && String(url.port || (url.protocol === 'https:' ? 443 : 80)) === String(env.PORT)) {
        return callback(null, true);
      }
    } catch {}

    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));

app.use(sessionMiddleware);

app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {

  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.use('/api', requireAuth);

app.use('/api', profileRoutes.router);
app.get('/api/categories', (req, res) => res.json(categories));
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api', reportRoutes.router);
app.use('/api/investments', investmentRoutes);
app.use('/api/market', marketRoutes);

if (env.isProd) {

  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
