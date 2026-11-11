const app = require('./app');
const env = require('./lib/env');
const prisma = require('./lib/prisma');
const pool = require('./lib/pool');
const { logger } = require('./lib/logger');

const server = app.listen(env.PORT);

server.on('listening', () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV, tz: env.APP_TIMEZONE }, `Server running on http://localhost:${env.PORT}`);
});

/*
 * Express 5 also registers a listen callback as the one-shot error handler.
 * Passing one made a taken port look like a successful start, then the
 * process exited 0 and nodemon waited forever instead of reporting the crash.
 */
server.on('error', (err) => {
  console.error(`Failed to listen on port ${env.PORT}: ${err.message}`);
  process.exit(1);
});

/*
 * Without this, a container stop kills in-flight requests and leaves Postgres
 * connections dangling until they time out.
 */
async function shutdown(signal) {
  logger.info({ signal }, 'shutting_down');
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
