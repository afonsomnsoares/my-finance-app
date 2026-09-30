const app = require('./app');
const env = require('./lib/env');
const prisma = require('./lib/prisma');
const pool = require('./lib/pool');
const { logger } = require('./lib/logger');

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV, tz: env.APP_TIMEZONE }, `Server running on http://localhost:${env.PORT}`);
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
