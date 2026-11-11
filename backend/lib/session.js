const session = require('express-session');

const env = require('./env');

/*
 * Server-side sessions kept in memory. No database, no install — the session
 * lives only while the server process runs; restarting the server clears it.
 * That's fine for a single-user app on one machine: you log in once and stay
 * logged in until the server restarts.
 */
const SESSION_DAYS = 30;

const sessionMiddleware = session({
  store: new session.MemoryStore(),
  name: 'pf.sid',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  },
});

module.exports = sessionMiddleware;
