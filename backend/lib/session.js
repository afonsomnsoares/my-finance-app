const session = require('express-session');
const ConnectPgSimple = require('connect-pg-simple')(session);

const env = require('./env');
const pool = require('./pool');

/*
 * Server-side sessions stored in Postgres. The cookie carries nothing but an
 * opaque session id — no user data, no token a stolen cookie can be replayed
 * against after logout, and nothing JavaScript can read.
 */
const SESSION_DAYS = 30;

const store = new ConnectPgSimple({
  pool,
  tableName: 'user_sessions',
  createTableIfMissing: true,
  // Sweep expired rows every 15 minutes.
  pruneSessionInterval: 60 * 15,
});

const sessionMiddleware = session({
  store,
  name: 'pf.sid',
  secret: env.SESSION_SECRET,
  resave: false,
  // Do not persist a row for every anonymous visitor who never logs in.
  saveUninitialized: false,
  /*
   * `rolling` re-sends the cookie on every response, so the 30 days count
   * from the last time the app was used rather than from the login. Someone
   * who opens it once a week is never logged out; a session left untouched
   * for a month expires on its own.
   */
  rolling: true,
  cookie: {
    httpOnly: true,
    // Blocks the cookie from riding along on cross-site requests, which is
    // what a CSRF attack depends on.
    sameSite: 'lax',
    // Only sent over HTTPS in production; in development the app is plain
    // http://localhost and a secure cookie would never be set at all.
    secure: env.isProd,
    /*
     * 30 days. The previous 12 hours meant logging in roughly daily, which is
     * a lot of friction for a single-user app used from one machine. The
     * session lives server-side either way, so a logout still revokes it
     * immediately — the longer window only affects how long an untouched session
     * survives, not how hard it is to cut one off.
     */
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  },
});

module.exports = sessionMiddleware;
