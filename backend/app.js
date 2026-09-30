const path = require('path');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

// First: pins the process time zone before any date is computed.
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

/*
 * Behind a reverse proxy (nginx, Fly, Render, …) the client IP arrives in
 * X-Forwarded-For. Without this, every rate limit would bucket the whole
 * internet under the proxy's address, and secure cookies would not be set.
 * `1` = trust exactly one hop; never `true`, which lets a client spoof its
 * own IP and walk past the rate limiter.
 */
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ───────── Security & infrastructure middleware ───────── */

app.use(helmet({
  // The API and the built frontend are served from the same origin in
  // production, so a strict default-src is safe here.
  contentSecurityPolicy: env.isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(pinoHttp({
  logger,
  // Health noise at info level drowns out everything worth reading.
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
  // An explicit allow-list, not a wildcard: cookies cannot be sent to a
  // wildcard origin, and a wildcard would let any site call this API.
  origin(origin, callback) {
    // Same-origin requests and curl send no Origin header at all.
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS.'));
  },
  credentials: true,
}));

// A body limit is a rate limit by another name: without it one request can
// occupy the process for as long as it takes to parse a 2GB payload.
app.use(express.json({ limit: '100kb' }));

app.use(sessionMiddleware);

app.use('/api', apiLimiter);

/* ───────── Public routes ───────── */

app.get('/api/health', (req, res) => {
  // Deliberately says nothing about versions, the database or the environment.
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

/*
 * Everything below this line requires a session. Mounting the gate on the
 * whole /api prefix means a route added later is protected by default —
 * forgetting to add `requireAuth` can no longer open a hole.
 */
app.use('/api', requireAuth);

/* ───────── Protected routes ───────── */

app.use('/api', profileRoutes.router);
app.get('/api/categories', (req, res) => res.json(categories));
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api', reportRoutes.router);
app.use('/api/investments', investmentRoutes);
app.use('/api/market', marketRoutes);

/* ───────── Static frontend ───────── */

if (env.isProd) {
  // Vite builds to `dist`. This used to point at `build`, a Create React App
  // leftover that made every production request a 404.
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // Anything that is not an API route falls through to the SPA shell.
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

/* ───────── Errors ───────── */

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
