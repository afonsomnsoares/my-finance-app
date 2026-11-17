const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');

const env = require('./env');
const pool = require('./pool');
const { logger } = require('./logger');

/*
 * Sessions live in Postgres (`user_sessions`) so they survive process restarts
 * and can be revoked per user — password change deletes every other row for
 * that account while keeping the current cookie valid.
 */
const SESSION_DAYS = 30;
const PgStore = connectPgSimple(session);

const store = new PgStore({
  pool,
  tableName: 'user_sessions',
  createTableIfMissing: false,
});

const sessionMiddleware = session({
  store,
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

/*
 * express-session stores `userId` inside the JSON `sess` column. Delete every
 * other session for this user so a password change actually logs other devices
 * out. The current `sid` is kept so the caller is not kicked mid-request.
 */
async function destroyOtherSessions(userId, keepSid) {
  const result = await pool.query(
    `DELETE FROM user_sessions
     WHERE (sess->>'userId')::int = $1
       AND sid IS DISTINCT FROM $2`,
    [userId, keepSid]
  );
  return result.rowCount;
}

async function destroyAllSessionsForUser(userId) {
  const result = await pool.query(
    `DELETE FROM user_sessions WHERE (sess->>'userId')::int = $1`,
    [userId]
  );
  return result.rowCount;
}

store.on('error', (err) => {
  logger.error({ err }, 'session_store_error');
});

module.exports = sessionMiddleware;
module.exports.destroyOtherSessions = destroyOtherSessions;
module.exports.destroyAllSessionsForUser = destroyAllSessionsForUser;
module.exports.SESSION_DAYS = SESSION_DAYS;
